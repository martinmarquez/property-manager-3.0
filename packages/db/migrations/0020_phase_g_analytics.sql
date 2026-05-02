-- =============================================================================
-- Migration: 0020_phase_g_analytics
-- Phase G — Analytics enum extensions + billing/appraisal/site/report KPIs
-- Depends on: 0007_analytics (event/KPI enums), 0015_phase_f_analytics
--
-- Enum extensions:
--   analytics_event_type  (+site.* +appraisal.* +report.* +billing.*)
--   analytics_entity_type (+site +appraisal +report)
--   kpi_metric_type       (+billing +appraisal +site +report metrics)
--
-- Materialized views (nightly refresh):
--   mv_billing_metrics  — MRR, ARR, churn, trial conversion, plan distribution
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extend analytics_event_type with Phase G events
-- ---------------------------------------------------------------------------

-- Website builder (Sitio)
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.page_published';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.page_unpublished';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.page_viewed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.form_submitted';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.custom_domain_connected';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.theme_changed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'site.block_added';

-- Appraisals (Tasaciones)
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'appraisal.created';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'appraisal.comp_searched';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'appraisal.ai_narrative_generated';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'appraisal.pdf_downloaded';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'appraisal.shared';

-- Report adoption
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'report.viewed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'report.filter_applied';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'report.exported';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'report.pinned';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'report.digest_scheduled';

-- Billing
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'billing.checkout_started';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'billing.checkout_completed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'billing.payment_failed';

-- ---------------------------------------------------------------------------
-- Extend analytics_entity_type
-- ---------------------------------------------------------------------------
ALTER TYPE analytics_entity_type ADD VALUE IF NOT EXISTS 'site';
ALTER TYPE analytics_entity_type ADD VALUE IF NOT EXISTS 'appraisal';
ALTER TYPE analytics_entity_type ADD VALUE IF NOT EXISTS 'report';

-- ---------------------------------------------------------------------------
-- Extend kpi_metric_type with Phase G metrics
-- ---------------------------------------------------------------------------

-- Website builder
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'site_pages_published_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'site_form_submissions_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'site_custom_domains_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'site_page_views_count';

-- Appraisals
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'appraisals_created_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'appraisal_comp_searches_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'appraisal_ai_narrative_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'appraisal_pdf_downloads_count';

-- Report adoption
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'report_views_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'report_exports_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'report_digest_subscriptions_count';

-- Billing (platform-level, dimension_type = 'agency')
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_mrr_amount';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_arr_amount';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_arpu_amount';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_churn_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_trial_conversion_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_active_subscriptions_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'billing_trials_active_count';

-- ---------------------------------------------------------------------------
-- mv_billing_metrics
-- Platform-level billing snapshot derived from tenant.plan_code.
-- Tenant pricing (ARS, per-month estimate):
--   trial       → 0
--   solo        → 15000
--   agencia     → 35000
--   pro         → 75000
--   enterprise  → 150000
-- Nightly refresh after kpi_snapshot_daily upsert.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_billing_metrics AS
WITH plan_prices AS (
  SELECT *
  FROM (VALUES
    ('trial',      0::numeric),
    ('solo',       15000::numeric),
    ('agencia',    35000::numeric),
    ('pro',        75000::numeric),
    ('enterprise', 150000::numeric)
  ) AS t(plan_code, monthly_ars)
),
tenant_plans AS (
  SELECT
    t.id                                  AS tenant_id,
    t.plan_code,
    CASE WHEN t.plan_code = 'trial' THEN TRUE ELSE FALSE END AS is_trial,
    COALESCE(pp.monthly_ars, 0)           AS monthly_ars,
    t.trial_ends_at,
    t.deleted_at
  FROM tenant t
  LEFT JOIN plan_prices pp ON pp.plan_code = t.plan_code
  WHERE t.deleted_at IS NULL
),
agg AS (
  SELECT
    COUNT(*)                                                         AS total_tenants,
    COUNT(*) FILTER (WHERE NOT is_trial)                             AS active_subscriptions,
    COUNT(*) FILTER (WHERE is_trial)                                 AS trials_active,
    COUNT(*) FILTER (WHERE is_trial AND trial_ends_at < NOW())       AS trials_expired,
    SUM(monthly_ars) FILTER (WHERE NOT is_trial)                     AS mrr_ars,
    SUM(monthly_ars) FILTER (WHERE NOT is_trial) * 12               AS arr_ars,
    ROUND(
      SUM(monthly_ars) FILTER (WHERE NOT is_trial)::numeric
      / NULLIF(COUNT(*) FILTER (WHERE NOT is_trial), 0),
      2
    )                                                                AS arpu_ars,
    -- Churn rate: trials that expired without converting / total tenants ever trialled
    -- Simplified: expired_trials / (expired_trials + active_subscriptions)
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE is_trial AND trial_ends_at < NOW())::numeric
      / NULLIF(
          COUNT(*) FILTER (WHERE is_trial AND trial_ends_at < NOW())
          + COUNT(*) FILTER (WHERE NOT is_trial),
          0
        ),
      2
    )                                                                AS churn_rate_pct,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE NOT is_trial)::numeric
      / NULLIF(COUNT(*), 0),
      2
    )                                                                AS trial_conversion_rate_pct
  FROM tenant_plans
),
plan_dist AS (
  SELECT
    plan_code,
    COUNT(*) AS tenant_count
  FROM tenant_plans
  GROUP BY plan_code
)
SELECT
  agg.total_tenants,
  agg.active_subscriptions,
  agg.trials_active,
  agg.trials_expired,
  COALESCE(agg.mrr_ars, 0)                   AS mrr_ars,
  COALESCE(agg.arr_ars, 0)                   AS arr_ars,
  COALESCE(agg.arpu_ars, 0)                  AS arpu_ars,
  COALESCE(agg.churn_rate_pct, 0)            AS churn_rate_pct,
  COALESCE(agg.trial_conversion_rate_pct, 0) AS trial_conversion_rate_pct,
  NOW()                                      AS refreshed_at
FROM agg;

CREATE UNIQUE INDEX IF NOT EXISTS mv_billing_metrics_singleton
  ON mv_billing_metrics ((TRUE));

-- ---------------------------------------------------------------------------
-- mv_plan_distribution
-- Per-plan tenant counts for plan distribution chart.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_plan_distribution AS
SELECT
  t.plan_code,
  COUNT(*) AS tenant_count,
  NOW()    AS refreshed_at
FROM tenant t
WHERE t.deleted_at IS NULL
GROUP BY t.plan_code;

CREATE UNIQUE INDEX IF NOT EXISTS mv_plan_distribution_pk
  ON mv_plan_distribution (plan_code);
