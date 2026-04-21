-- =============================================================================
-- Migration: 0002_auth_credentials
-- Phase A — Auth credential tables (RENA-5)
--
-- New tables: session, password_reset_token, totp_credential,
--             webauthn_credential
--
-- These tables extend the user / tenant foundation from 0001.
-- Session data is authoritative in Redis; this table is an audit trail.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- session
-- Audit mirror of Redis sessions.  Redis is authoritative for liveness.
-- ---------------------------------------------------------------------------
CREATE TABLE session (
  id            text PRIMARY KEY,          -- 256-bit hex (generateSessionId)
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  user_id       uuid NOT NULL REFERENCES "user"(id),
  roles         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);

CREATE INDEX session_user_idx    ON session (user_id)   WHERE revoked_at IS NULL;
CREATE INDEX session_tenant_idx  ON session (tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX session_expires_idx ON session (expires_at);

ALTER TABLE session ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON session
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- password_reset_token
-- One-use, time-limited.  tokenHash = SHA-256(rawToken).
-- ---------------------------------------------------------------------------
CREATE TABLE password_reset_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  user_id     uuid NOT NULL REFERENCES "user"(id),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prt_user_idx    ON password_reset_token (user_id)   WHERE used_at IS NULL;
CREATE INDEX prt_expires_idx ON password_reset_token (expires_at) WHERE used_at IS NULL;

ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON password_reset_token
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- totp_credential
-- One row per user; confirmed once user verifies their first code.
-- encryptedSecret = AES-256-GCM(base32Secret, AUTH_ENCRYPTION_KEY).
-- ---------------------------------------------------------------------------
CREATE TABLE totp_credential (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenant(id),
  user_id           uuid        NOT NULL UNIQUE REFERENCES "user"(id),
  encrypted_secret  text        NOT NULL,
  backup_codes      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  confirmed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX totp_tenant_idx ON totp_credential (tenant_id);

ALTER TABLE totp_credential ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON totp_credential
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- webauthn_credential
-- One row per registered authenticator / passkey.
-- credentialId is base64url-encoded as issued by the authenticator.
-- public_key stores the raw COSE CBOR bytes.
-- ---------------------------------------------------------------------------
CREATE TABLE webauthn_credential (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenant(id),
  user_id        uuid        NOT NULL REFERENCES "user"(id),
  credential_id  text        NOT NULL UNIQUE,
  public_key     bytea       NOT NULL,
  counter        bigint      NOT NULL DEFAULT 0,
  device_type    text        NOT NULL DEFAULT 'singleDevice',
  transports     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  aaguid         text,
  name           text        NOT NULL DEFAULT 'Security Key',
  backed_up      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_used_at   timestamptz
);

CREATE INDEX wac_user_idx   ON webauthn_credential (user_id);
CREATE INDEX wac_tenant_idx ON webauthn_credential (tenant_id);

ALTER TABLE webauthn_credential ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webauthn_credential
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
