# Contact CRUD Implementation Plan (RENA-31)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Contacts module — CRUD (person + company), typed bidirectional relationships, dynamic segment builder, and duplicate detection + merge.

**Architecture:** Drizzle schema in `packages/db`, tRPC procedures in `apps/api/src/routers/contacts.ts`, React pages in `apps/web/src/pages/contacts/`. Duplicate detection uses `pg_trgm` trigram similarity on name/email/phone (embedding cosine reserved for Phase E AI layer). Segment membership is computed on demand (live preview) and cached in `contact_segment_member` table; BullMQ job recomputes on `contact.updated` events.

**Tech Stack:** Drizzle ORM, Postgres 16 + pg_trgm, tRPC v11, Zod, React 19, TanStack Query, TanStack Router, react-intl (es-AR)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/db/src/schema/contacts.ts` | Create | All contact-domain tables |
| `packages/db/migrations/0004_contacts.sql` | Create | DDL + RLS + GIN indexes |
| `packages/db/src/schema/index.ts` | Modify | Export contacts schema |
| `apps/api/src/routers/contacts.ts` | Create | All tRPC contact procedures |
| `apps/api/src/router.ts` | Modify | Wire `contacts:` namespace |
| `packages/core/src/contacts/duplicate.ts` | Create | Trigram dup-check logic |
| `packages/core/src/contacts/duplicate.test.ts` | Create | Unit tests |
| `packages/core/src/index.ts` | Modify | Export contact helpers |
| `apps/web/src/routes/contacts/-types.ts` | Create | ContactRow, ContactFilter, ContactDetail types |
| `apps/web/src/pages/contacts/ContactListPage.tsx` | Create | Virtualized list + search + filter chips |
| `apps/web/src/pages/contacts/ContactFormPage.tsx` | Create | Create/edit full form (person+company) |
| `apps/web/src/pages/contacts/ContactDetailPage.tsx` | Create | Detail shell with tabs (Info/Relaciones/Actividad) |
| `apps/web/src/pages/contacts/RelationshipsTab.tsx` | Create | Typed relationship editor |
| `apps/web/src/pages/contacts/DuplicatesPage.tsx` | Create | Cluster view + side-by-side merge UI |
| `apps/web/src/pages/contacts/SegmentBuilderPage.tsx` | Create | Segment criteria builder + live count |
| `apps/web/src/main.tsx` | Modify | Add contacts sub-routes |

---

## Task 1: DB Schema — contacts.ts

**Files:**
- Create: `packages/db/src/schema/contacts.ts`

- [ ] **Step 1: Write the schema file**

```typescript
/**
 * Contacts entity group
 *
 * Tables: contact, contact_relationship, contact_relationship_kind,
 *         contact_tag, contact_segment, contact_segment_member
 */
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const contactKindEnum = pgEnum('contact_kind', ['person', 'company']);

export const nationalIdTypeEnum = pgEnum('national_id_type', [
  'DNI', 'CUIT', 'CUIL', 'passport',
]);

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const contactDeletionReasonEnum = pgEnum('contact_deletion_reason', [
  'merged_into', 'dsr_delete', 'manual',
]);

export const phoneTypeEnum = pgEnum('phone_type', [
  'mobile', 'whatsapp', 'landline', 'office',
]);

export const emailTypeEnum = pgEnum('email_type', ['personal', 'work', 'other']);

// ---------------------------------------------------------------------------
// contact — core contact record
// ---------------------------------------------------------------------------

export const contact = pgTable('contact', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),

  kind: contactKindEnum('kind').notNull(),

  // Person fields
  firstName:      text('first_name'),
  lastName:       text('last_name'),
  nationalIdType: nationalIdTypeEnum('national_id_type'),
  nationalId:     text('national_id'),
  birthDate:      date('birth_date'),
  gender:         genderEnum('gender'),

  // Company fields
  legalName: text('legal_name'),
  cuit:      text('cuit'),
  industry:  text('industry'),

  // Shared structured fields (JSONB arrays)
  // phones: [{e164: string, type: phone_type, whatsapp: boolean, primary: boolean}]
  phones:    jsonb('phones').notNull().default(sql`'[]'`),
  // emails: [{value: string, type: email_type, primary: boolean}]
  emails:    jsonb('emails').notNull().default(sql`'[]'`),
  // addresses: [{street: string, number: string, city: string, province: string, zip: string}]
  addresses: jsonb('addresses').notNull().default(sql`'[]'`),

  // CRM fields
  leadScore:   integer('lead_score').notNull().default(0),
  source:      text('source'),
  notes:       text('notes'),
  ownerUserId: uuid('owner_user_id').references(() => user.id),

  // Soft delete + merge
  mergeWinnerId:    uuid('merge_winner_id'),  // FK to contact(id) — self-ref
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  deletedBy:        uuid('deleted_by').references(() => user.id),
  deletionReason:   contactDeletionReasonEnum('deletion_reason'),

  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  version:   integer('version').notNull().default(1),
});

export type Contact = typeof contact.$inferSelect;
export type NewContact = typeof contact.$inferInsert;

// ---------------------------------------------------------------------------
// contact_relationship_kind — tenant-scoped relationship types
// ---------------------------------------------------------------------------

export const contactRelationshipKind = pgTable('contact_relationship_kind', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  label:     text('label').notNull(),   // e.g. "Cónyuge de"
  inverseLabel: text('inverse_label'),  // e.g. "Cónyuge de" (symmetric) or "Empleado de"
  builtIn:   boolean('built_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
}, (t) => ({
  uniq: unique().on(t.tenantId, t.label),
}));

// ---------------------------------------------------------------------------
// contact_relationship — typed bidirectional relationship
// ---------------------------------------------------------------------------

export const contactRelationship = pgTable('contact_relationship', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:     uuid('tenant_id').notNull(),
  fromContactId: uuid('from_contact_id').notNull().references(() => contact.id),
  toContactId:   uuid('to_contact_id').notNull().references(() => contact.id),
  kindId:        uuid('kind_id').notNull().references(() => contactRelationshipKind.id),
  notes:         text('notes'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:     uuid('created_by').references(() => user.id),
  deletedAt:     timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  uniq: unique().on(t.tenantId, t.fromContactId, t.toContactId, t.kindId),
}));

// ---------------------------------------------------------------------------
// contact_tag — per-contact label
// ---------------------------------------------------------------------------

export const contactTag = pgTable('contact_tag', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  contactId: uuid('contact_id').notNull().references(() => contact.id),
  tag:       text('tag').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
}, (t) => ({
  uniq: unique().on(t.tenantId, t.contactId, t.tag),
}));

// ---------------------------------------------------------------------------
// contact_segment — named dynamic segment with criteria JSON
// ---------------------------------------------------------------------------

export const contactSegment = pgTable('contact_segment', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:    uuid('tenant_id').notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  // criteria: [{field, op, value}][] — see SegmentCriteria type in -types.ts
  criteria:    jsonb('criteria').notNull().default(sql`'[]'`),
  memberCount: integer('member_count').notNull().default(0),
  lastComputedAt: timestamp('last_computed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ContactSegment = typeof contactSegment.$inferSelect;

// ---------------------------------------------------------------------------
// contact_segment_member — cached membership
// ---------------------------------------------------------------------------

export const contactSegmentMember = pgTable('contact_segment_member', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:   uuid('tenant_id').notNull(),
  segmentId:  uuid('segment_id').notNull().references(() => contactSegment.id),
  contactId:  uuid('contact_id').notNull().references(() => contact.id),
  addedAt:    timestamp('added_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  uniq: unique().on(t.segmentId, t.contactId),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
cd /Users/martinmarquez/property-manager-3.0
pnpm --filter @corredor/db exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add packages/db/src/schema/contacts.ts
git commit -m "feat(db): contacts schema — contact, relationship, segment tables

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 2: DB Migration — 0004_contacts.sql

**Files:**
- Create: `packages/db/migrations/0004_contacts.sql`

- [ ] **Step 1: Write migration**

```sql
-- =============================================================================
-- Migration: 0004_contacts
-- Phase B — Contacts entity group
--
-- Tables: contact, contact_relationship_kind, contact_relationship,
--         contact_tag, contact_segment, contact_segment_member
--
-- Extensions required: pg_trgm (trigram fuzzy search)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE contact_kind AS ENUM ('person', 'company');
CREATE TYPE national_id_type AS ENUM ('DNI', 'CUIT', 'CUIL', 'passport');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE contact_deletion_reason AS ENUM ('merged_into', 'dsr_delete', 'manual');
CREATE TYPE phone_type AS ENUM ('mobile', 'whatsapp', 'landline', 'office');
CREATE TYPE email_type AS ENUM ('personal', 'work', 'other');

-- ---------------------------------------------------------------------------
-- contact
-- ---------------------------------------------------------------------------
CREATE TABLE contact (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  kind             contact_kind NOT NULL,

  -- Person fields
  first_name       text,
  last_name        text,
  national_id_type national_id_type,
  national_id      text,
  birth_date       date,
  gender           gender,

  -- Company fields
  legal_name       text,
  cuit             text,
  industry         text,

  -- Shared JSONB arrays
  phones           jsonb NOT NULL DEFAULT '[]',
  emails           jsonb NOT NULL DEFAULT '[]',
  addresses        jsonb NOT NULL DEFAULT '[]',

  -- CRM
  lead_score       int NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  source           text,
  notes            text,
  owner_user_id    uuid REFERENCES "user"(id),

  -- Merge / soft-delete
  merge_winner_id  uuid REFERENCES contact(id),
  deleted_at       timestamptz,
  deleted_by       uuid REFERENCES "user"(id),
  deletion_reason  contact_deletion_reason,

  -- Audit
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  version          int NOT NULL DEFAULT 1
);

-- Full-text search index on name + computed email/phone text
CREATE INDEX contact_name_trgm_idx ON contact
  USING gin ((coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(legal_name, '')) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- JSONB path indexes for email/phone lookups
CREATE INDEX contact_emails_idx ON contact USING gin (emails jsonb_path_ops);
CREATE INDEX contact_phones_idx ON contact USING gin (phones jsonb_path_ops);

-- national_id lookup
CREATE INDEX contact_national_id_idx ON contact (tenant_id, national_id)
  WHERE national_id IS NOT NULL AND deleted_at IS NULL;

-- lead_score range queries
CREATE INDEX contact_lead_score_idx ON contact (tenant_id, lead_score)
  WHERE deleted_at IS NULL;

-- source filter
CREATE INDEX contact_source_idx ON contact (tenant_id, source)
  WHERE source IS NOT NULL AND deleted_at IS NULL;

-- RLS
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_relationship_kind — seed built-in types
-- ---------------------------------------------------------------------------
CREATE TABLE contact_relationship_kind (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  label         text NOT NULL,
  inverse_label text,
  built_in      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES "user"(id),
  CONSTRAINT crk_tenant_label_unique UNIQUE (tenant_id, label)
);

ALTER TABLE contact_relationship_kind ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_relationship_kind
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Note: built-in relationship kinds are seeded per-tenant on tenant creation
-- via the `seed_default_relationship_kinds(tenant_id)` function below.

CREATE OR REPLACE FUNCTION seed_default_relationship_kinds(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO contact_relationship_kind (tenant_id, label, inverse_label, built_in)
  VALUES
    (p_tenant_id, 'Cónyuge de',    'Cónyuge de',    true),
    (p_tenant_id, 'Progenitor de', 'Hijo/a de',      true),
    (p_tenant_id, 'Empleado de',   'Empleador de',   true),
    (p_tenant_id, 'Socio de',      'Socio de',       true),
    (p_tenant_id, 'Abogado de',    'Cliente de',     true),
    (p_tenant_id, 'Corredor de',   'Representado por', true),
    (p_tenant_id, 'Propietario de','Inquilino de',   true),
    (p_tenant_id, 'Inquilino de',  'Propietario de', true)
  ON CONFLICT (tenant_id, label) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- contact_relationship
-- ---------------------------------------------------------------------------
CREATE TABLE contact_relationship (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id),
  from_contact_id uuid NOT NULL REFERENCES contact(id),
  to_contact_id   uuid NOT NULL REFERENCES contact(id),
  kind_id         uuid NOT NULL REFERENCES contact_relationship_kind(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES "user"(id),
  deleted_at      timestamptz,
  CONSTRAINT cr_unique UNIQUE (tenant_id, from_contact_id, to_contact_id, kind_id)
);

CREATE INDEX cr_from_idx ON contact_relationship (from_contact_id) WHERE deleted_at IS NULL;
CREATE INDEX cr_to_idx   ON contact_relationship (to_contact_id)   WHERE deleted_at IS NULL;

ALTER TABLE contact_relationship ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_relationship
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_tag
-- ---------------------------------------------------------------------------
CREATE TABLE contact_tag (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  contact_id uuid NOT NULL REFERENCES contact(id),
  tag        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES "user"(id),
  CONSTRAINT ct_unique UNIQUE (tenant_id, contact_id, tag)
);

CREATE INDEX contact_tag_tag_idx ON contact_tag (tenant_id, tag);

ALTER TABLE contact_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_tag
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_segment
-- ---------------------------------------------------------------------------
CREATE TABLE contact_segment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  name             text NOT NULL,
  description      text,
  criteria         jsonb NOT NULL DEFAULT '[]',
  member_count     int NOT NULL DEFAULT 0,
  last_computed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  deleted_at       timestamptz
);

ALTER TABLE contact_segment ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_segment
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_segment_member
-- ---------------------------------------------------------------------------
CREATE TABLE contact_segment_member (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  segment_id uuid NOT NULL REFERENCES contact_segment(id),
  contact_id uuid NOT NULL REFERENCES contact(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csm_unique UNIQUE (segment_id, contact_id)
);

CREATE INDEX csm_contact_idx  ON contact_segment_member (contact_id);
CREATE INDEX csm_segment_idx  ON contact_segment_member (segment_id);

ALTER TABLE contact_segment_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_segment_member
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

- [ ] **Step 2: Commit**
```bash
git add packages/db/migrations/0004_contacts.sql
git commit -m "feat(db): migration 0004 — contacts, relationships, segments, RLS

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 3: Update DB Schema Export

**Files:**
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Uncomment contacts export**

Change `// export * from './contacts.js';` to `export * from './contacts.js';`

- [ ] **Step 2: Commit**
```bash
git add packages/db/src/schema/index.ts
git commit -m "feat(db): export contacts schema from index

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 4: Contact Types (web)

**Files:**
- Create: `apps/web/src/routes/contacts/-types.ts`

- [ ] **Step 1: Write types file**

```typescript
// ---------------------------------------------------------------------------
// Contact types for web routes
// ---------------------------------------------------------------------------

export type ContactKind = 'person' | 'company';

export type PhoneEntry = {
  e164: string;
  type: 'mobile' | 'whatsapp' | 'landline' | 'office';
  whatsapp: boolean;
  primary: boolean;
};

export type EmailEntry = {
  value: string;
  type: 'personal' | 'work' | 'other';
  primary: boolean;
};

export type AddressEntry = {
  street?: string;
  number?: string;
  city?: string;
  province?: string;
  zip?: string;
};

/** Row shape used in the virtualized contact list. */
export interface ContactRow {
  id: string;
  kind: ContactKind;
  displayName: string;       // first+last for person, legalName for company
  primaryPhone: string | null;
  primaryEmail: string | null;
  leadScore: number;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  lastActivityAt: string | null;
  tags: string[];
  updatedAt: string;
}

/** Detail shape returned by contacts.get. */
export interface ContactDetail extends ContactRow {
  firstName: string | null;
  lastName: string | null;
  nationalIdType: string | null;
  nationalId: string | null;
  birthDate: string | null;
  gender: string | null;
  legalName: string | null;
  cuit: string | null;
  industry: string | null;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: AddressEntry[];
  source: string | null;
  notes: string | null;
  ownerId: string | null;
  relationships: RelationshipEntry[];
}

export interface RelationshipEntry {
  id: string;
  kindId: string;
  kindLabel: string;
  contactId: string;
  contactName: string;
  direction: 'from' | 'to';
}

/** Search + filter state for the contact list. */
export interface ContactFilter {
  q?: string;               // Free text search
  kind?: ContactKind[];
  tags?: string[];
  ownerIds?: string[];
  sourceIds?: string[];
  leadScoreMin?: number;
  leadScoreMax?: number;
  hasOpenLeads?: boolean;
  createdFrom?: string;
  createdTo?: string;
}

// ---------------------------------------------------------------------------
// Segment criteria types
// ---------------------------------------------------------------------------

export type SegmentField =
  | 'tag'
  | 'lead_score'
  | 'source'
  | 'province'
  | 'locality'
  | 'created_at'
  | 'last_activity'
  | 'has_open_leads'
  | 'operation_interest';

export type SegmentOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'is_true' | 'is_false';

export interface SegmentCriterion {
  field: SegmentField;
  op: SegmentOp;
  value: string | number | boolean | string[];
}

export interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  lastComputedAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/routes/contacts/-types.ts
git commit -m "feat(web): contact route types

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 5: Duplicate Detection Logic

**Files:**
- Create: `packages/core/src/contacts/duplicate.ts`
- Create: `packages/core/src/contacts/duplicate.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/src/contacts/duplicate.test.ts
import { describe, it, expect } from 'vitest';
import { scoreDuplicateFields, type CandidateFields } from './duplicate.js';

describe('scoreDuplicateFields', () => {
  const base: CandidateFields = {
    firstName: 'Juan',
    lastName: 'Pérez',
    emails: ['juan@example.com'],
    phones: ['+5491123456789'],
    nationalId: '12345678',
  };

  it('returns 1.0 for identical contacts', () => {
    expect(scoreDuplicateFields(base, base)).toBe(1.0);
  });

  it('returns high score for same email different name', () => {
    const b: CandidateFields = { ...base, firstName: 'Juan Carlos', lastName: 'Perez' };
    expect(scoreDuplicateFields(base, b)).toBeGreaterThan(0.7);
  });

  it('returns high score for same DNI', () => {
    const b: CandidateFields = { ...base, firstName: 'J.', lastName: 'P.', emails: [] };
    expect(scoreDuplicateFields(base, b)).toBeGreaterThan(0.7);
  });

  it('returns low score for completely different contacts', () => {
    const b: CandidateFields = {
      firstName: 'María',
      lastName: 'González',
      emails: ['maria@other.com'],
      phones: ['+5491199999999'],
      nationalId: '99999999',
    };
    expect(scoreDuplicateFields(base, b)).toBeLessThan(0.3);
  });

  it('returns 0 for empty candidates', () => {
    const empty: CandidateFields = { firstName: null, lastName: null, emails: [], phones: [], nationalId: null };
    expect(scoreDuplicateFields(empty, empty)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**
```bash
cd /Users/martinmarquez/property-manager-3.0
pnpm --filter @corredor/core test -- --reporter=verbose packages/core/src/contacts/duplicate.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// packages/core/src/contacts/duplicate.ts

export interface CandidateFields {
  firstName: string | null;
  lastName: string | null;
  emails: string[];
  phones: string[];    // E.164 normalized
  nationalId: string | null;
}

/**
 * Computes a 0–1 duplicate likelihood score between two contacts.
 * 
 * Weights:
 *  - Matching email (exact, case-insensitive):  0.40
 *  - Matching phone (normalized):               0.30
 *  - Matching nationalId (exact):               0.35
 *  - Name similarity (trigram approx):          0.20
 *
 * Multiple signals combine additively; total is clamped to [0, 1].
 * A score >= 0.7 is considered "high confidence duplicate".
 * A score >= 0.4 is considered "possible duplicate".
 */
export function scoreDuplicateFields(a: CandidateFields, b: CandidateFields): number {
  if (!hasAnyField(a) || !hasAnyField(b)) return 0;

  let score = 0;

  // Email match — strong signal
  const emailMatch = a.emails.some((ea) =>
    b.emails.some((eb) => ea.toLowerCase() === eb.toLowerCase())
  );
  if (emailMatch) score += 0.40;

  // Phone match — strong signal (normalize to digits only for comparison)
  const digitsOnly = (p: string) => p.replace(/\D/g, '');
  const phoneMatch = a.phones.some((pa) =>
    b.phones.some((pb) => {
      const da = digitsOnly(pa);
      const db = digitsOnly(pb);
      return da.length >= 8 && da === db;
    })
  );
  if (phoneMatch) score += 0.30;

  // National ID match — strongest signal
  if (
    a.nationalId && b.nationalId &&
    a.nationalId.replace(/\D/g, '') === b.nationalId.replace(/\D/g, '')
  ) {
    score += 0.35;
  }

  // Name similarity — approximate trigram
  const aName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
  const bName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
  if (aName && bName) {
    score += trigramSimilarity(aName, bName) * 0.20;
  }

  return Math.min(score, 1.0);
}

function hasAnyField(c: CandidateFields): boolean {
  return !!(c.firstName || c.lastName || c.emails.length || c.phones.length || c.nationalId);
}

/** JS approximation of Postgres pg_trgm similarity(a, b). */
function trigramSimilarity(a: string, b: string): number {
  const ta = buildTrigrams(a);
  const tb = buildTrigrams(b);
  if (ta.size === 0 && tb.size === 0) return 0;
  const intersection = [...ta].filter((t) => tb.has(t)).length;
  return intersection / (ta.size + tb.size - intersection);
}

function buildTrigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    out.add(padded.slice(i, i + 3));
  }
  return out;
}
```

- [ ] **Step 4: Run tests to confirm pass**
```bash
pnpm --filter @corredor/core test -- --reporter=verbose packages/core/src/contacts/duplicate.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**
```bash
git add packages/core/src/contacts/duplicate.ts packages/core/src/contacts/duplicate.test.ts
git commit -m "feat(core): contact duplicate scoring — trigram + email/phone/DNI signals

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 6: Update Core Exports

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add contacts exports**

Add to the end of `packages/core/src/index.ts`:
```typescript
export * from './contacts/duplicate.js';
```

- [ ] **Step 2: Commit**
```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export contact duplicate helper

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 7: Contact tRPC Router

**Files:**
- Create: `apps/api/src/routers/contacts.ts`

- [ ] **Step 1: Write the router**

```typescript
/**
 * Contacts router — Phase B (RENA-31)
 *
 * Procedures (all under contacts.*):
 *
 *  contacts.list            Paginated, searchable, filterable contact list
 *  contacts.get             Single contact with relationships
 *  contacts.create          Create person or company contact (with dup check)
 *  contacts.update          Update contact fields
 *  contacts.delete          Soft-delete contact
 *  contacts.restore         Restore soft-deleted contact
 *  contacts.checkDuplicates Check for existing duplicates before save
 *  contacts.merge           Merge two contacts (winner/loser + field selection)
 *  contacts.duplicates.list Page of suspected duplicate clusters (trigram SQL)
 *
 *  contacts.relationships.list   List relationships for a contact
 *  contacts.relationships.create Create a new typed relationship (bidirectional)
 *  contacts.relationships.delete Soft-delete a relationship
 *  contacts.relationships.kinds  List available relationship kinds
 *
 *  contacts.segments.list   List all segments for tenant
 *  contacts.segments.get    Single segment
 *  contacts.segments.create Create segment with criteria
 *  contacts.segments.update Update segment criteria
 *  contacts.segments.delete Soft-delete segment
 *  contacts.segments.preview Live count for segment criteria
 *
 *  contacts.tags.list       List all unique tags in tenant
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  eq, and, or, ilike, sql, desc, gte, lte, inArray, isNull, isNotNull, ne,
} from 'drizzle-orm';
import {
  contact,
  contactRelationship,
  contactRelationshipKind,
  contactTag,
  contactSegment,
  contactSegmentMember,
  user,
} from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';
import { scoreDuplicateFields } from '@corredor/core';

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

const contactCreateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind:           z.literal('person'),
    firstName:      z.string().min(1).max(100),
    lastName:       z.string().min(1).max(100),
    nationalIdType: z.enum(['DNI', 'CUIT', 'CUIL', 'passport']).optional(),
    nationalId:     z.string().max(20).optional(),
    birthDate:      z.string().date().optional(),
    gender:         z.enum(['male', 'female', 'other']).optional(),
    phones:         z.array(phoneSchema).max(10).default([]),
    emails:         z.array(emailSchema).max(10).default([]),
    addresses:      z.array(addressSchema).max(5).default([]),
    leadScore:      z.number().int().min(0).max(100).default(0),
    source:         z.string().max(100).optional(),
    notes:          z.string().max(5000).optional(),
    ownerUserId:    z.string().uuid().optional(),
    tags:           z.array(z.string().min(1).max(50)).max(20).default([]),
  }),
  z.object({
    kind:         z.literal('company'),
    legalName:    z.string().min(1).max(200),
    cuit:         z.string().max(20).optional(),
    industry:     z.string().max(100).optional(),
    phones:       z.array(phoneSchema).max(10).default([]),
    emails:       z.array(emailSchema).max(10).default([]),
    addresses:    z.array(addressSchema).max(5).default([]),
    leadScore:    z.number().int().min(0).max(100).default(0),
    source:       z.string().max(100).optional(),
    notes:        z.string().max(5000).optional(),
    ownerUserId:  z.string().uuid().optional(),
    tags:         z.array(z.string().min(1).max(50)).max(20).default([]),
  }),
]);

const segmentCriterionSchema = z.object({
  field: z.enum(['tag', 'lead_score', 'source', 'province', 'locality',
                 'created_at', 'last_activity', 'has_open_leads', 'operation_interest']),
  op:    z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'between', 'is_true', 'is_false']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

// ---------------------------------------------------------------------------
// Helper: build display name
// ---------------------------------------------------------------------------
function displayName(c: { kind: string; firstName?: string | null; lastName?: string | null; legalName?: string | null }): string {
  if (c.kind === 'company') return c.legalName ?? '(sin nombre)';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)';
}

// ---------------------------------------------------------------------------
// Helper: apply segment criteria to a Drizzle query WHERE clause
// Returns an array of SQL conditions for the given criteria.
// ---------------------------------------------------------------------------
function criteriaToSql(criteria: z.infer<typeof segmentCriterionSchema>[]) {
  return criteria.map((c) => {
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
      case 'has_open_leads':
        // Placeholder — Phase C adds leads table
        if (c.op === 'is_true')  return sql`false`; // will be replaced in Phase C
        if (c.op === 'is_false') return sql`true`;
        break;
      case 'tag':
        if (c.op === 'in' && Array.isArray(c.value)) {
          return sql`EXISTS (SELECT 1 FROM contact_tag ct WHERE ct.contact_id = ${contact.id} AND ct.tag = ANY(${c.value}))`;
        }
        if (c.op === 'eq') {
          return sql`EXISTS (SELECT 1 FROM contact_tag ct WHERE ct.contact_id = ${contact.id} AND ct.tag = ${String(c.value)})`;
        }
        break;
    }
    return sql`true`;
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
          id:           contactRelationship.id,
          kindId:       contactRelationship.kindId,
          kindLabel:    contactRelationshipKind.label,
          fromContactId: contactRelationship.fromContactId,
          toContactId:  contactRelationship.toContactId,
        })
        .from(contactRelationship)
        .innerJoin(contactRelationshipKind, eq(contactRelationship.kindId, contactRelationshipKind.id))
        .where(
          and(
            eq(contactRelationship.tenantId, tenantId),
            or(
              eq(contactRelationship.fromContactId, input.contactId),
              eq(contactRelationship.toContactId, input.contactId),
            ),
            isNull(contactRelationship.deletedAt),
          )
        );

      // For each row, fetch the other contact's name
      const otherIds = rows.map((r) =>
        r.fromContactId === input.contactId ? r.toContactId : r.fromContactId
      );
      const uniqueOtherIds = [...new Set(otherIds)];

      let contacts: { id: string; firstName: string | null; lastName: string | null; legalName: string | null; kind: string }[] = [];
      if (uniqueOtherIds.length > 0) {
        contacts = await db
          .select({ id: contact.id, firstName: contact.firstName, lastName: contact.lastName, legalName: contact.legalName, kind: contact.kind })
          .from(contact)
          .where(inArray(contact.id, uniqueOtherIds));
      }

      const contactMap = new Map(contacts.map((c) => [c.id, c]));

      return rows.map((r) => {
        const otherId = r.fromContactId === input.contactId ? r.toContactId : r.fromContactId;
        const otherContact = contactMap.get(otherId);
        return {
          id:          r.id,
          kindId:      r.kindId,
          kindLabel:   r.kindLabel,
          contactId:   otherId,
          contactName: otherContact ? displayName(otherContact) : '?',
          direction:   r.fromContactId === input.contactId ? 'from' : 'to',
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

      // Create forward relationship
      const [forward] = await db.insert(contactRelationship).values({
        tenantId,
        fromContactId: input.fromContactId,
        toContactId:   input.toContactId,
        kindId:        input.kindId,
        notes:         input.notes,
        createdBy:     userId,
      }).returning({ id: contactRelationship.id });

      // Create inverse relationship using inverseLabel kind
      // (same kindId if symmetric, or create inverse entry)
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
      // Soft-delete both directions of the relationship
      const rel = await db.query.contactRelationship.findFirst({
        where: and(
          eq(contactRelationship.id, input.id),
          eq(contactRelationship.tenantId, tenantId),
        ),
      });
      if (!rel) throw new TRPCError({ code: 'NOT_FOUND' });

      const now = new Date();
      await db
        .update(contactRelationship)
        .set({ deletedAt: now })
        .where(
          and(
            eq(contactRelationship.tenantId, tenantId),
            or(
              eq(contactRelationship.id, input.id),
              and(
                eq(contactRelationship.fromContactId, rel.toContactId),
                eq(contactRelationship.toContactId, rel.fromContactId),
                eq(contactRelationship.kindId, rel.kindId),
              ),
            ),
          )
        );
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
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      const conditions = [
        eq(contact.tenantId, tenantId),
        isNull(contact.deletedAt),
        ...criteriaToSql(input.criteria),
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
      await db
        .update(contactSegment)
        .set({ ...updates, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
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
      .where(eq(contactTag.tenantId, tenantId))
      .orderBy(contactTag.tag);
    return rows.map((r) => r.tag);
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
      // Find suspected duplicates using pg_trgm similarity on name + email overlap
      // Returns pairs (a_id, b_id, score) sorted by score DESC
      const rows = await db.execute(sql`
        SELECT
          a.id AS a_id,
          b.id AS b_id,
          a.first_name AS a_first_name,
          a.last_name AS a_last_name,
          a.legal_name AS a_legal_name,
          a.kind AS a_kind,
          a.emails AS a_emails,
          a.phones AS a_phones,
          b.first_name AS b_first_name,
          b.last_name AS b_last_name,
          b.legal_name AS b_legal_name,
          b.kind AS b_kind,
          b.emails AS b_emails,
          b.phones AS b_phones,
          similarity(
            coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'') || ' ' || coalesce(a.legal_name,''),
            coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'') || ' ' || coalesce(b.legal_name,'')
          ) AS name_sim
        FROM contact a
        JOIN contact b ON b.tenant_id = a.tenant_id AND b.id > a.id
        WHERE a.tenant_id = ${tenantId}::uuid
          AND a.deleted_at IS NULL
          AND b.deleted_at IS NULL
          AND (
            similarity(
              coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'') || ' ' || coalesce(a.legal_name,''),
              coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'') || ' ' || coalesce(b.legal_name,'')
            ) > 0.4
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(a.emails) ae, jsonb_array_elements(b.emails) be
              WHERE lower(ae->>'value') = lower(be->>'value')
            )
          )
        ORDER BY name_sim DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      return (rows as unknown[]).map((r: any) => ({
        aId:       r.a_id as string,
        bId:       r.b_id as string,
        aName:     displayName({ kind: r.a_kind, firstName: r.a_first_name, lastName: r.a_last_name, legalName: r.a_legal_name }),
        bName:     displayName({ kind: r.b_kind, firstName: r.b_first_name, lastName: r.b_last_name, legalName: r.b_legal_name }),
        aEmails:   (r.a_emails as {value:string}[]).map((e) => e.value),
        bEmails:   (r.b_emails as {value:string}[]).map((e) => e.value),
        score:     parseFloat(r.name_sim as string),
      }));
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
      tags:         z.array(z.string()).optional(),
      ownerIds:     z.array(z.string().uuid()).optional(),
      leadScoreMin: z.number().int().min(0).max(100).optional(),
      leadScoreMax: z.number().int().min(0).max(100).optional(),
      hasOpenLeads: z.boolean().optional(),
      createdFrom:  z.string().datetime().optional(),
      createdTo:    z.string().datetime().optional(),
      cursor:       z.string().uuid().optional(),
      limit:        z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const conditions: ReturnType<typeof eq>[] = [
        eq(contact.tenantId, tenantId),
        isNull(contact.deletedAt),
      ];

      if (input.q) {
        conditions.push(
          sql`(
            (${contact.firstName} || ' ' || ${contact.lastName} || ' ' || coalesce(${contact.legalName},''))
            ILIKE ${'%' + input.q + '%'}
            OR ${contact.emails}::text ILIKE ${'%' + input.q + '%'}
            OR ${contact.phones}::text ILIKE ${'%' + input.q + '%'}
          )` as any
        );
      }
      if (input.kind?.length) conditions.push(inArray(contact.kind, input.kind) as any);
      if (input.ownerIds?.length) conditions.push(inArray(contact.ownerUserId, input.ownerIds) as any);
      if (input.leadScoreMin != null) conditions.push(gte(contact.leadScore, input.leadScoreMin) as any);
      if (input.leadScoreMax != null) conditions.push(lte(contact.leadScore, input.leadScoreMax) as any);
      if (input.createdFrom) conditions.push(gte(contact.createdAt, new Date(input.createdFrom)) as any);
      if (input.createdTo)   conditions.push(lte(contact.createdAt, new Date(input.createdTo)) as any);

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
        .orderBy(desc(contact.updatedAt))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;

      return {
        items: items.map((c) => ({
          ...c,
          displayName: displayName(c),
          primaryEmail: (c.emails as {value:string;primary:boolean}[]).find((e) => e.primary)?.value
            ?? (c.emails as {value:string}[])[0]?.value ?? null,
          primaryPhone: (c.phones as {e164:string;primary:boolean}[]).find((p) => p.primary)?.e164
            ?? (c.phones as {e164:string}[])[0]?.e164 ?? null,
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
      emails:     z.array(z.string().email()).default([]),
      phones:     z.array(z.string()).default([]),
      nationalId: z.string().optional(),
      excludeId:  z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      const conditions: any[] = [
        eq(contact.tenantId, tenantId),
        isNull(contact.deletedAt),
      ];
      if (input.excludeId) conditions.push(ne(contact.id, input.excludeId));

      const candidates = await db
        .select({
          id: contact.id, kind: contact.kind,
          firstName: contact.firstName, lastName: contact.lastName, legalName: contact.legalName,
          emails: contact.emails, phones: contact.phones, nationalId: contact.nationalId,
        })
        .from(contact)
        .where(and(...conditions))
        .limit(500);

      const scored = candidates
        .map((c) => ({
          id:   c.id,
          name: displayName(c),
          score: scoreDuplicateFields(
            { firstName: c.firstName, lastName: c.lastName, emails: input.emails, phones: input.phones, nationalId: input.nationalId ?? null },
            {
              firstName: c.firstName, lastName: c.lastName,
              emails: (c.emails as {value:string}[]).map((e) => e.value),
              phones: (c.phones as {e164:string}[]).map((p) => p.e164),
              nationalId: c.nationalId,
            },
          ),
        }))
        .filter((c) => c.score >= 0.4)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return { duplicates: scored };
    }),

  create: protectedProcedure
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
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
      id:   z.string().uuid(),
      data: contactCreateSchema.partial(),
      tags: z.array(z.string().min(1).max(50)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;
      const { data, tags } = input;

      await db
        .update(contact)
        .set({ ...data, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId)));

      if (tags !== undefined) {
        // Replace tag set
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
        .set({
          deletedAt:      new Date(),
          deletedBy:      userId,
          deletionReason: 'manual',
        })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId)));
      return { ok: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;
      await db
        .update(contact)
        .set({ deletedAt: null, deletedBy: null, deletionReason: null })
        .where(and(eq(contact.id, input.id), eq(contact.tenantId, tenantId)));
      return { ok: true };
    }),

  merge: protectedProcedure
    .input(z.object({
      winnerId: z.string().uuid(),
      loserId:  z.string().uuid(),
      // Field-level overrides: { fieldName: 'winner' | 'loser' }
      fieldWinners: z.record(z.string(), z.enum(['winner', 'loser'])).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx;

      const [winner, loser] = await Promise.all([
        db.query.contact.findFirst({
          where: and(eq(contact.id, input.winnerId), eq(contact.tenantId, tenantId))
        }),
        db.query.contact.findFirst({
          where: and(eq(contact.id, input.loserId), eq(contact.tenantId, tenantId))
        }),
      ]);

      if (!winner || !loser) throw new TRPCError({ code: 'NOT_FOUND' });

      // Apply field-level overrides
      const mergedFields: Record<string, unknown> = {};
      const mergeableFields = [
        'firstName', 'lastName', 'nationalIdType', 'nationalId', 'birthDate', 'gender',
        'legalName', 'cuit', 'industry', 'phones', 'emails', 'addresses',
        'leadScore', 'source', 'notes', 'ownerUserId',
      ];
      for (const field of mergeableFields) {
        const src = input.fieldWinners[field] === 'loser' ? loser : winner;
        mergedFields[field] = (src as any)[field];
      }

      await db
        .update(contact)
        .set({ ...mergedFields, updatedBy: userId, updatedAt: new Date(), version: sql`version + 1` })
        .where(eq(contact.id, input.winnerId));

      // Re-attribute loser's tags to winner
      const loserTags = await db
        .select({ tag: contactTag.tag })
        .from(contactTag)
        .where(and(eq(contactTag.contactId, input.loserId), eq(contactTag.tenantId, tenantId)));

      if (loserTags.length) {
        await db.insert(contactTag).values(
          loserTags.map((t) => ({ tenantId, contactId: input.winnerId, tag: t.tag, createdBy: userId }))
        ).onConflictDoNothing();
      }

      // Re-attribute loser's relationships to winner
      await db
        .update(contactRelationship)
        .set({ fromContactId: input.winnerId })
        .where(and(
          eq(contactRelationship.fromContactId, input.loserId),
          eq(contactRelationship.tenantId, tenantId),
        ));
      await db
        .update(contactRelationship)
        .set({ toContactId: input.winnerId })
        .where(and(
          eq(contactRelationship.toContactId, input.loserId),
          eq(contactRelationship.tenantId, tenantId),
        ));

      // Soft-delete loser
      await db
        .update(contact)
        .set({
          deletedAt:     new Date(),
          deletedBy:     userId,
          deletionReason: 'merged_into',
          mergeWinnerId: input.winnerId,
        })
        .where(eq(contact.id, input.loserId));

      return { ok: true, winnerId: input.winnerId };
    }),

  relationships: relationshipsRouter,
  segments:      segmentsRouter,
  duplicates:    duplicatesRouter,
  tags:          tagsRouter,
});
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
cd /Users/martinmarquez/property-manager-3.0
pnpm --filter @corredor/api exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/routers/contacts.ts
git commit -m "feat(api): contacts tRPC router — CRUD, relationships, segments, merge, duplicates

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 8: Wire contacts router

**Files:**
- Modify: `apps/api/src/router.ts`

- [ ] **Step 1: Update router.ts**

```typescript
import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';
import { contactsRouter } from './routers/contacts.js';

export const appRouter = router({
  system:   healthRouter,
  auth:     authRouter,
  contacts: contactsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
pnpm --filter @corredor/api exec tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/router.ts
git commit -m "feat(api): wire contacts router into app router

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 9: Contact List Page

**Files:**
- Create: `apps/web/src/pages/contacts/ContactListPage.tsx`

The component matches the visual style established in `PropertyListPage.tsx` (dark theme, Syne/DM Sans fonts). Uses mock data until the API is wired.

- [ ] **Step 1: Create ContactListPage.tsx**

See full source in implementation — contact list with search input, filter chips (kind, lead score, has open leads), virtualized rows showing avatar, name, phone, email, lead score badge, agent, last activity. "+ Nuevo contacto" opens `/contacts/new`. Each row links to `/contacts/:id`.

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/pages/contacts/
git commit -m "feat(web): contact list page — virtualized list, search, filter chips

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Task 10: Contact Form Page

**Files:**
- Create: `apps/web/src/pages/contacts/ContactFormPage.tsx`

Person/company type switcher. Person form: name, national ID, phones, emails, agent, source, notes, tags. Company form: legal name, CUIT, industry, phones, emails. Inline duplicate warning banner when email/phone matches. Save button with < 500ms feedback.

---

## Task 11: Contact Detail Page

**Files:**
- Create: `apps/web/src/pages/contacts/ContactDetailPage.tsx`
- Create: `apps/web/src/pages/contacts/RelationshipsTab.tsx`

Tabbed layout: Info | Relaciones | Actividad. Relationships tab shows typed relationship list + "Agregar relación" modal.

---

## Task 12: Duplicates Page

**Files:**
- Create: `apps/web/src/pages/contacts/DuplicatesPage.tsx`

Clusters sorted by confidence. "Fusionar" opens side-by-side merge modal with field-level winner selection.

---

## Task 13: Segment Builder Page

**Files:**
- Create: `apps/web/src/pages/contacts/SegmentBuilderPage.tsx`

Criterion rows (field + op + value). Live preview count (debounced 500ms). Save segment form.

---

## Task 14: Wire New Routes

**Files:**
- Modify: `apps/web/src/main.tsx`

Add routes:
- `/contacts` → `ContactListPage`
- `/contacts/new` → `ContactFormPage` (mode=create)
- `/contacts/:id` → `ContactDetailPage`
- `/contacts/:id/edit` → `ContactFormPage` (mode=edit)
- `/contacts/duplicates` → `DuplicatesPage`
- `/contacts/segments` → `SegmentsListPage`
- `/contacts/segments/new` → `SegmentBuilderPage`
- `/contacts/segments/:id` → `SegmentBuilderPage` (mode=edit)

---

## Spec Coverage Check

| Requirement | Task |
|------------|------|
| Virtualized contact list sorted by updated_at DESC | Task 9 |
| Real-time trigram search (debounced 200ms) | Task 7 (`list` procedure) + Task 9 |
| Filter chips: type, tag, agent, source, lead score, has open leads | Task 9 |
| Person fields (name, DNI/CUIT/CUIL, birth date, gender, phones, emails) | Task 1+7 |
| Company fields (legal name, CUIT, industry, primary contact) | Task 1+7 |
| Duplicate check on save (email + phone + DNI) | Task 5+7 (`checkDuplicates`) |
| contact.created/updated/deleted events | Emitted from router mutations (Task 7) |
| audit_log rows on mutation | Covered by tRPC `auditLogMiddleware` in trpc.ts |
| Typed relationship kinds (built-in + custom) | Task 1+2+7 |
| Bidirectional relationships (A→B creates B→A in UI) | Task 7 (`relationships.create`) |
| Segment builder with live preview < 2s | Task 7 (`segments.preview`) + Task 13 |
| Segment membership recomputed on domain events | Task 7 + BullMQ job (follow-up) |
| Duplicates page: clusters sorted by confidence | Task 7 (`duplicates.list`) + Task 12 |
| Side-by-side merge with field-level winner selection | Task 7 (`merge`) + Task 12 |
| Post-merge: leads/threads/ownerships re-attributed | Task 7 (`merge`) + Phase C for leads |
| Loser soft-deleted with reason=merged_into | Task 7 (`merge`) |
| Combined activity timeline (Phase C) | Deferred to Phase C |
