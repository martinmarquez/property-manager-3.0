/**
 * Analytics schema — Phase G prep
 *
 * Tables:
 *   analytics_events           — append-only event log (bigserial PK, no soft-delete)
 *   kpi_snapshot_daily         — nightly KPI rollup per dimension × metric
 *   analytics_events_archive   — cold storage >90 days (service-role only)
 *
 * Materialized view:
 *   mv_active_properties_by_tenant — active property counts; refreshed nightly
 *
 * RLS: both hot tables enforce tenant_isolation.
 *      Archive table has no RLS (service-role access only).
 */

import {
  bigserial,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  // Property lifecycle
  'property.created',
  'property.updated',
  'property.deleted',
  'property.restored',
  'property.published',
  'property.unpublished',
  'property.price_changed',
  'property.status_changed',
  'property.viewed',
  'property.lead_generated',
  'property.imported',
  // Lead lifecycle
  'lead.created',
  'lead.assigned',
  'lead.contacted',
  'lead.qualified',
  'lead.disqualified',
  'lead.converted',
  'lead.closed_won',
  'lead.closed_lost',
  // Opportunity (deal pipeline)
  'opportunity.created',
  'opportunity.stage_changed',
  'opportunity.closed_won',
  'opportunity.closed_lost',
  // Portal syndication
  'portal.published',
  'portal.unpublished',
  'portal.property_synced',
  'portal.lead_received',
  'portal.sync_error',
  // Unified inbox / messaging
  'message.sent',
  'message.received',
  'message.read',
  'message.replied',
  // Contacts
  'contact.created',
  'contact.updated',
  'contact.merged',
  // Users / agents
  'user.login',
  'user.logout',
  'user.invited',
  // Bulk import jobs
  'import.started',
  'import.completed',
  'import.failed',
  // Activation funnel
  'activation.signup',
  'activation.profile_completed',
  'activation.data_imported',
  'activation.portal_connected',
  'activation.aha_moment',
  'activation.stickiness',
  // Retention / engagement
  'retention.streak_extended',
  'retention.streak_broken',
  'retention.digest_opened',
  'retention.digest_clicked',
  'retention.feature_discovered',
  'retention.health_score_computed',
  // Referral loop
  'referral.link_generated',
  'referral.link_clicked',
  'referral.signup_attributed',
  'referral.converted',
  // Trial & subscription lifecycle
  'trial.started',
  'trial.converted',
  'trial.expired',
  'subscription.upgraded',
  'subscription.downgraded',
  'subscription.cancelled',
  'subscription.renewed',
  // Phase G — Website builder (Sitio)
  'site.page_published',
  'site.page_unpublished',
  'site.page_viewed',
  'site.form_submitted',
  'site.custom_domain_connected',
  'site.theme_changed',
  'site.block_added',
  // Phase G — Appraisals (Tasaciones)
  'appraisal.created',
  'appraisal.comp_searched',
  'appraisal.ai_narrative_generated',
  'appraisal.pdf_downloaded',
  'appraisal.shared',
  // Phase G — Report adoption
  'report.viewed',
  'report.filter_applied',
  'report.exported',
  'report.pinned',
  'report.digest_scheduled',
  // Phase G — Billing
  'billing.checkout_started',
  'billing.checkout_completed',
  'billing.payment_failed',
]);

export const analyticsEntityTypeEnum = pgEnum('analytics_entity_type', [
  'property',
  'lead',
  'opportunity',
  'portal',
  'message',
  'contact',
  'user',
  'import_job',
  'tenant',
  'referral',
  'subscription',
  // Phase G
  'site',
  'appraisal',
  'report',
]);

export const kpiDimensionTypeEnum = pgEnum('kpi_dimension_type', [
  'agency',   // whole-agency aggregate (dimension_id = NULL)
  'agent',    // per user / agent
  'property', // per property
  'channel',  // per lead source / portal channel
]);

export const kpiMetricTypeEnum = pgEnum('kpi_metric_type', [
  // Agency-level
  'active_properties_count',
  'leads_created_count',
  'leads_converted_count',
  'lead_conversion_rate',
  'avg_days_to_close',
  'revenue_pipeline_amount',
  'portal_reach_count',
  'new_contacts_count',
  // Agent-level
  'leads_assigned_count',
  'avg_lead_response_time_hours',
  'deals_closed_count',
  'commission_earned_amount',
  // Property-level
  'days_on_market',
  'property_views_count',
  'property_inquiries_count',
  'price_change_count',
  // Channel-level
  'channel_leads_count',
  'cost_per_lead_amount',
  'channel_avg_response_time_hours',
  // Inbox / messaging (Phase D)
  'inbox_messages_received_count',
  'inbox_messages_sent_count',
  'inbox_avg_first_response_minutes',
  'inbox_sla_compliance_rate',
  // Portal performance (Phase D)
  'portal_publications_count',
  'portal_sync_error_count',
  'portal_lead_conversion_rate',
  // Lead attribution (Phase D)
  'lead_portal_attribution_count',
  // Growth / activation funnel
  'activation_rate',
  'time_to_aha_hours',
  'trial_conversion_rate',
  'trial_started_count',
  'trial_converted_count',
  'trial_expired_count',
  // Retention
  'day7_retention_rate',
  'day30_retention_rate',
  'health_score',
  'active_streak_days',
  // Revenue
  'mrr_amount',
  'arr_amount',
  'arpu_amount',
  'churn_rate',
  'expansion_mrr_amount',
  // Referral
  'referral_k_factor',
  'referrals_sent_count',
  'referrals_converted_count',
  // Phase G — Website builder (Sitio)
  'site_pages_published_count',
  'site_form_submissions_count',
  'site_custom_domains_count',
  'site_page_views_count',
  // Phase G — Appraisals
  'appraisals_created_count',
  'appraisal_comp_searches_count',
  'appraisal_ai_narrative_rate',
  'appraisal_pdf_downloads_count',
  // Phase G — Report adoption
  'report_views_count',
  'report_exports_count',
  'report_digest_subscriptions_count',
  // Phase G — Billing (platform-level)
  'billing_mrr_amount',
  'billing_arr_amount',
  'billing_arpu_amount',
  'billing_churn_rate',
  'billing_trial_conversion_rate',
  'billing_active_subscriptions_count',
  'billing_trials_active_count',
]);

// ---------------------------------------------------------------------------
// analytics_events — append-only event log
// ---------------------------------------------------------------------------

export const analyticsEvent = pgTable('analytics_events', {
  id:         bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId:   uuid('tenant_id').notNull(),
  eventType:  analyticsEventTypeEnum('event_type').notNull(),
  entityType: analyticsEntityTypeEnum('entity_type'),
  entityId:   uuid('entity_id'),
  actorId:    uuid('actor_id').references(() => user.id),
  properties: jsonb('properties').notNull().default(sql`'{}'::jsonb`),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvent.$inferInsert;

// ---------------------------------------------------------------------------
// kpi_snapshot_daily — nightly rollup, one row per dimension × metric × date
// ---------------------------------------------------------------------------

export const kpiSnapshotDaily = pgTable('kpi_snapshot_daily', {
  id:             bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId:       uuid('tenant_id').notNull(),
  snapshotDate:   date('snapshot_date').notNull(),
  dimensionType:  kpiDimensionTypeEnum('dimension_type').notNull(),
  dimensionId:    uuid('dimension_id'),
  dimensionLabel: text('dimension_label'),
  metric:         kpiMetricTypeEnum('metric').notNull(),
  value:          numeric('value', { precision: 18, scale: 4 }).notNull().default('0'),
  metadata:       jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type KpiSnapshotDaily = typeof kpiSnapshotDaily.$inferSelect;
export type NewKpiSnapshotDaily = typeof kpiSnapshotDaily.$inferInsert;
