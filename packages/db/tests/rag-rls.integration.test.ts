/**
 * Integration tests — RAG / AI table RLS isolation (Phase F, RENA-91)
 *
 * Validates that ai_embedding, copilot_session, and copilot_turn enforce
 * row-level security so that tenant B cannot read or write tenant A rows.
 *
 * Tests:
 *  1. ai_embedding: tenant A embeddings invisible to tenant B queries
 *  2. ai_embedding: vector similarity query (matching retrieve.ts pattern) returns 0 cross-tenant
 *  3. ai_embedding: trgm keyword query returns 0 cross-tenant
 *  4. ai_embedding: cross-tenant INSERT is rejected by RLS WITH CHECK
 *  5. copilot_session: tenant isolation
 *  6. copilot_turn: tenant isolation (cascades from session)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql as sqlTag } from 'drizzle-orm';
import * as schema from '../src/schema/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const TEST_DB_URL =
  process.env['TEST_DATABASE_URL'] ??
  process.env['DATABASE_URL_UNPOOLED'] ??
  process.env['DATABASE_URL'];

if (!TEST_DB_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}

const sql = postgres(TEST_DB_URL, { max: 1 });
const db = drizzle(sql, { schema });

const createdTenantIds: string[] = [];

type TxDb = PostgresJsDatabase<typeof schema>;

async function withTenant(tenantId: string, fn: (tx: TxDb) => Promise<void>) {
  await db.transaction(async (tx) => {
    await tx.execute(sqlTag`SET LOCAL ROLE app_user`);
    await tx.execute(sqlTag`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    await fn(tx);
  });
}

async function resetTenantCtx() {
  await sql`SELECT set_config('app.tenant_id', '', false)`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
let tenantAId: string;
let tenantBId: string;
let userAId: string;
let embeddingAId: string;
let sessionAId: string;

// A real 512-dim zero vector — same dimensionality as text-embedding-3-small at d=512
const ZERO_VECTOR_SQL = sqlTag`array_fill(0.0::float4, ARRAY[512])::vector`;

beforeAll(async () => {
  await resetTenantCtx();

  // Create two tenants (superuser, bypasses RLS on tenant table)
  const [tenA] = await db
    .insert(schema.tenant)
    .values({ slug: `rag-rls-a-${Date.now()}`, name: 'RAG RLS Tenant A' })
    .returning();
  const [tenB] = await db
    .insert(schema.tenant)
    .values({ slug: `rag-rls-b-${Date.now()}`, name: 'RAG RLS Tenant B' })
    .returning();

  if (!tenA || !tenB) throw new Error('Failed to create test tenants');
  tenantAId = tenA.id;
  tenantBId = tenB.id;
  createdTenantIds.push(tenantAId, tenantBId);

  // User for tenant A
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [uA] = await db
    .insert(schema.user)
    .values({ tenantId: tenantAId, email: `alice-rag-${Date.now()}@a.test`, fullName: 'Alice RAG' })
    .returning();
  if (!uA) throw new Error('Failed to create user A');
  userAId = uA.id;

  // Insert an embedding for tenant A (superuser, then RLS check via insert)
  // Use raw SQL to pass the zero vector literal as type vector(512)
  const embRow = await sql<[{ id: string }]>`
    INSERT INTO ai_embedding
      (tenant_id, entity_type, entity_id, chunk_index, source_field, content, embedding, token_count, metadata)
    VALUES (
      ${tenantAId}::uuid,
      'property'::ai_entity_type,
      gen_random_uuid(),
      0,
      'description',
      'Departamento en Palermo con 3 ambientes y balcón corrido.',
      ${ZERO_VECTOR_SQL},
      12,
      '{}'::jsonb
    )
    RETURNING id
  `;
  embeddingAId = embRow[0]!.id;

  // Insert a copilot session for tenant A
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [sesA] = await db
    .insert(schema.copilotSession)
    .values({ tenantId: tenantAId, userId: userAId, title: 'RAG RLS test session' })
    .returning();
  if (!sesA) throw new Error('Failed to create copilot session A');
  sessionAId = sesA.id;

  // Insert a copilot turn for that session
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  await db.insert(schema.copilotTurn).values({
    tenantId: tenantAId,
    sessionId: sessionAId,
    role: 'user',
    content: 'Busco departamento en Palermo.',
  });

  await resetTenantCtx();
});

afterAll(async () => {
  await resetTenantCtx();
  for (const tid of createdTenantIds) {
    // Clean up in dependency order
    await sql`DELETE FROM copilot_turn WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM copilot_session WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM ai_embedding WHERE tenant_id = ${tid}::uuid`;
    await db.delete(schema.user).where(eq(schema.user.tenantId, tid));
    await db.delete(schema.tenant).where(eq(schema.tenant.id, tid));
  }
  await sql.end();
});

// ---------------------------------------------------------------------------
// 1. ai_embedding RLS isolation — simple SELECT
// ---------------------------------------------------------------------------
describe('ai_embedding RLS isolation', () => {
  it('tenant A can read its own embeddings', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.aiEmbedding);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === embeddingAId)).toBe(true);
    });
  });

  it('tenant B sees zero ai_embedding rows (tenant A rows invisible)', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.aiEmbedding);
      expect(rows.length).toBe(0);
      // Explicitly confirm the A row is not accessible
      expect(rows.some((r) => r.id === embeddingAId)).toBe(false);
    });
  });

  it('tenant B cross-tenant vector similarity query returns 0 results', async () => {
    // Replicates the exact WHERE clause in packages/core/src/rag/retrieve.ts:116
    // Querying as tenant B should return nothing even though tenant A has embeddings.
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id, entity_type, entity_id, chunk_index, content,
               1 - (embedding <=> ${ZERO_VECTOR_SQL}) AS similarity
        FROM ai_embedding
        WHERE tenant_id = ${tenantBId}::uuid
        ORDER BY embedding <=> ${ZERO_VECTOR_SQL}
        LIMIT 10
      `);
      expect((rows as unknown[]).length).toBe(0);
    });
  });

  it('tenant B trgm keyword query returns 0 results', async () => {
    // Replicates the keyword query pattern in packages/core/src/rag/retrieve.ts:127
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id, content
        FROM ai_embedding
        WHERE tenant_id = ${tenantBId}::uuid
          AND content % 'Palermo'
        ORDER BY similarity(content, 'Palermo') DESC
        LIMIT 10
      `);
      expect((rows as unknown[]).length).toBe(0);
    });
  });

  it('tenant B cannot insert an embedding with tenant A id (RLS WITH CHECK)', async () => {
    // The transaction-level abort means the whole withTenant block rejects
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sqlTag`SET LOCAL ROLE app_user`);
        await tx.execute(sqlTag`SELECT set_config('app.tenant_id', ${tenantBId}, true)`);
        // Attempt to insert a row claiming to belong to tenant A
        await tx.execute(sqlTag`
          INSERT INTO ai_embedding
            (tenant_id, entity_type, entity_id, chunk_index, content, embedding, token_count, metadata)
          VALUES (
            ${tenantAId}::uuid,
            'property'::ai_entity_type,
            gen_random_uuid(),
            0,
            'Cross-tenant injection attempt',
            ${ZERO_VECTOR_SQL},
            1,
            '{}'::jsonb
          )
        `);
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. copilot_session RLS isolation
// ---------------------------------------------------------------------------
describe('copilot_session RLS isolation', () => {
  it('tenant A can read its own copilot sessions', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.copilotSession);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
    });
  });

  it('tenant B sees zero copilot_session rows', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.copilotSession);
      expect(rows.length).toBe(0);
    });
  });

  it('tenant B cannot read tenant A session by id', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.copilotSession)
        .where(eq(schema.copilotSession.id, sessionAId));
      expect(rows.length).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. copilot_turn RLS isolation
// ---------------------------------------------------------------------------
describe('copilot_turn RLS isolation', () => {
  it('tenant A can read its own copilot turns', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.copilotTurn);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
    });
  });

  it('tenant B sees zero copilot_turn rows', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.copilotTurn);
      expect(rows.length).toBe(0);
    });
  });
});
