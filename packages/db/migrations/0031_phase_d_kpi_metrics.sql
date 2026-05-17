-- Phase D inbox / portal KPI metric enum values
-- These were defined in the Drizzle schema (kpiMetricTypeEnum) but never added
-- to the PostgreSQL kpi_metric_type enum via ALTER TYPE.

ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'inbox_messages_received_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'inbox_messages_sent_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'inbox_avg_first_response_minutes';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'inbox_sla_compliance_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'portal_publications_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'portal_sync_error_count';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'portal_lead_conversion_rate';
ALTER TYPE kpi_metric_type ADD VALUE IF NOT EXISTS 'lead_portal_attribution_count';
