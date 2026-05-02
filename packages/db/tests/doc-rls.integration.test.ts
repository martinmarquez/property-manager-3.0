/**
 * Integration tests — doc_* table RLS isolation + doc_document signed-row immutability
 *
 * Covers RENA-71 acceptance criteria:
 *  1. All 6 doc tables enforce tenant_isolation RLS (cross-tenant returns 0 rows)
 *  2. doc_audit_trail is append-only — UPDATE/DELETE are silently blocked by RLS
 *  3. doc_document signed rows are immutable — UPDATE/DELETE raise restrict_violation
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

// max: 1 — RLS session vars must be visible in the same connection.
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
let templateAId: string;
let templateBId: string;
let docAId: string;
let docBId: string;
let clauseAId: string;
let clauseBId: string;
let sigReqAId: string;
let signerAId: string;
let auditAId: string;
let signedDocAId: string;

beforeAll(async () => {
  await resetTenantCtx();

  // Tenants
  const [tenA] = await db
    .insert(schema.tenant)
    .values({ slug: `doc-rls-tenant-a-${Date.now()}`, name: 'Doc RLS Tenant A' })
    .returning();
  const [tenB] = await db
    .insert(schema.tenant)
    .values({ slug: `doc-rls-tenant-b-${Date.now()}`, name: 'Doc RLS Tenant B' })
    .returning();
  if (!tenA || !tenB) throw new Error('Failed to create test tenants');
  tenantAId = tenA.id;
  tenantBId = tenB.id;
  createdTenantIds.push(tenantAId, tenantBId);

  // Users (superuser insert with tenant context so RLS WITH CHECK passes)
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [uA] = await db
    .insert(schema.user)
    .values({ tenantId: tenantAId, email: `doc-alice-${Date.now()}@tenanta.test`, fullName: 'Alice Doc' })
    .returning();
  if (!uA) throw new Error('Failed to create user A');
  userAId = uA.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  await db
    .insert(schema.user)
    .values({ tenantId: tenantBId, email: `doc-bob-${Date.now()}@tenantb.test`, fullName: 'Bob Doc' });

  await resetTenantCtx();

  // Templates (one per tenant — superuser bypass)
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [tmplA] = await db
    .insert(schema.docTemplate)
    .values({
      tenantId: tenantAId,
      slug: `tmpl-a-${Date.now()}`,
      name: 'Template A',
      kind: 'reserva',
      createdBy: userAId,
      updatedBy: userAId,
    })
    .returning();
  if (!tmplA) throw new Error('Failed to create template A');
  templateAId = tmplA.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [tmplB] = await db
    .insert(schema.docTemplate)
    .values({
      tenantId: tenantBId,
      slug: `tmpl-b-${Date.now()}`,
      name: 'Template B',
      kind: 'boleto',
    })
    .returning();
  if (!tmplB) throw new Error('Failed to create template B');
  templateBId = tmplB.id;

  await resetTenantCtx();

  // Documents (one per tenant)
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [dA] = await db
    .insert(schema.docDocument)
    .values({ tenantId: tenantAId, templateId: templateAId, createdBy: userAId })
    .returning();
  if (!dA) throw new Error('Failed to create doc A');
  docAId = dA.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [dB] = await db
    .insert(schema.docDocument)
    .values({ tenantId: tenantBId, templateId: templateBId })
    .returning();
  if (!dB) throw new Error('Failed to create doc B');
  docBId = dB.id;

  // Signed document for immutability tests (status inserted directly as 'signed')
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [signedDoc] = await db
    .insert(schema.docDocument)
    .values({
      tenantId: tenantAId,
      templateId: templateAId,
      status: 'signed',
      signedAt: new Date(),
      createdBy: userAId,
    })
    .returning();
  if (!signedDoc) throw new Error('Failed to create signed doc');
  signedDocAId = signedDoc.id;

  await resetTenantCtx();

  // Clauses (one per tenant)
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [clA] = await db
    .insert(schema.docClause)
    .values({
      tenantId: tenantAId,
      name: 'Clause A',
      slug: `clause-a-${Date.now()}`,
      jurisdiction: 'AR-BA',
      bodyHtml: '<p>Clause A body</p>',
      createdBy: userAId,
      updatedBy: userAId,
    })
    .returning();
  if (!clA) throw new Error('Failed to create clause A');
  clauseAId = clA.id;

  await sql`SELECT set_config('app.tenant_id', ${tenantBId}, false)`;
  const [clB] = await db
    .insert(schema.docClause)
    .values({
      tenantId: tenantBId,
      name: 'Clause B',
      slug: `clause-b-${Date.now()}`,
      jurisdiction: 'AR-CB',
      bodyHtml: '<p>Clause B body</p>',
    })
    .returning();
  if (!clB) throw new Error('Failed to create clause B');
  clauseBId = clB.id;

  await resetTenantCtx();

  // Signature request for doc A
  await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
  const [srA] = await db
    .insert(schema.docSignatureRequest)
    .values({
      tenantId: tenantAId,
      docDocumentId: docAId,
      provider: 'signaturit',
      externalId: `ext-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: userAId,
    })
    .returning();
  if (!srA) throw new Error('Failed to create sig request A');
  sigReqAId = srA.id;

  // Signer for doc A
  const [snrA] = await db
    .insert(schema.docSigner)
    .values({
      tenantId: tenantAId,
      docDocumentId: docAId,
      signatureRequestId: sigReqAId,
      name: 'Alice Signer',
      email: `signer-${Date.now()}@tenanta.test`,
    })
    .returning();
  if (!snrA) throw new Error('Failed to create signer A');
  signerAId = snrA.id;

  // Audit trail row for doc A
  const [atA] = await db
    .insert(schema.docAuditTrail)
    .values({
      tenantId: tenantAId,
      docDocumentId: docAId,
      signatureRequestId: sigReqAId,
      signerId: signerAId,
      eventType: 'document_signed',
    })
    .returning();
  if (!atA) throw new Error('Failed to create audit trail row A');
  auditAId = atA.id;

  await resetTenantCtx();
});

afterAll(async () => {
  await resetTenantCtx();
  // Disable the signed-immutability trigger so test rows (including signed docs) can be cleaned up.
  // Only the superuser role can ALTER TABLE; this is safe in test teardown only.
  await sql`ALTER TABLE doc_document DISABLE TRIGGER block_signed_mutation`;
  try {
    for (const tid of createdTenantIds) {
      // Dependency order: audit trail → signer → sig request → document → clause → template → user → tenant
      await db.delete(schema.docAuditTrail).where(eq(schema.docAuditTrail.tenantId, tid));
      await db.delete(schema.docSigner).where(eq(schema.docSigner.tenantId, tid));
      await db.delete(schema.docSignatureRequest).where(eq(schema.docSignatureRequest.tenantId, tid));
      await db.delete(schema.docDocument).where(eq(schema.docDocument.tenantId, tid));
      await db.delete(schema.docClause).where(eq(schema.docClause.tenantId, tid));
      await db.delete(schema.docTemplateRevision).where(eq(schema.docTemplateRevision.tenantId, tid));
      await db.delete(schema.docTemplate).where(eq(schema.docTemplate.tenantId, tid));
      await db.delete(schema.user).where(eq(schema.user.tenantId, tid));
      await db.delete(schema.tenant).where(eq(schema.tenant.id, tid));
    }
  } finally {
    await sql`ALTER TABLE doc_document ENABLE TRIGGER block_signed_mutation`;
    await sql.end();
  }
});

// ---------------------------------------------------------------------------
// 1. doc_template RLS
// ---------------------------------------------------------------------------
describe('doc_template RLS isolation', () => {
  it('tenant A sees only its own templates', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docTemplate);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === templateAId)).toBe(true);
      expect(rows.some((r) => r.id === templateBId)).toBe(false);
    });
  });

  it('tenant B sees only its own templates', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docTemplate);
      expect(rows.every((r) => r.tenantId === tenantBId)).toBe(true);
      expect(rows.some((r) => r.id === templateBId)).toBe(true);
      expect(rows.some((r) => r.id === templateAId)).toBe(false);
    });
  });

  it('cross-tenant INSERT into doc_template is rejected', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sqlTag`SET LOCAL ROLE app_user`);
        await tx.execute(sqlTag`SELECT set_config('app.tenant_id', ${tenantAId}, true)`);
        await tx.insert(schema.docTemplate).values({
          tenantId: tenantBId,
          slug: `cross-tenant-evil-${Date.now()}`,
          name: 'Evil Template',
          kind: 'custom',
        });
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. doc_document RLS
// ---------------------------------------------------------------------------
describe('doc_document RLS isolation', () => {
  it('tenant A sees only its own documents', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docDocument);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === docAId)).toBe(true);
      expect(rows.some((r) => r.id === docBId)).toBe(false);
    });
  });

  it('tenant B sees only its own documents', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docDocument);
      expect(rows.every((r) => r.tenantId === tenantBId)).toBe(true);
      expect(rows.some((r) => r.id === docBId)).toBe(true);
      expect(rows.some((r) => r.id === docAId)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. doc_clause RLS
// ---------------------------------------------------------------------------
describe('doc_clause RLS isolation', () => {
  it('tenant A sees only its own clauses', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docClause);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === clauseAId)).toBe(true);
      expect(rows.some((r) => r.id === clauseBId)).toBe(false);
    });
  });

  it('tenant B sees only its own clauses', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docClause);
      expect(rows.every((r) => r.tenantId === tenantBId)).toBe(true);
      expect(rows.some((r) => r.id === clauseBId)).toBe(true);
      expect(rows.some((r) => r.id === clauseAId)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. doc_signature_request RLS
// ---------------------------------------------------------------------------
describe('doc_signature_request RLS isolation', () => {
  it('tenant A sees its own signature request', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docSignatureRequest);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === sigReqAId)).toBe(true);
    });
  });

  it('tenant B sees zero signature requests (none created for it)', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docSignatureRequest);
      expect(rows).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. doc_signer RLS
// ---------------------------------------------------------------------------
describe('doc_signer RLS isolation', () => {
  it('tenant A sees its own signer', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docSigner);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === signerAId)).toBe(true);
    });
  });

  it('tenant B sees zero signers', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docSigner);
      expect(rows).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 6. doc_audit_trail RLS + append-only enforcement
// ---------------------------------------------------------------------------
describe('doc_audit_trail RLS isolation', () => {
  it('tenant A sees its own audit trail row', async () => {
    await withTenant(tenantAId, async (tx) => {
      const rows = await tx.select().from(schema.docAuditTrail);
      expect(rows.every((r) => r.tenantId === tenantAId)).toBe(true);
      expect(rows.some((r) => r.id === auditAId)).toBe(true);
    });
  });

  it('tenant B sees zero audit trail rows', async () => {
    await withTenant(tenantBId, async (tx) => {
      const rows = await tx.select().from(schema.docAuditTrail);
      expect(rows).toHaveLength(0);
    });
  });

  it('tenant A can INSERT into doc_audit_trail', async () => {
    await withTenant(tenantAId, async (tx) => {
      const [inserted] = await tx
        .insert(schema.docAuditTrail)
        .values({
          tenantId: tenantAId,
          docDocumentId: docAId,
          eventType: 'document_viewed',
        })
        .returning();
      expect(inserted).toBeDefined();
      expect(inserted!.eventType).toBe('document_viewed');
    });
  });

  it('UPDATE on doc_audit_trail is silently blocked (no rows updated)', async () => {
    await withTenant(tenantAId, async (tx) => {
      // No UPDATE policy exists — 0 rows visible for update, no error thrown
      await tx.execute(
        sqlTag`UPDATE doc_audit_trail SET event_type = 'tampered' WHERE id = ${auditAId}::uuid`
      );
    });
    // Verify the row was not mutated (read as superuser)
    await resetTenantCtx();
    const [row] = await db
      .select()
      .from(schema.docAuditTrail)
      .where(eq(schema.docAuditTrail.id, auditAId));
    expect(row?.eventType).toBe('document_signed');
  });

  it('DELETE on doc_audit_trail is silently blocked (row still exists)', async () => {
    await withTenant(tenantAId, async (tx) => {
      // No DELETE policy exists — 0 rows visible for delete, no error thrown
      await tx.execute(
        sqlTag`DELETE FROM doc_audit_trail WHERE id = ${auditAId}::uuid`
      );
    });
    // Verify the row still exists (read as superuser)
    await resetTenantCtx();
    const [row] = await db
      .select()
      .from(schema.docAuditTrail)
      .where(eq(schema.docAuditTrail.id, auditAId));
    expect(row).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. doc_document signed-row immutability (RENA-71 trigger)
// ---------------------------------------------------------------------------
describe('doc_document signed-row immutability', () => {
  it('allows UPDATE on a draft document', async () => {
    await resetTenantCtx();
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await expect(
      db
        .update(schema.docDocument)
        .set({ fileUrl: 'https://storage.example/draft.pdf' })
        .where(eq(schema.docDocument.id, docAId))
    ).resolves.not.toThrow();
    await resetTenantCtx();
  });

  it('rejects UPDATE on a signed document (restrict_violation)', async () => {
    await resetTenantCtx();
    await sql`SELECT set_config('app.tenant_id', ${tenantAId}, false)`;
    await expect(
      db
        .update(schema.docDocument)
        .set({ fileUrl: 'https://attacker.example/evil.pdf' })
        .where(eq(schema.docDocument.id, signedDocAId))
    ).rejects.toThrow();
    await resetTenantCtx();
  });

  it('rejects DELETE on a signed document (restrict_violation)', async () => {
    await resetTenantCtx();
    await expect(
      db.delete(schema.docDocument).where(eq(schema.docDocument.id, signedDocAId))
    ).rejects.toThrow();
    await resetTenantCtx();
  });

  it('signed document is still intact after rejected mutations', async () => {
    await resetTenantCtx();
    const [row] = await db
      .select()
      .from(schema.docDocument)
      .where(eq(schema.docDocument.id, signedDocAId));
    expect(row).toBeDefined();
    expect(row!.status).toBe('signed');
    expect(row!.fileUrl).toBeNull();
  });
});
