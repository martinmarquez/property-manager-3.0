-- Corredor CRM — Postgres initialization script
-- Runs once on first container start (postgres:16 / pgvector/pgvector:pg16)
-- Enables required extensions and sets up the application role.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- pgvector: AI embedding storage + similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- PostGIS: geospatial queries (property coordinates, zone mapping)
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm: trigram-based fuzzy full-text search (contact/property name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- uuid-ossp: deterministic UUID generation in SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- btree_gist: composite GiST indexes (used by RLS exclusion constraints)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Application role
-- Note: POSTGRES_USER=corredor already owns the corredor database.
-- This block is a no-op if the role already exists (idempotent).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'corredor') THEN
    CREATE ROLE corredor WITH LOGIN PASSWORD 'corredor';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE corredor TO corredor;

-- Allow the app role to create schemas (needed for migrations and RLS setup)
ALTER DATABASE corredor OWNER TO corredor;
