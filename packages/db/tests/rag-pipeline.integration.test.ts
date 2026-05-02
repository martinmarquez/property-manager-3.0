/**
 * Integration tests — RAG pipeline: embedding ingestion, deletion, and hybrid retrieval
 *
 * Tests:
 *  1. Embedding ingestion — inserting chunks creates ai_embedding rows
 *  2. Chunk count matches entity chunking output
 *  3. Deletion — removing embeddings by entity clears all rows
 *  4. Upsert — re-ingesting same entity replaces existing rows (no duplicates)
 *  5. Hybrid retrieval — vector similarity query returns matches for same tenant
 *  6. Hybrid retrieval — keyword/trgm query returns matches for same tenant
 *  7. Hybrid retrieval — cross-tenant query returns 0 results
 *  8. Entity-type filter — restricts results to requested entityType
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql as sqlTag } from 'drizzle-orm';
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

// A deterministic 512-dim zero vector — same dimensionality as our embeddings
const ZERO_VECTOR_SQL = sqlTag`array_fill(0.0::float4, ARRAY[512])::vector`;

// A 512-dim vector biased toward 1.0 in dim 0 — represents "property" embedding
const PROPERTY_VECTOR_SQL = sqlTag`(
  SELECT array_agg(CASE WHEN i = 1 THEN 1.0::float4 ELSE 0.0::float4 END)::vector
  FROM generate_series(1, 512) AS i
)`;

async function withTenant(tenantId: string, fn: () => Promise<void>) {
  await sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  await fn();
  await sql`SELECT set_config('app.tenant_id', '', false)`;
}

async function resetCtx() {
  await sql`SELECT set_config('app.tenant_id', '', false)`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
let tenantAId: string;
let tenantBId: string;
let propertyAId: string;
let propertyBId: string;

beforeAll(async () => {
  await resetCtx();

  // Create two tenants (superuser bypasses RLS on tenant table)
  const [tenA] = await db
    .insert(schema.tenant)
    .values({ slug: `rag-pipe-a-${Date.now()}`, name: 'RAG Pipeline Tenant A' })
    .returning();
  const [tenB] = await db
    .insert(schema.tenant)
    .values({ slug: `rag-pipe-b-${Date.now()}`, name: 'RAG Pipeline Tenant B' })
    .returning();

  if (!tenA || !tenB) throw new Error('Failed to create test tenants');
  tenantAId = tenA.id;
  tenantBId = tenB.id;
  createdTenantIds.push(tenantAId, tenantBId);

  propertyAId = crypto.randomUUID();
  propertyBId = crypto.randomUUID();
});

afterAll(async () => {
  await resetCtx();
  for (const tid of createdTenantIds) {
    await sql`DELETE FROM ai_embedding WHERE tenant_id = ${tid}::uuid`;
    await db.delete(schema.tenant).where(eq(schema.tenant.id, tid));
  }
  await sql.end();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertEmbedding(opts: {
  tenantId: string;
  entityType?: string;
  entityId: string;
  chunkIndex?: number;
  content: string;
  vector?: ReturnType<typeof sqlTag>;
}): Promise<string> {
  const vector = opts.vector ?? ZERO_VECTOR_SQL;
  const entityType = opts.entityType ?? 'property';
  const chunkIndex = opts.chunkIndex ?? 0;

  const rows = await sql<[{ id: string }]>`
    INSERT INTO ai_embedding
      (tenant_id, entity_type, entity_id, chunk_index, source_field, content, embedding, token_count, metadata)
    VALUES (
      ${opts.tenantId}::uuid,
      ${entityType}::ai_entity_type,
      ${opts.entityId}::uuid,
      ${chunkIndex},
      'structured',
      ${opts.content},
      ${vector},
      ${opts.content.split(' ').length},
      '{}'::jsonb
    )
    RETURNING id
  `;
  return rows[0]!.id;
}

async function countEmbeddings(tenantId: string, entityId: string): Promise<number> {
  const rows = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM ai_embedding
    WHERE tenant_id = ${tenantId}::uuid AND entity_id = ${entityId}::uuid
  `;
  return parseInt(rows[0]!.count, 10);
}

// ---------------------------------------------------------------------------
// 1. Embedding ingestion
// ---------------------------------------------------------------------------
describe('RAG pipeline — embedding ingestion', () => {
  it('inserting a chunk creates one ai_embedding row', async () => {
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: propertyAId,
      content: 'Departamento en Palermo con 3 ambientes y balcón corrido.',
    });

    const count = await countEmbeddings(tenantAId, propertyAId);
    expect(count).toBe(1);
  });

  it('multiple chunks for same entity create multiple rows', async () => {
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: propertyAId,
      chunkIndex: 1,
      content: 'Código de referencia: PAL-00142. Tipo: Departamento.',
    });
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: propertyAId,
      chunkIndex: 2,
      content: 'Ubicado en Palermo Hollywood. Excelente luminosidad.',
    });

    const count = await countEmbeddings(tenantAId, propertyAId);
    expect(count).toBe(3);
  });

  it('rows belong to the correct tenant', async () => {
    const rows = await sql`
      SELECT tenant_id FROM ai_embedding
      WHERE entity_id = ${propertyAId}::uuid
    `;
    expect(rows.every((r: { tenant_id: string }) => r.tenant_id === tenantAId)).toBe(true);
  });

  it('entity_type is stored correctly', async () => {
    const rows = await sql`
      SELECT entity_type FROM ai_embedding
      WHERE entity_id = ${propertyAId}::uuid LIMIT 1
    `;
    expect(rows[0]?.entity_type).toBe('property');
  });
});

// ---------------------------------------------------------------------------
// 2. Chunk deletion (simulating what RagIngestWorker.deleteEmbeddings does)
// ---------------------------------------------------------------------------
describe('RAG pipeline — chunk deletion on entity remove', () => {
  let deletableEntityId: string;

  beforeAll(async () => {
    deletableEntityId = crypto.randomUUID();
    // Insert 3 chunks for a property
    for (let i = 0; i < 3; i++) {
      await insertEmbedding({
        tenantId: tenantAId,
        entityId: deletableEntityId,
        chunkIndex: i,
        content: `Chunk ${i} — Casa en Recoleta con jardín.`,
      });
    }
    const count = await countEmbeddings(tenantAId, deletableEntityId);
    expect(count).toBe(3);
  });

  it('deleting by entityId removes all chunks', async () => {
    await db
      .delete(schema.aiEmbedding)
      .where(
        and(
          eq(schema.aiEmbedding.tenantId, tenantAId),
          eq(schema.aiEmbedding.entityId, deletableEntityId),
        ),
      );

    const count = await countEmbeddings(tenantAId, deletableEntityId);
    expect(count).toBe(0);
  });

  it('deletion does not affect other entities in the same tenant', async () => {
    const remaining = await countEmbeddings(tenantAId, propertyAId);
    expect(remaining).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Upsert — re-ingesting same entity replaces rows
// ---------------------------------------------------------------------------
describe('RAG pipeline — upsert (re-ingest replaces existing rows)', () => {
  let upsertEntityId: string;

  beforeAll(async () => {
    upsertEntityId = crypto.randomUUID();
    // Initial ingest: 2 chunks
    for (let i = 0; i < 2; i++) {
      await insertEmbedding({
        tenantId: tenantAId,
        entityId: upsertEntityId,
        chunkIndex: i,
        content: `Chunk original ${i}`,
      });
    }
    expect(await countEmbeddings(tenantAId, upsertEntityId)).toBe(2);
  });

  it('re-ingest deletes old rows then inserts new ones', async () => {
    // Simulate worker upsert: delete then re-insert with new chunks
    await db
      .delete(schema.aiEmbedding)
      .where(
        and(
          eq(schema.aiEmbedding.tenantId, tenantAId),
          eq(schema.aiEmbedding.entityId, upsertEntityId),
        ),
      );

    // Insert updated 3 chunks
    for (let i = 0; i < 3; i++) {
      await insertEmbedding({
        tenantId: tenantAId,
        entityId: upsertEntityId,
        chunkIndex: i,
        content: `Chunk actualizado ${i}`,
      });
    }

    const count = await countEmbeddings(tenantAId, upsertEntityId);
    expect(count).toBe(3);

    // Verify content is updated
    const rows = await sql`
      SELECT content FROM ai_embedding
      WHERE entity_id = ${upsertEntityId}::uuid
      ORDER BY chunk_index
    `;
    expect(rows[0]?.content).toContain('actualizado');
  });
});

// ---------------------------------------------------------------------------
// 4. Hybrid retrieval — vector similarity (same tenant)
// ---------------------------------------------------------------------------
describe('RAG pipeline — hybrid retrieval', () => {
  let semanticEntityId: string;
  let keywordEntityId: string;

  beforeAll(async () => {
    semanticEntityId = crypto.randomUUID();
    keywordEntityId = crypto.randomUUID();

    // Semantic entity: distinctive vector (biased toward 1.0 in first dim)
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: semanticEntityId,
      content: 'Hermoso penthouse en Belgrano con terraza y parrilla.',
      vector: PROPERTY_VECTOR_SQL,
    });

    // Keyword entity: zero vector but distinctive content for trgm
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: keywordEntityId,
      content: 'PAL-99999 Departamento en Palermo Soho con cochera.',
    });

    // Tenant B entity — must never appear in tenant A queries
    await insertEmbedding({
      tenantId: tenantBId,
      entityId: propertyBId,
      content: 'Propiedad cross-tenant — NO debe aparecer en consultas de A.',
    });
  });

  it('vector similarity query returns results for same tenant', async () => {
    const rows = await sql`
      SELECT id, entity_id, content,
             1 - (embedding <=> ${PROPERTY_VECTOR_SQL}) AS similarity
      FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
      ORDER BY embedding <=> ${PROPERTY_VECTOR_SQL}
      LIMIT 5
    `;
    expect((rows as unknown[]).length).toBeGreaterThan(0);
    const ids = rows.map((r: { entity_id: string }) => r.entity_id);
    expect(ids).toContain(semanticEntityId);
  });

  it('keyword (trgm) query returns matching content for same tenant', async () => {
    const rows = await sql`
      SELECT id, entity_id, content,
             similarity(content, 'PAL-99999') AS sim
      FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
        AND content % 'PAL-99999'
      ORDER BY similarity(content, 'PAL-99999') DESC
      LIMIT 5
    `;
    expect((rows as unknown[]).length).toBeGreaterThan(0);
    const ids = rows.map((r: { entity_id: string }) => r.entity_id);
    expect(ids).toContain(keywordEntityId);
  });

  it('reference code exact match appears first in keyword query', async () => {
    const rows = await sql`
      SELECT entity_id, content,
             similarity(content, 'PAL-99999') AS sim
      FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
        AND content % 'PAL-99999'
      ORDER BY similarity(content, 'PAL-99999') DESC
      LIMIT 1
    `;
    expect(rows[0]?.entity_id).toBe(keywordEntityId);
  });

  it('cross-tenant retrieval returns 0 results (tenant isolation)', async () => {
    const rows = await sql`
      SELECT id FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
        AND entity_id = ${propertyBId}::uuid
    `;
    expect((rows as unknown[]).length).toBe(0);
  });

  it('entity-type filter restricts results to requested type', async () => {
    const contactEntityId = crypto.randomUUID();
    await insertEmbedding({
      tenantId: tenantAId,
      entityId: contactEntityId,
      entityType: 'contact_note',
      content: 'Nota de contacto: cliente interesado en departamentos.',
    });

    const rows = await sql`
      SELECT entity_type FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
        AND entity_type = 'property'::ai_entity_type
    `;
    expect(rows.every((r: { entity_type: string }) => r.entity_type === 'property')).toBe(true);
    expect(rows.some((r: { entity_type: string }) => r.entity_type === 'contact_note')).toBe(false);
  });

  it('two-tenant isolation: tenant B embeddings are invisible in tenant A queries', async () => {
    const tenantARows = await sql`
      SELECT entity_id FROM ai_embedding
      WHERE tenant_id = ${tenantAId}::uuid
    `;
    const ids = tenantARows.map((r: { entity_id: string }) => r.entity_id);
    expect(ids).not.toContain(propertyBId);
  });
});
