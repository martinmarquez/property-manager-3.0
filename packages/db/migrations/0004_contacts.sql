-- =============================================================================
-- Migration: 0004_contacts
-- Phase B — Contacts entity group (RENA-31)
--
-- Tables: contact, contact_relationship_kind, contact_relationship,
--         contact_tag, contact_segment, contact_segment_member
--
-- Extensions required: pg_trgm (trigram fuzzy search — for duplicate detection)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE contact_kind AS ENUM ('person', 'company');
CREATE TYPE national_id_type AS ENUM ('DNI', 'CUIT', 'CUIL', 'passport');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE contact_deletion_reason AS ENUM ('merged_into', 'dsr_delete', 'manual');
CREATE TYPE phone_type AS ENUM ('mobile', 'whatsapp', 'landline', 'office');
CREATE TYPE email_type AS ENUM ('personal', 'work', 'other');

-- ---------------------------------------------------------------------------
-- contact
-- ---------------------------------------------------------------------------
CREATE TABLE contact (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  kind             contact_kind NOT NULL,

  -- Person fields
  first_name       text,
  last_name        text,
  national_id_type national_id_type,
  national_id      text,
  birth_date       date,
  gender           gender,

  -- Company fields
  legal_name       text,
  cuit             text,
  industry         text,

  -- Shared JSONB arrays
  phones           jsonb NOT NULL DEFAULT '[]'::jsonb,
  emails           jsonb NOT NULL DEFAULT '[]'::jsonb,
  addresses        jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- CRM
  lead_score       int NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  source           text,
  notes            text,
  owner_user_id    uuid REFERENCES "user"(id),

  -- Merge / soft-delete
  merge_winner_id  uuid REFERENCES contact(id),
  deleted_at       timestamptz,
  deleted_by       uuid REFERENCES "user"(id),
  deletion_reason  contact_deletion_reason,

  -- Audit
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  version          int NOT NULL DEFAULT 1
);

-- Full-text trigram GIN index on composed name field
CREATE INDEX contact_name_trgm_idx ON contact
  USING gin (
    (coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(legal_name, ''))
    gin_trgm_ops
  )
  WHERE deleted_at IS NULL;

-- JSONB path ops indexes for email + phone queries
CREATE INDEX contact_emails_idx ON contact USING gin (emails jsonb_path_ops);
CREATE INDEX contact_phones_idx ON contact USING gin (phones jsonb_path_ops);

-- national_id exact lookup
CREATE INDEX contact_national_id_idx ON contact (tenant_id, national_id)
  WHERE national_id IS NOT NULL AND deleted_at IS NULL;

-- lead_score range queries + sorting
CREATE INDEX contact_lead_score_idx ON contact (tenant_id, lead_score)
  WHERE deleted_at IS NULL;

-- updated_at cursor pagination (primary sort column for the list view)
CREATE INDEX contact_updated_at_idx ON contact (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- source filter
CREATE INDEX contact_source_idx ON contact (tenant_id, source)
  WHERE source IS NOT NULL AND deleted_at IS NULL;

-- owner_user_id filter
CREATE INDEX contact_owner_idx ON contact (tenant_id, owner_user_id)
  WHERE owner_user_id IS NOT NULL AND deleted_at IS NULL;

-- RLS
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_relationship_kind — vocabulary of relationship types per tenant
-- Built-in kinds are seeded on tenant creation via seed_default_relationship_kinds().
-- ---------------------------------------------------------------------------
CREATE TABLE contact_relationship_kind (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  label         text NOT NULL,
  inverse_label text,
  built_in      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES "user"(id),
  CONSTRAINT crk_tenant_label_unique UNIQUE (tenant_id, label)
);

ALTER TABLE contact_relationship_kind ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_relationship_kind
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Helper called from tenant provisioning to seed built-in relationship kinds.
CREATE OR REPLACE FUNCTION seed_default_relationship_kinds(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO contact_relationship_kind (tenant_id, label, inverse_label, built_in)
  VALUES
    (p_tenant_id, 'Cónyuge de',      'Cónyuge de',       true),
    (p_tenant_id, 'Progenitor de',   'Hijo/a de',         true),
    (p_tenant_id, 'Empleado de',     'Empleador de',      true),
    (p_tenant_id, 'Socio de',        'Socio de',          true),
    (p_tenant_id, 'Abogado de',      'Cliente de',        true),
    (p_tenant_id, 'Corredor de',     'Representado por',  true),
    (p_tenant_id, 'Propietario de',  'Inquilino de',      true),
    (p_tenant_id, 'Inquilino de',    'Propietario de',    true)
  ON CONFLICT (tenant_id, label) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- contact_relationship — typed bidirectional link between contacts
-- Bidirectionality: inserting A→B also inserts B→A in the application layer
-- (see contacts.relationships.create in the tRPC router). Both rows are
-- soft-deleted together on removal.
-- ---------------------------------------------------------------------------
CREATE TABLE contact_relationship (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id),
  from_contact_id uuid NOT NULL REFERENCES contact(id),
  to_contact_id   uuid NOT NULL REFERENCES contact(id),
  kind_id         uuid NOT NULL REFERENCES contact_relationship_kind(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES "user"(id),
  deleted_at      timestamptz,
  CONSTRAINT cr_unique UNIQUE (tenant_id, from_contact_id, to_contact_id, kind_id)
);

CREATE INDEX cr_from_idx ON contact_relationship (from_contact_id) WHERE deleted_at IS NULL;
CREATE INDEX cr_to_idx   ON contact_relationship (to_contact_id)   WHERE deleted_at IS NULL;

ALTER TABLE contact_relationship ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_relationship
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_tag — per-contact free-form labels
-- ---------------------------------------------------------------------------
CREATE TABLE contact_tag (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  contact_id uuid NOT NULL REFERENCES contact(id),
  tag        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES "user"(id),
  CONSTRAINT ct_unique UNIQUE (tenant_id, contact_id, tag)
);

CREATE INDEX contact_tag_idx ON contact_tag (tenant_id, tag);

ALTER TABLE contact_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_tag
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_segment — named dynamic segment with JSON criteria
-- ---------------------------------------------------------------------------
CREATE TABLE contact_segment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  name             text NOT NULL,
  description      text,
  criteria         jsonb NOT NULL DEFAULT '[]'::jsonb,
  member_count     int NOT NULL DEFAULT 0,
  last_computed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  deleted_at       timestamptz
);

ALTER TABLE contact_segment ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_segment
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- contact_segment_member — cached segment membership
-- Recomputed by BullMQ worker on contact.updated domain events and nightly.
-- ---------------------------------------------------------------------------
CREATE TABLE contact_segment_member (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id),
  segment_id uuid NOT NULL REFERENCES contact_segment(id),
  contact_id uuid NOT NULL REFERENCES contact(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csm_unique UNIQUE (segment_id, contact_id)
);

CREATE INDEX csm_contact_idx  ON contact_segment_member (contact_id);
CREATE INDEX csm_segment_idx  ON contact_segment_member (segment_id);

ALTER TABLE contact_segment_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_segment_member
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
