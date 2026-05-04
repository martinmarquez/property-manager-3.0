-- 0023_phase_g_reports_mvs.sql
-- Phase G: Remaining 7 materialized views for the reports backend.
-- Completes the 10-MV set started in 0021_phase_g_reports.sql
-- (mv_pipeline_conversion, mv_agent_productivity already exist).

-- ============================================================================
-- MV-02: mv_listing_performance
-- Per-property listing KPIs: views, inquiries, days on market, price changes.
-- Source: property, property_listing, analytics_events, property_history
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_listing_performance AS
SELECT
  p.tenant_id,
  p.id                                            AS property_id,
  p.reference_code,
  p.status                                        AS property_status,
  pl.kind                                         AS listing_kind,
  pl.price_amount,
  pl.price_currency,
  EXTRACT(DAY FROM NOW() - p.created_at)::int     AS days_on_market,
  COALESCE(views.cnt, 0)                          AS view_count,
  COALESCE(inquiries.cnt, 0)                      AS inquiry_count,
  COALESCE(price_changes.cnt, 0)                  AS price_change_count,
  CASE
    WHEN COALESCE(views.cnt, 0) > 0
    THEN ROUND(100.0 * COALESCE(inquiries.cnt, 0) / views.cnt, 2)
    ELSE 0
  END                                             AS inquiry_rate_pct,
  NOW()                                           AS refreshed_at
FROM property p
LEFT JOIN LATERAL (
  SELECT id, kind, price_amount, price_currency
  FROM property_listing
  WHERE property_id = p.id AND tenant_id = p.tenant_id AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
) pl ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'property.viewed'
    AND occurred_at >= NOW() - INTERVAL '90 days'
) views ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'property.lead_generated'
    AND occurred_at >= NOW() - INTERVAL '90 days'
) inquiries ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'property.price_changed'
) price_changes ON true
WHERE p.deleted_at IS NULL
  AND p.status IN ('active', 'reserved');

CREATE UNIQUE INDEX IF NOT EXISTS mv_listing_performance_pk
  ON analytics.mv_listing_performance (tenant_id, property_id);

CREATE INDEX IF NOT EXISTS mv_listing_performance_status
  ON analytics.mv_listing_performance (tenant_id, property_status);

-- ============================================================================
-- MV-04: mv_portal_roi
-- Per-portal ROI: publications, leads received, sync errors, cost per lead.
-- Source: portal_connection, property_portal_publication, analytics_events
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_portal_roi AS
SELECT
  pc.tenant_id,
  pc.id                                           AS portal_connection_id,
  pc.portal                                       AS portal_name,
  pc.status                                       AS connection_status,
  DATE_TRUNC('month', ppp.published_at)           AS report_month,
  COUNT(DISTINCT ppp.id)                          AS active_publications,
  COALESCE(leads.cnt, 0)                          AS leads_received,
  COALESCE(sync_errors.cnt, 0)                    AS sync_error_count,
  CASE
    WHEN COUNT(DISTINCT ppp.id) > 0
    THEN ROUND(COALESCE(leads.cnt, 0)::numeric / COUNT(DISTINCT ppp.id), 4)
    ELSE 0
  END                                             AS leads_per_publication,
  NOW()                                           AS refreshed_at
FROM portal_connection pc
LEFT JOIN property_portal_publication ppp
  ON ppp.portal_connection_id = pc.id
  AND ppp.tenant_id = pc.tenant_id
  AND ppp.status = 'published'
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = pc.tenant_id
    AND event_type = 'portal.lead_received'
    AND properties->>'portal_id' = pc.id::text
    AND occurred_at >= DATE_TRUNC('month', COALESCE(ppp.published_at, NOW()))
) leads ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM portal_sync_log
  WHERE portal_connection_id = pc.id
    AND tenant_id = pc.tenant_id
    AND status = 'failed'
    AND created_at >= DATE_TRUNC('month', NOW())
) sync_errors ON true
GROUP BY
  pc.tenant_id, pc.id, pc.portal, pc.status,
  DATE_TRUNC('month', ppp.published_at),
  leads.cnt, sync_errors.cnt;

CREATE UNIQUE INDEX IF NOT EXISTS mv_portal_roi_pk
  ON analytics.mv_portal_roi (tenant_id, portal_connection_id, report_month);

CREATE INDEX IF NOT EXISTS mv_portal_roi_portal
  ON analytics.mv_portal_roi (tenant_id, portal_name);

-- ============================================================================
-- MV-05: mv_revenue_forecast
-- Monthly revenue pipeline: expected closes, weighted pipeline, actual revenue.
-- Source: lead, subscription, invoice
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_revenue_forecast AS
SELECT
  sub.tenant_id,
  DATE_TRUNC('month', sub.report_month)           AS report_month,
  sub.pipeline_value,
  sub.weighted_pipeline,
  sub.expected_closes,
  sub.actual_won_revenue,
  sub.subscription_mrr,
  sub.invoiced_amount,
  NOW()                                           AS refreshed_at
FROM (
  SELECT
    t.id AS tenant_id,
    months.m AS report_month,
    COALESCE(pipeline.total_value, 0)              AS pipeline_value,
    COALESCE(pipeline.weighted_value, 0)           AS weighted_pipeline,
    COALESCE(pipeline.expected_count, 0)           AS expected_closes,
    COALESCE(won.revenue, 0)                       AS actual_won_revenue,
    COALESCE(subs.mrr, 0)                          AS subscription_mrr,
    COALESCE(inv.total, 0)                         AS invoiced_amount
  FROM tenant t
  CROSS JOIN LATERAL (
    SELECT generate_series(
      DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
      DATE_TRUNC('month', NOW()),
      INTERVAL '1 month'
    ) AS m
  ) months
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(expected_value), 0)::numeric   AS total_value,
      COALESCE(SUM(expected_value * score / 100.0), 0)::numeric AS weighted_value,
      COUNT(*)::int                                AS expected_count
    FROM lead
    WHERE tenant_id = t.id
      AND deleted_at IS NULL
      AND won_at IS NULL AND lost_at IS NULL
      AND expected_close_date >= months.m
      AND expected_close_date < months.m + INTERVAL '1 month'
  ) pipeline ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(expected_value), 0)::numeric AS revenue
    FROM lead
    WHERE tenant_id = t.id
      AND deleted_at IS NULL
      AND won_at >= months.m
      AND won_at < months.m + INTERVAL '1 month'
  ) won ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(price_amount), 0)::numeric AS mrr
    FROM subscription
    WHERE tenant_id = t.id
      AND status IN ('active', 'trialing')
      AND deleted_at IS NULL
      AND current_period_start <= months.m + INTERVAL '1 month'
      AND current_period_end >= months.m
  ) subs ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(amount_paid), 0)::numeric AS total
    FROM invoice
    WHERE tenant_id = t.id
      AND deleted_at IS NULL
      AND paid_at >= months.m
      AND paid_at < months.m + INTERVAL '1 month'
  ) inv ON true
  WHERE t.deleted_at IS NULL
) sub;

CREATE UNIQUE INDEX IF NOT EXISTS mv_revenue_forecast_pk
  ON analytics.mv_revenue_forecast (tenant_id, report_month);

-- ============================================================================
-- MV-06: mv_retention_cohort
-- Monthly cohort retention: contacts created in month M, active in month M+N.
-- Source: contact, analytics_events
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_retention_cohort AS
SELECT
  c.tenant_id,
  DATE_TRUNC('month', c.created_at)               AS cohort_month,
  months.month_offset,
  COUNT(DISTINCT c.id)                             AS cohort_size,
  COUNT(DISTINCT ae.entity_id)                     AS active_count,
  ROUND(
    100.0 * COUNT(DISTINCT ae.entity_id)
    / NULLIF(COUNT(DISTINCT c.id), 0), 2
  )                                                AS retention_pct,
  NOW()                                            AS refreshed_at
FROM contact c
CROSS JOIN LATERAL (
  SELECT generate_series(0, 11) AS month_offset
) months
LEFT JOIN analytics_events ae
  ON ae.tenant_id = c.tenant_id
  AND ae.entity_id = c.id::text
  AND ae.entity_type = 'contact'
  AND ae.occurred_at >= DATE_TRUNC('month', c.created_at) + (months.month_offset || ' months')::interval
  AND ae.occurred_at <  DATE_TRUNC('month', c.created_at) + ((months.month_offset + 1) || ' months')::interval
WHERE c.deleted_at IS NULL
  AND c.merged_winner_id IS NULL
  AND c.created_at >= NOW() - INTERVAL '12 months'
GROUP BY c.tenant_id, DATE_TRUNC('month', c.created_at), months.month_offset;

CREATE UNIQUE INDEX IF NOT EXISTS mv_retention_cohort_pk
  ON analytics.mv_retention_cohort (tenant_id, cohort_month, month_offset);

-- ============================================================================
-- MV-07: mv_zone_heatmap
-- Geographic demand heatmap: inquiry/lead density by lat/lng grid cell.
-- Source: property, analytics_events (inquiries + leads)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_zone_heatmap AS
SELECT
  p.tenant_id,
  ROUND(p.lat::numeric, 2)                        AS lat_bucket,
  ROUND(p.lng::numeric, 2)                        AS lng_bucket,
  COUNT(DISTINCT p.id)                             AS property_count,
  COALESCE(SUM(views.cnt), 0)::int                AS total_views,
  COALESCE(SUM(inquiries.cnt), 0)::int            AS total_inquiries,
  COALESCE(SUM(leads.cnt), 0)::int                AS total_leads,
  ROUND(AVG(pl.price_amount) FILTER (WHERE pl.price_amount > 0), 2) AS avg_price,
  NOW()                                            AS refreshed_at
FROM property p
LEFT JOIN LATERAL (
  SELECT price_amount
  FROM property_listing
  WHERE property_id = p.id AND tenant_id = p.tenant_id AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
) pl ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'property.viewed'
    AND occurred_at >= NOW() - INTERVAL '90 days'
) views ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'property.lead_generated'
    AND occurred_at >= NOW() - INTERVAL '90 days'
) inquiries ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM analytics_events
  WHERE tenant_id = p.tenant_id
    AND entity_id = p.id::text
    AND event_type = 'lead.created'
    AND occurred_at >= NOW() - INTERVAL '90 days'
) leads ON true
WHERE p.deleted_at IS NULL
  AND p.lat IS NOT NULL
  AND p.lng IS NOT NULL
GROUP BY p.tenant_id, ROUND(p.lat::numeric, 2), ROUND(p.lng::numeric, 2);

CREATE UNIQUE INDEX IF NOT EXISTS mv_zone_heatmap_pk
  ON analytics.mv_zone_heatmap (tenant_id, lat_bucket, lng_bucket);

-- ============================================================================
-- MV-08: mv_sla_adherence
-- SLA compliance per agent and channel: first response time, resolution time.
-- Source: conversation, message, inbox_channel
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_sla_adherence AS
SELECT
  conv.tenant_id,
  conv.assigned_agent_id                           AS agent_id,
  ic.type                                          AS channel_type,
  DATE_TRUNC('week', conv.created_at)              AS week,
  COUNT(DISTINCT conv.id)                          AS total_conversations,
  COUNT(DISTINCT conv.id)
    FILTER (WHERE conv.sla_first_response_at IS NOT NULL
                  AND conv.sla_first_response_at <= conv.created_at + INTERVAL '1 hour')
                                                   AS sla_met_count,
  ROUND(
    100.0 * COUNT(DISTINCT conv.id)
      FILTER (WHERE conv.sla_first_response_at IS NOT NULL
                    AND conv.sla_first_response_at <= conv.created_at + INTERVAL '1 hour')
    / NULLIF(COUNT(DISTINCT conv.id), 0), 2
  )                                                AS sla_compliance_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (conv.sla_first_response_at - conv.created_at)) / 60
    ) FILTER (WHERE conv.sla_first_response_at IS NOT NULL), 2
  )                                                AS avg_first_response_min,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (conv.sla_resolved_at - conv.created_at)) / 3600
    ) FILTER (WHERE conv.sla_resolved_at IS NOT NULL), 2
  )                                                AS avg_resolution_hours,
  COUNT(DISTINCT conv.id)
    FILTER (WHERE conv.status = 'resolved' OR conv.status = 'closed')
                                                   AS resolved_count,
  NOW()                                            AS refreshed_at
FROM conversation conv
LEFT JOIN inbox_channel ic
  ON ic.id = conv.channel_id AND ic.tenant_id = conv.tenant_id
WHERE conv.deleted_at IS NULL
  AND conv.created_at >= NOW() - INTERVAL '13 weeks'
GROUP BY conv.tenant_id, conv.assigned_agent_id, ic.type, DATE_TRUNC('week', conv.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_sla_adherence_pk
  ON analytics.mv_sla_adherence (tenant_id, agent_id, channel_type, week);

CREATE INDEX IF NOT EXISTS mv_sla_adherence_agent
  ON analytics.mv_sla_adherence (tenant_id, agent_id);

-- ============================================================================
-- MV-09: mv_commission_owed
-- Per-agent commission tracking: won deals, commission rate, amount owed.
-- Source: lead, property_listing, user
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_commission_owed AS
SELECT
  l.tenant_id,
  l.owner_user_id                                  AS agent_id,
  DATE_TRUNC('month', l.won_at)                    AS report_month,
  COUNT(DISTINCT l.id)                             AS deals_won,
  COALESCE(SUM(pl.price_amount), 0)::numeric      AS total_deal_value,
  COALESCE(AVG(pl.commission_pct), 0)::numeric     AS avg_commission_pct,
  COALESCE(
    SUM(pl.price_amount * pl.commission_pct / 100.0), 0
  )::numeric                                       AS commission_amount,
  NOW()                                            AS refreshed_at
FROM lead l
LEFT JOIN LATERAL (
  SELECT price_amount, commission_pct
  FROM property_listing
  WHERE property_id = l.property_id
    AND tenant_id = l.tenant_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
) pl ON true
WHERE l.deleted_at IS NULL
  AND l.won_at IS NOT NULL
  AND l.won_at >= NOW() - INTERVAL '12 months'
GROUP BY l.tenant_id, l.owner_user_id, DATE_TRUNC('month', l.won_at);

CREATE UNIQUE INDEX IF NOT EXISTS mv_commission_owed_pk
  ON analytics.mv_commission_owed (tenant_id, agent_id, report_month);

CREATE INDEX IF NOT EXISTS mv_commission_owed_month
  ON analytics.mv_commission_owed (tenant_id, report_month);
