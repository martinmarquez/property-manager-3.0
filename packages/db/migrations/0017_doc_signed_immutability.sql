-- 0017_doc_signed_immutability.sql — RENA-71
-- DB-level enforcement: once a doc_document row reaches status = 'signed',
-- no further UPDATE or DELETE is permitted by any role.
-- Satisfies e-sign audit-trail integrity under Ley 25.506.

CREATE OR REPLACE FUNCTION block_signed_doc_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'signed documents are immutable (id: %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER block_signed_mutation
  BEFORE UPDATE OR DELETE ON doc_document
  FOR EACH ROW EXECUTE FUNCTION block_signed_doc_mutation();
