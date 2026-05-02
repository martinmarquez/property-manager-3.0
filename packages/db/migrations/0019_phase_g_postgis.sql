-- 0019_phase_g_postgis.sql — RENA-120
-- Phase G infra: enable PostGIS extension for appraisal comparable searches.
-- Required by the appraisal comp ST_DWithin radius queries in Phase G.
-- PostGIS 3.5.0 is available on Neon PG 17.

CREATE EXTENSION IF NOT EXISTS postgis;
