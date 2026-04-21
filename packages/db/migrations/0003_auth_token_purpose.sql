-- =============================================================================
-- Migration: 0003_auth_token_purpose
-- Phase A — Security hardening (RENA-5 security review)
--
-- Adds a purpose discriminator column to password_reset_token to prevent
-- cross-purpose token reuse (ASVS V3.5.2).
-- =============================================================================

alter table password_reset_token
  add column if not exists purpose text not null default 'password_reset'
    check (purpose in ('email_verification', 'password_reset'));

-- Index to speed up token lookups filtered by purpose
create index if not exists idx_password_reset_token_purpose
  on password_reset_token (purpose, token_hash)
  where used_at is null;
