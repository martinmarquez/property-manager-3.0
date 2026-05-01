/**
 * Integration tests — Smart Search tenant isolation & search_text columns
 *
 * Validates:
 *  1. search_text generated columns on property and contact
 *  2. search_text trigger on lead (cross-table data)
 *  3. pg_trgm similarity search respects tenant isolation
 *  4. Cross-tenant search returns 0 results
 *  5. Reference code exact match
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
// Test fixtures
// ---------------------------------------------------------------------------
let tenantAId: string;
let tenantBId: string;
let userAId: string;
let userBId: string;
let propertyAId: string;
let propertyBId: string;
let contactAId: string;
let contactBId: string;
let pipelineAId: string;
let stageAId: string;
let leadAId: string;

beforeAll(async () => {
  await resetTenantCtx();

  // Create two tenants
  const [tenA] = await db
    .insert(schema.tenant)
    .values({ slug: `search-tenant-a-${Date.now()}`, name: 'Search Tenant A' })
    .returning();
  const [tenB] = await db
    .insert(schema.tenant)
    .values({ slug: `search-tenant-b-${Date.now()}`, name: 'Search Tenant B' })
    .returning();

  if (!tenA || !tenB) throw new Error('Failed to create test tenants');
  tenantAId = tenA.id;
  tenantBId = tenB.id;
  createdTenantIds.push(tenantAId, tenantBId);

  // Create users
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [uA] = await db
    .insert(schema.user)
    .values({ tenantId: tenantAId, email: 'search-alice@a.test', fullName: 'Alice Search' })
    .returning();
  userAId = uA!.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [uB] = await db
    .insert(schema.user)
    .values({ tenantId: tenantBId, email: 'search-bob@b.test', fullName: 'Bob Search' })
    .returning();
  userBId = uB!.id;

  // Create property for tenant A — distinctive address for search
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [propA] = await db
    .insert(schema.property)
    .values({
      tenantId: tenantAId,
      referenceCode: 'SRCH-001',
      title: 'Luminoso departamento en Palermo',
      description: 'Hermoso 3 ambientes con balcón terraza y vista al río',
      propertyType: 'apartment',
      neighborhood: 'Palermo',
      locality: 'CABA',
      addressStreet: 'Av. Santa Fe',
      addressNumber: '3200',
      createdBy: userAId,
      updatedBy: userAId,
    })
    .returning();
  propertyAId = propA!.id;

  // Create property for tenant B — different data
  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [propB] = await db
    .insert(schema.property)
    .values({
      tenantId: tenantBId,
      referenceCode: 'SRCH-002',
      title: 'Casa con jardín en Nordelta',
      description: 'Amplia casa familiar con pileta y quincho',
      propertyType: 'house',
      neighborhood: 'Nordelta',
      locality: 'Tigre',
      addressStreet: 'Calle Los Álamos',
      addressNumber: '150',
      createdBy: userBId,
      updatedBy: userBId,
    })
    .returning();
  propertyBId = propB!.id;

  // Create contacts
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [cA] = await db
    .insert(schema.contact)
    .values({
      tenantId: tenantAId,
      kind: 'person',
      firstName: 'María',
      lastName: 'González',
      notes: 'Interesada en departamentos luminosos',
    })
    .returning();
  contactAId = cA!.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [cB] = await db
    .insert(schema.contact)
    .values({
      tenantId: tenantBId,
      kind: 'person',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      notes: 'Busca casa con jardín',
    })
    .returning();
  contactBId = cB!.id;

  // Create pipeline + stage + lead for tenant A
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [pipeA] = await sql<[{ id: string }]>`
    INSERT INTO pipeline (tenant_id, name, type, is_default, position, created_by, updated_by)
    VALUES (${tenantAId}::uuid, 'Ventas', 'ventas', true, 0, ${userAId}::uuid, ${userAId}::uuid)
    RETURNING id
  `;
  pipelineAId = pipeA!.id;

  const [stgA] = await sql<[{ id: string }]>`
    INSERT INTO pipeline_stage (tenant_id, pipeline_id, name, kind, position)
    VALUES (${tenantAId}::uuid, ${pipelineAId}::uuid, 'Contacto', 'open', 0)
    RETURNING id
  `;
  stageAId = stgA!.id;

  const [ldA] = await sql<[{ id: string }]>`
    INSERT INTO lead (tenant_id, pipeline_id, stage_id, contact_id, property_id, title, created_by, updated_by)
    VALUES (${tenantAId}::uuid, ${pipelineAId}::uuid, ${stageAId}::uuid, ${contactAId}::uuid, ${propertyAId}::uuid, 'María interesada en Palermo', ${userAId}::uuid, ${userAId}::uuid)
    RETURNING id
  `;
  leadAId = ldA!.id;

  await resetTenantCtx();
});

afterAll(async () => {
  await resetTenantCtx();
  for (const tid of createdTenantIds) {
    // Delete in FK dependency order
    await sql`DELETE FROM lead_stage_history WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM lead WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM pipeline_stage WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM pipeline WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM doc_document WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM property_listing WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM property_media WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM property_history WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM property_tag WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM property WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM contact WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM search_query_log WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM ai_embedding WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM user_role WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM role WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM feature_flag WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM api_key WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM webhook WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM tenant_domain WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM branch WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM audit_log WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM "user" WHERE tenant_id = ${tid}::uuid`;
    await sql`DELETE FROM tenant WHERE id = ${tid}::uuid`;
  }
  await sql.end();
});

// ---------------------------------------------------------------------------
// 1. search_text generated column on property
// ---------------------------------------------------------------------------
describe('property search_text', () => {
  it('populated automatically with address + neighborhood + reference_code + description', async () => {
    await resetTenantCtx();
    const [row] = await sql<[{ search_text: string }]>`
      SELECT search_text FROM property WHERE id = ${propertyAId}::uuid
    `;
    expect(row).toBeDefined();
    const st = row!.search_text;
    expect(st).toContain('SRCH-001');
    expect(st).toContain('Palermo');
    expect(st).toContain('Av. Santa Fe');
    expect(st).toContain('Luminoso departamento en Palermo');
  });
});

// ---------------------------------------------------------------------------
// 2. search_text generated column on contact
// ---------------------------------------------------------------------------
describe('contact search_text', () => {
  it('populated automatically with first_name + last_name + notes', async () => {
    await resetTenantCtx();
    const [row] = await sql<[{ search_text: string }]>`
      SELECT search_text FROM contact WHERE id = ${contactAId}::uuid
    `;
    expect(row).toBeDefined();
    const st = row!.search_text;
    expect(st).toContain('María');
    expect(st).toContain('González');
    expect(st).toContain('departamentos luminosos');
  });
});

// ---------------------------------------------------------------------------
// 3. search_text trigger on lead
// ---------------------------------------------------------------------------
describe('lead search_text', () => {
  it('populated via trigger with lead title + contact name + property address', async () => {
    await resetTenantCtx();
    const [row] = await sql<[{ search_text: string }]>`
      SELECT search_text FROM lead WHERE id = ${leadAId}::uuid
    `;
    expect(row).toBeDefined();
    const st = row!.search_text;
    expect(st).toContain('María');
    expect(st).toContain('González');
    expect(st).toContain('Palermo');
    expect(st).toContain('Av. Santa Fe');
    expect(st).toContain('SRCH-001');
  });
});

// ---------------------------------------------------------------------------
// 4. pg_trgm similarity search with tenant isolation
// ---------------------------------------------------------------------------
describe('trgm search tenant isolation', () => {
  it('tenant A search for Palermo returns only tenant A properties', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text, similarity(search_text, 'Palermo') AS sim
        FROM property
        WHERE search_text % 'Palermo'
        ORDER BY sim DESC
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.id === propertyAId)).toBe(true);
    });
  });

  it('tenant B search for Palermo returns 0 results (tenant A data invisible)', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text, similarity(search_text, 'Palermo') AS sim
        FROM property
        WHERE search_text % 'Palermo'
        ORDER BY sim DESC
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBe(0);
    });
  });

  it('tenant B search for Nordelta returns only tenant B properties', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text, similarity(search_text, 'Nordelta') AS sim
        FROM property
        WHERE search_text % 'Nordelta'
        ORDER BY sim DESC
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.id === propertyBId)).toBe(true);
    });
  });

  it('tenant A search for Nordelta returns 0 results (tenant B data invisible)', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text, similarity(search_text, 'Nordelta') AS sim
        FROM property
        WHERE search_text % 'Nordelta'
        ORDER BY sim DESC
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Contact trgm search isolation
// ---------------------------------------------------------------------------
describe('contact search isolation', () => {
  it('tenant A finds María but not Carlos', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text
        FROM contact
        WHERE search_text % 'María González'
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.id === contactAId)).toBe(true);
    });
  });

  it('tenant B finds Carlos but not María', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text
        FROM contact
        WHERE search_text % 'Carlos Rodríguez'
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.id === contactBId)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Reference code exact match
// ---------------------------------------------------------------------------
describe('reference code exact match', () => {
  it('exact reference code search returns the matching property', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, reference_code,
               similarity(search_text, 'SRCH-001') AS sim,
               CASE WHEN lower(reference_code) = lower('SRCH-001') THEN 1 ELSE 0 END AS exact_match
        FROM property
        WHERE search_text % 'SRCH-001'
        ORDER BY exact_match DESC, sim DESC
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].exact_match).toBe(1);
      expect(results[0].id).toBe(propertyAId);
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Lead search isolation
// ---------------------------------------------------------------------------
describe('lead search isolation', () => {
  it('tenant A finds lead by contact name', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text, search_text
        FROM lead
        WHERE search_text % 'María Palermo'
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.id === leadAId)).toBe(true);
    });
  });

  it('tenant B cannot see tenant A leads', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.execute(sqlTag`
        SELECT id::text FROM lead
        WHERE search_text % 'María Palermo'
      `);
      const results = (rows as any).rows ?? rows;
      expect(results.length).toBe(0);
    });
  });
});
