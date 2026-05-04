# Corredor Deployment Configuration

Infrastructure topology and runbook for Corredor CRM (Corredor project).

## Architecture Overview

| App / Service              | Provider           | Project / App Name           | Region |
|----------------------------|--------------------|------------------------------|--------|
| `apps/api`                 | Fly.io             | `corredor-api-prod`          | `gru` (São Paulo) + `scl` (Santiago) |
| `apps/worker`              | Fly.io             | `corredor-worker-prod`       | `gru`  |
| `apps/web` (SPA)           | Cloudflare Pages   | `corredor-web`               | Global CDN |
| `apps/admin` (SPA)         | Cloudflare Pages   | `corredor-admin`             | Global CDN |
| `apps/site` (Next.js)      | Vercel             | `corredor-site`              | Global CDN |
| `apps/tenant-site` (Next.js ISR) | Cloudflare Pages | `corredor-tenant-sites`  | Global CDN |
| `apps/mobile` (Capacitor)  | TestFlight + Play Console | `ar.corredor.app`     | iOS 16+ / Android API 26+ |
| Database                   | Neon (PostgreSQL)  | `corredor-crm`               | `aws-us-east-2` |
| Media storage              | Cloudflare R2      | `corredor-media-prod`        | — |
| Document storage           | Cloudflare R2      | `corredor-documents-prod`    | — |

## Deployment Triggers

| Event                  | Workflow                          | Effect |
|------------------------|-----------------------------------|--------|
| Push to `main`         | `production-deploy.yml`           | Full production deploy (migrate → API → Worker → Web → Admin → Site → Tenant Sites) |
| Push to `main` (web/mobile paths) | `mobile-ios.yml` + `mobile-android.yml` | Build + upload to TestFlight / Play Console internal track |
| PR opened / updated    | `preview.yml`                     | Ephemeral preview stack per PR (Neon branch + Fly preview + CF Pages preview + Vercel preview) |
| PR closed              | `cleanup-preview.yml`             | Tears down Fly preview app + Neon branch |
| Manual dispatch        | `load-test.yml`                   | k6 load test (smoke or 10k VU) against staging or production |

## Required GitHub Secrets

### Existing

| Secret | Used by |
|--------|---------|
| `FLY_API_TOKEN` | Fly.io deploys |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages + R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages + R2 |
| `DATABASE_URL` | Production Drizzle migrations (pooled) |
| `DIRECT_DATABASE_URL` | Production Drizzle migrations (direct) |
| `CI_DATABASE_URL` | CI test database (Neon branch) |
| `NEON_PROJECT_ID` | Preview branch creation |
| `NEON_API_KEY` | Preview branch creation |
| `VITE_API_URL_PROD` | `apps/web` + `apps/admin` production build |
| `SENTRY_AUTH_TOKEN` | Source map uploads |
| `SENTRY_ORG` | Source map uploads |
| `SENTRY_PROJECT` | Source map uploads |

### New (required for `apps/site` Vercel deployment)

| Secret | How to obtain |
|--------|---------------|
| `VERCEL_TOKEN` | Vercel dashboard → Account → Tokens → create CI token |
| `VERCEL_ORG_ID` | `vercel whoami --token <token>` or project settings |
| `VERCEL_PROJECT_ID_SITE` | Vercel project settings for `corredor-site` |
| `NEXT_PUBLIC_API_URL_PROD` | Production API URL, e.g. `https://corredor-api-prod.fly.dev` |

### Phase G — Electronic invoicing (AFIP WSAA)

| Secret | How to obtain |
|--------|---------------|
| `AFIP_CUIT` | Company CUIT (numeric, no dashes) |
| `AFIP_PRIVATE_KEY` | Base64-encoded RSA private key — see `infra/afip/README.md` |
| `AFIP_CERTIFICATE` | Base64-encoded WSAA signed cert — see `infra/afip/README.md` |
| `AFIP_SANDBOX` | `true` for staging, `false` for production |

### Phase G — Stripe billing

| Secret | How to obtain |
|--------|---------------|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API Keys → Secret key (test mode: `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → Add endpoint → signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_STARTER` | Stripe dashboard → Products → create Starter plan → copy price ID |
| `STRIPE_PRICE_ID_PRO` | Stripe dashboard → Products → create Pro plan → copy price ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API Keys → Publishable key (test: `pk_test_...`) |

Webhook endpoint to register in Stripe dashboard (staging):
`https://corredor-api-prod.fly.dev/webhooks/stripe`
Events to listen: `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`

### Phase G — Mercado Pago billing (AR domestic)

| Secret | How to obtain |
|--------|---------------|
| `MP_ACCESS_TOKEN` | MP Developers → Credentials → Sandbox access token (`TEST-...`) |
| `MP_PUBLIC_KEY` | MP Developers → Credentials → Sandbox public key |
| `MP_WEBHOOK_SECRET` | MP dashboard → Webhooks → configure → copy secret |

Sandbox credentials: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/credentials
MP Webhook endpoint (staging): `https://corredor-api-prod.fly.dev/webhooks/mercadopago`

### Phase H — iOS mobile CI/CD (Fastlane + TestFlight)

| Secret | How to obtain |
|--------|---------------|
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect → Users & Access → Keys → create CI key; copy Key ID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Same page — copy Issuer ID |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Download `.p8` file; base64-encode: `base64 -i AuthKey_<id>.p8` |
| `IOS_MATCH_GIT_URL` | Private repo URL for Fastlane Match certs, e.g. `git@github.com:corredor-org/ios-certs.git` |
| `IOS_MATCH_PASSWORD` | Passphrase used when running `fastlane match init` |
| `APPLE_ID` | Apple ID email for App Store Connect account |
| `APP_STORE_CONNECT_TEAM_ID` | App Store Connect team numeric ID |
| `DEVELOPER_PORTAL_TEAM_ID` | Apple Developer Portal team ID (10-char alphanumeric) |

**One-time bootstrap:**
1. Create App ID `ar.corredor.app` in Apple Developer Portal
2. Run `bundle exec fastlane match init` from `apps/mobile/` to create the certs repo
3. Run `bundle exec fastlane match appstore` to generate + store distribution cert + provisioning profile
4. Add all secrets above to GitHub repository secrets

### Phase H — Android mobile CI/CD (Fastlane + Play Console)

| Secret | How to obtain |
|--------|---------------|
| `ANDROID_KEYSTORE_BASE64` | Generate: `keytool -genkey -v -keystore corredor.jks -alias corredor -keyalg RSA -keysize 2048 -validity 10000`; then `base64 -i corredor.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Password set during keytool generation |
| `ANDROID_KEY_ALIAS` | Alias set during keytool generation (e.g. `corredor`) |
| `ANDROID_KEY_PASSWORD` | Key password set during keytool generation |
| `PLAY_STORE_JSON_KEY_DATA` | Google Play Console → Setup → API Access → create service account → download JSON; base64-encode |

**One-time bootstrap:**
1. Create app `ar.corredor.app` in Google Play Console
2. Create service account in Google Cloud Console with `Release Manager` role on the Play app
3. Grant the service account access in Play Console → Setup → API Access
4. Store the keystore securely (e.g. 1Password) — it cannot be regenerated if lost

### Phase H — Load testing (k6)

| Secret | How to obtain |
|--------|---------------|
| `STAGING_API_URL` | Staging API base URL, e.g. `https://corredor-api-staging.fly.dev` |
| `STAGING_DATABASE_URL` | Neon staging branch pooled connection string |
| `STAGING_LOAD_TEST_TOKEN` | JWT for the `k6@corredor.ar` load-test user (create via `/api/auth/login`) |
| `PROD_LOAD_TEST_TOKEN` | JWT for load-test user on prod (use with caution — rate limits apply) |

## Infra Config Files

| File | Purpose |
|------|---------|
| `infra/fly/api.fly.toml` | Fly.io config for `apps/api` (gru + scl regions, auto-stop) |
| `infra/fly/worker.fly.toml` | Fly.io config for `apps/worker` (1 GB RAM — Playwright/Chromium) |
| `infra/cloudflare/wrangler.jsonc` | R2 bucket bindings + Phase G tenant-sites Pages config |
| `infra/cloudflare/cache-rules.md` | Phase H CDN cache rules + image optimization guide |
| `apps/site/vercel.json` | Vercel project config for `apps/site` (Next.js marketing site) |
| `infra/neon/branch.sh` | Creates per-PR Neon branch; outputs `db_url` and `db_url_pooled` |
| `infra/neon/dev-branch.sh` | Creates a personal dev Neon branch |
| `infra/afip/README.md` | AFIP WSAA certificate generation and sandbox setup guide |
| `infra/k6/docker-compose.yml` | Self-hosted k6 cluster (k6 + InfluxDB + Grafana) |
| `infra/k6/scenarios/smoke.js` | 5 VU smoke test — validates all critical endpoints |
| `infra/k6/scenarios/load-10k.js` | 10k VU GA load test (GA criterion: p95 < 500ms) |
| `infra/k6/seed/seed.sql` | Seeds 1M listings + 100k contacts in staging DB |
| `apps/mobile/capacitor.config.ts` | Capacitor shell configuration (appId, webDir, plugins) |
| `apps/mobile/fastlane/Fastfile` | Fastlane lanes: ios:beta, android:beta |

## Vercel Project Bootstrap (one-time, run once per environment)

```bash
# From apps/site
cd apps/site
pnpm dlx vercel link --yes          # links to Vercel project corredor-site
pnpm dlx vercel env pull .env.local # pulls environment variables locally
```

## Manual Deploy Commands

```bash
# API (production)
flyctl deploy --config infra/fly/api.fly.toml --remote-only

# Worker (production)
flyctl deploy --config infra/fly/worker.fly.toml --remote-only

# Web SPA (production)
pnpm --filter @corredor/web build
pnpm dlx wrangler pages deploy apps/web/dist --project-name corredor-web

# Admin SPA (production)
pnpm --filter @corredor/admin build
pnpm dlx wrangler pages deploy apps/admin/dist --project-name corredor-admin

# Site — Next.js (production)
cd apps/site
pnpm dlx vercel pull --yes --environment=production --token=$VERCEL_TOKEN
pnpm dlx vercel build --prod --token=$VERCEL_TOKEN
pnpm dlx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN

# Run DB migrations
pnpm --filter @corredor/db migrate
```

## Worker VM Sizing Note

`apps/worker` includes Playwright + Chromium for server-side PDF generation (e-sign document rendering). The Fly VM is sized at `shared-cpu-2x / 1024 MB` to accommodate two concurrent Chromium instances (~450 MB each). Increase to `2048 MB` if OOM errors appear under load.
