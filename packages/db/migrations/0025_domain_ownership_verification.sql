-- =============================================================================
-- Migration: 0025_domain_ownership_verification
-- RENA-179: Fix custom domain race condition and add DNS pre-verification
--
-- 1. Add 'unverified' status to site_domain_status enum
-- 2. Add ownership_token column to site_domain
-- =============================================================================

ALTER TYPE site_domain_status ADD VALUE IF NOT EXISTS 'unverified' BEFORE 'pending';

ALTER TABLE site_domain ADD COLUMN IF NOT EXISTS ownership_token text;
