-- =============================================================================
-- Migration: 0007_analytics
-- Phase G prep — Analytics schema + KPI framework
-- Depends on: 0004_properties_base (property table for materialized view)
--
-- Tables:    analytics_events, kpi_snapshot_daily, analytics_events_archive
-- Indexes:   tenant+time, event_type, entity, actor, JSONB GIN
-- Views:     mv_active_properties_by_tenant
-- RLS:       tenant_isolation on analytics_events, kpi_snapshot_daily
--
-- Retention: analytics_events = 90-day hot storage; archive via scheduled job
-- Rollup:    kpi_snapshot_daily populated nightly by ANALYTICS_ROLLUP queue job
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Event taxonomy enum
-- Dot-namespaced:  <entity>.<action>
-- ---------------------------------------------------------------------------
CREATE TYPE analytics_event_type AS ENUM (
  -- Property lifecycle
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

  -- Lead lifecycle
  'lead.created',
  'lead.assigned',
  'lead.contacted',
  'lead.qualified',
  'lead.disqualified',
  'lead.converted',
  'lead.closed_won',
  'lead.closed_lost',

  -- Opportunity (deal pipeline)
  'opportunity.created',
  'opportunity.stage_changed',
  'opportunity.closed_won',
  'opportunity.closed_lost',

  -- Portal syndication
  'portal.published',
  'portal.unpublished',
  'portal.property_synced',
  'portal.lead_received',

  -- Unified inbox / messaging
  'message.sent',
  'message.received',
  'message.read',

  -- Contacts
  'contact.created',
  'contact.updated',
  'contact.merged',

  -- Users / agents
  'user.login',
  'user.logout',
  'user.invited',

  -- Bulk import jobs
  'import.started',
  'import.completed',
  'import.failed'
);

-- ---------------------------------------------------------------------------
-- Entity type enum — what the event is about
-- ---------------------------------------------------------------------------
CREATE TYPE analytics_entity_type AS ENUM (
  'property',
  'lead',
  'opportunity',
  'portal',
  'message',
  'contact',
  'user',
  'import_job'
);

-- ---------------------------------------------------------------------------
-- analytics_events  (append-only; bigserial PK like audit_log)
-- ---------------------------------------------------------------------------
CREATE TABLE analytics_events (
  id            bigserial               PRIMARY KEY,
  tenant_id     uuid                    NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  event_type    analytics_event_type    NOT NULL,
  entity_type   analytics_entity_type,
  entity_id     uuid,                   -- the entity being acted on (nullable for user-session events)
  actor_id      uuid                    REFERENCES "user"(id) ON DELETE SET NULL,
  properties    jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   timestamptz             NOT NULL DEFAULT now(),
  created_at    timestamptz             NOT NULL DEFAULT now()
);

-- Primary access patterns:
--   1. All events for a tenant in a time window
CREATE INDEX analytics_events_tenant_time_idx
  ON analytics_events (tenant_id, occurred_at DESC);

--   2. Events of a specific type for a tenant
CREATE INDEX analytics_events_type_idx
  ON analytics_events (tenant_id, event_type, occurred_at DESC);

--   3. All events for a specific entity (e.g. property detail timeline)
CREATE INDEX analytics_events_entity_idx
  ON analytics_events (tenant_id, entity_type, entity_id, occurred_at DESC)
  WHERE entity_id IS NOT NULL;

--   4. All actions by a specific user (agent activity feed)
CREATE INDEX analytics_events_actor_idx
  ON analytics_events (tenant_id, actor_id, occurred_at DESC)
  WHERE actor_id IS NOT NULL;

--   5. JSONB property filters (e.g. channel, source, stage_name)
CREATE INDEX analytics_events_properties_gin_idx
  ON analytics_events USING gin (properties);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON analytics_events
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- analytics_events_archive  (cold storage; no RLS; service-role access only)
-- Rows older than 90 days are moved here by the ANALYTICS_ARCHIVE queue job.
-- ---------------------------------------------------------------------------
CREATE TABLE analytics_events_archive (
  LIKE analytics_events INCLUDING ALL
);

-- ---------------------------------------------------------------------------
-- KPI dimension and metric type enums
-- ---------------------------------------------------------------------------
CREATE TYPE kpi_dimension_type AS ENUM (
  'agency',     -- whole-agency aggregate (dimension_id = NULL)
  'agent',      -- per user / agent
  'property',   -- per property
  'channel'     -- per lead source / portal channel
);

CREATE TYPE kpi_metric_type AS ENUM (
  -- Agency-level metrics
  'active_properties_count',
  'leads_created_count',
  'leads_converted_count',
  'lead_conversion_rate',       -- percentage (0–100)
  'avg_days_to_close',
  'revenue_pipeline_amount',    -- stored in tenant's base currency
  'portal_reach_count',         -- total property views across all portals
  'new_contacts_count',

  -- Agent-level metrics
  'leads_assigned_count',
  'avg_lead_response_time_hours',
  'deals_closed_count',
  'commission_earned_amount',

  -- Property-level metrics
  'days_on_market',
  'property_views_count',
  'property_inquiries_count',
  'price_change_count',

  -- Channel-level metrics
  'channel_leads_count',
  'cost_per_lead_amount',
  'channel_avg_response_time_hours'
);

-- ---------------------------------------------------------------------------
-- kpi_snapshot_daily  (populated nightly by ANALYTICS_ROLLUP job)
-- One row per (tenant, date, dimension_type, dimension_id, metric).
-- UPSERT-safe: job uses ON CONFLICT DO UPDATE.
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_snapshot_daily (
  id              bigserial           PRIMARY KEY,
  tenant_id       uuid                NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  snapshot_date   date                NOT NULL,
  dimension_type  kpi_dimension_type  NOT NULL,
  dimension_id    uuid,               -- NULL = agency-level
  dimension_label text,               -- cached name at snapshot time (user name, property ref, etc.)
  metric          kpi_metric_type     NOT NULL,
  value           numeric(18, 4)      NOT NULL DEFAULT 0,
  metadata        jsonb               NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT kpi_snapshot_daily_uniq
    UNIQUE (tenant_id, snapshot_date, dimension_type, COALESCE(dimension_id, '00000000-0000-0000-0000-000000000000'::uuid), metric)
);

-- Date-range dashboard queries
CREATE INDEX kpi_snapshot_daily_tenant_date_idx
  ON kpi_snapshot_daily (tenant_id, snapshot_date DESC, dimension_type);

-- Drill-down by specific dimension (agent leaderboard, property report)
CREATE INDEX kpi_snapshot_daily_dimension_idx
  ON kpi_snapshot_daily (tenant_id, dimension_type, dimension_id, snapshot_date DESC)
  WHERE dimension_id IS NOT NULL;

ALTER TABLE kpi_snapshot_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kpi_snapshot_daily
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Materialized view: active property counts per tenant
-- Refreshed nightly alongside kpi_snapshot_daily rollup.
-- Use CONCURRENTLY in production: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_properties_by_tenant
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_active_properties_by_tenant AS
SELECT
  tenant_id,
  COUNT(*)                                          AS total_count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL)        AS non_deleted_count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL
    AND status = 'active')                          AS active_count,
  now()                                             AS refreshed_at
FROM property
GROUP BY tenant_id;

CREATE UNIQUE INDEX mv_active_properties_by_tenant_pk
  ON mv_active_properties_by_tenant (tenant_id);
