# Secrets Management Runbook — Corredor CRM

> **Owner:** Security Engineer  
> **Updated:** 2026-04-20  
> **Tool:** Doppler (primary secrets manager), GitHub Secrets (CI/CD tokens only)

---

## The Never-Commit Rule

**Secrets MUST NEVER appear in:**
- Git commits or history (gitleaks scans all history — enforced in CI)
- `.env` files committed to the repo
- Application logs or structured log fields
- HTTP response bodies or error messages
- Issue tracker comments or Slack/Discord messages

Violation = **security incident**. Report immediately to security@corredor.ar.

---

## Doppler Setup

### Projects and Environments

| Project | Purpose |
|---------|---------|
| `corredor-api` | apps/api — Node API server |
| `corredor-worker` | apps/worker — BullMQ worker |
| `corredor-web` | apps/web — SSR web app (public-safe vars only) |
| `corredor-admin` | apps/admin — Admin panel |
| `corredor-ci` | CI/CD — build pipeline tokens (Snyk, Fly.io) |

| Environment | Used When |
|------------|---------|
| `local` | Developer local machines |
| `preview` | PR preview deployments |
| `staging` | `staging.corredor.ar` |
| `production` | `corredor.ar` (production) |

### Developer Setup

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler   # macOS
# Linux: curl -Ls --tlsv1.2 --proto "=https" https://cli.doppler.com/install.sh | sh

# Authenticate
doppler login

# Configure in monorepo root
doppler setup
# → Select project: corredor-api
# → Select config: local

# Run any command with secrets injected
doppler run -- pnpm dev
doppler run -- node dist/index.js
```

---

## GitHub Actions Secrets

Set in **Settings → Secrets and variables → Actions**.

| Secret | Description | Used by |
|--------|-------------|---------|
| `FLY_API_TOKEN` | Fly.io deploy token (org-scoped or app-scoped) | All deploy workflows |
| `FLY_ORG` | Fly.io organization slug (e.g. `corredor`) | Preview deploy |
| `NEON_API_KEY` | Neon API key for branch management | Preview deploy, cleanup |
| `NEON_PROJECT_ID` | Neon project ID | Preview deploy, cleanup |
| `NEON_DB_USER` | Database user for Neon branches | Preview deploy |
| `NEON_DB_NAME` | Database name | Preview deploy |
| `CI_DATABASE_URL` | Neon connection string for CI integration tests | `ci.yml` |
| `DATABASE_URL` | Production Neon connection string (for migrations) | `production-deploy.yml` |
| `SNYK_TOKEN` | Snyk API token for vulnerability scanning | `security.yml` |
| `GITLEAKS_LICENSE` | gitleaks license (optional, open-source version works without) | `security.yml` |
| `DOPPLER_TOKEN` | Service account token for pulling secrets at deploy | Deploy workflows |

---

## Fly.io App Secrets

Set with `fly secrets set KEY=VALUE --app <app-name>`.

> **Preferred:** Use Doppler → Fly.io integration to sync automatically.
> See: https://docs.doppler.com/docs/fly-io

### corredor-api (production)

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Neon pooled connection string (production branch) |
| `DIRECT_DATABASE_URL` | Neon direct connection string (for Drizzle migrations) |
| `SESSION_SECRET` | 256-bit random; invalidates all sessions if rotated |
| `ARGON2_PEPPER` | 128-bit random pepper for Argon2id hashing |
| `TOTP_ENCRYPTION_KEY` | AES-256-GCM key for TOTP secret encryption |
| `REDIS_URL` | Upstash Redis connection string |
| `RESEND_API_KEY` | Resend for transactional email |
| `AWS_SES_ACCESS_KEY_ID` | AWS SES for bulk/marketing email |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS SES secret |
| `POSTMARK_SERVER_TOKEN` | Postmark transactional email fallback |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account for R2/Images |
| `R2_ACCESS_KEY_ID` | R2 storage key |
| `R2_SECRET_ACCESS_KEY` | R2 storage secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `MUX_TOKEN_ID` | Mux video token ID |
| `MUX_TOKEN_SECRET` | Mux video token secret |
| `ANTHROPIC_API_KEY` | Primary AI API key |
| `OPENAI_API_KEY` | OpenAI fallback |
| `STRIPE_SECRET_KEY` | Stripe billing API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago API token |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Mercado Pago webhook HMAC secret |
| `AFIP_CERT` | Base64-encoded PEM certificate for AFIP |
| `AFIP_KEY` | Base64-encoded PEM private key for AFIP |
| `AFIP_CUIT` | Company CUIT number |
| `ZONAPROP_API_KEY` | Zonaprop portal API key |
| `ARGENPROP_API_KEY` | Argenprop portal API key |
| `TOKKO_API_KEY` | Tokko Broker API key (portal sync) |
| `SENTRY_DSN` | Sentry error tracking |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | OpenTelemetry auth headers |
| `INTERNAL_API_SECRET` | HMAC key for worker ↔ API communication |
| `MAPBOX_SECRET_TOKEN` | MapTiler / Mapbox server-side token |
| `SIGNATURIT_API_KEY` | Signaturit e-sign API key |

### corredor-worker (production)

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string |
| `REDIS_URL` | Redis connection string |
| `RESEND_API_KEY` | Email delivery for worker jobs |
| `AWS_SES_ACCESS_KEY_ID` | AWS SES for bulk campaigns |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS SES secret |
| `INTERNAL_API_SECRET` | HMAC key for API communication |

### corredor-web (production)

`VITE_*` variables are build-time. Set them as Fly secrets and reference in Dockerfile build args, or pass as GitHub Actions build args.

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public API URL (e.g. `https://api.corredor.ar`) |
| `VITE_MAPBOX_TOKEN` | MapTiler public token |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_POSTHOG_KEY` | PostHog analytics key |
| `VITE_POSTHOG_HOST` | PostHog host URL |

---

## Rotation Schedule

| Secret | Frequency | Method | Impact on rotation |
|--------|-----------|--------|-------------------|
| `SESSION_SECRET` | 90 days | `openssl rand -hex 32` → Doppler | Invalidates all active sessions |
| `ARGON2_PEPPER` | Emergency only | Full migration required | All passwords must be re-verified |
| `TOTP_ENCRYPTION_KEY` | Emergency only | Requires re-encryption of all TOTP secrets | Coordinate with CTO |
| `STRIPE_SECRET_KEY` | 180 days | Stripe dashboard → regenerate | Brief overlap during transition |
| `ANTHROPIC_API_KEY` | 180 days | Anthropic console | None |
| `OPENAI_API_KEY` | 180 days | OpenAI dashboard | None |
| `AWS_SES_*` | 90 days | IAM → create new key → delete old | Zero downtime if rotated correctly |
| `R2_ACCESS_KEY_ID` | 180 days | Cloudflare dashboard | Zero downtime |
| `FLY_API_TOKEN` | 90 days | `fly tokens create deploy` | CI/CD only |
| `SNYK_TOKEN` | 180 days | Snyk dashboard | CI/CD only |
| Database passwords | 180 days | Neon dashboard → update Doppler | Brief connection disruption |
| Portal API keys | On compromise only | Per-portal dashboard | Sync disruption until updated |

### Rotation Log

| Secret | Last Rotated | Next Due | Rotated By |
|--------|-------------|----------|-----------|
| **Neon main-branch password** | **(PENDING — see RENA-39)** | **Immediate** | **CTO/Security** |
| SESSION_SECRET | (initial setup) | 2026-07-20 | — |
| AWS_SES keys | (initial setup) | 2026-07-20 | — |
| FLY_API_TOKEN | (initial setup) | 2026-07-20 | — |
| STRIPE_SECRET_KEY | (initial setup) | 2026-10-20 | — |
| ANTHROPIC_API_KEY | (initial setup) | 2026-10-20 | — |

> **ACTION REQUIRED (2026-04-23):** The Neon main-branch password was found in `packages/db/.env` on at least one developer machine (RENA-39). Rotate the password immediately:
> 1. Neon Console → Project → Roles → Reset password for `neondb_owner`
> 2. Update `DATABASE_URL` / `DIRECT_DATABASE_URL` in all Fly.io app secrets
> 3. Update `CI_DATABASE_URL` / `DATABASE_URL` GitHub Actions secrets
> 4. Update Doppler production config
> 5. Each developer must re-run `./infra/neon/dev-branch.sh` (their dev branches inherit the new password automatically — only the production secrets need manual updates)

### Standard Rotation Procedure

```bash
# 1. Generate new secret
openssl rand -hex 32

# 2. Update in Doppler for all environments
doppler secrets set SESSION_SECRET=<new-value> --project corredor-api --config prd
doppler secrets set SESSION_SECRET=<new-value> --project corredor-api --config stg

# 3. Trigger rolling deploy (zero-downtime)
fly deploy --app corredor-api --strategy rolling

# 4. Verify the new secret is active (smoke test)
curl -s https://api.corredor.ar/health | jq .

# 5. Revoke old secret at the provider

# 6. Update rotation log in this file
```

---

## Emergency Rotation Procedure

### Scenario: Secret confirmed leaked

**Severity: CRITICAL — act within 15 minutes**

1. **Rotate immediately** via Doppler + deploy:
   ```bash
   doppler secrets set SECRET_NAME=<new-value> --project corredor-api --config prd
   fly deploy --app corredor-api --strategy immediate
   ```

2. **Revoke** old secret at the provider (Stripe, Anthropic, etc.)

3. **Assess impact:** check provider access logs for unauthorized usage in the exposure window

4. **Notify** within 30 minutes if user data may have been accessed:
   - CTO: cto@corredor.ar
   - Legal/DPO: dpo@corredor.ar (if PII involved)
   - Affected users: within 72 hours per Argentine PDPA requirements

5. **Incident report:** open GitHub issue tagged `security-incident`:
   - What secret leaked (do NOT include the secret value)
   - Where it appeared (URL, commit SHA, log timestamp)
   - Exposure window (earliest timestamp to rotation timestamp)
   - Actions taken and timeline
   - Impact assessment

### Scenario: Doppler account compromised

1. Immediately rotate all secrets via provider dashboards (bypass Doppler entirely)
2. Revoke all Doppler service account tokens: `doppler configs tokens revoke`
3. Audit Doppler access logs for unauthorized reads (Doppler → Audit Log)
4. Re-invite team with fresh credentials
5. Full incident report as above

---

## Pre-commit Hook (gitleaks)

gitleaks is **mandatory** for all contributors.

### Installation (Lefthook — preferred)

```bash
# Lefthook is already in devDependencies
pnpm lefthook install
```

### Installation (pre-commit framework)

```bash
pip install pre-commit   # or: brew install pre-commit
pre-commit install
```

### .gitleaks.toml (monorepo root)

```toml
title = "Corredor gitleaks config"

[extend]
useDefault = true

[[rules]]
description = "Fly.io API token"
id = "fly-api-token"
regex = '''FoAqP[0-9a-zA-Z]{100,}'''
tags = ["fly", "token"]

[[rules]]
description = "Neon Postgres connection string"
id = "neon-connection-string"
regex = '''postgres://[^:]+:[^@]+@[^/]+\.neon\.tech'''
tags = ["neon", "database"]

[allowlist]
description = "Known false positives"
paths = [
  '''.gitleaksignore''',
  '''docs/runbooks/secrets.md''',  # This file — example patterns
]
regexes = [
  '''REPLACE_ME''',
  '''<new-value>''',
  '''your-secret-here''',
]
```

### Handling False Positives

Do **NOT** disable gitleaks. Add the specific finding to `.gitleaksignore`:

```
# Format: sha256(secret):file:line
# Get this from gitleaks output or: gitleaks detect --report-format json | jq '.[] | .Fingerprint'
abc123fingerprint:path/to/file:42
```

Any `.gitleaksignore` addition requires Security Engineer review before merge.

---

## Branch Protection (Manual Setup)

Apply in **Settings → Branches → Add rule** for `main`:

- Require status checks to pass before merging:
  - `npm-audit` (security.yml)
  - `gitleaks` (security.yml)
  - `snyk` (security.yml)
  - `ci / Typecheck / Lint / Test / Build`
- Require pull request reviews before merging (1 approval)
- Dismiss stale pull request approvals when new commits are pushed
- Do not allow bypassing the above settings (no admin bypass)

---

## Local Development

Copy `.env.example` to `.env.local` in each app directory and fill in values.
`.env.local` is in `.gitignore` — never commit it.

**Preferred method:** use `doppler run --` instead of `.env.local` for full parity with production secrets.

### Branch-per-Developer Policy (packages/db)

**Policy:** `packages/db/.env` must always point to a personal Neon dev branch, never to the main branch.

| Who | Neon branch |
|-----|-------------|
| Developer (local) | `dev-<username>` — created via `./infra/neon/dev-branch.sh` |
| CI (`ci.yml`) | Dedicated CI branch — connection string in `CI_DATABASE_URL` GitHub secret |
| PR previews | `pr-<number>` — created/deleted automatically by `preview.yml` |
| Production | `main` — connection string in Fly.io secrets only, never on dev machines |

**Setup:** see [Local Setup Runbook — Neon dev branch section](local-setup.md#setting-up-your-personal-neon-dev-branch-required-for-db-package-work).

**Rationale:** `neondb_owner` has full DDL + DML access. A compromised developer machine with main-branch credentials would expose production data directly. Personal branches are isolated clones — an attacker can only reach the developer's own scratch copy.

---

## Access Control

| Role | Doppler Access | Who |
|------|--------------|-----|
| Admin | Full (all projects, all envs) | CTO, Security Engineer |
| Developer | Read: local + preview only | Engineering team |
| CI Service Account | Read: production (via scoped token) | GitHub Actions |
| On-call | Read: all; Write: staging + prod | On-call engineer |

Grant/revoke: Doppler dashboard → Team → Members.

---

## References

- [Doppler docs](https://docs.doppler.com)
- [gitleaks](https://github.com/gitleaks/gitleaks)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- ASVS controls: V2.10, V6.4 — see `docs/compliance/owasp-asvs.md`
- Threat model: `docs/compliance/threat-model.md` (I3 — Secrets in git)
