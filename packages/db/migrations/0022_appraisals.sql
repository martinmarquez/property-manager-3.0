-- =============================================================================
-- Migration: 0022_appraisals
-- Phase G — Appraisals (Tasaciones): appraisal, appraisal_comp, appraisal_report
-- Depends on: 0004_properties_base (property table), 0019_phase_g_postgis
--
-- Tables:
--   appraisal        — main appraisal record with subject property details
--   appraisal_comp   — comparable properties (PostGIS search or manual)
--   appraisal_report — AI narrative output + PDF metadata
--
-- RLS: all 3 tables enforce tenant_isolation via standard policy.
-- PostGIS: comp search uses ST_DWithin on property.lat/lng geometry.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE appraisal_status AS ENUM (
  'draft',
  'in_progress',
  'in_review',
  'approved',
  'delivered',
  'archived'
);

CREATE TYPE appraisal_purpose AS ENUM (
  'sale',
  'rent',
  'guarantee',
  'inheritance',
  'tax',
  'insurance',
  'judicial',
  'other'
);

-- ---------------------------------------------------------------------------
-- appraisal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appraisal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,

  -- Subject property (optional FK)
  property_id       UUID REFERENCES property(id),

  -- Client
  client_name       TEXT NOT NULL,
  client_email      TEXT,
  client_phone      TEXT,

  -- Subject property details (denormalized)
  address_street    TEXT NOT NULL,
  address_number    TEXT,
  locality          TEXT,
  province          TEXT,
  country           TEXT NOT NULL DEFAULT 'AR',
  lat               REAL,
  lng               REAL,

  property_type     property_type NOT NULL,
  operation_kind    operation_kind NOT NULL,
  covered_area_m2   REAL,
  total_area_m2     REAL,
  rooms             INTEGER,
  bedrooms          INTEGER,
  bathrooms         INTEGER,
  garages           INTEGER,
  age_years         INTEGER,

  -- Appraisal metadata
  purpose           appraisal_purpose NOT NULL DEFAULT 'sale',
  status            appraisal_status NOT NULL DEFAULT 'draft',
  reference_code    TEXT,

  -- Value range
  estimated_value_min NUMERIC(18,2),
  estimated_value_max NUMERIC(18,2),
  value_currency      currency NOT NULL DEFAULT 'USD',

  -- Appraiser info
  appraiser_signature_url TEXT,
  appraiser_matricula     TEXT,
  appraiser_name          TEXT,

  notes             TEXT,

  -- Soft delete
  deleted_at        TIMESTAMPTZ,

  -- Audit
  created_by        UUID REFERENCES "user"(id),
  updated_by        UUID REFERENCES "user"(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version           INTEGER NOT NULL DEFAULT 1
);

-- Spec: index on (tenant_id, status)
CREATE INDEX idx_appraisal_tenant_status ON appraisal(tenant_id, status);
CREATE INDEX idx_appraisal_property ON appraisal(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_appraisal_deleted ON appraisal(tenant_id) WHERE deleted_at IS NOT NULL;

ALTER TABLE appraisal ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appraisal
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- appraisal_comp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appraisal_comp (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  appraisal_id        UUID NOT NULL REFERENCES appraisal(id) ON DELETE CASCADE,

  -- Source property (nullable)
  source_property_id  UUID REFERENCES property(id),

  -- Comp details (denormalized)
  address             TEXT NOT NULL,
  lat                 REAL,
  lng                 REAL,
  distance_m          REAL,

  property_type       property_type,
  operation_kind      operation_kind,
  covered_area_m2     REAL,
  total_area_m2       REAL,
  rooms               INTEGER,
  bedrooms            INTEGER,
  bathrooms           INTEGER,

  price_amount        NUMERIC(18,2),
  price_currency      currency NOT NULL DEFAULT 'USD',
  price_per_m2        NUMERIC(12,2),

  photo_url           TEXT,
  listing_status      TEXT,

  is_included         BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spec: index on (appraisal_id, is_included)
CREATE INDEX idx_appraisal_comp_appraisal_included ON appraisal_comp(appraisal_id, is_included);
CREATE INDEX idx_appraisal_comp_tenant ON appraisal_comp(tenant_id);

ALTER TABLE appraisal_comp ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appraisal_comp
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- appraisal_report
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appraisal_report (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  appraisal_id        UUID NOT NULL REFERENCES appraisal(id) ON DELETE CASCADE,

  -- AI narrative output
  estimated_value_min NUMERIC(18,2),
  estimated_value_max NUMERIC(18,2),
  value_currency      currency NOT NULL DEFAULT 'USD',
  narrative_md        TEXT,
  comps_summary       TEXT,
  methodology_note    TEXT,

  -- AI metadata
  ai_model            TEXT,
  ai_latency_ms       INTEGER,
  ai_input_tokens     INTEGER,
  ai_output_tokens    INTEGER,
  ai_raw_output       JSONB,

  -- PDF
  pdf_storage_key     TEXT,
  pdf_url             TEXT,
  pdf_expires_at      TIMESTAMPTZ,
  pdf_generated_at    TIMESTAMPTZ,

  -- Share
  share_token         TEXT,
  share_expires_at    TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appraisal_report_appraisal ON appraisal_report(appraisal_id);
CREATE INDEX idx_appraisal_report_tenant ON appraisal_report(tenant_id);
CREATE UNIQUE INDEX idx_appraisal_report_share_token ON appraisal_report(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE appraisal_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appraisal_report
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
