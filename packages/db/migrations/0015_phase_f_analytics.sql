-- =============================================================================
-- Migration: 0015_phase_f_analytics
-- Phase F — AI operational tables + analytics log tables + materialized views
-- Depends on: 0007_analytics (event/KPI enums), 0014_extensions_vector (pgvector, pg_trgm)
--
-- Operational AI tables (schema: packages/db/src/schema/ai.ts):
--   ai_embedding, copilot_session, copilot_turn,
--   copilot_quota_usage, property_ai_description
--
-- Analytics log tables (schema: analytics-ai.ts):
--   ai_embedding_log, search_query_log, description_generation_log
--
-- Enum extensions:
--   analytics_event_type  (+copilot.* +search.* +description.*)
--   analytics_entity_type (+copilot_session)
--   kpi_metric_type       (+AI cost/usage metrics)
--
-- Materialized views (nightly refresh):
--   mv_ai_usage_value, mv_ai_cost_by_tenant,
--   mv_search_analytics, mv_description_metrics
--
-- Cost model baked into MVs:
--   text-embedding-3-small : $0.020 / 1M tokens
--   claude-haiku-4-5        : $0.800 / 1M input  +  $4.00 / 1M output
--   claude-sonnet-4-6       : $3.000 / 1M input  + $15.00 / 1M output
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extend analytics_event_type with Phase F events
-- ---------------------------------------------------------------------------
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'copilot.query_sent';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'copilot.action_confirmed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'copilot.session_ended';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'copilot.feedback_given';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'search.performed';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'search.result_clicked';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'description.generated';
ALTER TYPE analytics_event_type ADD VALUE IF NOT EXISTS 'description.saved';

-- ---------------------------------------------------------------------------
-- Extend analytics_entity_type
-- ---------------------------------------------------------------------------
ALTER TYPE analytics_entity_type ADD VALUE IF NOT EXISTS 'copilot_session';

-- ---------------------------------------------------------------------------
-- Extend kpi_metric_type with Phase F AI + search + description metrics
-- ---------------------------------------------------------------------------
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_queries_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_sessions_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_unique_users_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_tokens_input_total';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_tokens_output_total';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_action_confirmation_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'copilot_avg_response_ms';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'ai_embedding_cost_usd';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'ai_llm_cost_usd';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'ai_total_cost_usd';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'search_queries_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'search_zero_result_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'search_click_through_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'descriptions_generated_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'description_save_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'description_avg_generation_ms';

-- ---------------------------------------------------------------------------
-- Additional indexes on AI operational tables (created by 0015_phase_f_ai)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS copilot_session_tenant_time_idx
  ON copilot_session (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS copilot_session_user_idx
  ON copilot_session (tenant_id, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS copilot_turn_tenant_time_idx
  ON copilot_turn (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS copilot_turn_action_idx
  ON copilot_turn (tenant_id, created_at DESC)
  WHERE action_confirmed IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_embedding_chunk_idx
  ON ai_embedding (tenant_id, entity_type, entity_id, chunk_index);
CREATE INDEX IF NOT EXISTS property_ai_description_property_idx
  ON property_ai_description (tenant_id, property_id, created_at DESC);

-- ===========================================================================
-- Analytics log table indexes (tables created by 0015_phase_f_ai)
-- ===========================================================================

CREATE INDEX IF NOT EXISTS ai_embedding_log_tenant_time_idx
  ON ai_embedding_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_embedding_log_entity_idx
  ON ai_embedding_log (tenant_id, entity_type, entity_id);

ALTER TABLE search_query_log ADD CONSTRAINT search_query_log_search_type_check
  CHECK (search_type IN ('keyword', 'semantic', 'hybrid'));

CREATE INDEX IF NOT EXISTS search_query_log_tenant_time_idx
  ON search_query_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_query_log_zero_results_idx
  ON search_query_log (tenant_id, created_at DESC)
  WHERE result_count = 0;
CREATE INDEX IF NOT EXISTS search_query_log_query_trgm_idx
  ON search_query_log USING gin (query_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS description_generation_log_tenant_time_idx
  ON description_generation_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS description_generation_log_property_idx
  ON description_generation_log (tenant_id, property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS description_generation_log_saved_idx
  ON description_generation_log (tenant_id, created_at DESC)
  WHERE saved = true;

-- ===========================================================================
-- Materialized views
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- mv_ai_usage_value
-- Per-tenant, per-feature monthly adoption + LLM cost + satisfaction.
-- Combines copilot sessions (claude-sonnet-4-6) + description gen (claude-haiku-4-5).
-- Nightly refresh order: this view first, then mv_ai_cost_by_tenant.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_ai_usage_value AS

SELECT
  cs.tenant_id,
  'copilot'::text                               AS feature_type,
  DATE_TRUNC('month', cs.created_at)            AS report_month,
  COUNT(DISTINCT cs.id)                         AS total_sessions,
  COUNT(DISTINCT cs.user_id)                    AS unique_users,
  COUNT(ct.id)                                  AS total_turns,
  COALESCE(SUM(ct.input_tokens),  0)::bigint    AS total_input_tokens,
  COALESCE(SUM(ct.output_tokens), 0)::bigint    AS total_output_tokens,
  -- claude-sonnet-4-6 pricing
  ROUND(
    (COALESCE(SUM(ct.input_tokens),  0)::numeric / 1000000) * 3.0
    + (COALESCE(SUM(ct.output_tokens), 0)::numeric / 1000000) * 15.0,
    4
  )                                             AS llm_cost_usd,
  ROUND(
    100.0
    * COUNT(ct.id) FILTER (WHERE ct.action_confirmed = true)
    / NULLIF(COUNT(ct.id) FILTER (WHERE ct.action_confirmed IS NOT NULL), 0),
    2
  )                                             AS action_confirmation_pct,
  ROUND(
    100.0
    * COUNT(ct.id) FILTER (WHERE ct.feedback = 'positive')
    / NULLIF(COUNT(ct.id) FILTER (WHERE ct.feedback IS NOT NULL), 0),
    2
  )                                             AS positive_feedback_pct,
  NOW()                                         AS refreshed_at
FROM copilot_session cs
LEFT JOIN copilot_turn ct ON ct.session_id = cs.id AND ct.role = 'assistant'
GROUP BY cs.tenant_id, DATE_TRUNC('month', cs.created_at)

UNION ALL

SELECT
  dgl.tenant_id,
  'description_gen'::text                       AS feature_type,
  DATE_TRUNC('month', dgl.created_at)           AS report_month,
  COUNT(dgl.id)                                 AS total_sessions,
  COUNT(DISTINCT dgl.actor_id)                  AS unique_users,
  0::bigint                                     AS total_turns,
  COALESCE(SUM(dgl.input_tokens),  0)::bigint   AS total_input_tokens,
  COALESCE(SUM(dgl.output_tokens), 0)::bigint   AS total_output_tokens,
  -- claude-haiku-4-5 pricing
  ROUND(
    (COALESCE(SUM(dgl.input_tokens),  0)::numeric / 1000000) * 0.80
    + (COALESCE(SUM(dgl.output_tokens), 0)::numeric / 1000000) * 4.0,
    4
  )                                             AS llm_cost_usd,
  ROUND(
    100.0 * COUNT(dgl.id) FILTER (WHERE dgl.saved = true)
    / NULLIF(COUNT(dgl.id), 0),
    2
  )                                             AS action_confirmation_pct,  -- save rate
  NULL::numeric                                 AS positive_feedback_pct,
  NOW()                                         AS refreshed_at
FROM description_generation_log dgl
GROUP BY dgl.tenant_id, DATE_TRUNC('month', dgl.created_at);

CREATE UNIQUE INDEX mv_ai_usage_value_pk
  ON mv_ai_usage_value (tenant_id, feature_type, report_month);
CREATE INDEX mv_ai_usage_value_tenant_month_idx
  ON mv_ai_usage_value (tenant_id, report_month DESC);

-- ---------------------------------------------------------------------------
-- mv_ai_cost_by_tenant
-- Full per-tenant monthly cost breakdown: copilot LLM + description LLM + embeddings.
-- Refresh AFTER mv_ai_usage_value.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_ai_cost_by_tenant AS
WITH copilot_agg AS (
  SELECT
    cs.tenant_id,
    DATE_TRUNC('month', cs.created_at)          AS report_month,
    COALESCE(SUM(ct.input_tokens),  0)::bigint  AS input_tokens,
    COALESCE(SUM(ct.output_tokens), 0)::bigint  AS output_tokens,
    ROUND(
      (COALESCE(SUM(ct.input_tokens),  0)::numeric / 1000000) * 3.0
      + (COALESCE(SUM(ct.output_tokens), 0)::numeric / 1000000) * 15.0,
      4
    )                                           AS cost_usd
  FROM copilot_session cs
  LEFT JOIN copilot_turn ct ON ct.session_id = cs.id AND ct.role = 'assistant'
  GROUP BY cs.tenant_id, DATE_TRUNC('month', cs.created_at)
),
desc_agg AS (
  SELECT
    tenant_id,
    DATE_TRUNC('month', created_at)             AS report_month,
    COALESCE(SUM(input_tokens),  0)::bigint     AS input_tokens,
    COALESCE(SUM(output_tokens), 0)::bigint     AS output_tokens,
    ROUND(
      (COALESCE(SUM(input_tokens),  0)::numeric / 1000000) * 0.80
      + (COALESCE(SUM(output_tokens), 0)::numeric / 1000000) * 4.0,
      4
    )                                           AS cost_usd
  FROM description_generation_log
  GROUP BY tenant_id, DATE_TRUNC('month', created_at)
),
embed_agg AS (
  SELECT
    tenant_id,
    DATE_TRUNC('month', created_at)             AS report_month,
    COALESCE(SUM(token_count), 0)::bigint       AS embed_tokens,
    -- text-embedding-3-small: $0.02 / 1M tokens
    ROUND((COALESCE(SUM(token_count), 0)::numeric / 1000000) * 0.02, 6) AS cost_usd
  FROM ai_embedding_log
  GROUP BY tenant_id, DATE_TRUNC('month', created_at)
),
all_months AS (
  SELECT tenant_id, report_month FROM copilot_agg
  UNION
  SELECT tenant_id, report_month FROM desc_agg
  UNION
  SELECT tenant_id, report_month FROM embed_agg
)
SELECT
  am.tenant_id,
  am.report_month,
  COALESCE(ca.input_tokens,  0)  AS copilot_input_tokens,
  COALESCE(ca.output_tokens, 0)  AS copilot_output_tokens,
  COALESCE(ca.cost_usd,      0)  AS copilot_llm_cost_usd,
  COALESCE(da.input_tokens,  0)  AS desc_input_tokens,
  COALESCE(da.output_tokens, 0)  AS desc_output_tokens,
  COALESCE(da.cost_usd,      0)  AS desc_llm_cost_usd,
  COALESCE(ea.embed_tokens,  0)  AS embedding_tokens,
  COALESCE(ea.cost_usd,      0)  AS embedding_cost_usd,
  COALESCE(ca.cost_usd, 0)
    + COALESCE(da.cost_usd, 0)
    + COALESCE(ea.cost_usd, 0)   AS total_cost_usd,
  NOW()                          AS refreshed_at
FROM all_months am
LEFT JOIN copilot_agg ca ON ca.tenant_id = am.tenant_id AND ca.report_month = am.report_month
LEFT JOIN desc_agg    da ON da.tenant_id = am.tenant_id AND da.report_month = am.report_month
LEFT JOIN embed_agg   ea ON ea.tenant_id = am.tenant_id AND ea.report_month = am.report_month;

CREATE UNIQUE INDEX mv_ai_cost_by_tenant_pk
  ON mv_ai_cost_by_tenant (tenant_id, report_month);
CREATE INDEX mv_ai_cost_by_tenant_month_idx
  ON mv_ai_cost_by_tenant (report_month DESC);

-- ---------------------------------------------------------------------------
-- mv_search_analytics
-- Daily search volume, zero-result rate, CTR, and match-type distribution.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_search_analytics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at)                     AS report_day,
  COUNT(id)                                         AS total_queries,
  COUNT(id) FILTER (WHERE result_count = 0)         AS zero_result_queries,
  ROUND(
    100.0 * COUNT(id) FILTER (WHERE result_count = 0)
    / NULLIF(COUNT(id), 0),
    2
  )                                                 AS zero_result_rate_pct,
  COUNT(id) FILTER (WHERE clicked_rank IS NOT NULL) AS clicked_queries,
  ROUND(
    100.0 * COUNT(id) FILTER (WHERE clicked_rank IS NOT NULL)
    / NULLIF(COUNT(id), 0),
    2
  )                                                 AS click_through_rate_pct,
  ROUND(
    AVG(clicked_rank) FILTER (WHERE clicked_rank IS NOT NULL),
    2
  )                                                 AS avg_click_rank,
  COUNT(id) FILTER (WHERE search_type = 'keyword')  AS keyword_queries,
  COUNT(id) FILTER (WHERE search_type = 'semantic') AS semantic_queries,
  COUNT(id) FILTER (WHERE search_type = 'hybrid')   AS hybrid_queries,
  ROUND(AVG(latency_ms), 2)                         AS avg_latency_ms,
  NOW()                                             AS refreshed_at
FROM search_query_log
GROUP BY tenant_id, DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX mv_search_analytics_pk
  ON mv_search_analytics (tenant_id, report_day);
CREATE INDEX mv_search_analytics_tenant_day_idx
  ON mv_search_analytics (tenant_id, report_day DESC);

-- ---------------------------------------------------------------------------
-- mv_description_metrics
-- Daily description generation stats sliced by tone and portal.
-- COALESCE ensures tone/portal are never NULL so the unique index holds.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_description_metrics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at)                   AS report_day,
  COALESCE(tone,   'unknown')                     AS tone,
  COALESCE(portal, 'generic')                     AS portal,
  COUNT(id)                                       AS total_generated,
  COUNT(id) FILTER (WHERE saved = true)           AS total_saved,
  ROUND(
    100.0 * COUNT(id) FILTER (WHERE saved = true)
    / NULLIF(COUNT(id), 0),
    2
  )                                               AS save_rate_pct,
  ROUND(AVG(latency_ms), 2)                       AS avg_latency_ms,
  ROUND(AVG(input_tokens)::numeric,  2)           AS avg_input_tokens,
  ROUND(AVG(output_tokens)::numeric, 2)           AS avg_output_tokens,
  NOW()                                           AS refreshed_at
FROM description_generation_log
GROUP BY tenant_id, DATE_TRUNC('day', created_at), tone, portal;

CREATE UNIQUE INDEX mv_description_metrics_pk
  ON mv_description_metrics (tenant_id, report_day, tone, portal);
CREATE INDEX mv_description_metrics_tenant_day_idx
  ON mv_description_metrics (tenant_id, report_day DESC);
