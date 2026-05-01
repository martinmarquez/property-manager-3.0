-- Phase F — ensure AI extensions are enabled in every environment (Neon, CI, local).
-- These are idempotent; running them on an instance that already has the extension is safe.

-- pgvector: vector similarity search for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm: trigram fuzzy search (also required by migration 0005 GIN index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
