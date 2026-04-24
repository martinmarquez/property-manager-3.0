-- 0010_contact_relationship_kind_audit.sql
-- Add missing universalCols to contact_relationship_kind (CTO review follow-up)

ALTER TABLE contact_relationship_kind
  ADD COLUMN updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_by  uuid REFERENCES auth_user(id),
  ADD COLUMN deleted_at  timestamptz,
  ADD COLUMN version     integer NOT NULL DEFAULT 1;
