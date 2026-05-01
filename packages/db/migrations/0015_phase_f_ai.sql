-- 0015_phase_f_ai.sql — RENA-81
-- AI embedding tables, copilot session management, property AI descriptions,
-- and search_text generated columns for hybrid keyword + vector search.
-- Requires: 0014_extensions_vector.sql (pgvector + pg_trgm)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE ai_entity_type AS ENUM (
  'property', 'contact_note', 'conversation_message',
  'document_page', 'property_description'
);

CREATE TYPE copilot_intent AS ENUM (
  'property_search', 'lead_info', 'schedule', 'document_qa',
  'market_analysis', 'general', 'action_confirm'
);

CREATE TYPE copilot_turn_role AS ENUM ('user', 'assistant', 'system', 'tool');

-- ---------------------------------------------------------------------------
-- ai_embedding — vector store for all RAG content
-- ---------------------------------------------------------------------------

CREATE TABLE ai_embedding (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  entity_type      ai_entity_type NOT NULL,
  entity_id        uuid NOT NULL,
  chunk_index      integer NOT NULL DEFAULT 0,
  source_field     text,
  content          text NOT NULL,
  embedding        vector(512) NOT NULL,
  token_count      integer NOT NULL DEFAULT 0,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, entity_id, chunk_index)
);

ALTER TABLE ai_embedding ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_embedding
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- HNSW index for vector similarity search (cosine distance)
CREATE INDEX ai_embedding_hnsw_idx ON ai_embedding
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN trigram index on content for keyword search
CREATE INDEX ai_embedding_content_trgm_idx ON ai_embedding
  USING gin (content gin_trgm_ops);

-- Lookup index for entity upsert/delete operations
CREATE INDEX ai_embedding_entity_lookup_idx ON ai_embedding (tenant_id, entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- copilot_session — conversation sessions per user
-- ---------------------------------------------------------------------------

CREATE TABLE copilot_session (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  user_id          uuid REFERENCES "user"(id) ON DELETE SET NULL,
  title            text,
  context          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  turn_count       integer NOT NULL DEFAULT 0,
  ended_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE copilot_session ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON copilot_session
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX copilot_session_user_idx ON copilot_session (tenant_id, user_id, is_active);

-- ---------------------------------------------------------------------------
-- copilot_turn — individual messages in a copilot session
-- ---------------------------------------------------------------------------

CREATE TABLE copilot_turn (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  session_id       uuid NOT NULL REFERENCES copilot_session(id) ON DELETE CASCADE,
  role             copilot_turn_role NOT NULL,
  intent           copilot_intent,
  content          text NOT NULL,
  tool_calls       jsonb,
  token_count      integer NOT NULL DEFAULT 0,
  input_tokens     integer NOT NULL DEFAULT 0,
  output_tokens    integer NOT NULL DEFAULT 0,
  latency_ms       integer,
  total_ms         integer,
  model            text,
  action_type      text,
  action_confirmed boolean,
  feedback         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE copilot_turn ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON copilot_turn
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX copilot_turn_session_idx ON copilot_turn (session_id, created_at);

-- ---------------------------------------------------------------------------
-- copilot_quota_usage — per-tenant monthly AI usage tracking
-- ---------------------------------------------------------------------------

CREATE TABLE copilot_quota_usage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  month            text NOT NULL, -- 'YYYY-MM'
  total_tokens     bigint NOT NULL DEFAULT 0,
  total_requests   integer NOT NULL DEFAULT 0,
  embedding_tokens bigint NOT NULL DEFAULT 0,
  chat_tokens      bigint NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month)
);

ALTER TABLE copilot_quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON copilot_quota_usage
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- property_ai_description — AI-generated property descriptions
-- ---------------------------------------------------------------------------

CREATE TABLE property_ai_description (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id),
  property_id      uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  locale           text NOT NULL DEFAULT 'es-AR',
  tone             text NOT NULL DEFAULT 'professional',
  target_portal    text,
  body             text NOT NULL,
  is_draft         boolean NOT NULL DEFAULT true,
  model            text NOT NULL,
  prompt_tokens    integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES "user"(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_ai_description ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON property_ai_description
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX property_ai_desc_property_idx ON property_ai_description (tenant_id, property_id);

-- ---------------------------------------------------------------------------
-- search_text generated columns for keyword search
-- These concat relevant text fields for pg_trgm matching.
-- ---------------------------------------------------------------------------

ALTER TABLE property ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    coalesce(reference_code, '') || ' ' ||
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(property_type::text, '') || ' ' ||
    coalesce(subtype, '') || ' ' ||
    coalesce(province, '') || ' ' ||
    coalesce(locality, '') || ' ' ||
    coalesce(neighborhood, '') || ' ' ||
    coalesce(address_street, '')
  ) STORED;

CREATE INDEX IF NOT EXISTS property_search_text_trgm_idx ON property
  USING gin (search_text gin_trgm_ops);

ALTER TABLE contact ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(legal_name, '') || ' ' ||
    coalesce(cuit, '') || ' ' ||
    coalesce(national_id, '') || ' ' ||
    coalesce(notes, '')
  ) STORED;

CREATE INDEX IF NOT EXISTS contact_search_text_trgm_idx ON contact
  USING gin (search_text gin_trgm_ops);

ALTER TABLE doc_document ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    coalesce(id::text, '')
  ) STORED;

CREATE INDEX IF NOT EXISTS doc_document_search_text_trgm_idx ON doc_document
  USING gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- AI analytics / cost-tracking log tables
-- ---------------------------------------------------------------------------

CREATE TABLE ai_embedding_log (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  model            text NOT NULL DEFAULT 'text-embedding-3-small',
  entity_type      text NOT NULL,
  entity_id        uuid NOT NULL,
  token_count      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_embedding_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_embedding_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE search_query_log (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  actor_id         uuid REFERENCES "user"(id) ON DELETE SET NULL,
  query_text       text NOT NULL,
  search_type      text NOT NULL DEFAULT 'hybrid',
  result_count     integer NOT NULL DEFAULT 0,
  clicked_rank     integer,
  latency_ms       integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_query_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON search_query_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE description_generation_log (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  actor_id         uuid REFERENCES "user"(id) ON DELETE SET NULL,
  property_id      uuid,
  tone             text,
  portal           text,
  input_tokens     integer NOT NULL DEFAULT 0,
  output_tokens    integer NOT NULL DEFAULT 0,
  latency_ms       integer,
  saved            boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE description_generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON description_generation_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
