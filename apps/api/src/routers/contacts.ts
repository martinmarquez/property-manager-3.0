/**
 * Contacts router — Phase B (RENA-31)
 *
 * Procedures (all under contacts.*):
 *
 *  contacts.list              Paginated, searchable, filterable contact list
 *  contacts.get               Single contact with tags
 *  contacts.create            Create person or company contact
 *  contacts.update            Update contact fields + tag set
 *  contacts.delete            Soft-delete contact
 *  contacts.restore           Restore soft-deleted contact
 *  contacts.checkDuplicates   Pre-save duplicate detection (email+phone+DNI)
 *  contacts.merge             Merge two contacts with field-level winner selection
 *
 *  contacts.relationships.kinds   List relationship kind vocabulary
 *  contacts.relationships.list    Relationships for a contact
 *  contacts.relationships.create  Create typed bidirectional relationship
 *  contacts.relationships.delete  Soft-delete relationship (both directions)
 *
 *  contacts.segments.list     All segments for tenant
 *  contacts.segments.get      Single segment
 *  contacts.segments.preview  Live contact count for given criteria
 *  contacts.segments.create   Create segment
 *  contacts.segments.update   Update segment name/description/criteria
 *  contacts.segments.delete   Soft-delete segment
 *
 *  contacts.duplicates.list   Suspected duplicate pairs sorted by confidence
 *
 *  contacts.tags.list         All distinct tags in tenant
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  eq, and, or, sql, desc, gte, lte, inArray, isNull, ne,
} from 'drizzle-orm';
import {
  contact,
  contactRelationship,
  contactRelationshipKind,
  contactTag,
  contactSegment,
  contactSegmentMember,
  contactImportJob,
  contactImportRow,
  dsrRequest,
} from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';
import { requirePermission } from '../lib/auth/rbac.js';
import {
  scoreDuplicateFields,
  createQueue,
  QUEUE_NAMES,
  buildAccessBundle,
  buildPortabilityBundle,
  buildDeletePatch,
} from '@corredor/core';

// ---------------------------------------------------------------------------
// Shared input schemas
// ---------------------------------------------------------------------------

const phoneSchema = z.object({
  e164:     z.string().min(7).max(20),
  type:     z.enum(['mobile', 'whatsapp', 'landline', 'office']),
  whatsapp: z.boolean().default(false),
  primary:  z.boolean().default(false),
});

const emailSchema = z.object({
  value:   z.string().email(),
  type:    z.enum(['personal', 'work', 'other']),
  primary: z.boolean().default(false),
});

const addressSchema = z.object({
  street:   z.string().optional(),
  number:   z.string().optional(),
  city:     z.string().optional(),
  province: z.string().optional(),
  zip:      z.string().optional(),
});

const personFields = {
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().min(1).max(100),
  nationalIdType: z.enum(['DNI', 'CUIT', 'CUIL', 'passport']).optional(),
  nationalId:     z.string().max(20).optional(),
  birthDate:      z.string().date().optional(),
  gender:         z.enum(['male', 'female', 'other']).optional(),
};

const companyFields = {
  legalName: z.string().min(1).max(200),
  cuit:      z.string().max(20).optional(),
  industry:  z.string().max(100).optional(),
};

const sharedFields = {
  phones:      z.array(phoneSchema).max(10).default([]),
  emails:      z.array(emailSchema).max(10).default([]),
  addresses:   z.array(addressSchema).max(5).default([]),
  leadScore:   z.number().int().min(0).max(100).default(0),
  source:      z.string().max(100).optional(),
  notes:       z.string().max(5000).optional(),
  ownerUserId: z.string().uuid().optional(),
  tags:        z.array(z.string().min(1).max(50)).max(20).default([]),
};

const contactCreateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('person'), ...personFields, ...sharedFields }),
  z.object({ kind: z.literal('company'), ...companyFields, ...sharedFields }),
]);

const segmentCriterionSchema = z.object({
  field: z.enum([
    'tag', 'lead_score', 'source', 'province', 'locality',
    'created_at', 'last_activity', 'has_open_leads', 'operation_interest',
  ]),
  op:    z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'between', 'is_true', 'is_false']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

// ---------------------------------------------------------------------------
// Helper: display name
// ---------------------------------------------------------------------------
function displayName(c: {
  kind: string;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
}): string {
  if (c.kind === 'company') return c.legalName ?? '(sin nombre)';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)';
}

// ---------------------------------------------------------------------------
// Helper: segment criteria → SQL conditions
// Returns an array compatible with drizzle's `and(...)`.
// ---------------------------------------------------------------------------
function criteriaToConditions(criteria: z.infer<typeof segmentCriterionSchema>[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return criteria.map((c): any => {
    switch (c.field) {
      case 'lead_score':
        if (c.op === 'gte') return gte(contact.leadScore, Number(c.value));
        if (c.op === 'lte') return lte(contact.leadScore, Number(c.value));
        if (c.op === 'gt')  return sql`${contact.leadScore} > ${Number(c.value)}`;
        if (c.op === 'lt')  return sql`${contact.leadScore} < ${Number(c.value)}`;
        break;
      case 'source':
        if (c.op === 'eq')  return eq(contact.source, String(c.value));
        if (c.op === 'neq') return ne(contact.source, String(c.value));
        break;
      case 'tag':
        if (c.op === 'eq') {
          return sql`EXISTS (SELECT 1 FROM contact_tag ct WHERE ct.contact_id = ${contact.id} AND ct.tag = ${String(c.value)})`;
        }
        if (c.op === 'in' && Array.isArray(c.value)) {
          return sql`EXISTS (SELECT 1 FROM contact_tag ct WHERE ct.contact_id = ${contact.id} AND ct.tag = ANY(ARRAY[${sql.join(c.value.map((v: string) => sql`${v}`), sql`, `)}]))`;
        }
        break;
      case 'has_open_leads':
        // Placeholder — Phase C (RENA-34) adds the leads table
        return c.op === 'is_true' ? sql`false` : sql`true`;
      case 'created_at':
        if (c.op === 'gte') return gte(contact.createdAt, new Date(String(c.value)));
        if (c.op === 'lte') return lte(contact.createdAt, new Date(String(c.value)));
        if (c.op === 'gt')  return sql`${contact.createdAt} > ${new Date(String(c.value))}`;
        if (c.op === 'lt')  return sql`${contact.createdAt} < ${new Date(String(c.value))}`;
        break;
      case 'province':
        if (c.op === 'eq')  return sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${contact.addresses}) a WHERE a->>'province' = ${String(c.value)})`;
        if (c.op === 'neq') return sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${contact.addresses}) a WHERE a->>'province' = ${String(c.value)})`;
        break;
      case 'locality':
        if (c.op === 'eq')  return sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${contact.addresses}) a WHERE a->>'city' = ${String(c.value)})`;
        if (c.op === 'neq') return sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${contact.addresses}) a WHERE a->>'city' = ${String(c.value)})`;
        break;
      case 'last_activity':
      case 'operation_interest':
        return sql`false`;
    }
    return sql`false`;
  });
}

// ---------------------------------------------------------------------------
// Relationships sub-router
// ---------------------------------------------------------------------------
const relationshipsRouter = router({
  kinds: protectedProcedure.query(async ({ ctx }) => {
    const { db, tenantId } = ctx;
    return db
      .select({
        id:           contactRelationshipKind.id,
        label:        contactRelationshipKind.label,
        inverseLabel: contactRelationshipKind.inverseLabel,
        builtIn:      contactRelationshipKind.builtIn,
      })
      .from(contactRelationshipKind)
      .where(eq(contactRelationshipKind.tenantId, tenantId))
      .orderBy(contactRelationshipKind.label);
  }),

  list: protectedProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const rows = await db
        .select({
          id:            contactRelationship.id,
          kindId:        contactRelationship.kindId,
          kindLabel:     contactRelationshipKind.label,
          fromContactId: contactRelationship.fromContactId,
          toContactId:   contactRelationship.toContactId,
        })
        .from(contactRelationship)
        .innerJoin(
          contactRelationshipKind,
          eq(contactRelationship.kindId, contactRelationshipKind.id),
        )
        .where(and(
          eq(contactRelationship.tenantId, tenantId),
          or(
            eq(contactRelationship.fromContactId, input.contactId),
            eq(contactRelationship.toContactId, input.contactId),
          ),
          isNull(contactRelationship.deletedAt),
        ));

      const otherIds = [...new Set(
        rows.map((r) =>
          r.fromContactId === input.contactId ? r.toContactId : r.fromContactId
        )
      )];

      let peers: { id: string; firstName: string | null; lastName: string | null; legalName: string | null; kind: string }[] = [];
      if (otherIds.length) {
        peers = await db
          .select({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            legalName: contact.legalName,
            kind: contact.kind,
          })
          .from(contact)
          .where(inArray(contact.id, otherIds));
      }

      const peerMap = new Map(peers.map((p) => [p.id, p]));

      return rows.map((r) => {
        const otherId = r.fromContactId === input.contactId ? r.toContactId : r.fromContactId;
        const peer = peerMap.get(otherId);
        return {
          id:          r.id,
          kindId:      r.kindId,
          kindLabel:   r.kindLabel,
          contactId:   otherId,
          contactName: peer ? displayName(peer) : '?',
          direction:   r.fromContactId === input.contactId ? 'from' as const : 'to' as const,
        };
      });
    }),

  create: protectedProcedure
    .input(z.object({
      fromContactId: z.string().uuid(),
      toContactId:   z.string().uuid(),
      kindId:        z.string().uuid(),
      notes:         z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;

      if (input.fromContactId === input.toContactId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A contact cannot be related to itself' });
      }

      const [forward] = await db.insert(contactRelationship).values({
        tenantId,
        fromContactId: input.fromContactId,
        toContactId:   input.toContactId,
        kindId:        input.kindId,
        notes:         input.notes,
        createdBy:     userId,
      }).returning({ id: contactRelationship.id });

      // Create inverse direction (onConflict = no-op if already exists)
      await db.insert(contactRelationship).values({
        tenantId,
        fromContactId: input.toContactId,
        toContactId:   input.fromContactId,
        kindId:        input.kindId,
        notes:         input.notes,
        createdBy:     userId,
      }).onConflictDoNothing();

      return { id: forward!.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const rel = await db.query.contactRelationship.findFirst({
        where: and(
          eq(contactRelationship.id, input.id),
          eq(contactRelationship.tenantId, tenantId),
        ),
      });
      if (!rel) throw new TRPCError({ code: 'NOT_FOUND' });

      const now = new Date();
      // Soft-delete both the forward and inverse row
      await db
        .update(contactRelationship)
        .set({ deletedAt: now })
        .where(and(
          eq(contactRelationship.tenantId, tenantId),
          or(
            eq(contactRelationship.id, input.id),
            and(
              eq(contactRelationship.fromContactId, rel.toContactId),
              eq(contactRelationship.toContactId, rel.fromContactId),
              eq(contactRelationship.kindId, rel.kindId),
            ),
          ),
        ));

      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Segments sub-router
// ---------------------------------------------------------------------------
const segmentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, tenantId } = ctx;
    return db
      .select()
      .from(contactSegment)
      .where(and(eq(contactSegment.tenantId, tenantId), isNull(contactSegment.deletedAt)))
      .orderBy(desc(contactSegment.updatedAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      const seg = await db.query.contactSegment.findFirst({
        where: and(
          eq(contactSegment.id, input.id),
          eq(contactSegment.tenantId, tenantId),
          isNull(contactSegment.deletedAt),
        ),
      });
      if (!seg) throw new TRPCError({ code: 'NOT_FOUND' });
      return seg;
    }),

  preview: protectedProcedure
    .input(z.object({ criteria: z.array(segmentCriterionSchema) }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      const conditions = [
        eq(contact.tenantId, tenantId),
        isNull(contact.deletedAt),
        ...criteriaToConditions(input.criteria),
      ];
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contact)
        .where(and(...conditions));
      return { count: result?.count ?? 0 };
    }),

  create: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      criteria:    z.array(segmentCriterionSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      const [seg] = await db.insert(contactSegment).values({
        tenantId,
        name:        input.name,
        description: input.description,
        criteria:    input.criteria,
        createdBy:   userId,
        updatedBy:   userId,
      }).returning();
      return seg!;
    }),

  update: protectedProcedure
    .input(z.object({
      id:          z.string().uuid(),
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      criteria:    z.array(segmentCriterionSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db
        .update(contactSegment)
        .set({ ...filtered, updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(contactSegment.id, id), eq(contactSegment.tenantId, tenantId)));
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      await db
        .update(contactSegment)
        .set({ deletedAt: new Date() })
        .where(and(eq(contactSegment.id, input.id), eq(contactSegment.tenantId, tenantId)));
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Tags sub-router
// ---------------------------------------------------------------------------
const tagsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, tenantId } = ctx;
    const rows = await db
      .selectDistinct({ tag: contactTag.tag })
      .from(contactTag)
      .innerJoin(contact, and(eq(contactTag.contactId, contact.id), isNull(contact.deletedAt)))
      .where(eq(contactTag.tenantId, tenantId))
      .orderBy(contactTag.tag);
    return rows.map((r: { tag: string }) => r.tag);
  }),
});

// ---------------------------------------------------------------------------
// Duplicates sub-router
// ---------------------------------------------------------------------------
const duplicatesRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit:  z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      // Uses pg_trgm similarity() and email JSONB overlap to find duplicate pairs.
      // threshold > 0.4 on name trigram OR any email in common.
      const rows = await db.execute(sql`
        SELECT
          a.id              AS a_id,
          b.id              AS b_id,
          a.kind            AS a_kind,
          a.first_name      AS a_first_name,
          a.last_name       AS a_last_name,
          a.legal_name      AS a_legal_name,
          a.emails          AS a_emails,
          a.phones          AS a_phones,
          a.national_id     AS a_national_id,
          b.kind            AS b_kind,
          b.first_name      AS b_first_name,
          b.last_name       AS b_last_name,
          b.legal_name      AS b_legal_name,
          b.emails          AS b_emails,
          b.phones          AS b_phones,
          b.national_id     AS b_national_id,
          similarity(
            coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'') || ' ' || coalesce(a.legal_name,''),
            coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'') || ' ' || coalesce(b.legal_name,'')
          ) AS name_sim
        FROM contact a
        JOIN contact b
          ON b.tenant_id = a.tenant_id
         AND b.id > a.id
         AND b.deleted_at IS NULL
        WHERE a.tenant_id = ${tenantId}::uuid
          AND a.deleted_at IS NULL
          AND (
            similarity(
              coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'') || ' ' || coalesce(a.legal_name,''),
              coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'') || ' ' || coalesce(b.legal_name,'')
            ) > 0.4
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(a.emails) ae
              JOIN jsonb_array_elements(b.emails) be
                ON lower(ae->>'value') = lower(be->>'value')
            )
            OR (a.national_id IS NOT NULL AND a.national_id = b.national_id)
          )
        ORDER BY name_sim DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      // Re-score in JS for display (consistent with checkDuplicates)
      const rowsArray: Record<string, unknown>[] = Array.isArray(rows) ? rows as Record<string, unknown>[] : ((rows as { rows?: Record<string, unknown>[] }).rows ?? []);
      return rowsArray.map((r: Record<string, unknown>) => {
        const row = r as Record<string, unknown>;
        const aEmails = (row.a_emails as Array<{ value: string }>).map((e) => e.value);
        const bEmails = (row.b_emails as Array<{ value: string }>).map((e) => e.value);
        const aPhones = (row.a_phones as Array<{ e164: string }>).map((p) => p.e164);
        const bPhones = (row.b_phones as Array<{ e164: string }>).map((p) => p.e164);

        const score = scoreDuplicateFields(
          { firstName: row.a_first_name as string | null, lastName: row.a_last_name as string | null, emails: aEmails, phones: aPhones, nationalId: row.a_national_id as string | null },
          { firstName: row.b_first_name as string | null, lastName: row.b_last_name as string | null, emails: bEmails, phones: bPhones, nationalId: row.b_national_id as string | null },
        );

        return {
          aId:    row.a_id as string,
          bId:    row.b_id as string,
          aName:  displayName({ kind: row.a_kind as string, firstName: row.a_first_name as string | null, lastName: row.a_last_name as string | null, legalName: row.a_legal_name as string | null }),
          bName:  displayName({ kind: row.b_kind as string, firstName: row.b_first_name as string | null, lastName: row.b_last_name as string | null, legalName: row.b_legal_name as string | null }),
          aEmails,
          bEmails,
          score,
        };
      });
    }),
});

// ---------------------------------------------------------------------------
// Import sub-router (RENA-32)
// ---------------------------------------------------------------------------
const importRouter = router({
  start: protectedProcedure
    .input(z.object({
      originalFilename: z.string().min(1).max(500),
      columnMapping:    z.record(z.string(), z.string()).default({}),
      csvBase64:        z.string().max(70_000_000).optional(),
      csvStorageKey:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId, redis } = ctx as AuthenticatedContext;

      const [job] = await db
        .insert(contactImportJob)
        .values({
          tenantId,
          createdBy: userId,
          status: 'pending',
          originalFilename: input.originalFilename,
          columnMapping: input.columnMapping,
        })
        .returning({ id: contactImportJob.id });

      if (!job) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create import job' });
      }

      const queue = createQueue(QUEUE_NAMES.IMPORT_CSV, redis);
      await queue.add('import-contacts-csv', {
        importJobId: job.id,
        tenantId,
        userId,
        csvBase64: input.csvBase64,
        csvStorageKey: input.csvStorageKey,
        columnMapping: input.columnMapping,
        entity: 'contact',
      });
      await queue.close();

      return { importJobId: job.id };
    }),

  get: protectedProcedure
    .input(z.object({ importJobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const job = await db.query.contactImportJob.findFirst({
        where: and(
          eq(contactImportJob.id, input.importJobId),
          eq(contactImportJob.tenantId, tenantId),
        ),
      });
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      return job;
    }),

  rows: protectedProcedure
    .input(z.object({
      importJobId: z.string().uuid(),
      status:      z.enum(['imported', 'skipped', 'failed']).optional(),
      limit:       z.number().int().min(1).max(200).default(50),
      offset:      z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const conditions = [
        eq(contactImportRow.importJobId, input.importJobId),
        eq(contactImportRow.tenantId, tenantId),
      ];
      if (input.status) {
        conditions.push(eq(contactImportRow.rowStatus, input.status));
      }

      const rows = await db
        .select()
        .from(contactImportRow)
        .where(and(...conditions))
        .orderBy(contactImportRow.rowNumber)
        .limit(input.limit)
        .offset(input.offset);

      return { items: rows };
    }),
});

// ---------------------------------------------------------------------------
// DSR sub-router — Data Subject Requests (Ley 25.326) (RENA-32)
// ---------------------------------------------------------------------------
const dsrRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'disputed']).optional(),
      limit:  z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const conditions = [eq(dsrRequest.tenantId, tenantId)];
      if (input.status) conditions.push(eq(dsrRequest.status, input.status));

      const rows = await db
        .select({
          id:          dsrRequest.id,
          contactId:   dsrRequest.contactId,
          type:        dsrRequest.type,
          status:      dsrRequest.status,
          deadlineAt:  dsrRequest.deadlineAt,
          completedAt: dsrRequest.completedAt,
          disputedAt:  dsrRequest.disputedAt,
          createdAt:   dsrRequest.createdAt,
        })
        .from(dsrRequest)
        .where(and(...conditions))
        .orderBy(desc(dsrRequest.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items: rows };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      const dsr = await db.query.dsrRequest.findFirst({
        where: and(eq(dsrRequest.id, input.id), eq(dsrRequest.tenantId, tenantId)),
      });
      if (!dsr) throw new TRPCError({ code: 'NOT_FOUND' });

      const c = await db.query.contact.findFirst({
        where: eq(contact.id, dsr.contactId),
      });

      return { ...dsr, contact: c ?? null };
    }),

  create: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      type:      z.enum(['access', 'rectify', 'delete', 'portability']),
      notes:     z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, 'dsr:manage');
      const { db, tenantId, userId } = ctx;

      const c = await db.query.contact.findFirst({
        where: and(eq(contact.id, input.contactId), eq(contact.tenantId, tenantId)),
      });
      if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });

      const deadlineAt = new Date();
      deadlineAt.setDate(deadlineAt.getDate() + 30);

      const [created] = await db.insert(dsrRequest).values({
        tenantId,
        contactId: input.contactId,
        type: input.type,
        requestedBy: userId,
        assignedTo: userId,
        notes: input.notes,
        deadlineAt,
      }).returning();

      return created!;
    }),

  process: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, 'dsr:manage');
      const { db, tenantId, userId } = ctx;

      const dsr = await db.query.dsrRequest.findFirst({
        where: and(eq(dsrRequest.id, input.id), eq(dsrRequest.tenantId, tenantId)),
      });
      if (!dsr) throw new TRPCError({ code: 'NOT_FOUND' });
      if (dsr.status === 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'DSR already completed' });
      }

      await db
        .update(dsrRequest)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(dsrRequest.id, input.id));

      const c = await db.query.contact.findFirst({
        where: and(eq(contact.id, dsr.contactId), eq(contact.tenantId, tenantId)),
      });
      if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });

      const tags = await db
        .select({ tag: contactTag.tag })
        .from(contactTag)
        .where(eq(contactTag.contactId, dsr.contactId));

      const relatedData = {
        tags: tags.map((t) => t.tag),
        relationships: [],
        leads: [],
        inquiries: [],
      };

      let result: Record<string, unknown> = {};

      if (dsr.type === 'access') {
        const bundle = buildAccessBundle(c as never, relatedData);
        const bundleJson = JSON.stringify(bundle, null, 2);
        result = { bundle: bundleJson };
      } else if (dsr.type === 'portability') {
        const portBundle = buildPortabilityBundle(c as never, relatedData);
        result = { jsonLd: JSON.stringify(portBundle.jsonLd, null, 2), csv: portBundle.csv };
      } else if (dsr.type === 'delete') {
        const patch = buildDeletePatch();
        await db
          .update(contact)
          .set({ ...patch, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
          .where(eq(contact.id, dsr.contactId));

        await db.delete(contactTag).where(
          and(eq(contactTag.contactId, dsr.contactId), eq(contactTag.tenantId, tenantId)),
        );

        await db
          .delete(contactSegmentMember)
          .where(and(eq(contactSegmentMember.contactId, dsr.contactId), eq(contactSegmentMember.tenantId, tenantId)));

        result = { deleted: true };
      } else if (dsr.type === 'rectify') {
        result = { message: 'Rectification requires manual review — DSR marked in_progress for admin action' };
        return result;
      }

      await db
        .update(dsrRequest)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(dsrRequest.id, input.id));

      return result;
    }),

  dispute: protectedProcedure
    .input(z.object({
      id:     z.string().uuid(),
      reason: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, 'dsr:manage');
      const { db, tenantId } = ctx;
      const dsr = await db.query.dsrRequest.findFirst({
        where: and(eq(dsrRequest.id, input.id), eq(dsrRequest.tenantId, tenantId)),
      });
      if (!dsr) throw new TRPCError({ code: 'NOT_FOUND' });
      if (dsr.status === 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot dispute a completed DSR' });
      }

      await db
        .update(dsrRequest)
        .set({ status: 'disputed', disputedAt: new Date(), disputeReason: input.reason, updatedAt: new Date() })
        .where(eq(dsrRequest.id, input.id));

      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Root contacts router
// ---------------------------------------------------------------------------
export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({
      q:            z.string().max(200).optional(),
      kind:         z.array(z.enum(['person', 'company'])).optional(),
      ownerIds:     z.array(z.string().uuid()).optional(),
      leadScoreMin: z.number().int().min(0).max(100).optional(),
      leadScoreMax: z.number().int().min(0).max(100).optional(),
      createdFrom:  z.string().datetime().optional(),
      createdTo:    z.string().datetime().optional(),
      limit:        z.number().int().min(1).max(200).default(50),
      cursor:       z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [
        eq(contact.tenantId, tenantId),
        isNull(contact.deletedAt),
      ];

      if (input.q) {
        const escaped = input.q.replace(/[%_\\]/g, '\\$&');
        const pattern = `%${escaped}%`;
        conditions.push(
          sql`(
            coalesce(${contact.firstName},'') || ' ' || coalesce(${contact.lastName},'') || ' ' || coalesce(${contact.legalName},'')
            ILIKE ${pattern}
            OR ${contact.emails}::text ILIKE ${pattern}
            OR ${contact.phones}::text ILIKE ${pattern}
          )`
        );
      }
      if (input.kind?.length)     conditions.push(inArray(contact.kind, input.kind));
      if (input.ownerIds?.length) conditions.push(inArray(contact.ownerUserId, input.ownerIds));
      if (input.leadScoreMin != null) conditions.push(gte(contact.leadScore, input.leadScoreMin));
      if (input.leadScoreMax != null) conditions.push(lte(contact.leadScore, input.leadScoreMax));
      if (input.createdFrom) conditions.push(gte(contact.createdAt, new Date(input.createdFrom)));
      if (input.createdTo)   conditions.push(lte(contact.createdAt, new Date(input.createdTo)));

      if (input.cursor) {
        const cursorRow = await db
          .select({ updatedAt: contact.updatedAt })
          .from(contact)
          .where(eq(contact.id, input.cursor))
          .limit(1);
        if (cursorRow[0]) {
          conditions.push(or(
            sql`${contact.updatedAt} < ${cursorRow[0].updatedAt}`,
            and(eq(contact.updatedAt, cursorRow[0].updatedAt), sql`${contact.id} > ${input.cursor}::uuid`),
          ));
        }
      }

      const rows = await db
        .select({
          id:          contact.id,
          kind:        contact.kind,
          firstName:   contact.firstName,
          lastName:    contact.lastName,
          legalName:   contact.legalName,
          emails:      contact.emails,
          phones:      contact.phones,
          leadScore:   contact.leadScore,
          ownerUserId: contact.ownerUserId,
          updatedAt:   contact.updatedAt,
        })
        .from(contact)
        .where(and(...conditions))
        .orderBy(desc(contact.updatedAt), contact.id)
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;

      return {
        items: items.map((c) => ({
          ...c,
          displayName:  displayName(c),
          primaryEmail: (c.emails as Array<{ value: string; primary: boolean }>).find((e) => e.primary)?.value
            ?? (c.emails as Array<{ value: string }>)[0]?.value ?? null,
          primaryPhone: (c.phones as Array<{ e164: string; primary: boolean }>).find((p) => p.primary)?.e164
            ?? (c.phones as Array<{ e164: string }>)[0]?.e164 ?? null,
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const c = await db.query.contact.findFirst({
        where: and(
          eq(contact.id, input.id),
          eq(contact.tenantId, tenantId),
          isNull(contact.deletedAt),
        ),
      });
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });

      const tags = await db
        .select({ tag: contactTag.tag })
        .from(contactTag)
        .where(eq(contactTag.contactId, input.id));

      return { ...c, tags: tags.map((t) => t.tag) };
    }),

  checkDuplicates: protectedProcedure
    .input(z.object({
      firstName:  z.string().optional(),
      lastName:   z.string().optional(),
      legalName:  z.string().optional(),
      emails:     z.array(z.string().email()).default([]),
      phones:     z.array(z.string()).default([]),
      nationalId: z.string().optional(),
      excludeId:  z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const nameProbe = [input.firstName, input.lastName, input.legalName].filter(Boolean).join(' ');
      const hasName = nameProbe.length > 0;
      const hasEmail = input.emails.length > 0;
      const hasNationalId = !!input.nationalId;

      if (!hasName && !hasEmail && !hasNationalId) {
        return { duplicates: [] };
      }

      const excludeClause = input.excludeId
        ? sql`AND c.id != ${input.excludeId}::uuid`
        : sql``;

      const emailJsonb = input.emails.length
        ? sql`${JSON.stringify(input.emails.map((v) => ({ value: v })))}::jsonb`
        : sql`'[]'::jsonb`;

      const rows = await db.execute(sql`
        SELECT
          c.id,
          c.kind,
          c.first_name,
          c.last_name,
          c.legal_name,
          c.emails,
          c.phones,
          c.national_id
        FROM contact c
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.deleted_at IS NULL
          ${excludeClause}
          AND (
            ${hasName
              ? sql`similarity(
                  coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'') || ' ' || coalesce(c.legal_name,''),
                  ${nameProbe}
                ) > 0.3`
              : sql`false`}
            ${hasEmail
              ? sql`OR EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(c.emails) ce
                  JOIN jsonb_array_elements(${emailJsonb}) ie
                    ON lower(ce->>'value') = lower(ie->>'value')
                )`
              : sql``}
            ${hasNationalId
              ? sql`OR (c.national_id IS NOT NULL AND c.national_id = ${input.nationalId})`
              : sql``}
          )
        ORDER BY similarity(
          coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'') || ' ' || coalesce(c.legal_name,''),
          ${nameProbe || ''}
        ) DESC
        LIMIT 10
      `);

      const rowsArray: Record<string, unknown>[] = Array.isArray(rows) ? rows as Record<string, unknown>[] : ((rows as { rows?: Record<string, unknown>[] }).rows ?? []);

      const scored = rowsArray
        .map((row) => {
          const cEmails = (row.emails as Array<{ value: string }>).map((e) => e.value);
          const cPhones = (row.phones as Array<{ e164: string }>).map((p) => p.e164);
          const score = scoreDuplicateFields(
            {
              firstName:  input.firstName ?? null,
              lastName:   input.lastName ?? null,
              emails:     input.emails,
              phones:     input.phones,
              nationalId: input.nationalId ?? null,
            },
            {
              firstName:  row.first_name as string | null,
              lastName:   row.last_name as string | null,
              emails:     cEmails,
              phones:     cPhones,
              nationalId: row.national_id as string | null,
            },
          );
          return {
            id:    row.id as string,
            name:  displayName({
              kind:      row.kind as string,
              firstName: row.first_name as string | null,
              lastName:  row.last_name as string | null,
              legalName: row.legal_name as string | null,
            }),
            score,
          };
        })
        .filter((c) => c.score >= 0.4)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return { duplicates: scored };
    }),

  create: protectedProcedure
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { tags, ...fields } = input as any;

      const [created] = await db.insert(contact).values({
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        ...fields,
      }).returning();

      if (tags?.length) {
        await db.insert(contactTag).values(
          (tags as string[]).map((tag: string) => ({
            tenantId,
            contactId: created!.id,
            tag,
            createdBy: userId,
          }))
        ).onConflictDoNothing();
      }

      return created!;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      version: z.number().int().min(1).optional(),
      data: z.object({
        // person fields
        firstName:      z.string().min(1).max(100).optional(),
        lastName:       z.string().min(1).max(100).optional(),
        nationalIdType: z.enum(['DNI', 'CUIT', 'CUIL', 'passport']).optional(),
        nationalId:     z.string().max(20).optional(),
        birthDate:      z.string().date().optional(),
        gender:         z.enum(['male', 'female', 'other']).optional(),
        // company fields
        legalName:      z.string().min(1).max(200).optional(),
        cuit:           z.string().max(20).optional(),
        industry:       z.string().max(100).optional(),
        // shared fields
        phones:         z.array(phoneSchema).max(10).optional(),
        emails:         z.array(emailSchema).max(10).optional(),
        addresses:      z.array(addressSchema).max(5).optional(),
        leadScore:      z.number().int().min(0).max(100).optional(),
        source:         z.string().max(100).optional(),
        notes:          z.string().max(5000).optional(),
        ownerUserId:    z.string().uuid().optional(),
      }),
      tags: z.array(z.string().min(1).max(50)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      const { data, tags } = input;

      if (input.version !== undefined) {
        const existing = await db.query.contact.findFirst({
          where: and(eq(contact.id, input.id), eq(contact.tenantId, tenantId), isNull(contact.deletedAt)),
          columns: { version: true },
        });
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
        }
        if (existing.version !== input.version) {
          throw new TRPCError({ code: 'CONFLICT', message: 'stale_version' });
        }
      }

      await db
        .update(contact)
        .set({ ...data, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId), isNull(contact.deletedAt)));

      if (tags !== undefined) {
        await db.delete(contactTag).where(and(
          eq(contactTag.contactId, input.id),
          eq(contactTag.tenantId, tenantId),
        ));
        if (tags.length) {
          await db.insert(contactTag).values(
            tags.map((tag) => ({ tenantId, contactId: input.id, tag, createdBy: userId }))
          ).onConflictDoNothing();
        }
      }

      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      await db
        .update(contact)
        .set({ deletedAt: new Date(), deletedBy: userId, deletionReason: 'manual' })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId), isNull(contact.deletedAt)));

      await db
        .delete(contactSegmentMember)
        .where(and(eq(contactSegmentMember.contactId, input.id), eq(contactSegmentMember.tenantId, tenantId)));

      return { ok: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid(), version: z.number().int().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      if (input.version !== undefined) {
        const existing = await db.query.contact.findFirst({
          where: and(eq(contact.id, input.id), eq(contact.tenantId, tenantId)),
          columns: { version: true },
        });
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
        }
        if (existing.version !== input.version) {
          throw new TRPCError({ code: 'CONFLICT', message: 'stale_version' });
        }
      }

      await db
        .update(contact)
        .set({ deletedAt: null, deletedBy: null, deletionReason: null })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId)));
      return { ok: true };
    }),

  merge: protectedProcedure
    .input(z.object({
      winnerId:      z.string().uuid(),
      loserId:       z.string().uuid(),
      winnerVersion: z.number().int().min(1).optional(),
      loserVersion:  z.number().int().min(1).optional(),
      fieldWinners:  z.record(z.string(), z.enum(['winner', 'loser'])).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;

      if (input.winnerId === input.loserId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Winner and loser must be different contacts' });
      }

      const [winner, loser] = await Promise.all([
        db.query.contact.findFirst({ where: and(eq(contact.id, input.winnerId), eq(contact.tenantId, tenantId), isNull(contact.deletedAt)) }),
        db.query.contact.findFirst({ where: and(eq(contact.id, input.loserId),  eq(contact.tenantId, tenantId), isNull(contact.deletedAt)) }),
      ]);
      if (!winner) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Winner contact is deleted or does not exist' });
      if (!loser)  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Loser contact is deleted or does not exist' });

      if (input.winnerVersion !== undefined && winner.version !== input.winnerVersion) {
        throw new TRPCError({ code: 'CONFLICT', message: 'stale_version' });
      }
      if (input.loserVersion !== undefined && loser.version !== input.loserVersion) {
        throw new TRPCError({ code: 'CONFLICT', message: 'stale_version' });
      }

      // Build merged field set with overrides
      const mergeableFields = [
        'firstName', 'lastName', 'nationalIdType', 'nationalId', 'birthDate', 'gender',
        'legalName', 'cuit', 'industry', 'phones', 'emails', 'addresses',
        'leadScore', 'source', 'notes', 'ownerUserId',
      ] as const;

      const mergedFields: Record<string, unknown> = {};
      for (const field of mergeableFields) {
        const src = input.fieldWinners[field] === 'loser' ? loser : winner;
        mergedFields[field] = (src as Record<string, unknown>)[field];
      }

      await db
        .update(contact)
        .set({ ...mergedFields, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
        .where(eq(contact.id, input.winnerId));

      // Merge tags from loser into winner
      const loserTags = await db
        .select({ tag: contactTag.tag })
        .from(contactTag)
        .where(and(eq(contactTag.contactId, input.loserId), eq(contactTag.tenantId, tenantId)));

      if (loserTags.length) {
        await db.insert(contactTag).values(
          loserTags.map((t) => ({ tenantId, contactId: input.winnerId, tag: t.tag, createdBy: userId }))
        ).onConflictDoNothing();
      }

      // Re-attribute relationships from loser to winner (safe merge)
      // 1. Soft-delete loser relationships that would conflict with existing winner relationships
      await db.execute(sql`
        UPDATE contact_relationship lr
        SET deleted_at = now()
        FROM contact_relationship wr
        WHERE lr.tenant_id = ${tenantId}::uuid
          AND lr.deleted_at IS NULL
          AND wr.tenant_id = lr.tenant_id
          AND wr.deleted_at IS NULL
          AND lr.from_contact_id = ${input.loserId}::uuid
          AND wr.from_contact_id = ${input.winnerId}::uuid
          AND lr.to_contact_id = wr.to_contact_id
          AND lr.kind_id = wr.kind_id
      `);
      await db.execute(sql`
        UPDATE contact_relationship lr
        SET deleted_at = now()
        FROM contact_relationship wr
        WHERE lr.tenant_id = ${tenantId}::uuid
          AND lr.deleted_at IS NULL
          AND wr.tenant_id = lr.tenant_id
          AND wr.deleted_at IS NULL
          AND lr.to_contact_id = ${input.loserId}::uuid
          AND wr.to_contact_id = ${input.winnerId}::uuid
          AND lr.from_contact_id = wr.from_contact_id
          AND lr.kind_id = wr.kind_id
      `);

      // 2. Re-attribute remaining non-deleted loser relationships to winner
      await db
        .update(contactRelationship)
        .set({ fromContactId: input.winnerId })
        .where(and(
          eq(contactRelationship.fromContactId, input.loserId),
          eq(contactRelationship.tenantId, tenantId),
          isNull(contactRelationship.deletedAt),
        ));
      await db
        .update(contactRelationship)
        .set({ toContactId: input.winnerId })
        .where(and(
          eq(contactRelationship.toContactId, input.loserId),
          eq(contactRelationship.tenantId, tenantId),
          isNull(contactRelationship.deletedAt),
        ));

      // 3. Soft-delete any self-referential rows created by re-attribution
      await db
        .update(contactRelationship)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(contactRelationship.tenantId, tenantId),
          sql`${contactRelationship.fromContactId} = ${contactRelationship.toContactId}`,
          isNull(contactRelationship.deletedAt),
        ));

      // Soft-delete the loser
      await db
        .update(contact)
        .set({
          deletedAt:      new Date(),
          deletedBy:      userId,
          deletionReason: 'merged_into',
          mergeWinnerId:  input.winnerId,
        })
        .where(eq(contact.id, input.loserId));

      return { ok: true, winnerId: input.winnerId };
    }),

  relationships: relationshipsRouter,
  segments:      segmentsRouter,
  duplicates:    duplicatesRouter,
  tags:          tagsRouter,
  import:        importRouter,
  dsr:           dsrRouter,
});
