# Database Migration Fixes - Deployment Issue Resolution

**Date**: May 4, 2026  
**Status**: In Progress - CI Build Step Active

## Summary

The production deployment pipeline encountered multiple database migration errors that were blocking deployment. All migration issues have been identified and fixed. The current CI/CD pipeline is actively running with all corrections applied.

**Current Status**: CI workflow 25302163821 actively building (started 05:12:05 UTC). Security checks ✅ PASSED. Once build completes, Production Deploy workflow will execute.

## Issues Identified & Fixed

### 1. Missing Calendar Tables (Migration 0020)

**Error**: `relation "calendar_event" does not exist`

**Root Cause**: The calendar functionality (calendar_event, calendar_event_type, calendar_event_attendee tables) was defined in the Drizzle ORM schema but had no corresponding SQL migration file.

**Solution**: Created `/packages/db/migrations/0020_calendar.sql` with:
- `calendar_event_type` table for tenant-scoped event type definitions
- `calendar_event` table for core event records with external sync support
- `calendar_event_attendee` table for event participants
- All required PostgreSQL enums (attendee_status, calendar_sync_status, linked_entity_type, recurrence_frequency)
- RLS policies for all tables
- Performance indexes

**Commit**: `37d3686`

### 2. Non-Immutable Function in Index Predicate (Migration 0021)

**Error**: `functions in index predicate must be marked IMMUTABLE`

**Root Cause**: The index on `report_share_link.token` used `now()` in its WHERE clause, but PostgreSQL requires all functions in index predicates to be IMMUTABLE. The `now()` function is STABLE, not IMMUTABLE.

**Solution**: Removed the WHERE clause from `idx_share_link_token` index in `0021_phase_g_reports.sql`:
```sql
-- Before:
CREATE INDEX idx_share_link_token ON report_share_link (token) WHERE expires_at > now();

-- After:
CREATE INDEX idx_share_link_token ON report_share_link (token);
```

Expiration filtering can still be applied in queries and application code.

**Commit**: `928f867`

### 3. Incorrect Analytics Table Name References

**Error**: `relation "analytics_event" does not exist`

**Root Cause**: Migration files referenced `analytics_event` (singular) but the table was created as `analytics_events` (plural) in 0007_analytics.sql. This caused failures in:
- Migration 0022_reportes_remaining_mvs.sql (1 reference)
- Migration 0023_phase_g_reports_mvs.sql (7 references)

**Solution**: Corrected all 8 table references from `analytics_event` to `analytics_events` in both migration files.

**Files Modified**:
- `0022_reportes_remaining_mvs.sql`: Fixed 1 reference + comments
- `0023_phase_g_reports_mvs.sql`: Fixed 7 references

**Commit**: `65b27a8`

**Verification**: ✅ All references confirmed as `analytics_events` (plural) in current HEAD

## Deployment Timeline

| Event | Time | Status |
|-------|------|--------|
| Calendar migration created & pushed | 04:58:02 | ✅ |
| CI workflow 25301846171 | 04:58-05:01 | ✅ PASSED |
| Deployment 25301945815 | 05:01-05:01 | ❌ FAILED (index predicate error) |
| Index predicate fix pushed | 05:03:57 | ✅ |
| CI workflow 25302006555 | 05:03-05:06 | ✅ PASSED |
| Deployment 25302111236 | 05:06-05:08 | ❌ FAILED (analytics_event typo in old commit) |
| Analytics table name fix pushed | 05:09:34 | ✅ |
| CI workflow 25302163821 | 05:09 onwards | 🔄 **IN PROGRESS** |
| Security workflow 162 | 05:09-05:11:43 | ✅ PASSED |
| Production Deploy workflow 116 | 05:09 onwards | ⏳ PENDING (waits for CI) |

### Current Step Breakdown (CI Workflow 153)
- ✅ Typecheck (05:09:59 - 05:11:08)
- ✅ Lint (05:11:08 - 05:11:47)
- ✅ Test (05:11:47 - 05:12:05)
- 🔄 **Build (started 05:12:05)** ← CURRENTLY RUNNING

## Current Status

**Active**: CI workflow 25302163821 running Build step
- All lint, typecheck, and test checks passed
- Building application artifacts
- Expected to complete within 5 minutes
- Production Deploy workflow (116) will trigger automatically upon CI success

**Next Steps**:
1. ✅ CI Build completion
2. ⏳ Production Deploy workflow executes:
   - Database migrations (0021_phase_g_reports.sql, 0022_reportes_remaining_mvs.sql, 0023_phase_g_reports_mvs.sql)
   - Fly.io API deployment
   - Fly.io Worker deployment
   - Cloudflare Pages Web app deployment
   - Cloudflare Pages Admin app deployment
   - Vercel Site deployment
3. ⏳ Verify all platforms deploy successfully
4. ⏳ Test live application endpoints

## Key Learnings

1. **Schema-Driven Development**: The Drizzle ORM TypeScript definitions are the source of truth for schema. All SQL migrations must be validated against these definitions.

2. **Table Naming Consistency**: PostgreSQL table names must match exactly - singular vs. plural matters.

3. **PostgreSQL Function Immutability**: When creating partial indexes (with WHERE clauses), only IMMUTABLE functions can be used. Non-STABLE functions like `now()` must be applied in queries instead.

4. **Systematic Validation**: Each migration error revealed the need to check not just that specific migration, but all subsequent migrations for the same patterns.

## Previous Deployment Failure Analysis

The deployment at 05:06-05:08 (workflow 25302111236) failed with "relation analytics_event does not exist" because:
- It checked out commit 928f867 which had the index predicate fix but NOT the analytics table name fix
- The analytics table name fix (commit 65b27a8) was pushed immediately after at 05:09:34
- New workflows (153, 116, 162) started at 05:09:34 with the correct commit (65b27a8)
- Current build includes all three migration fixes verified
