-- 0011_contact_import_dsr.sql
-- RENA-32: Contact CSV import tracking + DSR (Data Subject Request) for Ley 25.326

-- ============================================================================
-- contact_import_job — one row per CSV import session
-- ============================================================================

CREATE TABLE contact_import_job (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  created_by        UUID REFERENCES "user"(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  source_format     TEXT
    CHECK (source_format IS NULL OR source_format IN ('tokko','google','generic')),
  original_filename TEXT,
  column_mapping    JSONB NOT NULL DEFAULT '{}',
  total_rows        INTEGER,
  imported_rows     INTEGER DEFAULT 0,
  skipped_rows      INTEGER DEFAULT 0,
  failed_rows       INTEGER DEFAULT 0,
  result_storage_key TEXT,
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_import_job ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_import_job
  USING  (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_contact_import_job_tenant_created
  ON contact_import_job (tenant_id, created_at DESC);

-- ============================================================================
-- contact_import_row — one row per CSV input row
-- ============================================================================

CREATE TABLE contact_import_row (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id   UUID NOT NULL REFERENCES contact_import_job(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  row_number      INTEGER NOT NULL,
  row_status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (row_status IN ('pending','imported','skipped','failed')),
  display_name    TEXT,
  contact_id      UUID REFERENCES contact(id),
  error_reason    TEXT,
  raw_data        JSONB
);

ALTER TABLE contact_import_row ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_import_row
  USING  (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_contact_import_row_job_rownum
  ON contact_import_row (import_job_id, row_number);

-- ============================================================================
-- dsr_request — Data Subject Request lifecycle (Ley 25.326)
-- ============================================================================

CREATE TYPE dsr_type AS ENUM ('access', 'rectify', 'delete', 'portability');
CREATE TYPE dsr_status AS ENUM ('pending', 'in_progress', 'completed', 'disputed');

CREATE TABLE dsr_request (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  contact_id        UUID NOT NULL REFERENCES contact(id),
  type              dsr_type NOT NULL,
  status            dsr_status NOT NULL DEFAULT 'pending',
  requested_by      UUID REFERENCES "user"(id),
  assigned_to       UUID REFERENCES "user"(id),
  notes             TEXT,
  deadline_at       TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  disputed_at       TIMESTAMPTZ,
  dispute_reason    TEXT,
  bundle_storage_key TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dsr_request ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dsr_request
  USING  (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_dsr_request_tenant_status
  ON dsr_request (tenant_id, status);
CREATE INDEX idx_dsr_request_contact
  ON dsr_request (contact_id);
CREATE INDEX idx_dsr_request_deadline
  ON dsr_request (tenant_id, deadline_at)
  WHERE status IN ('pending', 'in_progress');
