-- 0020_calendar.sql
-- Calendar feature: event types, events, and attendees
-- Creates tables for managing calendar events, event types, and event attendees

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE attendee_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'tentative'
);

CREATE TYPE calendar_sync_status AS ENUM (
  'local_only',
  'synced',
  'conflict',
  'pending_push',
  'pending_pull'
);

CREATE TYPE linked_entity_type AS ENUM (
  'contact',
  'property',
  'lead'
);

CREATE TYPE recurrence_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

-- ============================================================================
-- calendar_event_type — tenant-scoped event type definitions
-- ============================================================================

CREATE TABLE calendar_event_type (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  name                    TEXT NOT NULL,
  color                   TEXT NOT NULL,
  icon                    TEXT NOT NULL,
  default_duration_min    INTEGER NOT NULL DEFAULT 60,
  description_template    TEXT,
  built_in                BOOLEAN NOT NULL DEFAULT false,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID REFERENCES "user"(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES "user"(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by              UUID REFERENCES "user"(id),
  version                 INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_calendar_event_type_tenant
  ON calendar_event_type (tenant_id);

ALTER TABLE calendar_event_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_calendar_event_type ON calendar_event_type
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- calendar_event — core event record
-- ============================================================================

CREATE TABLE calendar_event (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  event_type_id           UUID NOT NULL REFERENCES calendar_event_type(id),
  title                   TEXT NOT NULL,
  description             TEXT,
  location                TEXT,
  start_at                TIMESTAMPTZ NOT NULL,
  end_at                  TIMESTAMPTZ NOT NULL,
  all_day                 BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule         JSONB,
  linked_entity_type      linked_entity_type,
  linked_entity_id        UUID,
  created_by_user_id      UUID REFERENCES "user"(id),
  external_provider       TEXT,
  external_id             TEXT,
  external_etag           TEXT,
  sync_status             calendar_sync_status NOT NULL DEFAULT 'local_only',
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID REFERENCES "user"(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES "user"(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by              UUID REFERENCES "user"(id),
  version                 INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_calendar_event_tenant
  ON calendar_event (tenant_id);
CREATE INDEX idx_calendar_event_start_at
  ON calendar_event (start_at);
CREATE INDEX idx_calendar_event_created_by_user
  ON calendar_event (created_by_user_id, tenant_id);
CREATE INDEX idx_calendar_event_linked
  ON calendar_event (linked_entity_type, linked_entity_id, tenant_id);

ALTER TABLE calendar_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_calendar_event ON calendar_event
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- calendar_event_attendee — event participants
-- ============================================================================

CREATE TABLE calendar_event_attendee (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  event_id                UUID NOT NULL REFERENCES calendar_event(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES "user"(id),
  contact_id              UUID REFERENCES contact(id),
  status                  attendee_status NOT NULL DEFAULT 'pending',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES "user"(id),
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, contact_id)
);

CREATE INDEX idx_calendar_event_attendee_tenant
  ON calendar_event_attendee (tenant_id);
CREATE INDEX idx_calendar_event_attendee_event
  ON calendar_event_attendee (event_id);
CREATE INDEX idx_calendar_event_attendee_user
  ON calendar_event_attendee (user_id, tenant_id);

ALTER TABLE calendar_event_attendee ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_calendar_event_attendee ON calendar_event_attendee
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
