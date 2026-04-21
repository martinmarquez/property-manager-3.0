# Deploy Runbook

---

## How Deploys Work

Corredor uses a **GitHub Actions → Fly.io** pipeline. All deploys are automated; no SSH access to machines is needed.

```
Developer pushes to main
        │
        ▼
GitHub Actions: ci.yml
  ├─ Typecheck (all packages)
  ├─ Lint (all packages)
  ├─ Test (all packages, Neon CI branch)
  └─ Build (all apps)
        │
        ▼ (if all checks pass)
GitHub Actions: deploy.yml
  ├─ Run Drizzle migrations against Neon main branch
  ├─ fly deploy --app corredor-api (rolling)
  ├─ fly deploy --app corredor-worker (rolling)
  ├─ fly deploy --app corredor-site (rolling)
  ├─ fly deploy --app corredor-admin (rolling)
  └─ Cloudflare Pages: auto-deploy apps/web via CF Pages Git integration
```

**Rolling deploy strategy:** Fly.io brings up new machines with the new version, health-checks them (30s grace), then drains traffic from old machines. Zero downtime for stateless apps (`api`, `site`, `admin`, `web`).

> **Note:** The GitHub Actions workflows are being finalized in [RENA-8](/RENA/issues/RENA-8). This runbook documents the deploy topology and manual procedures; refer to `infra/github/workflows/` for the current workflow definitions once RENA-8 is complete.

---

## Environments

| Environment | Trigger | Apps deployed to |
|-------------|---------|-----------------|
| **Preview** | PR opened / updated | `corredor-api-pr-{n}`, `corredor-worker-pr-{n}`, etc. on Fly + Neon `pr-{n}` branch |
| **Staging** | Merge to `main` (staging config) | `corredor-api-staging`, etc. on Fly + Neon `staging` branch |
| **Production** | Manual promotion from staging | `corredor-api`, etc. on Fly + Neon `main` branch |

---

## Triggering a Manual Deploy

### Manual deploy via Fly CLI

Requires the Fly CLI (`flyctl`) installed and authenticated:

```bash
# Authenticate once
flyctl auth login

# Deploy the API manually
flyctl deploy --app corredor-api --strategy rolling

# Deploy the worker
flyctl deploy --app corredor-worker --strategy rolling

# Deploy the site
flyctl deploy --app corredor-site --strategy rolling

# Deploy admin
flyctl deploy --app corredor-admin --strategy rolling
```

To deploy with a specific image tag:

```bash
flyctl deploy --app corredor-api --image registry.fly.io/corredor-api:<tag>
```

### Manual deploy with Doppler secrets injection

```bash
doppler run -- flyctl deploy --app corredor-api
```

### Deploy a single app via GitHub Actions (manual trigger)

> Available once CI/CD workflows are active (see [RENA-8](/RENA/issues/RENA-8)).

1. Go to the GitHub repository → **Actions** tab.
2. Select the `deploy.yml` workflow.
3. Click **Run workflow**, select the target environment, and confirm.

---

## Rolling Back

### Rollback via Fly CLI (fastest — uses last good image)

```bash
# List recent releases for an app
flyctl releases --app corredor-api

# Roll back to a specific version (get the version number from the list above)
flyctl deploy --app corredor-api --image registry.fly.io/corredor-api:<previous-tag>
```

### Rollback all apps to a known good state

```bash
# Find the last stable deployment tag (from CI or Fly release history)
STABLE_TAG="<known-good-sha>"

flyctl deploy --app corredor-api --image registry.fly.io/corredor-api:$STABLE_TAG
flyctl deploy --app corredor-worker --image registry.fly.io/corredor-worker:$STABLE_TAG
flyctl deploy --app corredor-site --image registry.fly.io/corredor-site:$STABLE_TAG
flyctl deploy --app corredor-admin --image registry.fly.io/corredor-admin:$STABLE_TAG
```

### Rollback a database migration

Drizzle migrations are not automatically reversible. To undo a migration:

1. Write a reverse migration manually as a new migration file in `packages/db/migrations/`.
2. Commit the reverse migration and merge it through the normal PR flow.
3. Once merged, the CI pipeline applies the reverse migration to the Neon `main` branch.
4. Do **not** manually edit the Neon `main` branch outside of the CI migration pipeline.

For emergency rollbacks under active incident, contact the database administrator with DBA access to the Neon project.

---

## Checking Deploy Status

```bash
# Status of all machines for an app
flyctl status --app corredor-api

# Tail live logs
flyctl logs --app corredor-api

# Open Fly dashboard for an app
flyctl dashboard --app corredor-api

# Check health endpoint
curl https://api.corredor.ar/health
```

---

## Preview Environments

Every pull request gets an isolated preview environment:

- **Fly apps:** `corredor-api-pr-{n}`, `corredor-worker-pr-{n}`, `corredor-site-pr-{n}`
- **Neon branch:** `pr-{n}` — copy-on-write snapshot from `main`, used only by this PR's apps
- **Lifecycle:** Created on PR open; destroyed on PR merge or close

Preview URLs are posted as a PR comment by GitHub Actions automatically once the deploy completes.

To manually destroy a preview environment:

```bash
PR_NUM=42
flyctl apps destroy corredor-api-pr-$PR_NUM --yes
flyctl apps destroy corredor-worker-pr-$PR_NUM --yes

# Delete the Neon branch (via Neon CLI)
neonctl branches delete pr-$PR_NUM --project-id $NEON_PROJECT_ID
```

---

## App Scaling

### View current machine counts

```bash
flyctl scale show --app corredor-api
```

### Scale up (incident / traffic spike)

```bash
# Add machines to corredor-api
flyctl scale count 4 --app corredor-api

# Scale to specific regions
flyctl scale count 3 --region gru --app corredor-api
flyctl scale count 1 --region scl --app corredor-api
```

### Scale down (after incident)

```bash
flyctl scale count 2 --app corredor-api
```

### Default scaling policy (from fly.api.toml)

| App | Min | Max | Region |
|-----|-----|-----|--------|
| `corredor-api` | 2 | 10 | gru (primary), scl (secondary) |
| `corredor-worker` | 1 | 5 | gru |
| `corredor-site` | 2 | 8 | gru, scl |
| `corredor-admin` | 1 | 2 | gru |
| `corredor-web` | — | — | Cloudflare Pages (CDN, no machines) |

---

## Secrets Management in Production

Secrets are managed via Doppler and synced to Fly.io on each deploy.

To update a secret in production:

```bash
# Update in Doppler first (UI or CLI)
doppler secrets set KEY=new_value --project corredor --config production

# Then redeploy to pick up the new value
flyctl deploy --app corredor-api
```

To set a Fly secret directly (for emergency use):

```bash
flyctl secrets set MY_SECRET=value --app corredor-api
```

This persists independently of Doppler. Reconcile the Doppler value afterward to avoid drift.

See [docs/runbooks/secrets.md](secrets.md) for the full list of secrets per app.

---

## Fly App Naming Convention

All Fly apps follow: `corredor-{app}-{env}`

| App | Production | Staging | Preview |
|-----|-----------|---------|---------|
| API | `corredor-api` | `corredor-api-staging` | `corredor-api-pr-{n}` |
| Worker | `corredor-worker` | `corredor-worker-staging` | `corredor-worker-pr-{n}` |
| Site | `corredor-site` | `corredor-site-staging` | `corredor-site-pr-{n}` |
| Admin | `corredor-admin` | `corredor-admin-staging` | `corredor-admin-pr-{n}` |

`apps/web` is deployed to **Cloudflare Pages** — it has no Fly app.

---

## Cloudflare Pages (apps/web)

`apps/web` is a static Vite SPA deployed to Cloudflare Pages.

- **Automatic deploys:** Cloudflare Pages has a Git integration. Every push to `main` triggers a new build + deploy.
- **Preview deploys:** Every PR branch gets a preview URL from Cloudflare Pages automatically.
- **Build command:** `pnpm --filter @corredor/web build`
- **Output directory:** `apps/web/dist`

To check the Cloudflare Pages deployment:

1. Log in to the Cloudflare dashboard.
2. Go to **Pages** → `corredor-web`.
3. View deployments, preview URLs, and build logs.

---

## Health Checks

| App | Health Endpoint | Expected Response |
|-----|----------------|-------------------|
| `corredor-api` | `GET /health` | `200 OK` |
| `corredor-worker` | TCP port 9090 | Connection accepted |
| `corredor-site` | `GET /` | `200 OK` |
| `corredor-admin` | `GET /` | `200 OK` |
| `corredor-web` | Cloudflare Pages | Always up (CDN) |

Fly.io checks these every 15 seconds. A machine that fails 3 consecutive health checks is replaced automatically.
