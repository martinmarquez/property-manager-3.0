-- Ensure app_user has permissions on ALL current and future tables.
-- Migration 0001 granted on tables that existed at the time, but tables
-- created by later migrations were missed. ALTER DEFAULT PRIVILEGES
-- ensures any future CREATE TABLE automatically inherits the grants.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    -- Re-grant on all current tables (catches any that were missed)
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

    -- Set default privileges so future tables are auto-granted
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE ON SEQUENCES TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO app_user;
  END IF;
END $$;
