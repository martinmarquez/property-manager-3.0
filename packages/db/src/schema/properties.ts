/**
 * Properties entity group
 *
 * Tables: property, property_listing, property_media,
 *         property_tag, property_history, saved_view
 *
 * RLS policy (apply via migration):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const operationKindEnum = pgEnum('operation_kind', [
  'sale',
  'rent',
  'temp_rent',
  'commercial_rent',
  'commercial_sale',
]);

export const propertyStatusEnum = pgEnum('property_status', [
  'active',
  'reserved',
  'sold',
  'paused',
  'archived',
]);

export const currencyEnum = pgEnum('currency', ['ARS', 'USD']);

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment',
  'ph',
  'house',
  'quinta',
  'land',
  'office',
  'commercial',
  'garage',
  'warehouse',
  'farm',
  'hotel',
  'building',
  'business_fund',
  'development',
]);

export const mediaDeletionReasonEnum = pgEnum('media_deletion_reason', [
  'duplicate',
  'sold_externally',
  'owner_withdrew',
  'data_error',
  'other',
]);

export const propertyDeletionReasonEnum = pgEnum('property_deletion_reason', [
  'sold_externally',
  'owner_withdrew',
  'duplicate',
  'data_error',
  'other',
]);

// ---------------------------------------------------------------------------
// property — core listing record
// ---------------------------------------------------------------------------

export const property = pgTable('property', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id'),

  referenceCode: text('reference_code').notNull(),
  title: text('title'),
  description: text('description'),

  // Classification
  propertyType: propertyTypeEnum('property_type').notNull(),
  subtype: text('subtype'),

  // Physical dimensions
  coveredAreaM2: real('covered_area_m2'),
  totalAreaM2: real('total_area_m2'),
  rooms: integer('rooms'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  toilets: integer('toilets'),
  garages: integer('garages'),
  ageYears: integer('age_years'),

  // Geography
  country: text('country').notNull().default('AR'),
  province: text('province'),
  locality: text('locality'),
  neighborhood: text('neighborhood'),
  addressStreet: text('address_street'),
  addressNumber: text('address_number'),
  lat: real('lat'),
  lng: real('lng'),

  // Status flags
  status: propertyStatusEnum('status').notNull().default('active'),
  featured: boolean('featured').notNull().default(false),
  hasPricePublic: boolean('has_price_public').notNull().default(true),

  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => user.id),
  deletionReason: propertyDeletionReasonEnum('deletion_reason'),
  deletionNote: text('deletion_note'),
  autoPurgeAt: timestamp('auto_purge_at', { withTimezone: true }),

  // Audit columns
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// property_listing — one row per operation type on a property
// A single property can have multiple listings (sale + rent simultaneously)
// ---------------------------------------------------------------------------

export const propertyListing = pgTable('property_listing', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => property.id),
  kind: operationKindEnum('kind').notNull(),
  priceAmount: numeric('price_amount', { precision: 18, scale: 2 }),
  priceCurrency: currencyEnum('price_currency').notNull().default('USD'),
  commissionPct: real('commission_pct'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// property_media — photos, videos, floor plans, 3D tour embeds
// ---------------------------------------------------------------------------

export const propertyMedia = pgTable('property_media', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => property.id),
  sortOrder: integer('sort_order').notNull().default(0),
  // 'photo' | 'video' | 'floorplan' | 'tour'
  mediaType: text('media_type').notNull().default('photo'),
  // Cloudflare Images key / Mux asset id / URL for tour embeds
  storageKey: text('storage_key').notNull(),
  // CDN variant URLs (null until processed)
  thumbUrl: text('thumb_url'),   // 160×120
  mediumUrl: text('medium_url'), // 800×600
  fullUrl: text('full_url'),     // 1920×1440
  caption: text('caption'),
  // { [portalId]: { hidden: true } } — per-portal visibility overrides
  portalOverrides: jsonb('portal_overrides').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// property_tag — many-to-many join to the tag table (Phase B+)
// ---------------------------------------------------------------------------

export const propertyTag = pgTable('property_tag', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => property.id),
  // FK to tag.id — tag table added in Phase B tag management issue
  tagId: uuid('tag_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// property_history — immutable field-level change log
// ---------------------------------------------------------------------------

export const propertyHistory = pgTable('property_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => property.id),
  actorId: uuid('actor_id').references(() => user.id),
  // Human-readable field name, e.g. 'status', 'price_amount', 'bedrooms'
  field: text('field').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  eventSource: text('event_source').notNull().default('single'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// saved_view — per-user named filter presets for the property list
// ---------------------------------------------------------------------------

export const savedView = pgTable('saved_view', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  // 'properties' | 'contacts' — module that owns this view
  module: text('module').notNull().default('properties'),
  name: text('name').notNull(),
  // Full serialized URL search params (PropertyFilter shape)
  filterState: jsonb('filter_state').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// import_job — one row per CSV import session
// ---------------------------------------------------------------------------

export const importJob = pgTable('import_job', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  createdBy: uuid('created_by').references(() => user.id),
  status: text('status').notNull().default('pending'),
  originalFilename: text('original_filename'),
  columnMapping: jsonb('column_mapping').notNull().default('{}'),
  totalRows: integer('total_rows'),
  importedRows: integer('imported_rows').default(0),
  skippedRows: integer('skipped_rows').default(0),
  failedRows: integer('failed_rows').default(0),
  resultStorageKey: text('result_storage_key'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// import_job_row — one row per CSV input row
// ---------------------------------------------------------------------------

export const importJobRow = pgTable('import_job_row', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  importJobId: uuid('import_job_id')
    .notNull()
    .references(() => importJob.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  rowNumber: integer('row_number').notNull(),
  rowStatus: text('row_status').notNull().default('pending'),
  referenceCode: text('reference_code'),
  propertyId: uuid('property_id').references(() => property.id),
  errorReason: text('error_reason'),
  rawData: jsonb('raw_data'),
});

// ---------------------------------------------------------------------------
// Type exports — import tables
// ---------------------------------------------------------------------------
export type ImportJob = typeof importJob.$inferSelect;
export type NewImportJob = typeof importJob.$inferInsert;

export type ImportJobRow = typeof importJobRow.$inferSelect;
export type NewImportJobRow = typeof importJobRow.$inferInsert;
