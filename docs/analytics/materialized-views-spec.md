# Corredor — Materialized Views Specification

**Version:** 1.0  
**Date:** 2026-04-20  
**Owner:** Data Analyst  
**Status:** Draft  
**Companion:** `docs/analytics/kpi-framework.md`

All views live in the `analytics` Postgres schema. Every view is `UNLOGGED` during initial population and converted to a regular materialized view before first production refresh. All queries include a `tenant_id` predicate enforced at the application layer (the views themselves are not RLS-filtered; access is gated by the tRPC middleware that resolves tenant context before querying).

---

## Universal Conventions

```sql
-- All MVs receive these two base indexes after creation:
CREATE UNIQUE INDEX ON analytics.<mv_name> (tenant_id, <pk_columns>);
CREATE INDEX ON analytics.<mv_name> (tenant_id, refreshed_at);

-- Refresh worker (BullMQ) calls:
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.<mv_name>;
-- CONCURRENT requires at least one UNIQUE index on the MV.
```

---

## MV-01: mv_pipeline_conversion

### Purpose
Stage-by-stage funnel conversion rates, average time per stage, and win/loss breakdowns — powers the Funnel Conversion and Pipeline Velocity dashboards.

### Source tables
`lead`, `lead_stage_history`, `pipeline`, `pipeline_stage`, `user`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_pipeline_conversion AS
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
    FILTER (WHERE l.status = 'won'
              AND lsh.stage_id = ps.id)     AS leads_won,
  COUNT(DISTINCT l.id)
    FILTER (WHERE l.status = 'lost'
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

CREATE UNIQUE INDEX mv_pipeline_conversion_pk
  ON analytics.mv_pipeline_conversion
  (tenant_id, pipeline_id, stage_id, cohort_month, agent_id);
```

### Refresh trigger
Hourly BullMQ cron (`analytics:refresh:pipeline_conversion`). Also triggered on `lead.stage_moved`, `lead.marked_won`, `lead.marked_lost` domain events (debounced 30 s per tenant).

### Index strategy
- Unique index on `(tenant_id, pipeline_id, stage_id, cohort_month, agent_id)` — required for `CONCURRENT` refresh.
- Covering index on `(tenant_id, pipeline_id, cohort_month)` — powers funnel dashboard date-range filter.

### Sample dashboard query

```sql
-- Funnel conversion dashboard: per-stage metrics for a pipeline in a date range
SELECT
  stage_name, sort_order, stage_kind,
  SUM(leads_entered)     AS total_entered,
  SUM(leads_exited)      AS total_exited,
  SUM(leads_won)         AS total_won,
  ROUND(AVG(exit_rate_pct), 2) AS avg_exit_rate,
  ROUND(AVG(avg_hours_in_stage), 2) AS avg_hours
FROM analytics.mv_pipeline_conversion
WHERE tenant_id = $1
  AND pipeline_id = $2
  AND cohort_month BETWEEN $3 AND $4
GROUP BY stage_name, sort_order, stage_kind
ORDER BY sort_order;
```

**Expected load:** < 50 ms at 100 k leads/tenant (index scan on `(tenant_id, pipeline_id, cohort_month)`).

---

## MV-02: mv_listing_performance

### Purpose
Per-listing metrics: views, inquiries, days-on-market, price reductions — powers the Listing Performance dashboard.

### Source tables
`listing`, `property`, `portal_publication`, `portal_sync_job`, `portal_lead`, `inquiry_match`, `user`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_listing_performance AS
SELECT
  l.tenant_id,
  l.id                                       AS listing_id,
  l.property_id,
  p.neighborhood,
  p.locality,
  p.province,
  p.property_type,
  l.operation_kind,
  l.price_amount,
  l.price_currency,
  l.status                                   AS listing_status,
  l.listed_at,
  l.unlisted_at,
  COALESCE(
    EXTRACT(DAY FROM (COALESCE(l.unlisted_at, NOW()) - l.listed_at)), 0
  )::int                                      AS days_on_market,
  l.created_by                               AS agent_id,
  COALESCE(SUM(psj.views_count), 0)          AS total_portal_views,
  COALESCE(COUNT(DISTINCT pl.id), 0)         AS total_portal_leads,
  COALESCE(COUNT(DISTINCT im.id), 0)         AS total_inquiry_matches,
  -- Price reduction
  COALESCE(
    ROUND(
      100.0 * (first_price.price_amount - l.price_amount)
      / NULLIF(first_price.price_amount, 0), 2
    ), 0
  )                                           AS price_reduction_pct,
  NOW()                                       AS refreshed_at
FROM listing l
JOIN property p ON p.id = l.property_id
LEFT JOIN portal_publication pp  ON pp.listing_id = l.id
LEFT JOIN portal_sync_job psj    ON psj.listing_id = l.id
LEFT JOIN portal_lead pl         ON pl.listing_id = l.id
LEFT JOIN inquiry_match im       ON im.listing_id = l.id
LEFT JOIN LATERAL (
  SELECT price_amount
  FROM property_price_history pph
  WHERE pph.property_id = l.property_id
  ORDER BY pph.created_at ASC
  LIMIT 1
) first_price ON true
WHERE l.deleted_at IS NULL
  AND p.deleted_at IS NULL
GROUP BY
  l.tenant_id, l.id, l.property_id, p.neighborhood, p.locality,
  p.province, p.property_type, l.operation_kind, l.price_amount,
  l.price_currency, l.status, l.listed_at, l.unlisted_at,
  l.created_by, first_price.price_amount;

CREATE UNIQUE INDEX mv_listing_performance_pk
  ON analytics.mv_listing_performance (tenant_id, listing_id);
CREATE INDEX mv_listing_performance_agent
  ON analytics.mv_listing_performance (tenant_id, agent_id, listing_status);
CREATE INDEX mv_listing_performance_geo
  ON analytics.mv_listing_performance (tenant_id, province, locality, neighborhood);
```

### Refresh trigger
Hourly. Also on: `property.price_changed`, `portal_lead.created`, `listing.status_changed`.

### Sample dashboard query

```sql
-- Top listings by portal views, last 30 days
SELECT
  listing_id, neighborhood, operation_kind, price_amount, price_currency,
  days_on_market, total_portal_views, total_portal_leads, price_reduction_pct
FROM analytics.mv_listing_performance
WHERE tenant_id = $1
  AND listing_status = 'active'
ORDER BY total_portal_views DESC
LIMIT 20;
```

---

## MV-03: mv_agent_productivity

### Purpose
Per-agent KPIs: leads handled, listings created, closes, first-reply time — powers the Agent Productivity Leaderboard.

### Source tables
`user`, `lead`, `listing`, `inbox_thread`, `inbox_message`, `calendar_event`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_agent_productivity AS
SELECT
  u.tenant_id,
  u.id                                        AS agent_id,
  DATE_TRUNC('month', NOW())                  AS report_month,
  COUNT(DISTINCT l.id)                        AS leads_handled,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won') AS leads_won,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'lost') AS leads_lost,
  ROUND(
    100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won')
    / NULLIF(
        COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('won','lost')), 0
      ), 2
  )                                            AS win_rate_pct,
  COUNT(DISTINCT li.id)                       AS listings_created,
  COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (first_reply.sent_at - it.created_at)) / 60
      ) FILTER (WHERE first_reply.sent_at IS NOT NULL), 2
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
LEFT JOIN listing li
  ON li.created_by = u.id
  AND li.tenant_id = u.tenant_id
  AND li.created_at >= DATE_TRUNC('month', NOW())
  AND li.deleted_at IS NULL
LEFT JOIN inbox_thread it
  ON it.assigned_user_id = u.id
  AND it.tenant_id = u.tenant_id
  AND it.created_at >= DATE_TRUNC('month', NOW())
LEFT JOIN LATERAL (
  SELECT im.sent_at
  FROM inbox_message im
  WHERE im.thread_id = it.id
    AND im.direction = 'out'
  ORDER BY im.sent_at ASC
  LIMIT 1
) first_reply ON true
LEFT JOIN calendar_event ce
  ON ce.created_by = u.id
  AND ce.tenant_id = u.tenant_id
  AND ce.event_type_id IN (
      SELECT id FROM event_type WHERE kind = 'visit' AND tenant_id = u.tenant_id
    )
  AND ce.starts_at >= DATE_TRUNC('month', NOW())
WHERE u.active = true
GROUP BY u.tenant_id, u.id;

CREATE UNIQUE INDEX mv_agent_productivity_pk
  ON analytics.mv_agent_productivity (tenant_id, agent_id, report_month);
```

### Refresh trigger
Hourly.

### Sample dashboard query

```sql
-- Agent leaderboard for current month
SELECT
  agent_id, leads_handled, leads_won, win_rate_pct,
  listings_created, avg_first_reply_min, visits_scheduled, visits_completed
FROM analytics.mv_agent_productivity
WHERE tenant_id = $1
  AND report_month = DATE_TRUNC('month', NOW())
ORDER BY leads_won DESC, win_rate_pct DESC;
```

---

## MV-04: mv_portal_roi

### Purpose
Per-portal cost vs. leads vs. closes — powers the Portal ROI dashboard.

### Source tables
`portal_connection`, `portal_lead`, `lead`, `contact`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_portal_roi AS
SELECT
  pc.tenant_id,
  pc.portal_id,
  DATE_TRUNC('month', pl.created_at)         AS report_month,
  pc.monthly_cost_usd,
  COUNT(DISTINCT pl.id)                       AS total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won') AS total_closes,
  ROUND(
    pc.monthly_cost_usd
    / NULLIF(COUNT(DISTINCT pl.id), 0), 2
  )                                            AS cost_per_lead_usd,
  ROUND(
    100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won')
    / NULLIF(COUNT(DISTINCT pl.id), 0), 2
  )                                            AS close_rate_pct,
  ROUND(
    pc.monthly_cost_usd
    / NULLIF(
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won'), 0
      ), 2
  )                                            AS cost_per_close_usd,
  NOW()                                        AS refreshed_at
FROM portal_connection pc
LEFT JOIN portal_lead pl
  ON pl.portal_connection_id = pc.id
  AND pl.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '12 months'
LEFT JOIN lead l
  ON l.source = CONCAT('portal:', pc.portal_id)
  AND l.contact_id = pl.contact_id
  AND l.tenant_id = pc.tenant_id
WHERE pc.deleted_at IS NULL
GROUP BY pc.tenant_id, pc.portal_id, DATE_TRUNC('month', pl.created_at), pc.monthly_cost_usd;

CREATE UNIQUE INDEX mv_portal_roi_pk
  ON analytics.mv_portal_roi (tenant_id, portal_id, report_month);
```

### Refresh trigger
Nightly.

### Sample dashboard query

```sql
-- Portal ROI comparison, last 3 months
SELECT
  portal_id,
  SUM(total_leads)        AS leads_3mo,
  SUM(total_closes)       AS closes_3mo,
  ROUND(AVG(cost_per_lead_usd), 2) AS avg_cpl,
  ROUND(AVG(close_rate_pct), 2)    AS avg_close_rate
FROM analytics.mv_portal_roi
WHERE tenant_id = $1
  AND report_month >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months'
GROUP BY portal_id
ORDER BY avg_close_rate DESC;
```

---

## MV-05: mv_revenue_forecast

### Purpose
MRR, churn, LTV, and weighted pipeline value — powers the Revenue Forecast dashboard.

### Source tables
`subscription`, `plan`, `lead` (won + open), `tenant`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_revenue_forecast AS
WITH mrr AS (
  SELECT
    s.tenant_id,
    SUM(p.price_usd) AS mrr_usd
  FROM subscription s
  JOIN plan p ON p.code = s.plan_code
  WHERE s.status = 'active'
  GROUP BY s.tenant_id
),
churn AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (
      WHERE status = 'cancelled'
        AND cancelled_at >= DATE_TRUNC('month', NOW())
    )::float / NULLIF(
      COUNT(*) FILTER (
        WHERE created_at < DATE_TRUNC('month', NOW())
      ), 0
    ) AS monthly_churn_rate
  FROM subscription
  GROUP BY tenant_id
),
pipeline_value AS (
  SELECT
    l.tenant_id,
    SUM(
      l.expected_value_amount * COALESCE(ps.win_probability_pct, 50) / 100.0
    ) AS weighted_pipeline_usd
  FROM lead l
  JOIN pipeline_stage ps ON ps.id = l.stage_id
  WHERE l.status NOT IN ('won', 'lost')
    AND l.deleted_at IS NULL
  GROUP BY l.tenant_id
)
SELECT
  m.tenant_id,
  m.mrr_usd,
  ROUND(m.mrr_usd / NULLIF(c.monthly_churn_rate, 0), 2) AS ltv_usd,
  c.monthly_churn_rate,
  COALESCE(pv.weighted_pipeline_usd, 0)                  AS weighted_pipeline_usd,
  ROUND(m.mrr_usd * 12, 2)                               AS arr_usd,
  NOW()                                                   AS refreshed_at
FROM mrr m
LEFT JOIN churn c          ON c.tenant_id = m.tenant_id
LEFT JOIN pipeline_value pv ON pv.tenant_id = m.tenant_id;

CREATE UNIQUE INDEX mv_revenue_forecast_pk
  ON analytics.mv_revenue_forecast (tenant_id);
```

### Refresh trigger
Real-time on `subscription.created`, `subscription.cancelled`, `lead.marked_won`. Nightly full refresh.

### Sample dashboard query

```sql
SELECT
  mrr_usd, arr_usd, monthly_churn_rate,
  ltv_usd, weighted_pipeline_usd,
  (mrr_usd + weighted_pipeline_usd * 0.3) AS 90_day_forecast_usd
FROM analytics.mv_revenue_forecast
WHERE tenant_id = $1;
```

---

## MV-06: mv_retention_cohort

### Purpose
Month-by-month tenant retention (SaaS metric) and contact re-engagement cohorts — powers the Cohort Analysis and Churn/Retention dashboards.

### Source tables
`tenant`, `subscription`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_retention_cohort AS
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
    DATE_TRUNC('month', created_at)  AS activity_month
  FROM subscription
  WHERE status = 'active'
  UNION
  SELECT
    tenant_id,
    DATE_TRUNC('month', updated_at)
  FROM subscription
  WHERE status = 'cancelled'
    AND updated_at IS NOT NULL
)
SELECT
  c.tenant_id,
  c.cohort_month,
  ma.activity_month,
  DATE_PART('month', AGE(ma.activity_month, c.cohort_month))::int AS months_since_signup,
  1 AS is_retained,
  NOW() AS refreshed_at
FROM cohorts c
JOIN monthly_activity ma ON ma.tenant_id = c.tenant_id
  AND ma.activity_month >= c.cohort_month;

CREATE UNIQUE INDEX mv_retention_cohort_pk
  ON analytics.mv_retention_cohort (tenant_id, cohort_month, activity_month);
CREATE INDEX mv_retention_cohort_month
  ON analytics.mv_retention_cohort (cohort_month, months_since_signup);
```

### Refresh trigger
Nightly.

### Sample dashboard query

```sql
-- Cohort retention grid (rows = cohort month, cols = M0..M12)
SELECT
  cohort_month,
  months_since_signup,
  COUNT(DISTINCT tenant_id)               AS retained_tenants,
  FIRST_VALUE(COUNT(DISTINCT tenant_id))
    OVER (PARTITION BY cohort_month ORDER BY months_since_signup) AS cohort_size,
  ROUND(
    100.0 * COUNT(DISTINCT tenant_id)
    / FIRST_VALUE(COUNT(DISTINCT tenant_id))
        OVER (PARTITION BY cohort_month ORDER BY months_since_signup), 2
  )                                         AS retention_pct
FROM analytics.mv_retention_cohort
GROUP BY cohort_month, months_since_signup
ORDER BY cohort_month, months_since_signup;
```

---

## MV-07: mv_zone_heatmap

### Purpose
Inquiry density by neighborhood/zone — powers the Market Share / Zone Analysis dashboard and the `/map` demand heatmap layer.

### Source tables
`inquiry`, `portal_lead`, `property`, `listing`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_zone_heatmap AS
SELECT
  i.tenant_id,
  -- Unnest zones from inquiry criteria
  zone_entry->>'province'     AS province,
  zone_entry->>'locality'     AS locality,
  zone_entry->>'neighborhood' AS neighborhood,
  DATE_TRUNC('week', i.created_at) AS week,
  COUNT(DISTINCT i.id)         AS inquiry_count,
  COUNT(DISTINCT pl.id)        AS portal_lead_count,
  COUNT(DISTINCT l.id)         AS active_listing_count,
  -- demand/supply ratio
  ROUND(
    COUNT(DISTINCT i.id)::float
    / NULLIF(COUNT(DISTINCT l.id), 0), 2
  )                            AS demand_supply_ratio,
  NOW()                        AS refreshed_at
FROM inquiry i
CROSS JOIN LATERAL jsonb_array_elements(i.zones) AS zone_entry
LEFT JOIN listing l
  ON l.tenant_id = i.tenant_id
  AND l.status = 'active'
  AND l.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM property p
    WHERE p.id = l.property_id
      AND p.neighborhood = zone_entry->>'neighborhood'
      AND p.locality     = zone_entry->>'locality'
  )
LEFT JOIN portal_lead pl
  ON pl.tenant_id = i.tenant_id
  AND pl.created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '12 weeks'
  AND pl.zone_neighborhood = zone_entry->>'neighborhood'
WHERE i.deleted_at IS NULL
  AND i.created_at >= NOW() - INTERVAL '6 months'
GROUP BY
  i.tenant_id,
  zone_entry->>'province',
  zone_entry->>'locality',
  zone_entry->>'neighborhood',
  DATE_TRUNC('week', i.created_at);

CREATE UNIQUE INDEX mv_zone_heatmap_pk
  ON analytics.mv_zone_heatmap (tenant_id, province, locality, neighborhood, week);
CREATE INDEX mv_zone_heatmap_tenant_week
  ON analytics.mv_zone_heatmap (tenant_id, week DESC);
```

### Refresh trigger
Hourly. Also on `inquiry.created`, `portal_lead.created`.

### Sample dashboard query

```sql
-- Top 20 neighborhoods by demand, last 4 weeks
SELECT
  neighborhood, locality, province,
  SUM(inquiry_count) AS total_inquiries,
  SUM(active_listing_count) AS total_listings,
  ROUND(AVG(demand_supply_ratio), 2) AS avg_dsr
FROM analytics.mv_zone_heatmap
WHERE tenant_id = $1
  AND week >= DATE_TRUNC('week', NOW()) - INTERVAL '4 weeks'
GROUP BY neighborhood, locality, province
ORDER BY total_inquiries DESC
LIMIT 20;
```

---

## MV-08: mv_ai_usage_value

### Purpose
AI feature adoption, unique users, estimated time saved — powers the AI Usage & Value dashboard.

### Source tables
`ai_conversation`, `ai_message`, `ai_tool_call`, `user`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_ai_usage_value AS
SELECT
  ac.tenant_id,
  ac.feature_type,                            -- 'description_gen'|'email_draft'|'copilot'|etc.
  DATE_TRUNC('month', ac.created_at)          AS report_month,
  COUNT(DISTINCT ac.id)                       AS total_sessions,
  COUNT(DISTINCT ac.user_id)                  AS unique_users,
  COUNT(DISTINCT atc.id)                      AS total_tool_calls,
  -- Estimated time saved per feature (minutes per session, calibrated)
  SUM(
    CASE ac.feature_type
      WHEN 'description_gen'   THEN 12
      WHEN 'email_draft'       THEN 8
      WHEN 'note_summarizer'   THEN 20
      WHEN 'lead_match'        THEN 15
      WHEN 'portal_optimizer'  THEN 10
      WHEN 'copilot'           THEN 5
      ELSE 5
    END
  )                                            AS estimated_time_saved_min,
  -- Satisfaction (thumbs-up rate where feedback collected)
  ROUND(
    100.0 * COUNT(DISTINCT am.id) FILTER (WHERE am.feedback = 'positive')
    / NULLIF(COUNT(DISTINCT am.id) FILTER (WHERE am.feedback IS NOT NULL), 0), 2
  )                                            AS positive_feedback_pct,
  NOW()                                        AS refreshed_at
FROM ai_conversation ac
LEFT JOIN ai_message am   ON am.conversation_id = ac.id
LEFT JOIN ai_tool_call atc ON atc.conversation_id = ac.id
WHERE ac.deleted_at IS NULL
GROUP BY ac.tenant_id, ac.feature_type, DATE_TRUNC('month', ac.created_at);

CREATE UNIQUE INDEX mv_ai_usage_value_pk
  ON analytics.mv_ai_usage_value (tenant_id, feature_type, report_month);
```

### Refresh trigger
Nightly.

### Sample dashboard query

```sql
-- AI usage summary for current month
SELECT
  feature_type, total_sessions, unique_users,
  estimated_time_saved_min, positive_feedback_pct
FROM analytics.mv_ai_usage_value
WHERE tenant_id = $1
  AND report_month = DATE_TRUNC('month', NOW())
ORDER BY total_sessions DESC;
```

---

## MV-09: mv_sla_adherence

### Purpose
SLA breach rates by agent, team, and channel — used in the Panel SLA widget and operational SLA report.

### Source tables
`sla_timer`, `sla_policy`, `inbox_thread`, `user`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_sla_adherence AS
SELECT
  it.tenant_id,
  it.assigned_user_id                         AS agent_id,
  st.policy_id,
  sp.name                                     AS policy_name,
  DATE_TRUNC('day', st.started_at)            AS report_day,
  COUNT(st.id)                                AS total_timers,
  COUNT(st.id) FILTER (WHERE st.breached = true) AS breached_count,
  ROUND(
    100.0 * COUNT(st.id) FILTER (WHERE st.breached = true)
    / NULLIF(COUNT(st.id), 0), 2
  )                                            AS breach_rate_pct,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(st.resolved_at, NOW()) - st.started_at
      )) / 60
    ), 2
  )                                            AS avg_resolution_min,
  NOW()                                        AS refreshed_at
FROM sla_timer st
JOIN sla_policy sp  ON sp.id = st.policy_id
JOIN inbox_thread it ON it.id = st.thread_id
WHERE st.started_at >= NOW() - INTERVAL '90 days'
GROUP BY
  it.tenant_id, it.assigned_user_id,
  st.policy_id, sp.name,
  DATE_TRUNC('day', st.started_at);

CREATE UNIQUE INDEX mv_sla_adherence_pk
  ON analytics.mv_sla_adherence (tenant_id, agent_id, policy_id, report_day);
CREATE INDEX mv_sla_adherence_tenant_day
  ON analytics.mv_sla_adherence (tenant_id, report_day DESC);
```

### Refresh trigger
Real-time (on `sla_timer.breached` event). Hourly full refresh.

### Sample dashboard query

```sql
-- SLA breach rate by agent, last 7 days
SELECT
  agent_id, policy_name,
  SUM(total_timers) AS timers,
  SUM(breached_count) AS breaches,
  ROUND(AVG(breach_rate_pct), 2) AS avg_breach_rate,
  ROUND(AVG(avg_resolution_min), 2) AS avg_resolution_min
FROM analytics.mv_sla_adherence
WHERE tenant_id = $1
  AND report_day >= NOW() - INTERVAL '7 days'
GROUP BY agent_id, policy_name
ORDER BY avg_breach_rate DESC;
```

---

## MV-10: mv_commission_owed

### Purpose
Pending and paid commission per agent and per deal — used in the Commission operational report.

### Source tables
`commission_split`, `lead`, `listing`, `property`, `user`

### SQL Spec

```sql
CREATE MATERIALIZED VIEW analytics.mv_commission_owed AS
SELECT
  cs.tenant_id,
  cs.agent_user_id                            AS agent_id,
  cs.lead_id,
  l.id                                        AS listing_id,
  p.id                                        AS property_id,
  p.address_street,
  p.neighborhood,
  cs.amount,
  cs.currency,
  cs.status,                                  -- pending | paid | disputed
  cs.due_date,
  cs.paid_at,
  -- Days outstanding (for pending only)
  CASE
    WHEN cs.status = 'pending'
    THEN EXTRACT(DAY FROM NOW() - cs.created_at)::int
    ELSE NULL
  END                                          AS days_outstanding,
  DATE_TRUNC('month', cs.created_at)          AS commission_month,
  NOW()                                        AS refreshed_at
FROM commission_split cs
JOIN lead ld        ON ld.id = cs.lead_id
JOIN listing l      ON l.id = cs.listing_id
JOIN property p     ON p.id = l.property_id
WHERE cs.deleted_at IS NULL;

CREATE UNIQUE INDEX mv_commission_owed_pk
  ON analytics.mv_commission_owed (tenant_id, lead_id, agent_id);
CREATE INDEX mv_commission_owed_agent
  ON analytics.mv_commission_owed (tenant_id, agent_id, status);
CREATE INDEX mv_commission_owed_month
  ON analytics.mv_commission_owed (tenant_id, commission_month, status);
```

### Refresh trigger
Real-time on `lead.marked_won` (creates `commission_split` rows). Nightly full refresh.

### Sample dashboard query

```sql
-- Pending commissions by agent, over 90 days
SELECT
  agent_id, COUNT(*) AS count, SUM(amount) AS total_amount, currency,
  MAX(days_outstanding) AS max_days_outstanding
FROM analytics.mv_commission_owed
WHERE tenant_id = $1
  AND status = 'pending'
  AND days_outstanding > 90
GROUP BY agent_id, currency
ORDER BY total_amount DESC;
```

---

## Refresh Schedule Summary

| MV | Cadence | Event triggers |
|---|---|---|
| mv_pipeline_conversion | Hourly | lead.stage_moved, lead.marked_won/lost |
| mv_listing_performance | Hourly | property.price_changed, portal_lead.created, listing.status_changed |
| mv_agent_productivity | Hourly | — |
| mv_portal_roi | Nightly | — |
| mv_revenue_forecast | Real-time + nightly | subscription.created/cancelled, lead.marked_won |
| mv_retention_cohort | Nightly | — |
| mv_zone_heatmap | Hourly | inquiry.created, portal_lead.created |
| mv_ai_usage_value | Nightly | — |
| mv_sla_adherence | Real-time + hourly | sla_timer.breached |
| mv_commission_owed | Real-time + nightly | lead.marked_won |

---

*Document last updated: 2026-04-20*
