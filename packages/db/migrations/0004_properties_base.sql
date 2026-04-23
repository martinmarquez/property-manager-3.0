-- =============================================================================
-- Migration: 0004_properties_base
-- Phase B — RENA-41: Core property entity group + RLS
--
-- Tables:   property, property_listing, property_media, property_tag,
--           property_history, saved_view
-- Enums:    operation_kind, property_status, currency, property_type,
--           media_deletion_reason, property_deletion_reason
-- RLS:      tenant_isolation on all tables
--
-- Note: deletion_reason, deletion_note, auto_purge_at (property) and
--       event_source (property_history) are added later in
--       0006_properties_bulk_csv_history_trash.sql via ALTER TABLE.
--       import_job and import_job_row are also in that migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE operation_kind AS ENUM (
    'sale', 'rent', 'temp_rent', 'commercial_rent', 'commercial_sale'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_status AS ENUM (
    'active', 'reserved', 'sold', 'paused', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE currency AS ENUM ('ARS', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM (
    'apartment', 'ph', 'house', 'quinta', 'land', 'office', 'commercial',
    'garage', 'warehouse', 'farm', 'hotel', 'building', 'business_fund',
    'development'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE media_deletion_reason AS ENUM (
    'duplicate', 'sold_externally', 'owner_withdrew', 'data_error', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_deletion_reason AS ENUM (
    'sold_externally', 'owner_withdrew', 'duplicate', 'data_error', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- property — core listing record
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid            NOT NULL REFERENCES tenant(id),
  branch_id         uuid            REFERENCES branch(id),

  reference_code    text            NOT NULL,
  title             text,
  description       text,

  -- Classification
  property_type     property_type   NOT NULL,
  subtype           text,

  -- Physical dimensions
  covered_area_m2   real,
  total_area_m2     real,
  rooms             int,
  bedrooms          int,
  bathrooms         int,
  toilets           int,
  garages           int,
  age_years         int,

  -- Geography
  country           text            NOT NULL DEFAULT 'AR',
  province          text,
  locality          text,
  neighborhood      text,
  address_street    text,
  address_number    text,
  lat               real,
  lng               real,

  -- Status flags
  status            property_status NOT NULL DEFAULT 'active',
  featured          boolean         NOT NULL DEFAULT false,
  has_price_public  boolean         NOT NULL DEFAULT true,

  -- Soft delete
  deleted_at        timestamptz,
  deleted_by        uuid            REFERENCES "user"(id),

  -- Audit
  created_at        timestamptz     NOT NULL DEFAULT now(),
  created_by        uuid            REFERENCES "user"(id),
  updated_at        timestamptz     NOT NULL DEFAULT now(),
  updated_by        uuid            REFERENCES "user"(id),
  version           int             NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_property_tenant_status
  ON property (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_tenant_updated
  ON property (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_reference_code
  ON property (tenant_id, reference_code)
  WHERE deleted_at IS NULL;

ALTER TABLE property ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON property
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- property_listing — one row per operation type on a property
-- A single property can have multiple listings (sale + rent simultaneously)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_listing (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid            NOT NULL REFERENCES tenant(id),
  property_id     uuid            NOT NULL REFERENCES property(id),
  kind            operation_kind  NOT NULL,
  price_amount    numeric(18, 2),
  price_currency  currency        NOT NULL DEFAULT 'USD',
  commission_pct  real,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_listing_property
  ON property_listing (property_id);

CREATE INDEX IF NOT EXISTS idx_property_listing_tenant_kind
  ON property_listing (tenant_id, kind);

ALTER TABLE property_listing ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON property_listing
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- property_media — photos, videos, floor plans, 3D tour embeds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_media (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenant(id),
  property_id      uuid        NOT NULL REFERENCES property(id),
  sort_order       int         NOT NULL DEFAULT 0,
  media_type       text        NOT NULL DEFAULT 'photo',
  storage_key      text        NOT NULL,
  thumb_url        text,
  medium_url       text,
  full_url         text,
  caption          text,
  portal_overrides jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_media_property
  ON property_media (property_id, sort_order);

ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON property_media
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- property_tag — many-to-many join to the tag table (Phase B+)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_tag (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id),
  property_id uuid        NOT NULL REFERENCES property(id),
  tag_id      uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_tag_property
  ON property_tag (property_id);

CREATE INDEX IF NOT EXISTS idx_property_tag_tenant_tag
  ON property_tag (tenant_id, tag_id);

ALTER TABLE property_tag ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON property_tag
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- property_history — immutable field-level change log
-- Note: event_source column is added in 0006_properties_bulk_csv_history_trash.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id),
  property_id uuid        NOT NULL REFERENCES property(id),
  actor_id    uuid        REFERENCES "user"(id),
  field       text        NOT NULL,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Named to match the index created in 0006_properties_bulk so IF NOT EXISTS skips it
CREATE INDEX IF NOT EXISTS idx_property_history_property_created
  ON property_history (property_id, created_at DESC);

ALTER TABLE property_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON property_history
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- saved_view — per-user named filter presets for the property list
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_view (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenant(id),
  user_id      uuid        NOT NULL REFERENCES "user"(id),
  module       text        NOT NULL DEFAULT 'properties',
  name         text        NOT NULL,
  filter_state jsonb       NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_view_user
  ON saved_view (tenant_id, user_id);

ALTER TABLE saved_view ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation ON saved_view
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
