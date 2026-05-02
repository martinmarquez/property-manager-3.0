-- =============================================================================
-- Migration: 0012_inbox_channels
-- Unified Inbox entity group
--
-- Tables: inbox_channel, conversation, message, canned_response, auto_triage_rule
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE channel_type AS ENUM (
  'whatsapp', 'email', 'sms', 'webchat', 'instagram', 'facebook'
);

CREATE TYPE channel_status AS ENUM (
  'active', 'inactive', 'pending_verification'
);

CREATE TYPE conversation_status AS ENUM (
  'open', 'assigned', 'pending', 'resolved', 'closed'
);

CREATE TYPE message_direction AS ENUM ('in', 'out');

CREATE TYPE message_content_type AS ENUM (
  'text', 'image', 'video', 'audio', 'document', 'template', 'location', 'contact_card'
);

CREATE TYPE message_status AS ENUM (
  'queued', 'sent', 'delivered', 'read', 'failed'
);

-- ---------------------------------------------------------------------------
-- inbox_channel
-- ---------------------------------------------------------------------------
CREATE TABLE inbox_channel (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid          NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  type        channel_type  NOT NULL,
  name        text          NOT NULL,
  config      jsonb,
  status      channel_status NOT NULL DEFAULT 'active',
  created_at  timestamptz   NOT NULL DEFAULT now(),
  created_by  uuid          REFERENCES "user"(id),
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  updated_by  uuid          REFERENCES "user"(id),
  deleted_at  timestamptz,
  version     integer       NOT NULL DEFAULT 1,
  CONSTRAINT inbox_channel_tenant_name_unique UNIQUE (tenant_id, name)
);

ALTER TABLE inbox_channel ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inbox_channel
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- conversation
-- ---------------------------------------------------------------------------
CREATE TABLE conversation (
  id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid                NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  channel_id          uuid                NOT NULL REFERENCES inbox_channel(id),
  contact_id          uuid                NOT NULL REFERENCES contact(id),
  assigned_agent_id   uuid                REFERENCES "user"(id),
  status              conversation_status NOT NULL DEFAULT 'open',
  subject             text,
  last_message_at     timestamptz,
  message_count       integer             NOT NULL DEFAULT 0,
  sla_first_response_at timestamptz,
  sla_resolved_at     timestamptz,
  metadata            jsonb,
  created_at          timestamptz         NOT NULL DEFAULT now(),
  created_by          uuid                REFERENCES "user"(id),
  updated_at          timestamptz         NOT NULL DEFAULT now(),
  updated_by          uuid                REFERENCES "user"(id),
  deleted_at          timestamptz,
  version             integer             NOT NULL DEFAULT 1
);

CREATE INDEX conversation_tenant_status_idx ON conversation (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX conversation_tenant_channel_idx ON conversation (tenant_id, channel_id) WHERE deleted_at IS NULL;
CREATE INDEX conversation_last_message_idx ON conversation (tenant_id, last_message_at DESC NULLS LAST);

ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- message  (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE message (
  id                 uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid                 NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  conversation_id    uuid                 NOT NULL REFERENCES conversation(id),
  direction          message_direction    NOT NULL,
  channel_message_id text,
  content_type       message_content_type NOT NULL,
  content            jsonb                NOT NULL,
  status             message_status       NOT NULL DEFAULT 'queued',
  sender_user_id     uuid                 REFERENCES "user"(id),
  sent_at            timestamptz,
  delivered_at       timestamptz,
  read_at            timestamptz,
  failed_reason      text,
  created_at         timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX message_conversation_idx ON message (conversation_id, created_at DESC);
CREATE INDEX message_tenant_status_idx ON message (tenant_id, status) WHERE status IN ('queued', 'sent');

ALTER TABLE message ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- canned_response
-- ---------------------------------------------------------------------------
CREATE TABLE canned_response (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  body        text        NOT NULL,
  tags        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES "user"(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES "user"(id),
  deleted_at  timestamptz,
  version     integer     NOT NULL DEFAULT 1
);

ALTER TABLE canned_response ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON canned_response
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- auto_triage_rule
-- ---------------------------------------------------------------------------
CREATE TABLE auto_triage_rule (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  conditions  jsonb       NOT NULL,
  action      jsonb       NOT NULL,
  priority    integer     NOT NULL DEFAULT 0,
  enabled     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES "user"(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES "user"(id),
  deleted_at  timestamptz,
  version     integer     NOT NULL DEFAULT 1
);

ALTER TABLE auto_triage_rule ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON auto_triage_rule
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
