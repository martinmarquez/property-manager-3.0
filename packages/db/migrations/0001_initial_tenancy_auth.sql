-- =============================================================================
-- Migration: 0001_initial_tenancy_auth
-- Phase A — Tenancy + Auth entity group
--
-- Tables: tenant, "user", branch, role, user_role, api_key, webhook,
--         audit_log, feature_flag, tenant_domain
--
-- Extensions required: uuid-ossp, citext, pgcrypto
--   (pre-created in Neon project setup)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- tenant
-- (No tenant_id FK or universal cols — this IS the tenant root)
-- ---------------------------------------------------------------------------
CREATE TABLE tenant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  country_code    text NOT NULL DEFAULT 'AR',
  timezone        text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency        text NOT NULL DEFAULT 'ARS',
  locale          text NOT NULL DEFAULT 'es-AR',
  -- plan_code: FK to billing.plan added in Phase G migration
  plan_code       text NOT NULL DEFAULT 'trial',
  trial_ends_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX tenant_slug_idx ON tenant (slug) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- "user"
-- (tenant-owned; quote required — user is a reserved word in Postgres)
-- ---------------------------------------------------------------------------
CREATE TABLE "user" (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenant(id),
  email                 citext NOT NULL,
  password_hash         text,           -- argon2id; NULL = SSO-only
  totp_secret           text,
  webauthn_credentials  jsonb,
  full_name             text,
  avatar_url            text,
  locale                text NOT NULL DEFAULT 'es-AR',
  timezone              text,
  active                boolean NOT NULL DEFAULT true,
  last_login_at         timestamptz,
  email_verified_at     timestamptz,
  invited_by            uuid REFERENCES "user"(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  version               int NOT NULL DEFAULT 1,
  CONSTRAINT user_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE INDEX user_tenant_active_idx ON "user" (tenant_id, active) WHERE deleted_at IS NULL;
CREATE INDEX user_email_idx ON "user" USING gin (email gin_trgm_ops) ;

-- ---------------------------------------------------------------------------
-- branch
-- ---------------------------------------------------------------------------
CREATE TABLE branch (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  name              text NOT NULL,
  slug              text NOT NULL,
  address           text,
  phone             text,
  email             text,
  parent_branch_id  uuid REFERENCES branch(id),
  -- universal columns
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES "user"(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES "user"(id),
  deleted_at        timestamptz,
  version           int NOT NULL DEFAULT 1,
  CONSTRAINT branch_tenant_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX branch_tenant_idx ON branch (tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- role
-- ---------------------------------------------------------------------------
CREATE TABLE role (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  name          text NOT NULL,
  slug          text NOT NULL,
  description   text,
  is_system     boolean NOT NULL DEFAULT false,
  permissions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- universal columns
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES "user"(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES "user"(id),
  deleted_at    timestamptz,
  version       int NOT NULL DEFAULT 1,
  CONSTRAINT role_tenant_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX role_tenant_idx ON role (tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- user_role  (join: user ↔ role, optionally scoped to a branch)
-- ---------------------------------------------------------------------------
CREATE TABLE user_role (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  user_id     uuid NOT NULL REFERENCES "user"(id),
  role_id     uuid NOT NULL REFERENCES role(id),
  branch_id   uuid REFERENCES branch(id), -- NULL = tenant-wide
  granted_by  uuid REFERENCES "user"(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  -- universal columns
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES "user"(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES "user"(id),
  deleted_at  timestamptz,
  version     int NOT NULL DEFAULT 1
);

CREATE INDEX user_role_user_idx   ON user_role (tenant_id, user_id)  WHERE deleted_at IS NULL;
CREATE INDEX user_role_role_idx   ON user_role (tenant_id, role_id)  WHERE deleted_at IS NULL;
CREATE INDEX user_role_branch_idx ON user_role (tenant_id, branch_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- api_key
-- ---------------------------------------------------------------------------
CREATE TABLE api_key (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  name          text NOT NULL,
  key_hash      text NOT NULL UNIQUE,   -- SHA-256 of raw key
  prefix        text NOT NULL,          -- first 8 chars shown in UI
  scopes        jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at    timestamptz,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  -- universal columns
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES "user"(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES "user"(id),
  deleted_at    timestamptz,
  version       int NOT NULL DEFAULT 1
);

CREATE INDEX api_key_tenant_idx ON api_key (tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- webhook
-- ---------------------------------------------------------------------------
CREATE TABLE webhook (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id),
  url                 text NOT NULL,
  secret_hash         text NOT NULL,    -- HMAC-SHA256 secret stored hashed
  events              jsonb NOT NULL DEFAULT '[]'::jsonb,
  active              boolean NOT NULL DEFAULT true,
  last_triggered_at   timestamptz,
  failure_count       int NOT NULL DEFAULT 0,
  -- universal columns
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES "user"(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES "user"(id),
  deleted_at          timestamptz,
  version             int NOT NULL DEFAULT 1
);

CREATE INDEX webhook_tenant_active_idx ON webhook (tenant_id, active) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- audit_log  (append-only; bigserial PK; no soft-delete)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  user_id       uuid REFERENCES "user"(id),
  entity_type   text NOT NULL,
  entity_id     uuid NOT NULL,
  action        text NOT NULL,   -- create|update|delete|restore|publish|sign|…
  diff          jsonb,
  ip            inet,
  user_agent    text,
  request_id    text,
  at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx   ON audit_log (tenant_id, entity_type, entity_id, at DESC);
CREATE INDEX audit_log_user_idx     ON audit_log (tenant_id, user_id, at DESC);
CREATE INDEX audit_log_tenant_at_idx ON audit_log (tenant_id, at DESC);

-- ---------------------------------------------------------------------------
-- feature_flag
-- ---------------------------------------------------------------------------
CREATE TABLE feature_flag (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  key           text NOT NULL,
  enabled       boolean NOT NULL DEFAULT false,
  rollout_pct   int NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  payload       jsonb,
  -- universal columns
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES "user"(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES "user"(id),
  deleted_at    timestamptz,
  version       int NOT NULL DEFAULT 1,
  CONSTRAINT feature_flag_tenant_key_unique UNIQUE (tenant_id, key)
);

CREATE INDEX feature_flag_tenant_idx ON feature_flag (tenant_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- tenant_domain  (custom domains for white-label tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_domain (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenant(id),
  domain                text NOT NULL UNIQUE,
  verified_at           timestamptz,
  ssl_provisioned_at    timestamptz,
  is_primary            boolean NOT NULL DEFAULT false,
  -- universal columns
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES "user"(id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES "user"(id),
  deleted_at            timestamptz,
  version               int NOT NULL DEFAULT 1
);

CREATE INDEX tenant_domain_tenant_idx ON tenant_domain (tenant_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- Row Level Security (RLS)
--
-- Policy: every query must provide app.tenant_id via SET LOCAL.
-- The API request lifecycle calls:
--   SET LOCAL app.tenant_id = '<uuid>';
--   SET LOCAL app.user_id   = '<uuid>';
-- at the start of each transaction.
--
-- audit_log uses RLS on tenant_id for reads; inserts bypass via SECURITY DEFINER
-- function (see below) so that mutations in any context are always logged.
-- =============================================================================

-- "user" table
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "user"
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- branch
ALTER TABLE branch ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branch
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- role
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- user_role
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_role
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- api_key
ALTER TABLE api_key ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON api_key
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- webhook
ALTER TABLE webhook ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webhook
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- audit_log (read-scoped; writes via SECURITY DEFINER fn below)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- feature_flag
ALTER TABLE feature_flag ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON feature_flag
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- tenant_domain
ALTER TABLE tenant_domain ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_domain
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- tenant table: RLS not applied (accessed by ID in auth flow before tenant context is set)
-- Admin/bootstrap queries use superuser or SECURITY DEFINER wrappers.

-- =============================================================================
-- SECURITY DEFINER helper for audit_log inserts
-- Allows application code to insert audit rows without needing to bypass RLS
-- via a separate privileged connection.
-- =============================================================================
CREATE OR REPLACE FUNCTION write_audit_log(
  p_tenant_id   uuid,
  p_user_id     uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_diff        jsonb    DEFAULT NULL,
  p_ip          inet     DEFAULT NULL,
  p_user_agent  text     DEFAULT NULL,
  p_request_id  text     DEFAULT NULL
) RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO audit_log
    (tenant_id, user_id, entity_type, entity_id, action, diff, ip, user_agent, request_id)
  VALUES
    (p_tenant_id, p_user_id, p_entity_type, p_entity_id, p_action, p_diff, p_ip, p_user_agent, p_request_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- =============================================================================
-- updated_at trigger  (auto-bump updated_at on row changes)
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply trigger to all tables that have updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON branch
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON role
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_role
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON api_key
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON webhook
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON feature_flag
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_domain
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Optimistic concurrency trigger  (bump version on update)
-- =============================================================================
CREATE OR REPLACE FUNCTION bump_version()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_version BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON branch
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON role
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON user_role
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON api_key
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON webhook
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON feature_flag
  FOR EACH ROW EXECUTE FUNCTION bump_version();

CREATE TRIGGER bump_version BEFORE UPDATE ON tenant_domain
  FOR EACH ROW EXECUTE FUNCTION bump_version();
