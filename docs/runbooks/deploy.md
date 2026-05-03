# Deploy Runbook

---

## How Deploys Work

Corredor uses a **GitHub Actions → Fly.io** pipeline. All deploys are automated; no SSH access to machines is needed.

```
PR opened / updated
        │
        ▼
.github/workflows/ci.yml
  ├─ Typecheck (turbo)
  ├─ Lint (turbo)
  ├─ Test (turbo)
  └─ Build (turbo)
        │
        ▼ (in parallel)
.github/workflows/preview.yml
  ├─ Create Neon branch pr-{n}
  ├─ Run Drizzle migrations on pr-{n}
  ├─ Deploy corredor-api-pr-{n} to Fly.io
  ├─ Build + deploy apps/web to Cloudflare Pages (branch: pr-{n})
  └─ Comment preview URLs on PR
        │
Push to main
        │
        ▼
.github/workflows/production-deploy.yml
  ├─ [CI Gate] Typecheck + Lint + Test + Build
  ├─ [CI Gate] Sentry source map upload (api, worker)
  ├─ Run Drizzle migrations (Neon main branch)
  ├─ Deploy corredor-api to Fly.io (rolling)
  ├─ Deploy corredor-worker to Fly.io (rolling)
  └─ Build + deploy apps/web to Cloudflare Pages (production)

PR closed (merged or abandoned)
        │
        ▼
.github/workflows/cleanup-preview.yml
  ├─ Destroy corredor-api-pr-{n} on Fly.io
  └─ Delete Neon pr-{n} branch
```

**Rolling deploy strategy:** Fly.io brings up new machines with the new version, health-checks them, then drains traffic from old machines. Zero downtime for stateless apps.

---

## Workflow Files

All workflows live in `.github/workflows/`.

| File | Trigger | Purpose |
|------|---------|---------|
| `ci.yml` | PR to `main`/`staging`; push to `main` | Typecheck, lint, test, build gate |
| `preview.yml` | PR opened / updated | Spin up isolated preview environment |
| `production-deploy.yml` | Push to `main` | Full CI gate + production deploy |
| `cleanup-preview.yml` | PR closed | Destroy Fly preview app + Neon branch |
| `security.yml` | PR, push to `main`, daily cron (03:00 UTC) | `pnpm audit`, Snyk, gitleaks, CodeQL |
| `nightly-regression.yml` | Daily cron (03:00 UTC); manual dispatch | Full Playwright E2E suite against production |
| `e2e-smoke.yml` | See file | E2E smoke tests (PR/staging path) |

---

## Environments

| Environment | Trigger | Apps |
|-------------|---------|------|
| **Preview** | PR opened / updated | `corredor-api-pr-{n}` on Fly + CF Pages branch `pr-{n}` + Neon `pr-{n}` branch |
| **Production** | Push to `main` (after CI gate passes) | `corredor-api`, `corredor-worker` on Fly + CF Pages production (`corredor-web`) |

---

## Triggering a Manual Deploy

### Via Fly CLI

Requires the Fly CLI (`flyctl`) installed and authenticated:

```bash
# Authenticate once
flyctl auth login

# Deploy the API
flyctl deploy --config infra/fly/api.fly.toml --remote-only --wait-timeout 300

# Deploy the worker
flyctl deploy --config infra/fly/worker.fly.toml --remote-only --wait-timeout 300
```

### Via GitHub Actions (manual dispatch)

The nightly regression workflow supports manual dispatch. To trigger it:

1. Go to the GitHub repository → **Actions** tab.
2. Select **Nightly Regression**.
3. Click **Run workflow** → confirm.

For a manual production deploy without a code change, trigger a push to `main` or use `flyctl deploy` directly.

---

## Rolling Back

### Rollback via Fly CLI (fastest)

```bash
# List recent releases
flyctl releases --app corredor-api

# Roll back to a specific version
flyctl deploy --app corredor-api --image registry.fly.io/corredor-api:<previous-sha>

# Roll back the worker too if needed
flyctl deploy --app corredor-worker --image registry.fly.io/corredor-worker:<previous-sha>
```

### Roll back all apps to a known good commit

```bash
STABLE_SHA="<known-good-git-sha>"

flyctl deploy --app corredor-api    --image registry.fly.io/corredor-api:$STABLE_SHA
flyctl deploy --app corredor-worker --image registry.fly.io/corredor-worker:$STABLE_SHA
```

`apps/web` on Cloudflare Pages: roll back via the Cloudflare dashboard (Pages → `corredor-web` → Deployments → select a previous deployment → **Rollback**).

### Roll back a database migration

Drizzle migrations are not automatically reversible. To undo a migration:

1. Write a reverse migration as a new file in `packages/db/migrations/`.
2. Merge it through the normal PR flow.
3. The production deploy pipeline applies it to the Neon `main` branch automatically.

Do **not** manually edit the Neon `main` branch outside of the CI pipeline.

---

## Checking Deploy Status

```bash
# Status of all machines for an app
flyctl status --app corredor-api

# Tail live logs
flyctl logs --app corredor-api

# Check health endpoint
curl https://api.corredor.ar/health

# Open Fly dashboard
flyctl dashboard --app corredor-api
```

GitHub Actions run history: **GitHub repo → Actions tab** — filter by workflow name.

---

## Preview Environments

Every pull request gets an isolated preview environment created by `preview.yml`:

- **Fly app:** `corredor-api-pr-{n}` — API server pointing at the PR's Neon branch
- **Cloudflare Pages:** `pr-{n}` branch deploy — web app pointing at the preview API
- **Neon branch:** `pr-{n}` — copy-on-write snapshot from `main` with PR migrations applied
- **Lifecycle:** Created on PR open/update; destroyed automatically by `cleanup-preview.yml` on PR close

Preview URLs are posted as a PR comment by the workflow. The API URL is `https://corredor-api-pr-{n}.fly.dev`. The web URL appears in the Cloudflare Pages deployment comment.

### Manual preview cleanup

If a preview environment was not cleaned up automatically:

```bash
PR_NUM=42

# Destroy Fly preview app
flyctl apps destroy corredor-api-pr-$PR_NUM --yes

# Delete Neon branch (Neon CLI)
neonctl branches delete pr-$PR_NUM --project-id $NEON_PROJECT_ID
```

Cloudflare Pages preview branches are cleaned up automatically by Cloudflare — no manual step needed.

---

## Security Scans

The `security.yml` workflow runs on every PR and push to `main`, plus daily at 03:00 UTC:

| Check | Tool | Fail condition |
|-------|------|----------------|
| Dependency vulnerabilities | `pnpm audit` + Snyk | High or critical CVE |
| Secrets in git history | gitleaks | Any secret detected |
| Static analysis (SAST) | CodeQL (`security-extended`) | Any detected issue |

Snyk results are also uploaded to the **GitHub Security tab** as SARIF.

---

## Nightly Regression

`nightly-regression.yml` runs the full Playwright E2E suite against production every night at 03:00 UTC. It can also be triggered manually via the Actions tab.

Results (Playwright HTML report) are uploaded as a GitHub Actions artifact and retained for 30 days. Check the **Actions → Nightly Regression** run history if you suspect a silent regression.

---

## App Scaling

### View current machine counts

```bash
flyctl scale show --app corredor-api
```

### Scale up (incident / traffic spike)

```bash
flyctl scale count 4 --app corredor-api
flyctl scale count 3 --region gru --app corredor-api
flyctl scale count 1 --region scl --app corredor-api
```

### Scale down (after incident)

```bash
flyctl scale count 2 --app corredor-api
```

### Default scaling policy

| App | Min | Max | Region |
|-----|-----|-----|--------|
| `corredor-api` | 2 | 10 | gru (primary), scl (secondary) |
| `corredor-worker` | 1 | 5 | gru |
| `corredor-site` | 2 | 8 | gru, scl |
| `corredor-admin` | 1 | 2 | gru |
| `corredor-web` | — | — | Cloudflare Pages (CDN, no machines) |

---

## Fly App Naming Convention

All Fly apps follow: `corredor-{app}-{env}`

| App | Production | Preview |
|-----|-----------|---------|
| API | `corredor-api` | `corredor-api-pr-{n}` |
| Worker | `corredor-worker` | `corredor-worker-pr-{n}` |
| Site | `corredor-site` | — |
| Admin | `corredor-admin` | — |

`apps/web` is deployed to **Cloudflare Pages** — no Fly app.

---

## Secrets Management in Production

Secrets are managed via Doppler and injected into Fly at deploy time.

To update a secret:

```bash
# 1. Update in Doppler (source of truth)
doppler secrets set KEY=new_value --project corredor --config production

# 2. Redeploy to pick up the new value
flyctl deploy --config infra/fly/api.fly.toml --remote-only
```

For emergency direct updates (reconcile in Doppler afterward to prevent drift):

```bash
flyctl secrets set MY_SECRET=value --app corredor-api
```

See [docs/runbooks/secrets.md](secrets.md) for the full secrets list per app.

---

## Health Checks

| App | Check type | Endpoint | Interval |
|-----|-----------|----------|---------|
| `corredor-api` | HTTP GET | `/health` → `200 OK` | 15s |
| `corredor-worker` | TCP | port 9090 | 30s |
| `corredor-site` | HTTP GET | `/` → `200 OK` | 15s |
| `corredor-admin` | HTTP GET | `/` → `200 OK` | 15s |
| `corredor-web` | Cloudflare Pages | Always up (CDN) | — |

Fly.io replaces machines that fail 3 consecutive health checks automatically.

---

## Smoke Test Checklist

Run manually after every production deploy (or automated via `e2e-smoke.yml`):

```
[ ] API health endpoint returns 200:
      curl https://api.corredor.ar/health

[ ] Auth flow — login returns a session token:
      curl -X POST https://api.corredor.ar/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"smoke@corredor.ar","password":"<smoke-pass>"}'

[ ] Tenant listing loads (authenticated):
      curl https://api.corredor.ar/api/tenants \
        -H "Authorization: Bearer <smoke-token>"

[ ] Property listing loads for a known tenant

[ ] Web portal loads in browser (no JS errors):
      open https://app.corredor.ar

[ ] Admin panel loads:
      open https://admin.corredor.ar

[ ] BullMQ worker is processing (check queue depth, should be draining):
      flyctl logs --app corredor-worker-prod --tail --lines 50

[ ] Sentry — no new error spike in the last 10 min:
      open https://sentry.io → corredor project → Issues (sorted by Last seen)

[ ] Check Nightly Regression last run if deploy was after 03:00 UTC
```

For critical-path E2E smoke (automated):

```bash
# Trigger smoke suite against production
gh workflow run e2e-smoke.yml --field env=production
```

---

## Canary Deploy Strategy

Fly.io's rolling deploy acts as a lightweight canary: new machines are health-checked before old ones are drained. For higher-risk changes, use a manual staged rollout:

### Option A — Partial machine rollout (Fly rolling)

The default. Fly deploys new machines one at a time, waits for health checks, then drains the old. No explicit action needed.

```bash
# Default rolling deploy — safe for most changes
flyctl deploy --config infra/fly/api.fly.toml --remote-only --wait-timeout 300
```

Monitor during rollout (see next section).

### Option B — Manual staged rollout (high-risk changes)

For schema-breaking changes, new billing logic, or AI model swaps:

```bash
# Step 1: Deploy to 1 of N machines (set count to 1 temporarily)
flyctl scale count 1 --app corredor-api-prod

# Step 2: Deploy new image
flyctl deploy --config infra/fly/api.fly.toml --remote-only

# Step 3: Monitor for 10 minutes (see Monitoring section below)
#   Check: error rate, latency, BullMQ queue depth

# Step 4: If healthy, scale back to full capacity
flyctl scale count 2 --app corredor-api-prod

# Step 5: If unhealthy, roll back immediately
flyctl deploy --app corredor-api-prod \
  --image registry.fly.io/corredor-api-prod:<previous-sha> --remote-only
```

### Option C — Feature flag canary (gradual user rollout)

Use the database-backed feature flag system for per-tenant or percentage-based rollout:

```sql
-- Enable for 10% of tenants (uses rollout percentage column)
UPDATE "featureFlag"
SET enabled = true, "rolloutPercentage" = 10
WHERE key = 'new_billing_flow';

-- Increase to 50% after validation
UPDATE "featureFlag"
SET "rolloutPercentage" = 50
WHERE key = 'new_billing_flow';

-- Full rollout
UPDATE "featureFlag"
SET "rolloutPercentage" = 100
WHERE key = 'new_billing_flow';
```

---

## Monitoring During Rollout

Open these tabs before triggering a production deploy. Keep them visible throughout the rollout.

### What to watch

| Signal | Where | Healthy threshold |
|--------|-------|------------------|
| API error rate | Sentry → corredor-api → Issues | No new P1/P2 errors |
| Machine health | `flyctl status --app corredor-api-prod` | All machines `started` |
| Response latency | Fly dashboard → Metrics | p99 < 2s |
| BullMQ queue depth | Admin queue board or Redis | Jobs draining, not accumulating |
| Database connections | Neon dashboard → Monitoring | No connection pool exhaustion |

### Live commands during rollout

```bash
# Terminal 1 — watch Fly machine status
watch -n 5 flyctl status --app corredor-api-prod

# Terminal 2 — tail API logs
flyctl logs --app corredor-api-prod --tail

# Terminal 3 — tail worker logs
flyctl logs --app corredor-worker-prod --tail

# Terminal 4 — spot-check health
watch -n 10 'curl -s https://api.corredor.ar/health | jq .'
```

### Rollout abort criteria

Abort and roll back if any of these occur within 10 min of deploying:

```
- Error rate increases > 5% vs pre-deploy baseline
- Any machine enters failed/stopped state
- p99 latency exceeds 3s
- BullMQ failed job count grows
- Any Sentry P1 (crash) error in the new release
- Customer reports of broken core flow (auth, property listing, billing)
```

Roll back procedure: see [rollback.md](rollback.md).
