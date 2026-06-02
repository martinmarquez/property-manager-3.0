-- 0026_property_spatial_index.sql — RENA-184
-- Phase H prerequisite: GiST spatial index on property(lat, lng) for appraisal comp search.
-- Without this index, ST_DWithin queries require a full table scan on the property table.
-- The expression index matches the cast used in the comp search query:
--   ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography

CREATE INDEX IF NOT EXISTS idx_property_location
  ON property
  USING GIST (
    (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography)
  )
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL;
