# Corredor Deployment Configuration

Infrastructure topology and runbook for Corredor CRM (Corredor project).

## Architecture Overview

| App / Service              | Provider           | Project / App Name           | Region |
|----------------------------|--------------------|------------------------------|--------|
| `apps/api`                 | Fly.io             | `corredor-api-prod`          | `gru` (São Paulo) |
| `apps/worker`              | Fly.io             | `corredor-worker-prod`       | `gru`  |
| `apps/web` (SPA)           | Cloudflare Pages   | `corredor-web`               | Global CDN |
| `apps/admin` (SPA)         | Cloudflare Pages   | `corredor-admin`             | Global CDN |
| `apps/site` (Next.js)      | Vercel             | `corredor-site`              | Global CDN |
| `apps/tenant-site` (Next.js ISR) | Cloudflare Pages | `corredor-tenant-sites`  | Global CDN |
| Database                   | Neon (PostgreSQL)  | `corredor-crm`               | `aws-us-east-2` |
| Media storage              | Cloudflare R2      | `corredor-media-prod`        | — |
| Document storage           | Cloudflare R2      | `corredor-documents-prod`    | — |

## Deployment Triggers

| Event                  | Workflow                          | Effect |
|------------------------|-----------------------------------|--------|
| Push to `main`         | `production-deploy.yml`           | Full production deploy (migrate → API → Worker → Web → Admin → Site → Tenant Sites) |
| PR opened / updated    | `preview.yml`                     | Ephemeral preview stack per PR (Neon branch + Fly preview + CF Pages preview + Vercel preview) |
| PR closed              | `cleanup-preview.yml`             | Tears down Fly preview app + Neon branch |

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

## Infra Config Files

| File | Purpose |
|------|---------|
| `infra/fly/api.fly.toml` | Fly.io config for `apps/api` |
| `infra/fly/worker.fly.toml` | Fly.io config for `apps/worker` (1 GB RAM — Playwright/Chromium) |
| `infra/cloudflare/wrangler.jsonc` | R2 bucket bindings + Phase G tenant-sites Pages config |
| `apps/site/vercel.json` | Vercel project config for `apps/site` (Next.js marketing site) |
| `infra/neon/branch.sh` | Creates per-PR Neon branch; outputs `db_url` and `db_url_pooled` |
| `infra/neon/dev-branch.sh` | Creates a personal dev Neon branch |
| `infra/afip/README.md` | AFIP WSAA certificate generation and sandbox setup guide |

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
