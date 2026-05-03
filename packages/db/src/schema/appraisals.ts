/**
 * Appraisals (Tasaciones) entity group — Phase G
 *
 * Tables: appraisal, appraisal_comp, appraisal_report
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
import { property } from './properties.js';
import { operationKindEnum, propertyTypeEnum, currencyEnum } from './properties.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const appraisalStatusEnum = pgEnum('appraisal_status', [
  'draft',
  'in_progress',
  'in_review',
  'approved',
  'delivered',
  'archived',
]);

export const appraisalPurposeEnum = pgEnum('appraisal_purpose', [
  'sale',
  'rent',
  'guarantee',
  'inheritance',
  'tax',
  'insurance',
  'judicial',
  'other',
]);

// ---------------------------------------------------------------------------
// appraisal — main appraisal record
// ---------------------------------------------------------------------------

export const appraisal = pgTable('appraisal', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),

  // Subject property (optional FK — may be an external address)
  propertyId: uuid('property_id').references(() => property.id),

  // Client
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  clientPhone: text('client_phone'),

  // Subject property details (denormalized for standalone appraisals)
  addressStreet: text('address_street').notNull(),
  addressNumber: text('address_number'),
  locality: text('locality'),
  province: text('province'),
  country: text('country').notNull().default('AR'),
  lat: real('lat'),
  lng: real('lng'),

  propertyType: propertyTypeEnum('property_type').notNull(),
  operationKind: operationKindEnum('operation_kind').notNull(),
  coveredAreaM2: real('covered_area_m2'),
  totalAreaM2: real('total_area_m2'),
  rooms: integer('rooms'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  garages: integer('garages'),
  ageYears: integer('age_years'),

  // Appraisal metadata
  purpose: appraisalPurposeEnum('purpose').notNull().default('sale'),
  status: appraisalStatusEnum('status').notNull().default('draft'),
  referenceCode: text('reference_code'),

  // Value range (set after AI narrative or manual entry)
  estimatedValueMin: numeric('estimated_value_min', { precision: 18, scale: 2 }),
  estimatedValueMax: numeric('estimated_value_max', { precision: 18, scale: 2 }),
  valueCurrency: currencyEnum('value_currency').notNull().default('USD'),

  // Appraiser info
  appraiserSignatureUrl: text('appraiser_signature_url'),
  appraiserMatricula: text('appraiser_matricula'),
  appraiserName: text('appraiser_name'),

  notes: text('notes'),

  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Audit
  createdBy: uuid('created_by').references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// appraisal_comp — comparable properties (from PostGIS search or manual add)
// ---------------------------------------------------------------------------

export const appraisalComp = pgTable('appraisal_comp', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  appraisalId: uuid('appraisal_id').notNull().references(() => appraisal.id, { onDelete: 'cascade' }),

  // Source property (nullable — comp may come from external data)
  sourcePropertyId: uuid('source_property_id').references(() => property.id),

  // Comp details (denormalized)
  address: text('address').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  distanceM: real('distance_m'),

  propertyType: propertyTypeEnum('property_type'),
  operationKind: operationKindEnum('operation_kind'),
  coveredAreaM2: real('covered_area_m2'),
  totalAreaM2: real('total_area_m2'),
  rooms: integer('rooms'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),

  priceAmount: numeric('price_amount', { precision: 18, scale: 2 }),
  priceCurrency: currencyEnum('price_currency').notNull().default('USD'),
  pricePerM2: numeric('price_per_m2', { precision: 12, scale: 2 }),

  photoUrl: text('photo_url'),
  listingStatus: text('listing_status'),

  isIncluded: boolean('is_included').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// appraisal_report — AI narrative + PDF metadata
// ---------------------------------------------------------------------------

export const appraisalReport = pgTable('appraisal_report', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull(),
  appraisalId: uuid('appraisal_id').notNull().references(() => appraisal.id, { onDelete: 'cascade' }),

  // AI narrative output
  estimatedValueMin: numeric('estimated_value_min', { precision: 18, scale: 2 }),
  estimatedValueMax: numeric('estimated_value_max', { precision: 18, scale: 2 }),
  valueCurrency: currencyEnum('value_currency').notNull().default('USD'),
  narrativeMd: text('narrative_md'),
  compsSummary: text('comps_summary'),
  methodologyNote: text('methodology_note'),

  // AI metadata
  aiModel: text('ai_model'),
  aiLatencyMs: integer('ai_latency_ms'),
  aiInputTokens: integer('ai_input_tokens'),
  aiOutputTokens: integer('ai_output_tokens'),
  aiRawOutput: jsonb('ai_raw_output'),

  // PDF
  pdfStorageKey: text('pdf_storage_key'),
  pdfUrl: text('pdf_url'),
  pdfExpiresAt: timestamp('pdf_expires_at', { withTimezone: true }),
  pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),

  // Share
  shareToken: text('share_token'),
  shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type Appraisal = typeof appraisal.$inferSelect;
export type NewAppraisal = typeof appraisal.$inferInsert;

export type AppraisalComp = typeof appraisalComp.$inferSelect;
export type NewAppraisalComp = typeof appraisalComp.$inferInsert;

export type AppraisalReport = typeof appraisalReport.$inferSelect;
export type NewAppraisalReport = typeof appraisalReport.$inferInsert;
