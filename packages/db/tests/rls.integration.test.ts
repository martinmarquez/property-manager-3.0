/**
 * Integration tests — RLS isolation, universal columns, FK constraints
 *
 * Connects directly to the Neon TEST_DATABASE_URL using postgres-js (no pool).
 * Each test suite provisions its own tenant rows and tears them down in afterAll.
 *
 * What is validated:
 *  1. RLS isolation — tenant A cannot read tenant B rows
 *  2. Universal columns present — id, tenant_id, created_at, updated_at, deleted_at, version
 *  3. updated_at trigger fires on UPDATE
 *  4. version bumps on UPDATE
 *  5. FK constraints — orphan inserts are rejected
 *  6. Unique constraints — duplicate (tenant_id, email) rejected
 *  7. write_audit_log SECURITY DEFINER function works across tenant boundaries
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql as sqlTag } from 'drizzle-orm';
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

// max: 1 ensures set_config and subsequent queries share the same connection so
// RLS session vars are visible to the queries that follow in the same withTenant block.
const sql = postgres(TEST_DB_URL, { max: 1 });
const db = drizzle(sql, { schema });

// UUIDs of rows we create so we can clean up in afterAll
const createdTenantIds: string[] = [];

// Helper: run fn as app_user inside a transaction so RLS is enforced.
// neondb_owner has rolbypassrls=true and never sees RLS filters; app_user does not.
// Using SET LOCAL ROLE scopes the role switch to the transaction only.
// set_config with true (local) scopes the tenant setting to the transaction too.
type TxDb = PostgresJsDatabase<typeof schema>;
async function withTenant(tenantId: string, fn: (tx: TxDb) => Promise<void>) {
  await db.transaction(async (tx) => {
    await tx.execute(sqlTag`SET LOCAL ROLE app_user`);
    await tx.execute(sqlTag`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    await fn(tx);
  });
}

// Helper: reset RLS context (for superuser queries that bypass RLS)
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

beforeAll(async () => {
  await resetTenantCtx();

  // Create two isolated tenants (superuser — bypasses RLS on tenant table)
  const [tenA] = await db
    .insert(schema.tenant)
    .values({ slug: `test-tenant-a-${Date.now()}`, name: 'Test Tenant A' })
    .returning();
  const [tenB] = await db
    .insert(schema.tenant)
    .values({ slug: `test-tenant-b-${Date.now()}`, name: 'Test Tenant B' })
    .returning();

  if (!tenA || !tenB) throw new Error('Failed to create test tenants');

  tenantAId = tenA.id;
  tenantBId = tenB.id;
  createdTenantIds.push(tenantAId, tenantBId);

  // Create one user per tenant using SET LOCAL so RLS check passes on insert
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [uA] = await db
    .insert(schema.user)
    .values({ tenantId: tenantAId, email: 'alice@tenanta.test', fullName: 'Alice A' })
    .returning();
  if (!uA) throw new Error('Failed to create user A');
  userAId = uA.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [uB] = await db
    .insert(schema.user)
    .values({ tenantId: tenantBId, email: 'bob@tenantb.test', fullName: 'Bob B' })
    .returning();
  if (!uB) throw new Error('Failed to create user B');
  userBId = uB.id;

  await resetTenantCtx();
});

afterAll(async () => {
  // Clean up in dependency order (superuser bypass)
  await resetTenantCtx();
  for (const tid of createdTenantIds) {
    await db.delete(schema.userRole).where(eq(schema.userRole.tenantId, tid));
    await db.delete(schema.role).where(eq(schema.role.tenantId, tid));
    await db.delete(schema.featureFlag).where(eq(schema.featureFlag.tenantId, tid));
    await db.delete(schema.apiKey).where(eq(schema.apiKey.tenantId, tid));
    await db.delete(schema.webhook).where(eq(schema.webhook.tenantId, tid));
    await db.delete(schema.tenantDomain).where(eq(schema.tenantDomain.tenantId, tid));
    await db.delete(schema.branch).where(eq(schema.branch.tenantId, tid));
    // audit_log.user_id FK must be cleared before user rows are deleted
    await db.delete(schema.auditLog).where(eq(schema.auditLog.tenantId, tid));
    await db.delete(schema.user).where(eq(schema.user.tenantId, tid));
    await db.delete(schema.tenant).where(eq(schema.tenant.id, tid));
  }
  await sql.end();
});

// ---------------------------------------------------------------------------
// 1. RLS isolation
// ---------------------------------------------------------------------------
describe('RLS isolation', () => {
  it('tenant A sees only its own users', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.user);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === userAId)).toBe(true);
      expect(rows.some((r) => r.id === userBId)).toBe(false);
    });
  });

  it('tenant B sees only its own users', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.user);
      expect(rows.every((r) => r.tenantId === tenantBId)).toBe(true);
      expect(rows.some((r) => r.id === userBId)).toBe(true);
      expect(rows.some((r) => r.id === userAId)).toBe(false);
    });
  });

  it('tenant A cannot insert a user belonging to tenant B', async () => {
    // The INSERT aborts the transaction; expect the whole transaction to reject
    // (consuming the error inside withTenant and then catching the commit error
    //  would leak the aborted-transaction state, so we test at the tx boundary).
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sqlTag`SET LOCAL ROLE app_user`);
        await tx.execute(sqlTag`SELECT set_config('app.tenant_id', ${tenantAId}, true)`);
        await tx.insert(schema.user).values({ tenantId: tenantBId, email: 'evil@cross.test' });
      })
    ).rejects.toThrow();
  });

  it('tenant A role rows are invisible to tenant B', async () => {
    // Insert a role as tenant A
    await withTenant(tenantAId, async (tx) => {
      await tx.insert(schema.role).values({
        tenantId: tenantAId,
        name: 'RLS Test Role',
        slug: `rls-test-${Date.now()}`,
        createdBy: userAId,
        updatedBy: userAId,
      });
    });

    // Tenant B should not see it
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.role);
      expect(rows.every((r) => r.tenantId === tenantBId)).toBe(true);
    });
  });

  it('feature_flag RLS: tenant A cannot read tenant B flags', async () => {
    // Create a flag for tenant B
    await withTenant(tenantBId, async (tx) => {
      await tx.insert(schema.featureFlag).values({
        tenantId: tenantBId,
        key: `secret-flag-${Date.now()}`,
        enabled: true,
        createdBy: userBId,
        updatedBy: userBId,
      });
    });

    // Tenant A should see zero flags (none created for A yet)
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.featureFlag);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Universal columns present
// ---------------------------------------------------------------------------
describe('universal columns', () => {
  it('user row has all universal columns with correct defaults', async () => {
    await resetTenantCtx();
    const [row] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, userAId))
      .limit(1);

    expect(row).toBeDefined();
    expect(row!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(row!.tenantId).toBe(tenantAId);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
    expect(row!.deletedAt).toBeNull();
    expect(row!.version).toBe(1);
  });

  it('branch row has all universal columns', async () => {
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    const [branch] = await db
      .insert(schema.branch)
      .values({
        tenantId: tenantAId,
        name: 'Test Branch',
        slug: `test-branch-${Date.now()}`,
        createdBy: userAId,
        updatedBy: userAId,
      })
      .returning();
    await resetTenantCtx();

    expect(branch).toBeDefined();
    expect(branch!.id).toBeTruthy();
    expect(branch!.tenantId).toBe(tenantAId);
    expect(branch!.createdAt).toBeInstanceOf(Date);
    expect(branch!.updatedAt).toBeInstanceOf(Date);
    expect(branch!.deletedAt).toBeNull();
    expect(branch!.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. updated_at trigger
// ---------------------------------------------------------------------------
describe('updated_at trigger', () => {
  it('bumps updated_at on user UPDATE', async () => {
    await resetTenantCtx();
    const before = await db
      .select({ updatedAt: schema.user.updatedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userAId))
      .limit(1);

    // Small delay to ensure clock advances
    await new Promise((r) => setTimeout(r, 20));

    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await db
      .update(schema.user)
      .set({ fullName: 'Alice Updated' })
      .where(and(eq(schema.user.id, userAId), eq(schema.user.tenantId, tenantAId)));
    await resetTenantCtx();

    const after = await db
      .select({ updatedAt: schema.user.updatedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userAId))
      .limit(1);

    expect(after[0]!.updatedAt.getTime()).toBeGreaterThan(
      before[0]!.updatedAt.getTime()
    );
  });
});

// ---------------------------------------------------------------------------
// 4. version bump on UPDATE
// ---------------------------------------------------------------------------
describe('optimistic concurrency (version)', () => {
  it('version increments on each UPDATE', async () => {
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    const [created] = await db
      .insert(schema.role)
      .values({
        tenantId: tenantAId,
        name: 'Version Test Role',
        slug: `version-test-${Date.now()}`,
        createdBy: userAId,
        updatedBy: userAId,
      })
      .returning();
    expect(created!.version).toBe(1);

    await db
      .update(schema.role)
      .set({ name: 'Version Test Role v2' })
      .where(eq(schema.role.id, created!.id));

    const [after1] = await db
      .select({ version: schema.role.version })
      .from(schema.role)
      .where(eq(schema.role.id, created!.id));
    expect(after1!.version).toBe(2);

    await db
      .update(schema.role)
      .set({ name: 'Version Test Role v3' })
      .where(eq(schema.role.id, created!.id));

    const [after2] = await db
      .select({ version: schema.role.version })
      .from(schema.role)
      .where(eq(schema.role.id, created!.id));
    expect(after2!.version).toBe(3);

    await resetTenantCtx();
  });
});

// ---------------------------------------------------------------------------
// 5. FK constraints
// ---------------------------------------------------------------------------
describe('FK constraints', () => {
  it('rejects user insert with non-existent tenant_id', async () => {
    await resetTenantCtx();
    const fakeTenantId = '00000000-0000-0000-0000-000000000001';
    await expect(
      db.insert(schema.user).values({
        tenantId: fakeTenantId,
        email: 'orphan@test.test',
      })
    ).rejects.toThrow();
  });

  it('rejects role insert with non-existent tenant_id', async () => {
    await resetTenantCtx();
    const fakeTenantId = '00000000-0000-0000-0000-000000000002';
    await expect(
      db.insert(schema.role).values({
        tenantId: fakeTenantId,
        name: 'Orphan Role',
        slug: 'orphan-role',
      })
    ).rejects.toThrow();
  });

  it('rejects user_role insert with non-existent role_id', async () => {
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    const fakeRoleId = '00000000-0000-0000-0000-000000000003';
    await expect(
      db.insert(schema.userRole).values({
        tenantId: tenantAId,
        userId: userAId,
        roleId: fakeRoleId,
      })
    ).rejects.toThrow();
    await resetTenantCtx();
  });
});

// ---------------------------------------------------------------------------
// 6. Unique constraints
// ---------------------------------------------------------------------------
describe('unique constraints', () => {
  it('rejects duplicate (tenant_id, email) on user', async () => {
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await expect(
      db.insert(schema.user).values({
        tenantId: tenantAId,
        email: 'alice@tenanta.test', // already seeded in beforeAll
      })
    ).rejects.toThrow();
    await resetTenantCtx();
  });

  it('allows same email across different tenants', async () => {
    const sharedEmail = `shared-${Date.now()}@example.test`;

    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await db
      .insert(schema.user)
      .values({ tenantId: tenantAId, email: sharedEmail })
      .returning();

    await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
    const [uB] = await db
      .insert(schema.user)
      .values({ tenantId: tenantBId, email: sharedEmail })
      .returning();
    expect(uB).toBeDefined();

    await resetTenantCtx();
  });

  it('rejects duplicate feature_flag key within same tenant', async () => {
    const key = `dup-flag-${Date.now()}`;
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await db.insert(schema.featureFlag).values({
      tenantId: tenantAId,
      key,
      createdBy: userAId,
      updatedBy: userAId,
    });
    await expect(
      db.insert(schema.featureFlag).values({
        tenantId: tenantAId,
        key,
        createdBy: userAId,
        updatedBy: userAId,
      })
    ).rejects.toThrow();
    await resetTenantCtx();
  });
});

// ---------------------------------------------------------------------------
// 7. write_audit_log SECURITY DEFINER function
// ---------------------------------------------------------------------------
describe('write_audit_log', () => {
  it('inserts an audit row and returns its id', async () => {
    await resetTenantCtx();
    const [result] = await sql<[{ write_audit_log: string }]>`
      SELECT write_audit_log(
        ${tenantAId}::uuid,
        ${userAId}::uuid,
        'user',
        ${userAId}::uuid,
        'update',
        '{"full_name": "Alice Updated"}'::jsonb,
        NULL, NULL, 'test-req-001'
      )
    `;
    const auditId = result?.write_audit_log;
    expect(Number(auditId)).toBeGreaterThan(0);

    // Verify the row is readable when tenant context is set
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.tenantId, tenantAId));
    expect(rows.some((r) => r.requestId === 'test-req-001')).toBe(true);
    await resetTenantCtx();
  });
});
