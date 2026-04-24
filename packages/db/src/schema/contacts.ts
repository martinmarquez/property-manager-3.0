/**
 * Contacts entity group
 *
 * Tables: contact, contact_relationship_kind, contact_relationship,
 *         contact_tag, contact_segment, contact_segment_member
 *
 * RLS policy (applied via migration 0004_contacts.sql):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
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
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),

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

  // Shared structured fields stored as JSONB arrays
  // phones:    [{e164: string, type: phone_type, whatsapp: boolean, primary: boolean}]
  // emails:    [{value: string, type: email_type, primary: boolean}]
  // addresses: [{street: string, number: string, city: string, province: string, zip: string}]
  phones:    jsonb('phones').notNull().default(sql`'[]'::jsonb`),
  emails:    jsonb('emails').notNull().default(sql`'[]'::jsonb`),
  addresses: jsonb('addresses').notNull().default(sql`'[]'::jsonb`),

  // CRM
  leadScore:   integer('lead_score').notNull().default(0),
  source:      text('source'),
  notes:       text('notes'),
  ownerUserId: uuid('owner_user_id').references(() => user.id),

  // Soft delete + merge
  mergeWinnerId:  uuid('merge_winner_id'),  // self-ref FK enforced in migration
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  deletedBy:      uuid('deleted_by').references(() => user.id),
  deletionReason: contactDeletionReasonEnum('deletion_reason'),

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
// contact_relationship_kind — tenant-scoped relationship type vocabulary
// ---------------------------------------------------------------------------

export const contactRelationshipKind = pgTable('contact_relationship_kind', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:     uuid('tenant_id').notNull(),
  label:        text('label').notNull(),
  inverseLabel: text('inverse_label'),
  builtIn:      boolean('built_in').notNull().default(false),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:    uuid('created_by').references(() => user.id),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:    uuid('updated_by').references(() => user.id),
  deletedAt:    timestamp('deleted_at', { withTimezone: true }),
  version:      integer('version').notNull().default(1),
}, (t) => ({
  uniq: unique().on(t.tenantId, t.label),
}));

export type ContactRelationshipKind = typeof contactRelationshipKind.$inferSelect;

// ---------------------------------------------------------------------------
// contact_relationship — typed bidirectional link between contacts
// ---------------------------------------------------------------------------

export const contactRelationship = pgTable('contact_relationship', {
  id:            uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:      uuid('tenant_id').notNull(),
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

export type ContactRelationship = typeof contactRelationship.$inferSelect;

// ---------------------------------------------------------------------------
// contact_tag — per-contact string label
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
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       uuid('tenant_id').notNull(),
  name:           text('name').notNull(),
  description:    text('description'),
  // criteria: SegmentCriterion[] — see apps/web/src/routes/contacts/-types.ts
  criteria:       jsonb('criteria').notNull().default(sql`'[]'::jsonb`),
  memberCount:    integer('member_count').notNull().default(0),
  lastComputedAt: timestamp('last_computed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ContactSegment = typeof contactSegment.$inferSelect;

// ---------------------------------------------------------------------------
// contact_segment_member — cached segment membership
// ---------------------------------------------------------------------------

export const contactSegmentMember = pgTable('contact_segment_member', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  segmentId: uuid('segment_id').notNull().references(() => contactSegment.id),
  contactId: uuid('contact_id').notNull().references(() => contact.id),
  addedAt:   timestamp('added_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  uniq: unique().on(t.segmentId, t.contactId),
}));

// ---------------------------------------------------------------------------
// contact_import_job — one row per CSV import session (RENA-32)
// ---------------------------------------------------------------------------

export const contactImportJob = pgTable('contact_import_job', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:         uuid('tenant_id').notNull(),
  createdBy:        uuid('created_by').references(() => user.id),
  status:           text('status').notNull().default('pending'),
  sourceFormat:     text('source_format'),
  originalFilename: text('original_filename'),
  columnMapping:    jsonb('column_mapping').notNull().default('{}'),
  totalRows:        integer('total_rows'),
  importedRows:     integer('imported_rows').default(0),
  skippedRows:      integer('skipped_rows').default(0),
  failedRows:       integer('failed_rows').default(0),
  resultStorageKey: text('result_storage_key'),
  errorMessage:     text('error_message'),
  startedAt:        timestamp('started_at', { withTimezone: true }),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ContactImportJob = typeof contactImportJob.$inferSelect;
export type NewContactImportJob = typeof contactImportJob.$inferInsert;

// ---------------------------------------------------------------------------
// contact_import_row — one row per CSV input row
// ---------------------------------------------------------------------------

export const contactImportRow = pgTable('contact_import_row', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  importJobId:  uuid('import_job_id').notNull().references(() => contactImportJob.id, { onDelete: 'cascade' }),
  tenantId:     uuid('tenant_id').notNull(),
  rowNumber:    integer('row_number').notNull(),
  rowStatus:    text('row_status').notNull().default('pending'),
  displayName:  text('display_name'),
  contactId:    uuid('contact_id').references(() => contact.id),
  errorReason:  text('error_reason'),
  rawData:      jsonb('raw_data'),
});

export type ContactImportRow = typeof contactImportRow.$inferSelect;
export type NewContactImportRow = typeof contactImportRow.$inferInsert;

// ---------------------------------------------------------------------------
// dsr_request — Data Subject Request lifecycle (Ley 25.326) (RENA-32)
// ---------------------------------------------------------------------------

export const dsrTypeEnum = pgEnum('dsr_type', [
  'access', 'rectify', 'delete', 'portability',
]);

export const dsrStatusEnum = pgEnum('dsr_status', [
  'pending', 'in_progress', 'completed', 'disputed',
]);

export const dsrRequest = pgTable('dsr_request', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:         uuid('tenant_id').notNull(),
  contactId:        uuid('contact_id').notNull().references(() => contact.id),
  type:             dsrTypeEnum('type').notNull(),
  status:           dsrStatusEnum('status').notNull().default('pending'),
  requestedBy:      uuid('requested_by').references(() => user.id),
  assignedTo:       uuid('assigned_to').references(() => user.id),
  notes:            text('notes'),
  deadlineAt:       timestamp('deadline_at', { withTimezone: true }).notNull(),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  disputedAt:       timestamp('disputed_at', { withTimezone: true }),
  disputeReason:    text('dispute_reason'),
  bundleStorageKey: text('bundle_storage_key'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type DsrRequest = typeof dsrRequest.$inferSelect;
export type NewDsrRequest = typeof dsrRequest.$inferInsert;
