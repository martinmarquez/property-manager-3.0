-- =============================================================================
-- Migration: 0008_inquiries
-- Phase C — Inquiry entity group (RENA-34)
--
-- Tables: inquiry, inquiry_match
--
-- Depends on: 0001 (tenant, user), 0004 (property, property_listing, operation_kind, currency),
--             0005 (contact)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE inquiry_status AS ENUM ('active', 'paused', 'closed');

-- ---------------------------------------------------------------------------
-- inquiry — a contact's search criteria
-- ---------------------------------------------------------------------------
CREATE TABLE inquiry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id),
  contact_id          uuid NOT NULL REFERENCES contact(id),

  operation           operation_kind NOT NULL,
  property_types      text[] NOT NULL,
  bedrooms_min        int,
  rooms_min           int,
  price_min           numeric(18, 2),
  price_max           numeric(18, 2),
  price_currency      currency NOT NULL DEFAULT 'USD',
  area_min_m2         real,

  zones               jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_features   jsonb NOT NULL DEFAULT '[]'::jsonb,

  notes               text,

  notify_on_new_match boolean NOT NULL DEFAULT false,
  notify_threshold    int NOT NULL DEFAULT 70 CHECK (notify_threshold >= 0 AND notify_threshold <= 100),

  status              inquiry_status NOT NULL DEFAULT 'active',

  assigned_user_id    uuid REFERENCES "user"(id),

  deleted_at          timestamptz,
  deleted_by          uuid REFERENCES "user"(id),

  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES "user"(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES "user"(id),
  version             int NOT NULL DEFAULT 1,

  CONSTRAINT inquiry_price_range CHECK (
    price_min IS NULL OR price_max IS NULL OR price_min <= price_max
  )
);

-- Indexes: inquiry
CREATE INDEX inquiry_tenant_status_idx ON inquiry (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX inquiry_contact_idx ON inquiry (tenant_id, contact_id)
  WHERE deleted_at IS NULL;

CREATE INDEX inquiry_operation_idx ON inquiry (tenant_id, operation)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX inquiry_updated_at_idx ON inquiry (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- RLS: inquiry
ALTER TABLE inquiry ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inquiry
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- inquiry_match — computed match score between inquiry and listing
-- ---------------------------------------------------------------------------
CREATE TABLE inquiry_match (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id),
  inquiry_id   uuid NOT NULL REFERENCES inquiry(id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES property_listing(id) ON DELETE CASCADE,
  property_id  uuid NOT NULL REFERENCES property(id),

  score        int NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown    jsonb NOT NULL,

  computed_at  timestamptz NOT NULL DEFAULT now(),
  notified_at  timestamptz,
  viewed_at    timestamptz,

  CONSTRAINT inquiry_match_unique UNIQUE (inquiry_id, listing_id)
);

-- Indexes: inquiry_match
CREATE INDEX inquiry_match_inquiry_score_idx ON inquiry_match (inquiry_id, score DESC);

CREATE INDEX inquiry_match_listing_idx ON inquiry_match (listing_id);

CREATE INDEX inquiry_match_property_idx ON inquiry_match (property_id);

CREATE INDEX inquiry_match_tenant_idx ON inquiry_match (tenant_id);

-- For the nightly full refresh: find active inquiries per tenant
CREATE INDEX inquiry_active_tenant_idx ON inquiry (tenant_id)
  WHERE deleted_at IS NULL AND status = 'active';

-- RLS: inquiry_match
ALTER TABLE inquiry_match ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inquiry_match
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
