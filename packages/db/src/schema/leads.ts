/**
 * Leads & Pipelines entity group (RENA-33)
 *
 * Tables: pipeline, pipeline_stage, lead, lead_stage_history
 *
 * RLS policy (applied via migration 0006_pipelines_leads.sql):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';
import { contact } from './contacts.js';
import { property, currencyEnum } from './properties.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const pipelineTypeEnum = pgEnum('pipeline_type', [
  'ventas', 'alquileres', 'desarrollos', 'custom',
]);

export const stageKindEnum = pgEnum('stage_kind', [
  'open', 'won', 'lost',
]);

// ---------------------------------------------------------------------------
// pipeline — tenant-scoped pipeline definitions
// ---------------------------------------------------------------------------

export const pipeline = pgTable('pipeline', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  name:      text('name').notNull(),
  type:      pipelineTypeEnum('type').notNull().default('custom'),
  isDefault: boolean('is_default').notNull().default(false),
  position:  integer('position').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  version:   integer('version').notNull().default(1),
});

export type Pipeline = typeof pipeline.$inferSelect;
export type NewPipeline = typeof pipeline.$inferInsert;

// ---------------------------------------------------------------------------
// pipeline_stage — ordered stages within a pipeline
// ---------------------------------------------------------------------------

export const pipelineStage = pgTable('pipeline_stage', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:   uuid('tenant_id').notNull(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipeline.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  kind:       stageKindEnum('kind').notNull().default('open'),
  color:      text('color').notNull().default('#4669ff'),
  slaHours:   integer('sla_hours'),
  position:   integer('position').notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:  uuid('created_by').references(() => user.id),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:  uuid('updated_by').references(() => user.id),
});

export type PipelineStage = typeof pipelineStage.$inferSelect;
export type NewPipelineStage = typeof pipelineStage.$inferInsert;

// ---------------------------------------------------------------------------
// lead — the opportunity record
// ---------------------------------------------------------------------------

export const lead = pgTable('lead', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:           uuid('tenant_id').notNull(),
  pipelineId:         uuid('pipeline_id').notNull().references(() => pipeline.id),
  stageId:            uuid('stage_id').notNull().references(() => pipelineStage.id),
  contactId:          uuid('contact_id').notNull().references(() => contact.id),
  propertyId:         uuid('property_id').references(() => property.id),
  title:              text('title'),
  expectedValue:      numeric('expected_value', { precision: 15, scale: 2 }),
  expectedCurrency:   currencyEnum('expected_currency').notNull().default('USD'),
  expectedCloseDate:  date('expected_close_date'),
  score:              integer('score').notNull().default(0),
  ownerUserId:        uuid('owner_user_id').references(() => user.id),
  lostReason:         text('lost_reason'),
  wonAt:              timestamp('won_at', { withTimezone: true }),
  lostAt:             timestamp('lost_at', { withTimezone: true }),
  stageEnteredAt:     timestamp('stage_entered_at', { withTimezone: true }).notNull().default(sql`now()`),
  deletedAt:          timestamp('deleted_at', { withTimezone: true }),
  deletedBy:          uuid('deleted_by').references(() => user.id),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:          uuid('created_by').references(() => user.id),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:          uuid('updated_by').references(() => user.id),
  version:            integer('version').notNull().default(1),
}, (t) => ({
  tenantPipelineStageIdx: index('idx_lead_tenant_pipeline_stage')
    .on(t.tenantId, t.pipelineId, t.stageId)
    .where(sql`deleted_at IS NULL`),
  tenantOwnerIdx: index('idx_lead_tenant_owner')
    .on(t.tenantId, t.ownerUserId)
    .where(sql`deleted_at IS NULL`),
  tenantCloseDateIdx: index('idx_lead_tenant_close_date')
    .on(t.tenantId, t.expectedCloseDate)
    .where(sql`deleted_at IS NULL`),
}));

export type Lead = typeof lead.$inferSelect;
export type NewLead = typeof lead.$inferInsert;

// ---------------------------------------------------------------------------
// lead_stage_history — immutable log of stage transitions
// ---------------------------------------------------------------------------

export const leadStageHistory = pgTable('lead_stage_history', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  leadId:    uuid('lead_id').notNull().references(() => lead.id, { onDelete: 'cascade' }),
  stageId:   uuid('stage_id').notNull().references(() => pipelineStage.id),
  enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().default(sql`now()`),
  exitedAt:  timestamp('exited_at', { withTimezone: true }),
  movedBy:   uuid('moved_by').references(() => user.id),
}, (t) => ({
  tenantLeadEnteredIdx: index('idx_lead_stage_history_tenant_lead')
    .on(t.tenantId, t.leadId, t.enteredAt),
}));

export type LeadStageHistory = typeof leadStageHistory.$inferSelect;
export type NewLeadStageHistory = typeof leadStageHistory.$inferInsert;
