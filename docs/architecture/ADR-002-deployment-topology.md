# ADR-002: Deployment Topology

**Date:** 2026-04-20
**Status:** Accepted
**Deciders:** CTO (Paperclip agent 3942c6ad)

---

## Context

Corredor targets Argentina-first with LATAM expansion. The deployment topology must satisfy:

- p95 API latency < 200ms (reads) / < 500ms (writes) for Argentine users
- Postgres RLS + pgvector + PostGIS (requires managed Postgres, not cloud-agnostic)
- Per-PR isolated database branches for safe migration testing
- Serverless-adjacent background workers for portal sync, email, AI
- Static tenant websites with ISR on Cloudflare CDN
- Mobile media (listing photos, floor plans, documents) stored at edge
- LATAM data residency preference (Brazil/Argentina nodes)

---

## Decisions

### 1. Compute: Fly.io

**Decision:** All application compute runs on Fly.io.

**Rationale:**
- **LATAM nodes:** Fly has `gru` (São Paulo) and `scl` (Santiago) regions. Primary in `gru`, secondary in `scl` for cross-region failover. Argentine users get ~30ms RTT vs São Paulo vs ~180ms to US-East.
- **Per-app machines:** Each Fly app (`web`, `api`, `worker`, `site`, `admin`) runs on dedicated Fly machines with independent scaling policies.
- **Preview environments:** `fly deploy --app corredor-api-pr-{n}` spins up ephemeral PR environments in < 60s. Paired with Neon branching for isolated DB.
- **Secrets:** Fly secrets + Doppler integration. No `.env` files ever committed.
- **Persistent volumes:** `apps/worker` mounts a Fly volume for BullMQ persistent storage and portal sync state.

**App scaling policy:**

| App | Min machines | Max machines | Region | Notes |
|-----|-------------|-------------|--------|-------|
| `api` | 2 | 10 | gru (primary), scl (secondary) | Auto-scale on CPU > 70% |
| `worker` | 1 | 5 | gru | Scale on queue depth via BullMQ metrics |
| `web` | 0 | 0 | — | Static SPA served from Cloudflare Pages |
| `site` | 2 | 8 | gru, scl | Next.js ISR; CF Pages handles static cache |
| `admin` | 1 | 2 | gru | Internal only |

**Trade-offs:**
- Fly.io is not AWS/GCP. No native integration with AWS SES (fire-and-forget) or S3. Mitigated: all external services called over HTTPS — no VPC peering required.
- Fly's autoscaler is request-count based (not custom metrics). Worker scaling via BullMQ metrics requires a custom Prometheus exporter → Fly autoscaler sidecar. Tracked as Phase B task.

---

### 2. Database: Neon (Postgres 16)

**Decision:** Neon as the Postgres provider across all environments.

**Rationale:**
- **Branching:** Neon's copy-on-write branch model gives every PR a fresh database in ~5 seconds with production schema + seed data. This is non-negotiable for our migration-heavy Phase A work.
- **Autoscale:** Neon scales compute 0.25 CU → 8 CU based on connection load. Branch envs scale to zero between CI runs — near-zero cost.
- **Serverless driver:** `@neondatabase/serverless` provides a WebSocket-compatible Postgres client that works in Cloudflare Workers (future proofing for any edge compute migration).
- **pgvector + PostGIS:** Neon supports both extensions on all tiers. Verified against our schema requirements (HNSW index, geography column type).
- **AWS us-east-1 → São Paulo:** Neon primary in `us-east-1`. Neon's São Paulo region (`sa-east-1`) is GA as of Q1 2026 — migrate production database to `sa-east-1` post-launch for latency compliance.

**Branch strategy:**

| Branch | Purpose | Lifecycle |
|--------|---------|-----------|
| `main` | Production | Permanent; migrations gated by CI |
| `staging` | Pre-prod | Long-lived; reset weekly from main |
| `pr-{n}` | Per-PR isolated testing | Created by CI on PR open; deleted on merge |
| `dev-{name}` | Developer local | Self-managed; created/deleted per dev |

**Migration workflow:**
1. Developer writes Drizzle schema change.
2. `drizzle-kit generate` creates SQL migration file → committed to `packages/db/migrations/`.
3. PR opens → CI creates `pr-{n}` Neon branch → runs `drizzle-kit migrate` against branch.
4. Tests run against isolated branch DB.
5. PR merges → `drizzle-kit migrate` runs against `main` Neon branch in CI.

**Trade-offs:**
- Neon is a single vendor dependency for the most critical service. Mitigated: Drizzle migrations are portable SQL — runnable against any Postgres 16 instance. Escape hatch: provision an RDS instance from the same migration files.
- Neon's `sa-east-1` region is newer; monitor SLA history before production cutover.

---

### 3. Static Assets & Media: Cloudflare

**Decision:** Cloudflare R2 for object storage; Cloudflare Images for listing photos; Cloudflare Pages for `apps/web` and `apps/site`.

**Rationale:**
- **R2 egress cost:** R2 charges zero egress fees. Listing photos are high-traffic (agents browse hundreds per day); R2 makes this cost-predictable vs S3 egress at $0.09/GB.
- **Cloudflare Images:** Automatic AVIF/WebP transcoding + responsive srcset generation. Eliminates a Mux-like media pipeline for images. Listing photos served at edge CDN latency (~5ms to Argentine users from Cloudflare's Buenos Aires PoP).
- **Cloudflare Pages:** `apps/web` is a static SPA deployed to CF Pages — global CDN, unlimited bandwidth, 0ms cold start. `apps/site` (Next.js ISR) uses CF Pages with ISR revalidation tags for tenant websites.
- **Cloudflare WAF:** DDoS protection + rate limiting at the CDN layer before traffic reaches Fly.io. Required by security spec.

**Trade-offs:**
- Cloudflare Images has a 10,000 image limit on free tier; upgrade to Cloudflare Images paid tier (~$5/mo for 100k images) required pre-launch.
- CF Pages ISR for `apps/site` requires Cloudflare Workers runtime. Next.js 15 App Router on CF Pages is GA but has known edge-case limitations (Node.js APIs unavailable in CF Workers). `apps/site` avoids any Node.js-only APIs in the request path.

---

### 4. Email: AWS SES + Postmark

**Decision:** AWS SES for bulk/transactional volume; Postmark for critical transactional email (password reset, e-sign notifications, billing receipts).

**Rationale:**
- **Cost:** SES at $0.10/1000 emails vs Postmark at $1.50/1000. High-volume campaign emails go via SES; critical transactional (< 100/day) go via Postmark for superior deliverability and bounce tracking.
- **Dual-provider:** Postmark handles critical paths; SES handles campaigns. No single provider SPOF for the email channel.
- **DKIM/SPF:** Both providers handle domain verification. Postmark's dedicated IP pools improve deliverability for Argentine ISPs (historically aggressive spam filters).

---

### 5. Video: Mux

**Decision:** Mux for all video transcoding and streaming (virtual tours, meeting recordings).

**Rationale:**
- In-house video transcoding is in the explicit non-goals list. Mux's HLS adaptive streaming, automatic AVIF thumbnail generation, and per-minute pricing align with Corredor's usage pattern (sparse, high-value property tour videos).

---

### 6. Environments

```
local       → Docker Compose (Postgres 16, Redis, MinIO/R2-local, Mailhog)
preview     → Fly.io ephemeral apps + Neon pr-{n} branch (per PR, destroyed on merge)
staging     → Fly.io gru + Neon staging branch (long-lived, weekly DB reset)
production  → Fly.io gru (primary) + scl (secondary) + Neon main branch
```

**DNS:** All environments behind Cloudflare proxy. `corredor.com.ar` → Cloudflare → Fly.io. Tenant custom domains via `*.corredor.com.ar` CNAME + CF custom hostname SSL.

---

### 7. Secrets Management

**Decision:** Doppler for secrets in all environments; Fly secrets for runtime injection.

**Rationale:**
- No `.env` files in git — enforced by `.gitignore` and pre-commit hooks.
- Doppler syncs to Fly secrets on deploy via `doppler run -- fly deploy`.
- Local dev uses `doppler run -- pnpm dev` or `doppler run -- docker-compose up`.
- Secret rotation schedule: API keys every 90 days, signing secrets every 30 days. Doppler tracks rotation history.

---

## Consequences

- `infra/fly/` contains one `fly.toml` per app — checked into git.
- `infra/neon/` contains Neon branching automation scripts used by CI.
- `infra/github/` contains GitHub Actions workflows: `ci.yml` (lint + test + typecheck), `preview.yml` (deploy preview env on PR), `deploy.yml` (deploy staging/prod on main merge).
- All Fly app names follow `corredor-{app}-{env}` convention (e.g., `corredor-api-prod`, `corredor-api-pr-42`).
- Production database is `main` branch on Neon `sa-east-1` — migrate from `us-east-1` before GA.
- Cloudflare R2 bucket names: `corredor-media-{env}`, `corredor-docs-{env}`.
