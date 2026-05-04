# Migration 0021 Schema Fixes Summary

## Overview
Migration `0021_phase_g_reports.sql` contained 6 schema mismatches where column names or table references didn't match the actual database structure. All have been corrected.

## Issues Found & Fixed

### 1. Pipeline Stage Column Names (lines 20-21, 50)
**Issue**: Referenced non-existent columns in the `pipeline_stage` table

#### Fix 1a: sort_order → position
- **Location**: Line 20 (SELECT clause), Line 50 (GROUP BY)
- **Error**: Column `ps.sort_order` does not exist
- **Actual Column**: `ps.position`
- **Commit**: 1213e79
- **Impact**: mv_pipeline_conversion materialized view

#### Fix 1b: stage_kind → kind  
- **Location**: Line 21 (SELECT clause), Line 50 (GROUP BY)
- **Error**: Column `ps.stage_kind` does not exist
- **Actual Column**: `ps.kind`
- **Commit**: 1213e79
- **Impact**: mv_pipeline_conversion materialized view

### 2. Property Listing Join (lines 100-107)
**Issue**: Attempted to join `property_listing` directly using non-existent columns

#### Problem
- **Column Missing**: `property_listing.created_by` does not exist
- **Column Missing**: `property_listing.deleted_at` does not exist
- The original join structure assumed property_listing tracked who created listings and their deletion state

#### Root Cause
The `property_listing` table only tracks:
- `id`, `tenantId`, `propertyId`, `kind`, `priceAmount`, `priceCurrency`, `commissionPct`, `createdAt`, `updatedAt`

It does NOT track creation by a specific user or soft deletes.

#### Solution
Added a join through the `property` table which has:
- `property.created_by` - User who created the property
- `property.deleted_at` - Soft delete timestamp
- `property.created_at` - When property was created

**New Join Structure**:
```sql
LEFT JOIN property p
  ON p.created_by = u.id
  AND p.tenant_id = u.tenant_id
  AND p.created_at >= DATE_TRUNC('month', NOW())
  AND p.deleted_at IS NULL
LEFT JOIN property_listing pl
  ON pl.property_id = p.id
  AND pl.tenant_id = u.tenant_id
```

**Semantic Change**: "Listings created by agent" now correctly means "Listings of properties created by that agent"
- **Commit**: 0c0bf57
- **Impact**: mv_agent_productivity materialized view

### 3. Conversation Column Name (line 109)
**Issue**: Referenced non-existent column in conversation table

#### Fix: assigned_to_id → assigned_agent_id
- **Location**: Line 109 (JOIN condition)
- **Error**: Column `conv.assigned_to_id` does not exist
- **Actual Column**: `conv.assigned_agent_id`
- **Commit**: ee5556d
- **Impact**: mv_agent_productivity materialized view

### 4. Calendar Event Timestamp (line 123)
**Issue**: Referenced non-existent column in calendar_event table

#### Fix: starts_at → start_at
- **Location**: Line 123 (JOIN condition)
- **Error**: Column `ce.starts_at` does not exist
- **Actual Column**: `ce.start_at`
- **Commit**: ee5556d
- **Impact**: mv_agent_productivity materialized view

### 5. Calendar Event Completion Status (line 92)
**Issue**: Referenced non-existent status column

#### Problem
- **Original Filter**: `WHERE ce.status = 'completed'`
- **Issue**: The `calendar_event` table does not have a `status` column
- **Actual Columns**: Only `sync_status` exists (for external sync tracking: 'local_only', etc.)

#### Solution
Changed filter to use end time to determine completion:
```sql
FILTER (WHERE ce.end_at < NOW())
```

**Logic**: Events are considered "completed" if their end time has passed
- **Commit**: ee5556d
- **Impact**: mv_agent_productivity materialized view (visits_completed metric)

## Schema Reference Tables

### Tables Used in Materialized Views

| Table | Key Columns | Notes |
|-------|------------|-------|
| lead | id, tenant_id, owner_user_id, pipeline_id, won_at, lost_at, created_at, deleted_at | Lead opportunities |
| lead_stage_history | lead_id, stage_id, entered_at, exited_at | Immutable pipeline stage movement log |
| pipeline_stage | id, name, kind, position | Pipeline stage definitions |
| user | id, tenant_id, active | Agent/user records |
| property | id, created_by, tenant_id, created_at, deleted_at | Property records with creator tracking |
| property_listing | id, property_id, tenant_id, created_at | Listings per property (sale/rent/etc) |
| conversation | id, assigned_agent_id, tenant_id, created_at | Inbox conversations |
| message | id, conversation_id, direction, created_at | Messages within conversations |
| calendar_event | id, created_by, tenant_id, start_at, end_at | Scheduled events |

## Deployment Timeline

| Commit | Description | Status |
|--------|-------------|--------|
| 1213e79 | Fix: correct column names in 0021_phase_g_reports migration | ✅ CI Pass (25301286282) |
| 0c0bf57 | Fix: correct property_listing join in mv_agent_productivity | ⏳ CI Run 25301537276 |
| ee5556d | Fix: correct column names in mv_agent_productivity materialized view | ⏳ CI Run 25301591247 |

## Verification Steps

To verify the migration now works correctly:

```bash
# After deployment, verify materialized views are created
psql $DATABASE_URL -c "\d analytics.mv_pipeline_conversion"
psql $DATABASE_URL -c "\d analytics.mv_agent_productivity"

# Test view queries
psql $DATABASE_URL -c "SELECT COUNT(*) FROM analytics.mv_pipeline_conversion LIMIT 1"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM analytics.mv_agent_productivity LIMIT 1"
```

## Lessons Learned

1. **Schema Evolution**: Migration files must be validated against current schema definitions before execution
2. **Type Safety**: TypeScript schema definitions (Drizzle ORM) are the source of truth for column names
3. **Join Logic**: When tables lack certain fields, joins must traverse related tables
4. **Testing**: Run migrations in a test/staging environment first to catch these issues before production
