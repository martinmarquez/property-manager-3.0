-- =============================================================================
-- Migration: 0006_properties_bulk_csv_history_trash
-- Phase B — RENA-30: Bulk edit, CSV import, history, soft-delete + trash
-- Depends on: 0004_properties_base (property, property_history tables)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Property deletion reason enum (separate from media_deletion_reason)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE property_deletion_reason AS ENUM (
    'sold_externally',
    'owner_withdrew',
    'duplicate',
    'data_error',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Alter property table
-- ---------------------------------------------------------------------------
ALTER TABLE property
  ADD COLUMN IF NOT EXISTS deletion_note      text,
  ADD COLUMN IF NOT EXISTS auto_purge_at      timestamptz;

DO $$ BEGIN
  ALTER TABLE property DROP COLUMN IF EXISTS deletion_reason;
  ALTER TABLE property
    ADD COLUMN deletion_reason property_deletion_reason;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. import_job — one row per CSV import session
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_job (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenant(id),
  created_by      uuid        REFERENCES "user"(id),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','processing','done','failed')),
  original_filename text,
  column_mapping  jsonb       NOT NULL DEFAULT '{}',
  total_rows      int,
  imported_rows   int         DEFAULT 0,
  skipped_rows    int         DEFAULT 0,
  failed_rows     int         DEFAULT 0,
  result_storage_key text,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_job_tenant
  ON import_job (tenant_id, created_at DESC)
  WHERE status != 'failed';

ALTER TABLE import_job ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY import_job_tenant_isolation ON import_job
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. import_job_row — one row per CSV input row
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_job_row (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id   uuid        NOT NULL REFERENCES import_job(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL,
  row_number      int         NOT NULL,
  row_status      text        NOT NULL DEFAULT 'pending'
                              CHECK (row_status IN ('pending','imported','skipped','failed')),
  reference_code  text,
  property_id     uuid        REFERENCES property(id),
  error_reason    text,
  raw_data        jsonb
);

CREATE INDEX IF NOT EXISTS idx_import_job_row_job
  ON import_job_row (import_job_id, row_number);

ALTER TABLE import_job_row ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY import_job_row_tenant_isolation ON import_job_row
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 5. property_history: add event_source column
-- ---------------------------------------------------------------------------
ALTER TABLE property_history
  ADD COLUMN IF NOT EXISTS event_source text NOT NULL DEFAULT 'single'
    CHECK (event_source IN ('single', 'bulk', 'import', 'system'));

CREATE INDEX IF NOT EXISTS idx_property_history_property_created
  ON property_history (property_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Indexes for trash queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_property_deleted
  ON property (tenant_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_auto_purge
  ON property (auto_purge_at)
  WHERE deleted_at IS NOT NULL AND auto_purge_at IS NOT NULL;
