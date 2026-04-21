# Architecture Overview

**Last updated:** 2026-04-20
**Status:** Current

---

## System Architecture

```mermaid
graph TD
    subgraph Client
        UA[User Agent<br/>Browser / iOS / Android]
    end

    subgraph Cloudflare
        WAF[Cloudflare WAF<br/>DDoS + Rate Limit]
        Pages[Cloudflare Pages<br/>apps/web SPA]
        R2[Cloudflare R2<br/>Media Storage]
        Img[Cloudflare Images<br/>Listing Photos]
    end

    subgraph Fly_io["Fly.io — São Paulo (gru) primary, Santiago (scl) secondary"]
        API["apps/api<br/>Hono v4 + tRPC v11<br/>Node 22"]
        Site["apps/site<br/>Next.js 15 ISR<br/>Tenant Websites"]
        Admin["apps/admin<br/>React + Vite<br/>Internal Ops"]
        Worker["apps/worker<br/>BullMQ<br/>Background Jobs"]
    end

    subgraph Neon["Neon — Postgres 16"]
        DB[(Main Branch<br/>Production DB)]
        DBBranch[(pr-{n} Branch<br/>Per-PR Isolated DB)]
    end

    subgraph External
        Redis[Upstash Redis<br/>Job Queue + Rate Limit]
        Portals[8 Portal Adapters<br/>ZonaProp, Argenprop,<br/>Tokko, etc.]
        SES[AWS SES<br/>Bulk Email]
        Postmark[Postmark<br/>Transactional Email]
        Mux[Mux<br/>Video Streaming]
        Stripe[Stripe<br/>Billing]
        Sign[Signaturit<br/>E-Sign]
        AI[Anthropic + OpenAI<br/>LLM Routing]
    end

    UA -->|HTTPS| WAF
    WAF -->|Static SPA| Pages
    WAF -->|API requests| API
    WAF -->|Tenant websites| Site

    Pages -->|tRPC calls| API
    API --> DB
    API --> Redis
    API --> Worker

    Worker --> DB
    Worker --> Redis
    Worker --> Portals
    Worker --> SES
    Worker --> Postmark
    Worker --> AI

    API --> Mux
    API --> Stripe
    API --> Sign
    API --> R2
    API --> Img
```

---

## Apps

| App | Runtime | Deploy Target | Purpose |
|-----|---------|---------------|---------|
| `apps/api` | Node 22 + Hono v4 + tRPC v11 | Fly.io `gru`+`scl` | Main API server. All data mutations, authentication, tRPC procedure routing |
| `apps/web` | React 19 + Vite 6 (SPA) | Cloudflare Pages | Agent-facing CRM UI. Kanban, inbox, calendar, listings, contacts, AI copilot |
| `apps/site` | Next.js 15 (ISR) | Fly.io + CF Pages | Public-facing tenant websites. ISR for listing detail pages |
| `apps/admin` | React + Vite (SPA) | Fly.io `gru` | Corredor internal ops. Tenant management, billing overrides, support tooling |
| `apps/worker` | Node 22 + BullMQ | Fly.io `gru` | Background job processor. Portal sync, email delivery, AI document generation |
| `apps/mobile` | Capacitor shell | App Store / Play Store | iOS + Android shells wrapping `apps/web` PWA |

---

## Packages

| Package | Description |
|---------|-------------|
| `packages/core` | Domain logic, business rules, all tRPC procedure definitions. The canonical layer for CRM operations. |
| `packages/db` | Drizzle ORM schema, SQL migrations, Neon client setup, RLS helpers |
| `packages/ai` | LLM routing across Anthropic and OpenAI, RAG pipeline, pgvector hybrid search |
| `packages/portals` | Typed adapter contracts for all 8 real estate portals (ZonaProp, Argenprop, Tokko, etc.) |
| `packages/ui` | Shared React component library (used by `web`, `site`, `admin`) |
| `packages/documents` | PDF generation, e-sign document templates (listing agreements, contracts) |
| `packages/sdk` | Public TypeScript SDK for partner integrations and webhook consumers |
| `packages/telemetry` | OpenTelemetry instrumentation shared across all Node apps |
| `packages/config` | Shared tsconfig base, ESLint config, and Vitest config |

---

## Key Design Decisions

| Decision | Choice | Reference |
|----------|--------|-----------|
| HTTP framework | Hono v4 (not Express) | [ADR-001 §2](ADR-001-stack-rationale.md#2-api-server-hono-over-express) |
| ORM | Drizzle (not Prisma) | [ADR-001 §3](ADR-001-stack-rationale.md#3-orm-drizzle) |
| Internal API | tRPC v11 (not REST) | [ADR-001 §4](ADR-001-stack-rationale.md#4-api-layer-trpc-v11) |
| Database | Neon Postgres 16 + pgvector + PostGIS | [ADR-001 §5](ADR-001-stack-rationale.md#5-database-postgres-16--pgvector--postgis-neon) |
| Job queue | BullMQ + Upstash Redis | [ADR-001 §6](ADR-001-stack-rationale.md#6-background-jobs-bullmq--upstash-redis) |
| Compute | Fly.io (LATAM regions) | [ADR-002 §1](ADR-002-deployment-topology.md#1-compute-flyio) |
| CDN / storage | Cloudflare R2 + Images + Pages | [ADR-002 §3](ADR-002-deployment-topology.md#3-static-assets--media-cloudflare) |
| Mobile | Capacitor (not React Native) | [ADR-001 §8](ADR-001-stack-rationale.md#8-mobile-capacitor-not-react-native) |

---

## Tenancy Model

Corredor is a **shared-database, row-level-security** multi-tenant SaaS.

- Every table (150+) has a `tenant_id uuid NOT NULL` column.
- Postgres RLS enforces `tenant_id = current_setting('app.tenant_id')` on all tables.
- **No tenant ever sees another tenant's data** — enforced at the database layer, not the application layer.
- The tRPC `tenant` middleware sets `SET LOCAL app.tenant_id = '<uuid>'` at the start of every request transaction.
- This is non-optional: the `tenant` middleware runs before any other tRPC middleware and before any database query.

```
tRPC middleware chain (per request):
  tenant → user → rbac → rateLimit → auditLog → tx → procedure
```

Each real estate agency (inmobiliaria) maps to one tenant. Corredor employees use the `apps/admin` app with elevated access outside of RLS.

---

## Request Lifecycle

A typical agent action (e.g., updating a lead's stage in the kanban):

```
1. Browser (apps/web)
   └─ tRPC mutation via @tanstack/react-query
        │
2. Cloudflare WAF
   └─ DDoS check, rate limit, WAF rules → passes through
        │
3. Fly.io (São Paulo)
   └─ apps/api — Hono HTTP server
        │
4. Hono middleware
   └─ CORS check, request ID, bearer auth extraction
        │
5. tRPC router (packages/core)
   ├─ [tenant] middleware: SET LOCAL app.tenant_id = '<uuid>'
   ├─ [user]   middleware: resolve session → user record
   ├─ [rbac]   middleware: check role permission for mutation
   ├─ [rateLimit] middleware: Redis token bucket check
   ├─ [auditLog]  middleware: write audit record stub
   └─ [tx]     middleware: open Postgres transaction
        │
6. Procedure handler (packages/core)
   └─ Drizzle query via packages/db
        │
7. Neon Postgres 16
   └─ RLS validates tenant_id → row returned/mutated
        │
8. Response: JSON via tRPC → TanStack Query cache update → React re-render
```

For background jobs triggered by mutations, step 6 also enqueues a BullMQ job:

```
6b. Worker (apps/worker) — separate process
    ├─ Portal sync (update listing on ZonaProp/Argenprop)
    ├─ Email delivery (via AWS SES or Postmark)
    └─ AI job (appraisal generation, document extraction)
```

---

## Database Branch Strategy

| Branch | Purpose | Lifecycle |
|--------|---------|-----------|
| `main` | Production | Permanent; migrations run only via CI on merge to main |
| `staging` | Pre-production | Long-lived; reset weekly from main |
| `pr-{n}` | Per-PR isolation | Created on PR open; deleted on merge |
| `dev-{name}` | Developer local | Self-managed |

Each PR gets a fresh Neon branch with a complete copy of the schema and seed data. Migrations are tested against the branch before they can merge. This prevents schema regressions from reaching production.

---

## External Services Summary

| Service | Purpose | Provider |
|---------|---------|---------|
| Database | Postgres 16 + pgvector + PostGIS | Neon |
| Job queue | BullMQ backing store + rate limiting | Upstash Redis |
| Media storage | Listing photos, floor plans, documents | Cloudflare R2 |
| Image transcoding | AVIF/WebP, responsive srcsets | Cloudflare Images |
| CDN | SPA + tenant websites | Cloudflare Pages |
| Email (bulk) | Campaign and marketing email | AWS SES |
| Email (transactional) | Password reset, e-sign, billing | Postmark |
| Video | Virtual tours, meeting recordings | Mux |
| Billing | Subscription management | Stripe |
| E-sign | Listing contracts, buyer agreements | Signaturit |
| AI | Appraisals, email drafts, doc extraction | Anthropic + OpenAI |
| Secrets | All environment variables | Doppler |
| Compute | API, worker, site, admin | Fly.io |
