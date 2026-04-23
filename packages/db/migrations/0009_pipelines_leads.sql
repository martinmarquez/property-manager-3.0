-- =============================================================================
-- Migration: 0009_pipelines_leads
-- Phase C — Leads & Pipelines entity group (RENA-33)
-- Depends on: 0004 (property, currency), 0005 (contact)
--
-- Tables: pipeline, pipeline_stage, lead, lead_stage_history
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE pipeline_type AS ENUM ('ventas', 'alquileres', 'desarrollos', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stage_kind AS ENUM ('open', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- pipeline
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  name        text NOT NULL,
  type        pipeline_type NOT NULL DEFAULT 'custom',
  is_default  boolean NOT NULL DEFAULT false,
  position    int NOT NULL DEFAULT 0,

  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES "user"(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES "user"(id),
  version     int NOT NULL DEFAULT 1
);

-- Exactly one default pipeline per tenant (among non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_default_per_tenant
  ON pipeline (tenant_id) WHERE is_default = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_tenant ON pipeline (tenant_id);

ALTER TABLE pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pipeline
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- pipeline_stage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_stage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  pipeline_id uuid NOT NULL REFERENCES pipeline(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        stage_kind NOT NULL DEFAULT 'open',
  color       text NOT NULL DEFAULT '#4669ff',
  sla_hours   int,
  position    int NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage_pipeline ON pipeline_stage (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_tenant ON pipeline_stage (tenant_id);

ALTER TABLE pipeline_stage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pipeline_stage
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- lead
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  pipeline_id       uuid NOT NULL REFERENCES pipeline(id),
  stage_id          uuid NOT NULL REFERENCES pipeline_stage(id),
  contact_id        uuid NOT NULL REFERENCES contact(id),
  property_id       uuid REFERENCES property(id),

  title             text,
  expected_value    numeric(15,2),
  expected_currency currency NOT NULL DEFAULT 'USD',
  expected_close_date date,

  score             int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  owner_user_id     uuid REFERENCES "user"(id),

  lost_reason       text,
  won_at            timestamptz,
  lost_at           timestamptz,
  stage_entered_at  timestamptz NOT NULL DEFAULT now(),

  deleted_at        timestamptz,
  deleted_by        uuid REFERENCES "user"(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES "user"(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES "user"(id),
  version           int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_lead_tenant ON lead (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline ON lead (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage ON lead (stage_id);
CREATE INDEX IF NOT EXISTS idx_lead_contact ON lead (contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_owner ON lead (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_deleted ON lead (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lead
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- lead_stage_history — immutable transition log for funnel analytics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  lead_id     uuid NOT NULL REFERENCES lead(id) ON DELETE CASCADE,
  stage_id    uuid NOT NULL REFERENCES pipeline_stage(id),

  entered_at  timestamptz NOT NULL DEFAULT now(),
  exited_at   timestamptz,
  moved_by    uuid REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON lead_stage_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_stage ON lead_stage_history (stage_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_tenant ON lead_stage_history (tenant_id);

ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lead_stage_history
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
