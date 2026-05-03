-- =============================================================================
-- Migration: 0021_billing
-- Phase G — Billing: 7 tables per RENA-112 Section 3.3
-- Depends on: 0001_initial_tenancy_auth (tenant, "user")
--
-- Tables:
--   plan               — plan catalogue (solo, agencia, pro, empresa)
--   plan_feature        — feature gate per plan (10 keys × 4+ plans)
--   subscription        — per-tenant subscription lifecycle
--   invoice             — billing invoices (Stripe/MP/Corredor)
--   payment             — individual payment records
--   usage_counter       — metered usage per tenant per period
--   afip_invoice        — AFIP electronic invoice with CAE
--
-- RLS: subscription, invoice, payment, usage_counter, afip_invoice are
--       tenant-isolated via standard RLS policy.
-- Catalogue tables (plan, plan_feature) have no tenant_id and no RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- plan (catalogue — no RLS, shared across tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan (
  code            TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  price_usd       NUMERIC(10,2),              -- null for Empresa (custom pricing)
  billing_period  TEXT NOT NULL DEFAULT 'monthly',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- Seed plan catalogue (CEO-approved tier names: Solo/Agencia/Pro/Empresa)
-- Trial plan (hidden, is_active=false) provides FK target for tenant.plan_code default
INSERT INTO plan (code, display_name, price_usd, billing_period, is_active, sort_order)
VALUES
  ('trial',    'Trial',    0,      'monthly', FALSE, 0),
  ('solo',     'Solo',     12.00,  'monthly', TRUE,  1),
  ('agencia',  'Agencia',  45.00,  'monthly', TRUE,  2),
  ('pro',      'Pro',      120.00, 'monthly', TRUE,  3),
  ('empresa',  'Empresa',  NULL,   'monthly', TRUE,  4)
ON CONFLICT (code) DO NOTHING;

-- FK from tenant.plan_code → plan(code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tenant_plan_code'
      AND table_name = 'tenant'
  ) THEN
    ALTER TABLE tenant
      ADD CONSTRAINT fk_tenant_plan_code
      FOREIGN KEY (plan_code) REFERENCES plan(code);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- plan_feature (catalogue — no RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_feature (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code     TEXT NOT NULL REFERENCES plan(code),
  feature_key   TEXT NOT NULL,
  feature_limit INTEGER,                     -- null = unlimited, 0 = blocked, N = cap
  UNIQUE (plan_code, feature_key)
);

-- Seed plan_feature: 10 feature keys × 5 plans (including trial = full-Pro)
-- Feature keys from BL-10: user_limit, property_limit, portal_connections,
-- website_builder, ai_appraisal, ai_copilot, custom_domain,
-- analytics_advanced, white_label, api_access
INSERT INTO plan_feature (plan_code, feature_key, feature_limit) VALUES
  -- trial (mirrors Pro features — 14-day full-Pro trial)
  ('trial', 'user_limit',          25),
  ('trial', 'property_limit',      NULL),
  ('trial', 'portal_connections',  NULL),
  ('trial', 'website_builder',     1),
  ('trial', 'ai_appraisal',        1),
  ('trial', 'ai_copilot',          1),
  ('trial', 'custom_domain',       1),
  ('trial', 'analytics_advanced',  1),
  ('trial', 'white_label',         0),
  ('trial', 'api_access',          1),
  -- solo ($12/mo)
  ('solo', 'user_limit',           3),
  ('solo', 'property_limit',       100),
  ('solo', 'portal_connections',   3),
  ('solo', 'website_builder',      0),
  ('solo', 'ai_appraisal',         0),
  ('solo', 'ai_copilot',           0),
  ('solo', 'custom_domain',        0),
  ('solo', 'analytics_advanced',   0),
  ('solo', 'white_label',          0),
  ('solo', 'api_access',           0),
  -- agencia ($45/mo)
  ('agencia', 'user_limit',        10),
  ('agencia', 'property_limit',    NULL),
  ('agencia', 'portal_connections', NULL),
  ('agencia', 'website_builder',   1),
  ('agencia', 'ai_appraisal',      0),
  ('agencia', 'ai_copilot',        0),
  ('agencia', 'custom_domain',     1),
  ('agencia', 'analytics_advanced', 1),
  ('agencia', 'white_label',       0),
  ('agencia', 'api_access',        0),
  -- pro ($120/mo)
  ('pro', 'user_limit',            25),
  ('pro', 'property_limit',        NULL),
  ('pro', 'portal_connections',    NULL),
  ('pro', 'website_builder',       1),
  ('pro', 'ai_appraisal',          1),
  ('pro', 'ai_copilot',            1),
  ('pro', 'custom_domain',         1),
  ('pro', 'analytics_advanced',    1),
  ('pro', 'white_label',           0),
  ('pro', 'api_access',            1),
  -- empresa (custom pricing)
  ('empresa', 'user_limit',        NULL),
  ('empresa', 'property_limit',    NULL),
  ('empresa', 'portal_connections', NULL),
  ('empresa', 'website_builder',   1),
  ('empresa', 'ai_appraisal',      1),
  ('empresa', 'ai_copilot',        1),
  ('empresa', 'custom_domain',     1),
  ('empresa', 'analytics_advanced', 1),
  ('empresa', 'white_label',       1),
  ('empresa', 'api_access',        1)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- subscription (tenant-scoped, RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenant(id) UNIQUE,
  plan_code              TEXT NOT NULL REFERENCES plan(code),

  status                 TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','cancelled','suspended','expired','paused')),
  billing_provider       TEXT NOT NULL
    CHECK (billing_provider IN ('stripe','mercadopago','manual')),

  -- Stripe fields
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,

  -- Mercado Pago fields
  mp_customer_id         TEXT,
  mp_preapproval_id      TEXT,

  -- Trial
  trial_ends_at          TIMESTAMPTZ,

  -- Billing period
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at           TIMESTAMPTZ,

  -- Dunning
  dunning_started_at     TIMESTAMPTZ,
  dunning_attempts       INTEGER NOT NULL DEFAULT 0,
  suspended_at           TIMESTAMPTZ,

  -- Currency & pricing
  currency               TEXT NOT NULL DEFAULT 'USD',
  price_amount           NUMERIC(10,2),

  -- Fiscal data (for AFIP invoicing)
  fiscal_condition       TEXT
    CHECK (fiscal_condition IN ('RI','CF','MO','EX','EX_IVA')),
  cuit                   TEXT,
  razon_social           TEXT,
  billing_email          TEXT,
  billing_address        JSONB,

  -- Universal columns
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES "user"(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES "user"(id),
  deleted_at             TIMESTAMPTZ,
  version                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_subscription_tenant ON subscription(tenant_id);
CREATE INDEX idx_subscription_status ON subscription(status);

ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscription
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER set_updated_at_subscription
  BEFORE UPDATE ON subscription
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bump_version_subscription
  BEFORE UPDATE ON subscription
  FOR EACH ROW EXECUTE FUNCTION bump_version();

-- ---------------------------------------------------------------------------
-- invoice (tenant-scoped, RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  subscription_id        UUID NOT NULL REFERENCES subscription(id),

  provider               TEXT NOT NULL
    CHECK (provider IN ('stripe','mercadopago','corredor')),
  provider_invoice_id    TEXT,

  status                 TEXT NOT NULL
    CHECK (status IN ('draft','open','paid','void','uncollectible')),
  amount_due             NUMERIC(14,2) NOT NULL,
  amount_paid            NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL,

  period_start           TIMESTAMPTZ,
  period_end             TIMESTAMPTZ,
  pdf_url                TEXT,
  sent_at                TIMESTAMPTZ,
  due_at                 TIMESTAMPTZ,
  paid_at                TIMESTAMPTZ,

  -- Universal columns
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES "user"(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES "user"(id),
  deleted_at             TIMESTAMPTZ,
  version                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_invoice_tenant ON invoice(tenant_id);
CREATE INDEX idx_invoice_subscription ON invoice(subscription_id);
CREATE INDEX idx_invoice_status ON invoice(status);

ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoice
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER set_updated_at_invoice
  BEFORE UPDATE ON invoice
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bump_version_invoice
  BEFORE UPDATE ON invoice
  FOR EACH ROW EXECUTE FUNCTION bump_version();

-- ---------------------------------------------------------------------------
-- payment (tenant-scoped, RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  invoice_id             UUID NOT NULL REFERENCES invoice(id),

  provider               TEXT NOT NULL
    CHECK (provider IN ('stripe','mercadopago')),
  provider_payment_id    TEXT NOT NULL,

  status                 TEXT NOT NULL
    CHECK (status IN ('pending','approved','rejected','refunded','in_mediation')),
  amount                 NUMERIC(14,2) NOT NULL,
  currency               TEXT NOT NULL,
  payment_method         TEXT,

  paid_at                TIMESTAMPTZ,

  -- Universal columns
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES "user"(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES "user"(id),
  deleted_at             TIMESTAMPTZ,
  version                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_payment_tenant ON payment(tenant_id);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_payment_provider_id ON payment(provider_payment_id);
CREATE INDEX idx_payment_status ON payment(status);

ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payment
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER set_updated_at_payment
  BEFORE UPDATE ON payment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bump_version_payment
  BEFORE UPDATE ON payment
  FOR EACH ROW EXECUTE FUNCTION bump_version();

-- ---------------------------------------------------------------------------
-- usage_counter (tenant-scoped, RLS — no universal columns per spec)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_counter (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  counter_key      TEXT NOT NULL,              -- 'user_count','property_count','ai_tokens_month'
  value            INTEGER NOT NULL DEFAULT 0,
  period_start     TIMESTAMPTZ NOT NULL,       -- month start for monthly counters
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, counter_key, period_start)
);

CREATE INDEX idx_usage_counter_tenant ON usage_counter(tenant_id);

ALTER TABLE usage_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON usage_counter
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- afip_invoice (tenant-scoped, RLS, UNIQUE on invoice_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS afip_invoice (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  invoice_id             UUID NOT NULL REFERENCES invoice(id) UNIQUE,

  invoice_type           TEXT NOT NULL
    CHECK (invoice_type IN ('A','B','C','E')),
  invoice_number         BIGINT NOT NULL,
  punto_venta            INTEGER NOT NULL DEFAULT 1,
  cae                    TEXT,
  cae_expires_at         DATE,

  wsfe_request           JSONB,
  wsfe_response          JSONB,
  pdf_r2_key             TEXT,

  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','requested','approved','retry_exhausted','failed','voided')),
  error_message          TEXT,
  retry_count            INTEGER NOT NULL DEFAULT 0,

  -- Universal columns
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES "user"(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES "user"(id),
  deleted_at             TIMESTAMPTZ,
  version                INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_afip_invoice_tenant ON afip_invoice(tenant_id);
CREATE INDEX idx_afip_invoice_invoice ON afip_invoice(invoice_id);
CREATE INDEX idx_afip_invoice_cae ON afip_invoice(cae);
CREATE INDEX idx_afip_invoice_status ON afip_invoice(status);

ALTER TABLE afip_invoice ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON afip_invoice
  USING       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK  (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TRIGGER set_updated_at_afip_invoice
  BEFORE UPDATE ON afip_invoice
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER bump_version_afip_invoice
  BEFORE UPDATE ON afip_invoice
  FOR EACH ROW EXECUTE FUNCTION bump_version();
