-- 0012_documents_esign.sql — RENA-56 + RENA-57
-- Document templates, generated documents, e-sign integration (Signaturit + DocuSign),
-- signer flows, and append-only audit trail (Ley 25.506 compliance).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE doc_template_kind AS ENUM (
  'reserva', 'boleto', 'escritura', 'recibo_sena',
  'autorizacion_venta', 'contrato_locacion', 'recibo_alquiler',
  'carta_oferta', 'custom'
);

CREATE TYPE doc_signature_level AS ENUM ('firma_electronica', 'firma_digital');
CREATE TYPE doc_status AS ENUM ('draft', 'pending_signature', 'signed', 'expired', 'cancelled');
CREATE TYPE doc_signer_status AS ENUM ('pending', 'signed', 'declined', 'expired');
CREATE TYPE esign_provider AS ENUM ('signaturit', 'docusign');
CREATE TYPE esign_flow_kind AS ENUM ('sequential', 'parallel');
CREATE TYPE esign_request_status AS ENUM ('pending', 'completed', 'declined', 'expired', 'cancelled');

-- ---------------------------------------------------------------------------
-- doc_template — version-controlled templates per tenant
-- ---------------------------------------------------------------------------

CREATE TABLE doc_template (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  slug             text NOT NULL,
  name             text NOT NULL,
  kind             doc_template_kind NOT NULL,
  body_html        text NOT NULL DEFAULT '',
  required_bindings jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_signature_level doc_signature_level NOT NULL DEFAULT 'firma_digital',
  jurisdiction     text,
  source_template_id uuid,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  deleted_at       timestamptz,
  version          integer NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, slug)
);

ALTER TABLE doc_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_template
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_template_revision — immutable revision log
-- ---------------------------------------------------------------------------

CREATE TABLE doc_template_revision (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  template_id      uuid NOT NULL REFERENCES doc_template(id),
  revision_number  integer NOT NULL,
  body_html        text NOT NULL,
  required_bindings jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by       uuid REFERENCES "user"(id),
  changed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, revision_number)
);

ALTER TABLE doc_template_revision ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_template_revision
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_clause — jurisdiction-specific clause library
-- ---------------------------------------------------------------------------

CREATE TABLE doc_clause (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  name             text NOT NULL,
  slug             text NOT NULL,
  jurisdiction     text NOT NULL,
  required_by      text,
  body_html        text NOT NULL,
  tags             jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required      boolean NOT NULL DEFAULT false,
  applicable_kinds jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES "user"(id),
  deleted_at       timestamptz,
  version          integer NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, slug)
);

ALTER TABLE doc_clause ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_clause
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_document — generated document instances
-- ---------------------------------------------------------------------------

CREATE TABLE doc_document (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenant(id),
  template_id            uuid NOT NULL REFERENCES doc_template(id),
  template_revision_id   uuid REFERENCES doc_template_revision(id),
  version                integer NOT NULL DEFAULT 1,
  previous_version_id    uuid,
  status                 doc_status NOT NULL DEFAULT 'draft',
  file_url               text,
  signed_file_url        text,
  file_object_key        text,
  field_bindings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at           timestamptz,
  signed_at              timestamptz,
  lead_id                uuid,
  property_id            uuid,
  contact_buyer_id       uuid,
  contact_seller_id      uuid,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES "user"(id),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES "user"(id),
  deleted_at             timestamptz
);

ALTER TABLE doc_document ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_document
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_signature_request — envelope-level e-sign request
-- ---------------------------------------------------------------------------

CREATE TABLE doc_signature_request (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenant(id),
  doc_document_id    uuid NOT NULL REFERENCES doc_document(id),
  provider           esign_provider NOT NULL,
  external_id        text NOT NULL,
  flow_kind          esign_flow_kind NOT NULL DEFAULT 'sequential',
  status             esign_request_status NOT NULL DEFAULT 'pending',
  expires_at         timestamptz NOT NULL,
  reminder_every_days integer,
  last_reminder_at   timestamptz,
  sender_name        text,
  sender_email       text,
  custom_message     text,
  provider_metadata  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES "user"(id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX idx_sig_req_provider_external ON doc_signature_request(provider, external_id);

ALTER TABLE doc_signature_request ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_signature_request
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_signer — per-document signers
-- ---------------------------------------------------------------------------

CREATE TABLE doc_signer (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenant(id),
  doc_document_id     uuid NOT NULL REFERENCES doc_document(id),
  signature_request_id uuid REFERENCES doc_signature_request(id),
  contact_id          uuid,
  user_id             uuid REFERENCES "user"(id),
  name                text NOT NULL,
  email               text NOT NULL,
  role_label          text,
  signature_order     integer NOT NULL DEFAULT 0,
  signature_level     doc_signature_level NOT NULL DEFAULT 'firma_electronica',
  status              doc_signer_status NOT NULL DEFAULT 'pending',
  signed_at           timestamptz,
  declined_at         timestamptz,
  decline_reason      text,
  external_signer_id  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             integer NOT NULL DEFAULT 1
);

ALTER TABLE doc_signer ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON doc_signer
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- doc_audit_trail — append-only, legally mandated (Ley 25.506)
-- Only SELECT + INSERT: no UPDATE or DELETE policies.
-- ---------------------------------------------------------------------------

CREATE TABLE doc_audit_trail (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES tenant(id),
  doc_document_id      uuid NOT NULL REFERENCES doc_document(id),
  signature_request_id uuid REFERENCES doc_signature_request(id),
  signer_id            uuid REFERENCES doc_signer(id),
  event_type           text NOT NULL,
  ip_address           inet,
  user_agent           text,
  geolocation          jsonb,
  biometric_consent    boolean,
  certificate_serial   text,
  certificate_url      text,
  provider_event_id    text,
  occurred_at          timestamptz NOT NULL DEFAULT now(),
  metadata             jsonb
);

ALTER TABLE doc_audit_trail ENABLE ROW LEVEL SECURITY;

-- Read-only for tenant rows; INSERT allowed; NO UPDATE/DELETE
CREATE POLICY tenant_read ON doc_audit_trail
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_insert ON doc_audit_trail
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Triggers: set_updated_at for mutable tables
-- ---------------------------------------------------------------------------

CREATE TRIGGER set_updated_at BEFORE UPDATE ON doc_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON doc_clause
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON doc_document
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON doc_signature_request
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON doc_signer
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_doc_template_tenant ON doc_template(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_document_tenant ON doc_document(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_document_template ON doc_document(template_id);
CREATE INDEX idx_doc_signer_request ON doc_signer(signature_request_id);
CREATE INDEX idx_doc_signer_document ON doc_signer(doc_document_id);
CREATE INDEX idx_doc_audit_trail_document ON doc_audit_trail(doc_document_id);
CREATE INDEX idx_doc_audit_trail_request ON doc_audit_trail(signature_request_id);
