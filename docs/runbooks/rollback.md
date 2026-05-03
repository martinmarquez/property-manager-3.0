# Rollback Runbook

> **When to use this runbook:** Error rate spike after a deploy, health checks failing, customer reports of broken core flows, Sentry alerts, or on-call page.

---

## 1. Identify the Need to Roll Back

```
[ ] Check Sentry — new error spike after recent deploy?
[ ] Check Fly dashboard — machines failing health checks?
[ ] Check API health: curl https://api.corredor.ar/health
[ ] Check recent GitHub Actions deploy — did it succeed cleanly?
[ ] Check BullMQ worker queue — jobs accumulating / failing?
```

**Decision tree:**

```
Did a production deploy happen in the last 2 hours?
  YES → Is there a clear error spike / health failure?
          YES → Roll back (Section 2)
          NO  → Monitor 15 min, then roll back if not improving
  NO  → Investigate: database, external provider, or infrastructure issue
          → See portal-outage.md or provider-outage.md
```

---

## 2. Fly.io Application Rollback (fastest path)

### 2a. Identify previous good version

```bash
# List releases (most recent first)
flyctl releases --app corredor-api-prod
flyctl releases --app corredor-worker-prod
```

Output includes version number, image SHA, date, and status. Pick the last `SUCCEEDED` version before the bad deploy.

### 2b. Roll back API

```bash
# Roll back to previous release
flyctl deploy --app corredor-api-prod \
  --image registry.fly.io/corredor-api-prod:<PREVIOUS_SHA> \
  --remote-only

# Confirm machines are healthy
flyctl status --app corredor-api-prod
flyctl logs --app corredor-api-prod --tail
```

### 2c. Roll back Worker

```bash
flyctl deploy --app corredor-worker-prod \
  --image registry.fly.io/corredor-worker-prod:<PREVIOUS_SHA> \
  --remote-only

flyctl status --app corredor-worker-prod
```

### 2d. Roll back all apps to a known-good SHA

```bash
STABLE_SHA="<known-good-git-sha>"  # from git log or GitHub Actions run

flyctl deploy --app corredor-api-prod    --image registry.fly.io/corredor-api-prod:$STABLE_SHA --remote-only
flyctl deploy --app corredor-worker-prod --image registry.fly.io/corredor-worker-prod:$STABLE_SHA --remote-only
```

### 2e. Roll back Frontend (Cloudflare Pages)

1. Open Cloudflare dashboard → **Pages** → `corredor-web` → **Deployments**.
2. Find the last healthy deployment (before the bad push).
3. Click the three-dot menu → **Rollback to this deployment**.
4. Repeat for `corredor-admin` and `corredor-tenant-sites` if affected.

### 2f. Roll back Site (Vercel)

1. Open Vercel dashboard → `corredor-site` → **Deployments**.
2. Click the target deployment → **Promote to Production**.

---

## 3. Database Migration Rollback

Drizzle migrations are **forward-only** (no automatic `down` migrations). Rolling back app code does not reverse applied migrations.

**If the migration broke data integrity or schema:**

1. Write a compensating (reverse) migration:

```bash
# Create new file in packages/db/migrations/
# Name it sequentially, e.g. 0028_rollback_bna_rate.sql
```

2. Test on a preview branch (Neon branch):

```bash
neonctl branches create --project-id $NEON_PROJECT_ID --name fix-rollback
DATABASE_URL=<neon-branch-url> pnpm --filter @corredor/db migrate
```

3. Merge through normal PR flow — the production pipeline applies it.

**Emergency schema fix (break-glass only):**

```bash
# Connect to Neon main branch directly — use DIRECT_DATABASE_URL
psql $DIRECT_DATABASE_URL

-- Run your compensating SQL manually
ALTER TABLE ...;

-- Document exactly what was run in the PR description
```

> Prefer the PR path. Direct DB edits must be reconciled in a migration file within 24 hours.

---

## 4. Feature Flag Emergency Off

Use feature flags to disable a broken feature without rolling back code.

### Via database

```bash
# Connect to production DB
psql $DATABASE_URL

-- Disable a feature flag for all tenants
UPDATE "featureFlag"
SET enabled = false
WHERE key = '<flag-key>';

-- Or for a specific tenant
UPDATE "featureFlag"
SET enabled = false
WHERE key = '<flag-key>' AND "tenantId" = '<tenant-uuid>';
```

### Via PostHog dashboard

1. Open PostHog → **Feature Flags**.
2. Find the flag → toggle **Disabled**.
3. Save.

---

## 5. Verify Recovery

```bash
# API health
curl https://api.corredor.ar/health

# Smoke test critical paths
curl https://api.corredor.ar/api/tenants -H "Authorization: Bearer <TEST_TOKEN>"

# Check Sentry — error rate dropping?
# Check Fly machines — all healthy?
flyctl status --app corredor-api-prod
flyctl status --app corredor-worker-prod
```

---

## 6. Post-Rollback Actions

- [ ] Post incident update in Slack `#incidents` channel.
- [ ] File a Sentry issue or link existing one to the incident.
- [ ] Revert the bad PR or push a fix PR to `main`.
- [ ] Run a full post-mortem if customer data was affected — see [security-incident.md](security-incident.md).
- [ ] Update on-call notes with timeline and root cause.

---

## Escalation

| Situation | Owner | Contact |
|-----------|-------|---------|
| DB data loss suspected | Engineering Lead | `<engineering-lead@corredor.ar>` |
| Payment provider affected | Billing Owner | `<billing@corredor.ar>` |
| Fly infrastructure issue | Fly.io support | `support.fly.io` |
| Neon database issue | Neon support | `neon.tech/support` |
| Customer-visible outage > 30 min | CEO/CTO | `<cto@corredor.ar>` |
