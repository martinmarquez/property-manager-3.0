-- 0022_reportes_remaining_mvs.sql
-- Phase G: Reportes — remaining 8 analytics materialized views
-- Complements 0021_phase_g_reports.sql (which has MV-01 + MV-03).
--
-- MVs: mv_listing_performance, mv_portal_roi, mv_revenue_forecast,
--      mv_retention_cohort, mv_zone_heatmap, mv_ai_usage_value,
--      mv_sla_adherence, mv_commission_owed
--
-- All live in the analytics schema (created in 0021_phase_g_reports.sql).
-- Each MV has a UNIQUE index for CONCURRENT refresh support.
--
-- Table name mapping from spec → actual schema:
--   listing           → property_listing (0004_properties_base.sql)
--   subscription      → billing_subscription (0021_billing.sql)
--   plan              → billing_plan (0021_billing.sql)
--   inbox_thread      → conversation (0012_inbox_channels.sql)
--   inbox_message     → message (0012_inbox_channels.sql)
--   ai_conversation   → copilot_session (0015_phase_f_ai.sql)
--   ai_message        → copilot_turn (0015_phase_f_ai.sql)
--   l.status = 'won'  → l.won_at IS NOT NULL (actual lead schema)
--   ps.stage_kind     → ps.kind (actual pipeline_stage schema)

-- ============================================================================
-- MV-02: mv_listing_performance
-- Per-listing metrics: inquiry matches, days-on-market, price data.
-- Source: property_listing, property, inquiry_match
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_listing_performance AS
SELECT
  pl.tenant_id,
  pl.id                                              AS listing_id,
  pl.property_id,
  p.neighborhood,
  p.locality,
  p.province,
  p.property_type,
  pl.kind                                            AS operation_kind,
  pl.price_amount,
  pl.price_currency,
  p.status                                           AS property_status,
  p.created_at                                       AS listed_at,
  COALESCE(
    EXTRACT(DAY FROM (NOW() - p.created_at)), 0
  )::int                                             AS days_on_market,
  p.created_by                                       AS agent_id,
  COALESCE(COUNT(DISTINCT im.id), 0)                AS total_inquiry_matches,
  NOW()                                              AS refreshed_at
FROM property_listing pl
JOIN property p ON p.id = pl.property_id
LEFT JOIN inquiry_match im ON im.listing_id = pl.id
WHERE p.deleted_at IS NULL
GROUP BY
  pl.tenant_id, pl.id, pl.property_id,
  p.neighborhood, p.locality, p.province, p.property_type,
  pl.kind, pl.price_amount, pl.price_currency,
  p.status, p.created_at, p.created_by;

CREATE UNIQUE INDEX IF NOT EXISTS mv_listing_performance_pk
  ON analytics.mv_listing_performance (tenant_id, listing_id);

CREATE INDEX IF NOT EXISTS mv_listing_performance_agent
  ON analytics.mv_listing_performance (tenant_id, agent_id, property_status);

CREATE INDEX IF NOT EXISTS mv_listing_performance_geo
  ON analytics.mv_listing_performance (tenant_id, province, locality, neighborhood);

-- ============================================================================
-- MV-04: mv_portal_roi
-- Per-portal leads vs publications — portal ROI signal.
-- Source: analytics_event (portal events with portal_id in properties JSONB)
-- Note: portal_lead table not yet in schema; using analytics_event approach.
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_portal_roi AS
SELECT
  ae.tenant_id,
  ae.properties->>'portal_id'                        AS portal_id,
  ae.properties->>'portal_name'                      AS portal_name,
  DATE_TRUNC('month', ae.occurred_at)                AS report_month,
  COUNT(DISTINCT ae.id)
    FILTER (WHERE ae.event_type = 'portal.lead_received')    AS total_leads,
  COUNT(DISTINCT ae.entity_id)
    FILTER (WHERE ae.event_type = 'portal.property_synced')  AS total_synced_listings,
  ROUND(
    COUNT(DISTINCT ae.id)
      FILTER (WHERE ae.event_type = 'portal.lead_received')::numeric
    / NULLIF(
        COUNT(DISTINCT ae.entity_id)
          FILTER (WHERE ae.event_type = 'portal.property_synced'), 0
      ), 4
  )                                                   AS leads_per_listing,
  NOW()                                               AS refreshed_at
FROM analytics_event ae
WHERE ae.event_type IN ('portal.lead_received', 'portal.property_synced')
  AND ae.properties->>'portal_id' IS NOT NULL
GROUP BY
  ae.tenant_id,
  ae.properties->>'portal_id',
  ae.properties->>'portal_name',
  DATE_TRUNC('month', ae.occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_portal_roi_pk
  ON analytics.mv_portal_roi (tenant_id, portal_id, report_month);

CREATE INDEX IF NOT EXISTS mv_portal_roi_tenant_month
  ON analytics.mv_portal_roi (tenant_id, report_month DESC);

-- ============================================================================
-- MV-05: mv_revenue_forecast
-- MRR, ARR, churn rate, and weighted pipeline value per tenant.
-- Source: billing_subscription, billing_plan, lead, pipeline_stage
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_revenue_forecast AS
WITH mrr AS (
  SELECT
    bs.tenant_id,
    SUM(
      CASE bs.billing_interval
        WHEN 'monthly' THEN bp.price_usd_monthly
        WHEN 'annual'  THEN ROUND(bp.price_usd_annual / 12.0, 2)
        ELSE 0
      END
    ) AS mrr_usd
  FROM billing_subscription bs
  JOIN billing_plan bp ON bp.code = bs.plan_code
  WHERE bs.status = 'active'
  GROUP BY bs.tenant_id
),
churn AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (
      WHERE status = 'canceled'
        AND canceled_at >= DATE_TRUNC('month', NOW())
    )::float / NULLIF(
      COUNT(*) FILTER (
        WHERE created_at < DATE_TRUNC('month', NOW())
      ), 0
    ) AS monthly_churn_rate
  FROM billing_subscription
  GROUP BY tenant_id
),
pipeline_value AS (
  SELECT
    l.tenant_id,
    SUM(
      l.expected_value * COALESCE(
        CASE ps.kind
          WHEN 'won'  THEN 1.0
          WHEN 'lost' THEN 0.0
          ELSE 0.5
        END, 0.5
      )
    ) AS weighted_pipeline_usd
  FROM lead l
  JOIN pipeline_stage ps ON ps.id = l.stage_id
  WHERE l.won_at IS NULL
    AND l.lost_at IS NULL
    AND l.deleted_at IS NULL
    AND l.expected_value IS NOT NULL
  GROUP BY l.tenant_id
)
SELECT
  m.tenant_id,
  ROUND(m.mrr_usd, 2)                               AS mrr_usd,
  ROUND(m.mrr_usd * 12, 2)                          AS arr_usd,
  ROUND(
    m.mrr_usd / NULLIF(c.monthly_churn_rate, 0), 2
  )                                                  AS ltv_usd,
  ROUND(c.monthly_churn_rate::numeric, 4)            AS monthly_churn_rate,
  COALESCE(ROUND(pv.weighted_pipeline_usd::numeric, 2), 0) AS weighted_pipeline_usd,
  NOW()                                              AS refreshed_at
FROM mrr m
LEFT JOIN churn c           ON c.tenant_id = m.tenant_id
LEFT JOIN pipeline_value pv ON pv.tenant_id = m.tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_revenue_forecast_pk
  ON analytics.mv_revenue_forecast (tenant_id);

-- ============================================================================
-- MV-06: mv_retention_cohort
-- Month-over-month tenant retention cohort analysis.
-- Source: tenant, billing_subscription
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_retention_cohort AS
WITH cohorts AS (
  SELECT
    id AS tenant_id,
    DATE_TRUNC('month', created_at) AS cohort_month
  FROM tenant
  WHERE deleted_at IS NULL
),
monthly_activity AS (
  SELECT
    tenant_id,
    DATE_TRUNC('month', created_at) AS activity_month
  FROM billing_subscription
  WHERE status = 'active'
  UNION
  SELECT
    tenant_id,
    DATE_TRUNC('month', updated_at)
  FROM billing_subscription
  WHERE status = 'canceled'
    AND updated_at IS NOT NULL
)
SELECT
  c.tenant_id,
  c.cohort_month,
  ma.activity_month,
  DATE_PART(
    'month', AGE(ma.activity_month, c.cohort_month)
  )::int                                             AS months_since_signup,
  1                                                  AS is_retained,
  NOW()                                              AS refreshed_at
FROM cohorts c
JOIN monthly_activity ma
  ON ma.tenant_id = c.tenant_id
  AND ma.activity_month >= c.cohort_month;

CREATE UNIQUE INDEX IF NOT EXISTS mv_retention_cohort_pk
  ON analytics.mv_retention_cohort (tenant_id, cohort_month, activity_month);

CREATE INDEX IF NOT EXISTS mv_retention_cohort_month
  ON analytics.mv_retention_cohort (cohort_month, months_since_signup);

-- ============================================================================
-- MV-07: mv_zone_heatmap
-- Inquiry density by neighborhood/zone from inquiry.zones JSONB array.
-- Source: inquiry, property_listing, property
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_zone_heatmap AS
SELECT
  i.tenant_id,
  zone_entry->>'province'                            AS province,
  zone_entry->>'locality'                            AS locality,
  zone_entry->>'neighborhood'                        AS neighborhood,
  DATE_TRUNC('week', i.created_at)                   AS week,
  COUNT(DISTINCT i.id)                               AS inquiry_count,
  COUNT(DISTINCT l.id)                               AS active_listing_count,
  ROUND(
    COUNT(DISTINCT i.id)::float
    / NULLIF(COUNT(DISTINCT l.id), 0), 2
  )                                                  AS demand_supply_ratio,
  NOW()                                              AS refreshed_at
FROM inquiry i
CROSS JOIN LATERAL jsonb_array_elements(i.zones) AS zone_entry
LEFT JOIN property_listing l
  ON l.tenant_id = i.tenant_id
  AND EXISTS (
    SELECT 1
    FROM property p
    WHERE p.id = l.property_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      AND (
        zone_entry->>'neighborhood' IS NULL
        OR p.neighborhood = zone_entry->>'neighborhood'
      )
      AND (
        zone_entry->>'locality' IS NULL
        OR p.locality = zone_entry->>'locality'
      )
  )
WHERE i.deleted_at IS NULL
  AND i.created_at >= NOW() - INTERVAL '6 months'
  AND jsonb_array_length(i.zones) > 0
GROUP BY
  i.tenant_id,
  zone_entry->>'province',
  zone_entry->>'locality',
  zone_entry->>'neighborhood',
  DATE_TRUNC('week', i.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_zone_heatmap_pk
  ON analytics.mv_zone_heatmap (tenant_id, province, locality, neighborhood, week);

CREATE INDEX IF NOT EXISTS mv_zone_heatmap_tenant_week
  ON analytics.mv_zone_heatmap (tenant_id, week DESC);

-- ============================================================================
-- MV-08: mv_ai_usage_value
-- AI/Copilot feature adoption by intent, time saved, and feedback.
-- Source: copilot_session, copilot_turn (0015_phase_f_ai.sql)
-- Note: spec uses ai_conversation/ai_message — actual tables are copilot_session/copilot_turn.
--       feature_type mapped from copilot_turn.intent enum.
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_ai_usage_value AS
SELECT
  ct.tenant_id,
  ct.intent::text                                    AS feature_type,
  DATE_TRUNC('month', ct.created_at)                 AS report_month,
  COUNT(DISTINCT cs.id)                              AS total_sessions,
  COUNT(DISTINCT cs.user_id)                         AS unique_users,
  COUNT(DISTINCT ct.id)                              AS total_turns,
  COALESCE(SUM(ct.input_tokens), 0)                 AS total_input_tokens,
  COALESCE(SUM(ct.output_tokens), 0)                AS total_output_tokens,
  -- Estimated minutes saved per turn, calibrated by intent
  SUM(
    CASE ct.intent
      WHEN 'property_search'  THEN 15
      WHEN 'lead_info'        THEN 10
      WHEN 'schedule'         THEN 8
      WHEN 'document_qa'      THEN 12
      WHEN 'market_analysis'  THEN 20
      WHEN 'action_confirm'   THEN 5
      ELSE 5
    END
  )                                                  AS estimated_time_saved_min,
  ROUND(
    100.0 * COUNT(DISTINCT ct.id) FILTER (WHERE ct.feedback = 'positive')
    / NULLIF(COUNT(DISTINCT ct.id) FILTER (WHERE ct.feedback IS NOT NULL), 0), 2
  )                                                  AS positive_feedback_pct,
  ROUND(AVG(ct.total_ms) FILTER (WHERE ct.total_ms IS NOT NULL), 2) AS avg_response_ms,
  NOW()                                              AS refreshed_at
FROM copilot_turn ct
JOIN copilot_session cs ON cs.id = ct.session_id
WHERE ct.intent IS NOT NULL
GROUP BY
  ct.tenant_id,
  ct.intent,
  DATE_TRUNC('month', ct.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_ai_usage_value_pk
  ON analytics.mv_ai_usage_value (tenant_id, feature_type, report_month);

CREATE INDEX IF NOT EXISTS mv_ai_usage_value_tenant_month
  ON analytics.mv_ai_usage_value (tenant_id, report_month DESC);

-- ============================================================================
-- MV-09: mv_sla_adherence
-- SLA compliance tracking using conversation SLA target timestamps.
-- Source: conversation, message (0012_inbox_channels.sql)
-- Note: spec uses sla_timer/sla_policy tables — actual schema embeds SLA
--       targets in conversation.sla_first_response_at / sla_resolved_at.
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_sla_adherence AS
SELECT
  c.tenant_id,
  c.assigned_agent_id                                AS agent_id,
  DATE_TRUNC('day', c.created_at)                   AS report_day,
  COUNT(DISTINCT c.id)                              AS total_conversations,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.sla_first_response_at IS NOT NULL
      AND first_msg.sent_at IS NOT NULL
      AND first_msg.sent_at <= c.sla_first_response_at
  )                                                  AS first_response_sla_met,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.sla_first_response_at IS NOT NULL
      AND (first_msg.sent_at IS NULL
           OR first_msg.sent_at > c.sla_first_response_at)
  )                                                  AS first_response_sla_breached,
  ROUND(
    100.0 * COUNT(DISTINCT c.id) FILTER (
      WHERE c.sla_first_response_at IS NOT NULL
        AND first_msg.sent_at IS NOT NULL
        AND first_msg.sent_at <= c.sla_first_response_at
    ) / NULLIF(
      COUNT(DISTINCT c.id) FILTER (WHERE c.sla_first_response_at IS NOT NULL), 0
    ), 2
  )                                                  AS sla_compliance_rate_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(first_msg.sent_at, NOW()) - c.created_at
      )) / 60
    ) FILTER (WHERE c.sla_first_response_at IS NOT NULL), 2
  )                                                  AS avg_first_reply_min,
  NOW()                                              AS refreshed_at
FROM conversation c
LEFT JOIN LATERAL (
  SELECT MIN(m.sent_at) AS sent_at
  FROM message m
  WHERE m.conversation_id = c.id
    AND m.direction = 'out'
    AND m.sent_at IS NOT NULL
) first_msg ON true
WHERE c.created_at >= NOW() - INTERVAL '90 days'
GROUP BY
  c.tenant_id,
  c.assigned_agent_id,
  DATE_TRUNC('day', c.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_sla_adherence_pk
  ON analytics.mv_sla_adherence (tenant_id, agent_id, report_day);

CREATE INDEX IF NOT EXISTS mv_sla_adherence_tenant_day
  ON analytics.mv_sla_adherence (tenant_id, report_day DESC);

-- ============================================================================
-- MV-10: mv_commission_owed
-- Commission tracking per agent on closed deals.
-- Source: commission_split, lead, property_listing, property
-- Note: commission_split table created when commission feature ships.
--       Wrapped in DO block to allow migration to succeed if table absent.
-- ============================================================================

DO $$
BEGIN
  CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_commission_owed AS
  SELECT
    cs.tenant_id,
    cs.agent_user_id                                AS agent_id,
    cs.lead_id,
    l.id                                            AS listing_id,
    p.id                                            AS property_id,
    p.address_street,
    p.neighborhood,
    cs.amount,
    cs.currency,
    cs.status,
    cs.due_date,
    cs.paid_at,
    CASE
      WHEN cs.status = 'pending'
      THEN EXTRACT(DAY FROM NOW() - cs.created_at)::int
      ELSE NULL
    END                                              AS days_outstanding,
    DATE_TRUNC('month', cs.created_at)              AS commission_month,
    NOW()                                            AS refreshed_at
  FROM commission_split cs
  JOIN lead ld              ON ld.id = cs.lead_id
  JOIN property_listing l   ON l.id = cs.listing_id
  JOIN property p           ON p.id = l.property_id
  WHERE cs.deleted_at IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS mv_commission_owed_pk
    ON analytics.mv_commission_owed (tenant_id, lead_id, agent_id);

  CREATE INDEX IF NOT EXISTS mv_commission_owed_agent
    ON analytics.mv_commission_owed (tenant_id, agent_id, status);

  CREATE INDEX IF NOT EXISTS mv_commission_owed_month
    ON analytics.mv_commission_owed (tenant_id, commission_month, status);

EXCEPTION WHEN undefined_table THEN
  RAISE WARNING 'analytics.mv_commission_owed skipped — commission_split table not yet created';
END
$$;
