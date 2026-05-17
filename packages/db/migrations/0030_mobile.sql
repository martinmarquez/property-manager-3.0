-- RENA-198: Mobile app backend tables
-- Phase H — push notifications, deep links, biometric auth, version policy

-- ---------------------------------------------------------------------------
-- push_device — registered FCM/APNs device tokens per user
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_device (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform     TEXT        NOT NULL CHECK (platform IN ('fcm', 'apns')),
  token        TEXT        NOT NULL,
  device_info  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  CONSTRAINT push_device_user_token_unique UNIQUE (user_id, token)
);

CREATE INDEX idx_push_device_tenant ON push_device(tenant_id);
CREATE INDEX idx_push_device_user   ON push_device(user_id);

ALTER TABLE push_device ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON push_device
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON TABLE push_device IS 'Registered FCM/APNs device tokens per user for push notifications';

-- ---------------------------------------------------------------------------
-- notification_preference — per-user push notification opt-in/out per category
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_preference (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category   TEXT,
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  quiet_from TEXT,
  quiet_to   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_pref_user_category_unique UNIQUE (user_id, category)
);

CREATE INDEX idx_notification_pref_tenant ON notification_preference(tenant_id);
CREATE INDEX idx_notification_pref_user   ON notification_preference(user_id);

ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_preference
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON TABLE notification_preference IS 'Per-user push notification opt-in/out settings per category';

-- ---------------------------------------------------------------------------
-- device_trust — biometric session token bindings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS device_trust (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  device_id      TEXT        NOT NULL,
  session_id     TEXT        NOT NULL,
  challenge_hash TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ
);

CREATE INDEX idx_device_trust_tenant ON device_trust(tenant_id);
CREATE INDEX idx_device_trust_user   ON device_trust(user_id);

ALTER TABLE device_trust ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON device_trust
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON TABLE device_trust IS 'Biometric session token bindings for device trust management';

-- ---------------------------------------------------------------------------
-- app_version_policy — minimum version enforcement + update prompts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_version_policy (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform             TEXT        NOT NULL UNIQUE CHECK (platform IN ('ios', 'android')),
  minimum_version      TEXT        NOT NULL,
  force_update         BOOLEAN     NOT NULL DEFAULT false,
  latest_version       TEXT        NOT NULL,
  release_notes        TEXT,
  feature_flags        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  minimum_build_number INTEGER
);

COMMENT ON TABLE app_version_policy IS 'Per-platform minimum version enforcement and soft/hard update flags';
