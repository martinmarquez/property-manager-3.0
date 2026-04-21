# Corredor

Production-grade, multi-tenant real estate CRM SaaS for the Argentine market. Built to compete with Tokko Broker.

![CI](https://github.com/corredor-ar/corredor/actions/workflows/ci.yml/badge.svg)
![Coverage](https://img.shields.io/codecov/c/github/corredor-ar/corredor)
![Lighthouse](https://img.shields.io/badge/lighthouse-%E2%89%A590-brightgreen)

---

## What is Corredor?

Corredor is a full-stack, multi-tenant CRM for Argentine real estate agencies. It handles the full property lifecycle: listings, leads, pipeline, e-sign contracts, AI appraisals, portal sync (ZonaProp, Argenprop, Tokko, and 5 others), and tenant websites — all under strict Postgres row-level security.

**Who it's for:** Real estate agencies (inmobiliarias) operating in Argentina. Each agency is an isolated tenant.

**Stack summary:** React 19 + Vite → Hono + tRPC → Drizzle + Neon (Postgres 16 + pgvector + PostGIS) → Fly.io + Cloudflare.

---

## Monorepo Structure

```
corredor/
├── apps/
│   ├── api/        # Hono v4 HTTP server + tRPC router (Node 22, Fly.io)
│   ├── web/        # React 19 + Vite SPA — main agent-facing app (Cloudflare Pages)
│   ├── site/       # Next.js 15 — tenant public websites (Fly.io + CF Pages ISR)
│   ├── admin/      # React + Vite — Corredor internal ops dashboard (Fly.io)
│   ├── worker/     # BullMQ background jobs — portal sync, email, AI (Fly.io)
│   └── mobile/     # Capacitor shell wrapping apps/web for iOS + Android
├── packages/
│   ├── core/       # Domain logic, business rules, tRPC procedures
│   ├── db/         # Drizzle schema, migrations, Neon client setup
│   ├── ai/         # LLM routing (Anthropic + OpenAI), RAG pipeline, pgvector search
│   ├── portals/    # Portal adapter interfaces + Zod contracts (ZonaProp, Argenprop, etc.)
│   ├── ui/         # Shared React component library (used by web, site, admin)
│   ├── documents/  # PDF generation, e-sign document templates
│   ├── sdk/        # Public TypeScript SDK for partner/webhook integrations
│   ├── telemetry/  # OpenTelemetry instrumentation shared across apps
│   └── config/     # Shared tsconfig, eslint, and tooling config
├── infra/
│   ├── fly/        # Fly.io config (one fly.toml per app)
│   ├── neon/       # Neon branch automation scripts
│   ├── github/     # GitHub Actions workflows
│   └── cloudflare/ # Cloudflare Workers + Pages config
├── docs/
│   ├── architecture/  # ADRs + system overview
│   ├── runbooks/      # Operational runbooks (local setup, deploy, secrets)
│   ├── compliance/    # Security policy, threat model
│   └── api/           # API reference
├── fly.api.toml       # Fly config for apps/api (symlink to infra/fly/)
├── fly.web.toml       # Fly config for apps/web
└── fly.worker.toml    # Fly config for apps/worker
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22.x | Use `nvm use` or `.nvmrc` |
| pnpm | 9.x+ | `npm install -g pnpm` |
| Docker Desktop | Latest | Postgres + Redis + MinIO local services |
| Doppler CLI | Latest | Secrets management: `brew install dopplerhq/cli/doppler` |
| Fly CLI (`flyctl`) | Latest | Deploy + preview envs: `brew install flyctl` |

---

## Quick Start

```bash
# 1. Clone
git clone git@github.com:corredor-ar/corredor.git
cd corredor

# 2. Install dependencies
pnpm install

# 3. Configure local environment
cp .env.example .env.local
# Edit .env.local — defaults match docker-compose.yml, no changes needed to get started

# 4. Start all local services + run migrations + seeds  (single command)
make dev-up

# 5. Start all apps in dev mode
pnpm dev
```

After step 5:
- Web app → http://localhost:5173
- API server → http://localhost:8080
- Admin → http://localhost:5174
- Site (tenant websites) → http://localhost:3000

**Local services started by `make dev-up`:**

| Service | URL | Credentials |
|---------|-----|-------------|
| Postgres 16 | `localhost:5432` | `corredor` / `corredor` |
| Redis 7 | `localhost:6379` | — |
| MinIO S3 API | `http://localhost:9000` | `minioadmin` / `minioadmin` |
| MinIO Console | `http://localhost:9001` | `minioadmin` / `minioadmin` |
| Mailhog (SMTP) | `localhost:1025` | — |
| Mailhog Web UI | `http://localhost:8025` | — |

All emails sent by the API appear in Mailhog — nothing leaves your machine.

For a full walkthrough including Windows/Linux variants, common issues, and database reset: see [docs/runbooks/local-setup.md](docs/runbooks/local-setup.md).

---

## Deeper Docs

| Document | Description |
|----------|-------------|
| [Architecture Overview](docs/architecture/overview.md) | System diagram, request lifecycle, tenancy model |
| [ADR-001: Stack Rationale](docs/architecture/ADR-001-stack-rationale.md) | Why Hono, Drizzle, tRPC, Neon, BullMQ |
| [ADR-002: Deployment Topology](docs/architecture/ADR-002-deployment-topology.md) | Why Fly.io, Cloudflare, Neon branching |
| [Contributing Guide](docs/contributing.md) | Branch naming, commit format, PR checklist |
| [Local Setup Runbook](docs/runbooks/local-setup.md) | Full local dev walkthrough |
| [Deploy Runbook](docs/runbooks/deploy.md) | Deploy, rollback, manual triggers |
| [Secrets Reference](docs/runbooks/secrets.md) | All secrets, where they live, rotation schedule |

---

## Key Commands

```bash
# Dev stack
make dev-up          # Start services + migrations + seeds (full bootstrap)
make dev-down        # Stop services (volumes preserved)
make dev-reset       # Stop services + delete all data volumes (fresh start)
make ps              # Show container status
make logs            # Tail all service logs

# Development
pnpm dev                          # Start all apps
pnpm --filter @corredor/api dev   # Start api only

# Type checking (all packages)
pnpm typecheck

# Lint
pnpm lint

# Tests
pnpm test

# Database
pnpm --filter @corredor/db generate   # Generate migration from schema change
pnpm --filter @corredor/db migrate    # Apply migrations
pnpm --filter @corredor/db studio     # Open Drizzle Studio (DB browser)
make db-shell                         # Open psql shell inside the container
```

Run `make help` to list all available Makefile targets.

---

## Architecture at a Glance

```
Argentine User
     │
     ▼
Cloudflare CDN / WAF
     │
     ├──▶ apps/web  (SPA, Cloudflare Pages)
     │
     └──▶ apps/api  (Hono + tRPC, Fly.io São Paulo)
              │
              ├──▶ packages/core   (domain logic)
              ├──▶ packages/db     (Drizzle → Neon Postgres)
              └──▶ apps/worker     (BullMQ → portals, email, AI)
```

Full diagram with external services: [docs/architecture/overview.md](docs/architecture/overview.md).

---

## License

Proprietary. All rights reserved.
