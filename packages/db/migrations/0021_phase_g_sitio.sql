-- =============================================================================
-- Migration: 0021_phase_g_sitio
-- Sitio — Website Builder entity group (RENA-138)
--
-- Tables: site_theme, site, site_page, site_block, site_domain,
--         site_form_submission, site_redirect
-- Depends on: 0001 (tenant, user), 0005 (contact), 0009 (lead)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE site_page_status AS ENUM ('draft', 'published');
CREATE TYPE site_block_type AS ENUM (
  'Hero', 'ListingGrid', 'ListingDetail', 'ContactForm',
  'AgentBio', 'Testimonials', 'Map', 'Blog', 'CTA', 'Footer'
);
CREATE TYPE site_domain_status AS ENUM ('pending', 'verifying', 'active', 'failed');

-- ---------------------------------------------------------------------------
-- site_theme — global lookup, no tenant_id, no RLS
-- ---------------------------------------------------------------------------
CREATE TABLE site_theme (
  code          text        PRIMARY KEY,
  display_name  text        NOT NULL,
  thumbnail_url text        NOT NULL,
  default_props jsonb       NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------------------
-- site — one per tenant (typically)
-- ---------------------------------------------------------------------------
CREATE TABLE site (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name            text          NOT NULL,
  subdomain       text          NOT NULL UNIQUE,
  custom_domain   text,
  theme_code      text          NOT NULL DEFAULT 'moderno' REFERENCES site_theme(code),
  brand_settings  jsonb         NOT NULL DEFAULT '{}',
  custom_css      text,
  custom_head_html text,
  published_at    timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES "user"(id),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  updated_by      uuid          REFERENCES "user"(id),
  deleted_at      timestamptz,
  version         integer       NOT NULL DEFAULT 1
);

CREATE INDEX site_tenant_idx ON site (tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE site ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_page
-- ---------------------------------------------------------------------------
CREATE TABLE site_page (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid              NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  site_id             uuid              NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  slug                text              NOT NULL,
  title               text              NOT NULL,
  meta_title          text,
  meta_description    text,
  og_image_url        text,
  puck_data           jsonb             NOT NULL DEFAULT '{}',
  published_puck_data jsonb,
  status              site_page_status  NOT NULL DEFAULT 'draft',
  published_at        timestamptz,
  created_at          timestamptz       NOT NULL DEFAULT now(),
  created_by          uuid              REFERENCES "user"(id),
  updated_at          timestamptz       NOT NULL DEFAULT now(),
  updated_by          uuid              REFERENCES "user"(id),
  deleted_at          timestamptz,
  version             integer           NOT NULL DEFAULT 1,
  CONSTRAINT site_page_site_slug_uq UNIQUE (site_id, slug)
);

CREATE INDEX site_page_tenant_site_idx ON site_page (tenant_id, site_id) WHERE deleted_at IS NULL;

ALTER TABLE site_page ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_page
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_block
-- ---------------------------------------------------------------------------
CREATE TABLE site_block (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid            NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  site_id     uuid            NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  page_id     uuid            NOT NULL REFERENCES site_page(id) ON DELETE CASCADE,
  block_type  site_block_type NOT NULL,
  sort_order  integer         NOT NULL,
  props       jsonb           NOT NULL DEFAULT '{}',
  created_at  timestamptz     NOT NULL DEFAULT now(),
  created_by  uuid            REFERENCES "user"(id),
  updated_at  timestamptz     NOT NULL DEFAULT now(),
  updated_by  uuid            REFERENCES "user"(id),
  deleted_at  timestamptz,
  version     integer         NOT NULL DEFAULT 1
);

CREATE INDEX site_block_page_sort_idx ON site_block (page_id, sort_order) WHERE deleted_at IS NULL;

ALTER TABLE site_block ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_block
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_domain — custom domains with Cloudflare Custom Hostnames
-- ---------------------------------------------------------------------------
CREATE TABLE site_domain (
  id                      uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid                NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  site_id                 uuid                NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  hostname                text                NOT NULL UNIQUE,
  dns_target              text                NOT NULL,
  verified_at             timestamptz,
  ssl_active_at           timestamptz,
  cloudflare_hostname_id  text,
  status                  site_domain_status  NOT NULL DEFAULT 'pending',
  created_at              timestamptz         NOT NULL DEFAULT now(),
  created_by              uuid                REFERENCES "user"(id),
  updated_at              timestamptz         NOT NULL DEFAULT now(),
  updated_by              uuid                REFERENCES "user"(id),
  deleted_at              timestamptz,
  version                 integer             NOT NULL DEFAULT 1
);

CREATE INDEX site_domain_tenant_site_idx ON site_domain (tenant_id, site_id) WHERE deleted_at IS NULL;

ALTER TABLE site_domain ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_domain
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_form_submission — captured from public site contact forms
-- ---------------------------------------------------------------------------
CREATE TABLE site_form_submission (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  site_id          uuid          NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  page_id          uuid          REFERENCES site_page(id),
  block_id         uuid          REFERENCES site_block(id),
  data             jsonb         NOT NULL,
  ip               inet,
  user_agent       text,
  recaptcha_score  numeric(3,2),
  flagged_as_spam  boolean       NOT NULL DEFAULT false,
  lead_id          uuid          REFERENCES lead(id),
  contact_id       uuid          REFERENCES contact(id),
  processed_at     timestamptz,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES "user"(id),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  updated_by       uuid          REFERENCES "user"(id),
  deleted_at       timestamptz,
  version          integer       NOT NULL DEFAULT 1
);

CREATE INDEX site_form_submission_tenant_idx ON site_form_submission (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX site_form_submission_spam_idx ON site_form_submission (tenant_id) WHERE flagged_as_spam = false AND processed_at IS NULL AND deleted_at IS NULL;

ALTER TABLE site_form_submission ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_form_submission
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_redirect — 301/302 path redirects
-- ---------------------------------------------------------------------------
CREATE TABLE site_redirect (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  site_id         uuid        NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  source_path     text        NOT NULL,
  destination_url text        NOT NULL,
  status_code     integer     NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES "user"(id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid        REFERENCES "user"(id),
  deleted_at      timestamptz,
  version         integer     NOT NULL DEFAULT 1,
  CONSTRAINT site_redirect_site_source_uq UNIQUE (site_id, source_path)
);

CREATE INDEX site_redirect_tenant_site_idx ON site_redirect (tenant_id, site_id) WHERE deleted_at IS NULL;

ALTER TABLE site_redirect ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_redirect
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- site_page_snapshot — immutable publish history for rollback
-- ---------------------------------------------------------------------------
CREATE TABLE site_page_snapshot (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  page_id          uuid        NOT NULL REFERENCES site_page(id) ON DELETE CASCADE,
  puck_data        jsonb       NOT NULL,
  meta_title       text,
  meta_description text,
  published_by     uuid        REFERENCES "user"(id),
  published_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_page_snapshot_page_idx ON site_page_snapshot (page_id, published_at DESC);

ALTER TABLE site_page_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON site_page_snapshot
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Add last_polled_at and error_message to site_domain for SSL polling
-- ---------------------------------------------------------------------------
ALTER TABLE site_domain ADD COLUMN IF NOT EXISTS last_polled_at timestamptz;
ALTER TABLE site_domain ADD COLUMN IF NOT EXISTS error_message text;

-- ---------------------------------------------------------------------------
-- Seed: 5 built-in themes
-- ---------------------------------------------------------------------------
INSERT INTO site_theme (code, display_name, thumbnail_url, default_props) VALUES
  ('moderno',     'Moderno',     '/themes/moderno/thumb.webp',     '{"hero":{"variant":"fullscreen"},"footer":{"columns":3}}'),
  ('clasico',     'Clásico',     '/themes/clasico/thumb.webp',     '{"hero":{"variant":"split"},"footer":{"columns":4}}'),
  ('premium',     'Premium',     '/themes/premium/thumb.webp',     '{"hero":{"variant":"video"},"footer":{"columns":3},"listingGrid":{"columns":3}}'),
  ('minimalista', 'Minimalista', '/themes/minimalista/thumb.webp', '{"hero":{"variant":"text-only"},"footer":{"columns":2}}'),
  ('barrio',      'Barrio',      '/themes/barrio/thumb.webp',      '{"hero":{"variant":"map"},"footer":{"columns":3},"map":{"style":"streets"}}');
