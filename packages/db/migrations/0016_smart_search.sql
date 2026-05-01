-- 0016_smart_search.sql — RENA-86
-- Smart Search: lead search_text (trigger-maintained), doc_document search_text
-- improvement, and GIN trgm indexes for hybrid keyword search.
-- Requires: 0014_extensions_vector.sql (pg_trgm), 0015_phase_f_ai.sql (search_text on property/contact)

-- ---------------------------------------------------------------------------
-- lead.search_text — trigger-maintained (needs cross-table joins)
-- Concatenates: lead title + contact first/last name + property reference_code
-- + property address + property neighborhood + lead lost_reason
-- ---------------------------------------------------------------------------

ALTER TABLE lead ADD COLUMN IF NOT EXISTS search_text text;

-- Trigger function: builds search_text from lead + joined contact/property data
CREATE OR REPLACE FUNCTION lead_search_text_trigger_fn() RETURNS trigger AS $$
BEGIN
  SELECT
    coalesce(NEW.title, '') || ' ' ||
    coalesce(c.first_name, '') || ' ' ||
    coalesce(c.last_name, '') || ' ' ||
    coalesce(c.legal_name, '') || ' ' ||
    coalesce(p.reference_code, '') || ' ' ||
    coalesce(p.address_street, '') || ' ' ||
    coalesce(p.neighborhood, '') || ' ' ||
    coalesce(p.locality, '') || ' ' ||
    coalesce(NEW.lost_reason, '')
  INTO NEW.search_text
  FROM contact c
  LEFT JOIN property p ON p.id = NEW.property_id
  WHERE c.id = NEW.contact_id;

  -- Fallback if contact not found (shouldn't happen due to FK, but be safe)
  IF NEW.search_text IS NULL THEN
    NEW.search_text := coalesce(NEW.title, '') || ' ' || coalesce(NEW.lost_reason, '');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_search_text_trg
  BEFORE INSERT OR UPDATE ON lead
  FOR EACH ROW EXECUTE FUNCTION lead_search_text_trigger_fn();

-- Backfill existing leads
UPDATE lead SET search_text = search_text WHERE search_text IS NULL;

-- GIN trgm index for fast keyword search
CREATE INDEX CONCURRENTLY IF NOT EXISTS lead_search_text_trgm_idx
  ON lead USING gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- doc_document.search_text — replace placeholder with trigger-maintained column
-- The existing generated column (just id::text) is useless for search.
-- We drop the generated column and replace with a trigger-maintained one
-- that includes template kind/name + signer names.
-- ---------------------------------------------------------------------------

-- Drop the old generated column
ALTER TABLE doc_document DROP COLUMN IF EXISTS search_text;

-- Add a regular text column
ALTER TABLE doc_document ADD COLUMN search_text text;

CREATE OR REPLACE FUNCTION doc_document_search_text_trigger_fn() RETURNS trigger AS $$
BEGIN
  SELECT
    coalesce(t.kind::text, '') || ' ' ||
    coalesce(t.name, '') || ' ' ||
    coalesce(NEW.status::text, '')
  INTO NEW.search_text
  FROM doc_template t
  WHERE t.id = NEW.template_id;

  IF NEW.search_text IS NULL THEN
    NEW.search_text := coalesce(NEW.status::text, '');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doc_document_search_text_trg
  BEFORE INSERT OR UPDATE ON doc_document
  FOR EACH ROW EXECUTE FUNCTION doc_document_search_text_trigger_fn();

-- Backfill existing documents
UPDATE doc_document SET search_text = search_text;

-- Recreate the trgm index (drop old one from 0015 if it exists on the generated column)
DROP INDEX IF EXISTS doc_document_search_text_trgm_idx;
CREATE INDEX CONCURRENTLY IF NOT EXISTS doc_document_search_text_trgm_idx
  ON doc_document USING gin (search_text gin_trgm_ops);
