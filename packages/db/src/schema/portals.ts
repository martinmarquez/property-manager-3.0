/**
 * Portal sync entity group (RENA-60)
 *
 * Tables: portal_connection, property_portal_publication, portal_sync_log
 *
 * RLS policy (applied via migration 0013_portals.sql):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';
import { property } from './properties.js';

// ---------------------------------------------------------------------------
// Custom type for bytea columns (credentials stored as encrypted bytes)
// ---------------------------------------------------------------------------

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const portalTypeEnum = pgEnum('portal_type', [
  'mercadolibre',
  'zonaprop',
  'argenprop',
  'proppit',
  'inmuebles24',
  'properati',
  'idealista',
  'remax',
  'generic_xml',
]);

export const portalConnectionStatusEnum = pgEnum('portal_connection_status', [
  'active',
  'paused',
  'error',
  'expired',
  'pending_auth',
]);

export const publicationStatusEnum = pgEnum('publication_status', [
  'draft',
  'publishing',
  'published',
  'update_pending',
  'unpublishing',
  'unpublished',
  'error',
]);

export const syncActionEnum = pgEnum('sync_action', [
  'publish',
  'update',
  'unpublish',
  'fetch_leads',
  'validate_credentials',
  'full_sync',
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'pending',
  'running',
  'success',
  'failed',
]);

// ---------------------------------------------------------------------------
// portal_connection — one row per tenant×portal credential set
// ---------------------------------------------------------------------------

export const portalConnection = pgTable('portal_connection', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:     uuid('tenant_id').notNull(),
  portal:       portalTypeEnum('portal').notNull(),
  label:        text('label'),
  status:       portalConnectionStatusEnum('status').notNull().default('pending_auth'),
  credentials:  bytea('credentials').notNull(),
  config:       jsonb('config').notNull().default(sql`'{}'::jsonb`),
  lastSyncAt:   timestamp('last_sync_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  deletedAt:    timestamp('deleted_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:    uuid('created_by').references(() => user.id),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:    uuid('updated_by').references(() => user.id),
  version:      integer('version').notNull().default(1),
});

export type PortalConnection = typeof portalConnection.$inferSelect;
export type NewPortalConnection = typeof portalConnection.$inferInsert;

// ---------------------------------------------------------------------------
// property_portal_publication — tracks each property on each portal
// ---------------------------------------------------------------------------

export const propertyPortalPublication = pgTable('property_portal_publication', {
  id:                   uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:             uuid('tenant_id').notNull(),
  propertyId:           uuid('property_id').notNull().references(() => property.id),
  portalConnectionId:   uuid('portal_connection_id').notNull().references(() => portalConnection.id),
  status:               publicationStatusEnum('status').notNull().default('draft'),
  portalListingId:      text('portal_listing_id'),
  portalUrl:            text('portal_url'),
  publishedAt:          timestamp('published_at', { withTimezone: true }),
  lastSyncedAt:         timestamp('last_synced_at', { withTimezone: true }),
  errorMessage:         text('error_message'),
  portalSpecificFields: jsonb('portal_specific_fields').notNull().default(sql`'{}'::jsonb`),
  deletedAt:            timestamp('deleted_at', { withTimezone: true }),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:            uuid('created_by').references(() => user.id),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:            uuid('updated_by').references(() => user.id),
  version:              integer('version').notNull().default(1),
});

export type PropertyPortalPublication = typeof propertyPortalPublication.$inferSelect;
export type NewPropertyPortalPublication = typeof propertyPortalPublication.$inferInsert;

// ---------------------------------------------------------------------------
// portal_sync_log — append-only audit trail of sync operations
// ---------------------------------------------------------------------------

export const portalSyncLog = pgTable('portal_sync_log', {
  id:                  uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:            uuid('tenant_id').notNull(),
  portalConnectionId:  uuid('portal_connection_id').notNull().references(() => portalConnection.id),
  publicationId:       uuid('publication_id').references(() => propertyPortalPublication.id),
  action:              syncActionEnum('action').notNull(),
  status:              syncStatusEnum('status').notNull().default('pending'),
  requestPayload:      jsonb('request_payload'),
  responsePayload:     jsonb('response_payload'),
  errorMessage:        text('error_message'),
  startedAt:           timestamp('started_at', { withTimezone: true }).notNull().default(sql`now()`),
  completedAt:         timestamp('completed_at', { withTimezone: true }),
  durationMs:          integer('duration_ms'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type PortalSyncLog = typeof portalSyncLog.$inferSelect;
export type NewPortalSyncLog = typeof portalSyncLog.$inferInsert;
