-- =============================================================================
-- Migration: 0012_portals
-- Portal sync entity group (RENA-60)
--
-- Tables: portal_connection, property_portal_publication, portal_sync_log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE portal_type AS ENUM (
  'mercadolibre', 'zonaprop', 'argenprop', 'proppit',
  'inmuebles24', 'properati', 'idealista', 'remax', 'generic_xml'
);

CREATE TYPE portal_connection_status AS ENUM (
  'active', 'paused', 'error', 'expired', 'pending_auth'
);

CREATE TYPE publication_status AS ENUM (
  'draft', 'publishing', 'published', 'update_pending',
  'unpublishing', 'unpublished', 'error'
);

CREATE TYPE sync_action AS ENUM (
  'publish', 'update', 'unpublish', 'fetch_leads',
  'validate_credentials', 'full_sync'
);

CREATE TYPE sync_status AS ENUM (
  'pending', 'running', 'success', 'failed'
);

-- ---------------------------------------------------------------------------
-- portal_connection — one row per tenant×portal credential set
-- ---------------------------------------------------------------------------
CREATE TABLE portal_connection (
  id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid                      NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  portal        portal_type               NOT NULL,
  label         text,
  status        portal_connection_status  NOT NULL DEFAULT 'pending_auth',
  credentials   bytea                     NOT NULL,
  config        jsonb                     NOT NULL DEFAULT '{}',
  last_sync_at  timestamptz,
  error_message text,
  deleted_at    timestamptz,
  created_at    timestamptz               NOT NULL DEFAULT now(),
  created_by    uuid                      REFERENCES "user"(id),
  updated_at    timestamptz               NOT NULL DEFAULT now(),
  updated_by    uuid                      REFERENCES "user"(id),
  version       integer                   NOT NULL DEFAULT 1
);

CREATE INDEX portal_connection_tenant_idx ON portal_connection (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE portal_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_connection
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- property_portal_publication
-- ---------------------------------------------------------------------------
CREATE TABLE property_portal_publication (
  id                    uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid                NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  property_id           uuid                NOT NULL REFERENCES property(id),
  portal_connection_id  uuid                NOT NULL REFERENCES portal_connection(id),
  status                publication_status  NOT NULL DEFAULT 'draft',
  portal_listing_id     text,
  portal_url            text,
  published_at          timestamptz,
  last_synced_at        timestamptz,
  error_message         text,
  portal_specific_fields jsonb              NOT NULL DEFAULT '{}',
  deleted_at            timestamptz,
  created_at            timestamptz         NOT NULL DEFAULT now(),
  created_by            uuid                REFERENCES "user"(id),
  updated_at            timestamptz         NOT NULL DEFAULT now(),
  updated_by            uuid                REFERENCES "user"(id),
  version               integer             NOT NULL DEFAULT 1
);

CREATE INDEX property_portal_publication_tenant_property_idx
  ON property_portal_publication (tenant_id, property_id) WHERE deleted_at IS NULL;

ALTER TABLE property_portal_publication ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON property_portal_publication
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- portal_sync_log — append-only audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE portal_sync_log (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  portal_connection_id  uuid          NOT NULL REFERENCES portal_connection(id),
  publication_id        uuid          REFERENCES property_portal_publication(id),
  action                sync_action   NOT NULL,
  status                sync_status   NOT NULL DEFAULT 'pending',
  request_payload       jsonb,
  response_payload      jsonb,
  error_message         text,
  started_at            timestamptz   NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  duration_ms           integer,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX portal_sync_log_tenant_idx ON portal_sync_log (tenant_id, started_at DESC);

ALTER TABLE portal_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_sync_log
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
