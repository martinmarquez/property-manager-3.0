# Database Migration Runbook

Database: **Neon PostgreSQL** (`corredor-crm`, `aws-us-east-2`).
ORM: **Drizzle** — migrations live in `packages/db/migrations/`.

---

## 1. Pre-Migration Checklist

Run this before merging any PR that includes a migration:

```
[ ] Migration file is in packages/db/migrations/ with the correct sequential number
[ ] Migration has been applied to a preview/dev Neon branch and tested end-to-end
[ ] No destructive operations (DROP COLUMN, DROP TABLE) on columns still read by deployed code
[ ] If adding NOT NULL column: default value supplied OR all rows backfilled in same migration
[ ] Index creations on large tables use CONCURRENTLY (no table lock)
[ ] Migration is idempotent (IF NOT EXISTS / IF EXISTS guards where relevant)
[ ] Schema types in packages/db/src/ updated to match new columns
[ ] TypeScript build passes: pnpm turbo typecheck
[ ] Tests pass with new schema: pnpm turbo test
[ ] Estimated migration runtime reviewed — flag anything > 30s to team lead
```

---

## 2. How Migrations Run in CI/CD

Migrations run **automatically** as the first step of the production deploy workflow before any application code is deployed:

```yaml
# .github/workflows/production-deploy.yml
- name: Run Drizzle migrations (production)
  run: pnpm --filter @corredor/db migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}           # Neon pooled URL
    DIRECT_DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}  # Neon direct URL
```

Migration order: **migrate → deploy API → deploy Worker → deploy Frontends**.

If a migration fails, the application deploy is blocked — Fly.io keeps the old image running with no downtime.

---

## 3. Running Migrations Manually

### On a dev/preview branch

```bash
# Create a personal dev branch
bash infra/neon/dev-branch.sh

# Set the branch URL in your shell
export DATABASE_URL="<branch-db-url>"
export DIRECT_DATABASE_URL="<branch-db-url-direct>"

# Run migrations
pnpm --filter @corredor/db migrate
```

### On production (break-glass)

Only run manually when the CI pipeline cannot be used (e.g. emergency rollback migration):

```bash
# Export secrets from Doppler or 1Password
export DATABASE_URL="<neon-main-pooled-url>"
export DIRECT_DATABASE_URL="<neon-main-direct-url>"

# Run
pnpm --filter @corredor/db migrate

# Verify
pnpm --filter @corredor/db studio   # Opens Drizzle Studio on localhost:4983
```

> All manual production migrations must be documented in a follow-up PR.

---

## 4. Generating a New Migration File

```bash
# After editing packages/db/src/schema/*.ts
pnpm --filter @corredor/db generate

# Review the generated SQL before committing
cat packages/db/migrations/<new-file>.sql
```

Generated files are auto-named by Drizzle. Rename if needed to match the sequential convention (`0028_description.sql`).

---

## 5. Verifying Data Integrity After Migration

Run after every production migration completes:

```bash
# Connect to production DB (read-only check)
psql $DATABASE_URL
```

```sql
-- 1. Confirm new table/column exists
\d "tableName"

-- 2. Row counts unchanged (compare before/after for critical tables)
SELECT COUNT(*) FROM "property";
SELECT COUNT(*) FROM "tenant";

-- 3. Check for unexpected NULLs in NOT NULL columns
SELECT COUNT(*) FROM "tableName" WHERE "newColumn" IS NULL;

-- 4. Spot-check a sample of rows
SELECT * FROM "tableName" ORDER BY "createdAt" DESC LIMIT 10;

-- 5. Check migration history table
SELECT * FROM drizzle_migrations ORDER BY "id" DESC LIMIT 5;
```

If any check fails: immediately apply a compensating migration (see Section 6).

---

## 6. Rollback Procedures

### Option A — Compensating migration (preferred)

```bash
# 1. Write SQL that reverses the change
cat > packages/db/migrations/0029_rollback_bna_rate.sql << 'SQL'
ALTER TABLE "property" DROP COLUMN IF EXISTS "bnaRate";
SQL

# 2. Run on a preview branch first
DATABASE_URL=<branch-url> pnpm --filter @corredor/db migrate

# 3. Merge via normal PR flow
```

### Option B — Direct SQL fix (break-glass, use with extreme caution)

```bash
psql $DIRECT_DATABASE_URL << 'SQL'
-- Document every statement in a migration file immediately after
BEGIN;
-- ... your compensating SQL ...
COMMIT;
SQL
```

> Always prefer Option A. Option B bypasses CI history and risks drift.

### Option C — Neon point-in-time restore

For severe data loss where compensating SQL is insufficient:

1. Open Neon dashboard → project `corredor-crm` → **Branches** → `main`.
2. Click **Restore** → select a point in time before the bad migration.
3. Restore creates a new branch — validate data, then promote if correct.
4. Update `DATABASE_URL` and `DIRECT_DATABASE_URL` secrets to point to the restored branch.
5. Redeploy apps to pick up the new connection string.

> Neon point-in-time restore may incur downtime. Coordinate with engineering lead.

---

## 7. Long-Running Migration Playbook

For migrations estimated > 60 seconds (large table rewrites, backfills):

```
[ ] Schedule during low-traffic window (e.g. 03:00 UTC weekday)
[ ] Notify team in Slack #engineering at least 4 hours in advance
[ ] Use CONCURRENTLY for index creation to avoid table locks
[ ] Consider splitting: schema change → backfill worker → NOT NULL constraint in 3 separate PRs
[ ] Have rollback SQL ready before merging
[ ] Monitor Neon dashboard during migration for lock wait / CPU spike
```

Example safe backfill pattern:

```sql
-- Step 1: Add column nullable (no lock)
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "bnaRate" DECIMAL;

-- Step 2: Backfill in batches (separate worker/script, repeat until 0 rows)
UPDATE "property" SET "bnaRate" = 0 WHERE "bnaRate" IS NULL AND id IN (
  SELECT id FROM "property" WHERE "bnaRate" IS NULL LIMIT 10000
);

-- Step 3: Add NOT NULL constraint (after backfill complete)
ALTER TABLE "property" ALTER COLUMN "bnaRate" SET NOT NULL;
```

---

## Escalation

| Issue | Owner | Action |
|-------|-------|--------|
| Migration hanging > 5 min | Engineering Lead | Check Neon active queries; kill if needed |
| Data loss suspected | CTO | Neon PITR restore (Section 6C) |
| Neon platform outage | Neon support | `neon.tech/support` |
