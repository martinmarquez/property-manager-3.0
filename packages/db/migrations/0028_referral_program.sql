-- RENA-204: Referral program tables
-- Phase H growth activation — viral loop infrastructure

CREATE TABLE IF NOT EXISTS referral_codes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenant(id),
  user_id          UUID        NOT NULL REFERENCES "user"(id),
  code             TEXT        NOT NULL UNIQUE,
  click_count      INTEGER     NOT NULL DEFAULT 0,
  signup_count     INTEGER     NOT NULL DEFAULT 0,
  converted_count  INTEGER     NOT NULL DEFAULT 0,
  reward_granted_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_tenant ON referral_codes(tenant_id);
CREATE INDEX idx_referral_codes_user   ON referral_codes(user_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_codes
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMENT ON TABLE referral_codes IS 'Per-user referral links for the Phase H viral growth loop';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS referral_attributions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id    UUID        NOT NULL REFERENCES referral_codes(id),
  referrer_tenant_id  UUID        NOT NULL,
  referee_tenant_id   UUID,
  referee_user_id     UUID,
  status              TEXT        NOT NULL DEFAULT 'clicked'
                        CHECK (status IN ('clicked', 'signed_up', 'converted')),
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_attr_code           ON referral_attributions(referral_code_id);
CREATE INDEX idx_referral_attr_referee_tenant  ON referral_attributions(referee_tenant_id);

COMMENT ON TABLE referral_attributions IS 'Tracks each referral click, signup, and conversion event';
