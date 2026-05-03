-- 0021_phase_g_reports.sql
-- Phase G: Reportes API infrastructure
-- Creates materialized views for reports data endpoints,
-- plus tables for digest subscriptions and share links.

-- ============================================================================
-- MV-01: mv_pipeline_conversion
-- Stage-by-stage funnel conversion rates, avg time per stage, win/loss counts.
-- Source: lead, lead_stage_history, pipeline, pipeline_stage
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_pipeline_conversion AS
SELECT
  l.tenant_id,
  l.pipeline_id,
  ps.id                                     AS stage_id,
  ps.name                                   AS stage_name,
  ps.sort_order,
  ps.stage_kind,
  DATE_TRUNC('month', lsh.entered_at)       AS cohort_month,
  l.owner_user_id                           AS agent_id,
  COUNT(DISTINCT lsh.lead_id)               AS leads_entered,
  COUNT(DISTINCT lsh.lead_id)
    FILTER (WHERE lsh.exited_at IS NOT NULL) AS leads_exited,
  COUNT(DISTINCT l.id)
    FILTER (WHERE l.won_at IS NOT NULL
              AND lsh.stage_id = ps.id)     AS leads_won,
  COUNT(DISTINCT l.id)
    FILTER (WHERE l.lost_at IS NOT NULL
              AND lsh.stage_id = ps.id)     AS leads_lost,
  ROUND(
    100.0 * COUNT(DISTINCT lsh.lead_id)
              FILTER (WHERE lsh.exited_at IS NOT NULL)
    / NULLIF(COUNT(DISTINCT lsh.lead_id), 0), 2
  )                                          AS exit_rate_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (lsh.exited_at - lsh.entered_at)) / 3600
    ) FILTER (WHERE lsh.exited_at IS NOT NULL), 2
  )                                          AS avg_hours_in_stage,
  NOW()                                      AS refreshed_at
FROM lead_stage_history lsh
JOIN lead l          ON l.id = lsh.lead_id
JOIN pipeline_stage ps ON ps.id = lsh.stage_id
WHERE l.deleted_at IS NULL
GROUP BY
  l.tenant_id, l.pipeline_id, ps.id, ps.name,
  ps.sort_order, ps.stage_kind,
  DATE_TRUNC('month', lsh.entered_at),
  l.owner_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_pipeline_conversion_pk
  ON analytics.mv_pipeline_conversion
  (tenant_id, pipeline_id, stage_id, cohort_month, agent_id);

CREATE INDEX IF NOT EXISTS mv_pipeline_conversion_cohort
  ON analytics.mv_pipeline_conversion
  (tenant_id, pipeline_id, cohort_month);

-- ============================================================================
-- MV-03: mv_agent_productivity
-- Per-agent KPIs: leads handled, listings created, closes, first-reply time.
-- Source: user, lead, property_listing, conversation, message, calendar_event
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_agent_productivity AS
SELECT
  u.tenant_id,
  u.id                                        AS agent_id,
  DATE_TRUNC('month', NOW())                  AS report_month,
  COUNT(DISTINCT l.id)                        AS leads_handled,
  COUNT(DISTINCT l.id) FILTER (WHERE l.won_at IS NOT NULL) AS leads_won,
  COUNT(DISTINCT l.id) FILTER (WHERE l.lost_at IS NOT NULL) AS leads_lost,
  ROUND(
    100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.won_at IS NOT NULL)
    / NULLIF(
        COUNT(DISTINCT l.id) FILTER (WHERE l.won_at IS NOT NULL OR l.lost_at IS NOT NULL), 0
      ), 2
  )                                            AS win_rate_pct,
  COUNT(DISTINCT pl.id)                       AS listings_created,
  COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (first_reply.created_at - conv.created_at)) / 60
      ) FILTER (WHERE first_reply.created_at IS NOT NULL), 2
    ), 0
  )                                            AS avg_first_reply_min,
  COUNT(DISTINCT ce.id)                       AS visits_scheduled,
  COUNT(DISTINCT ce.id)
    FILTER (WHERE ce.status = 'completed')    AS visits_completed,
  NOW()                                        AS refreshed_at
FROM "user" u
LEFT JOIN lead l
  ON l.owner_user_id = u.id
  AND l.tenant_id = u.tenant_id
  AND l.created_at >= DATE_TRUNC('month', NOW())
  AND l.deleted_at IS NULL
LEFT JOIN property_listing pl
  ON pl.created_by = u.id
  AND pl.tenant_id = u.tenant_id
  AND pl.created_at >= DATE_TRUNC('month', NOW())
  AND pl.deleted_at IS NULL
LEFT JOIN conversation conv
  ON conv.assigned_to_id = u.id
  AND conv.tenant_id = u.tenant_id
  AND conv.created_at >= DATE_TRUNC('month', NOW())
LEFT JOIN LATERAL (
  SELECT m.created_at
  FROM message m
  WHERE m.conversation_id = conv.id
    AND m.direction = 'outbound'
  ORDER BY m.created_at ASC
  LIMIT 1
) first_reply ON true
LEFT JOIN calendar_event ce
  ON ce.created_by = u.id
  AND ce.tenant_id = u.tenant_id
  AND ce.starts_at >= DATE_TRUNC('month', NOW())
WHERE u.active = true
GROUP BY u.tenant_id, u.id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_agent_productivity_pk
  ON analytics.mv_agent_productivity (tenant_id, agent_id, report_month);

-- ============================================================================
-- report_digest_subscription — user subscriptions to scheduled report digests
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_digest_subscription (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  report_slug     TEXT NOT NULL,
  frequency       TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  hour_utc        SMALLINT NOT NULL DEFAULT 8 CHECK (hour_utc BETWEEN 0 AND 23),
  timezone        TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,
  active          BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  last_sent_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_sub_tenant_user_report
  ON report_digest_subscription (tenant_id, user_id, report_slug);
CREATE INDEX IF NOT EXISTS idx_digest_sub_active
  ON report_digest_subscription (active, frequency) WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_sub_unsub_token
  ON report_digest_subscription (unsubscribe_token);

ALTER TABLE report_digest_subscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_digest_sub ON report_digest_subscription
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- report_share_link — signed share links for report snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_share_link (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  created_by      UUID NOT NULL REFERENCES "user"(id),
  report_slug     TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ NOT NULL,
  view_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_link_token
  ON report_share_link (token) WHERE expires_at > now();
CREATE INDEX IF NOT EXISTS idx_share_link_tenant
  ON report_share_link (tenant_id, report_slug);

ALTER TABLE report_share_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_share_link ON report_share_link
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
