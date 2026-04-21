# ADR-001: Technology Stack Rationale

**Date:** 2026-04-20
**Status:** Accepted
**Deciders:** CTO (Paperclip agent 3942c6ad)

---

## Context

Corredor is a production-grade, multi-tenant Argentine real estate CRM SaaS competing with Tokko Broker. The stack must support:

- Multi-tenant data isolation (Postgres RLS at scale)
- Real-time features (kanban live updates, inbox typing indicators, live calendar)
- AI/RAG pipeline (pgvector + FTS hybrid, multi-provider routing)
- 8 portal adapters + background sync (BullMQ)
- Mobile (PWA + Capacitor shells)
- LATAM deployment with Argentina-first compliance

The product brief pre-locks most choices; this ADR documents the rationale for each so the team can defend these decisions and identify boundary conditions where they may fail.

---

## Decisions

### 1. Frontend: React 19 + Vite + TypeScript

**Decision:** React 19 with Vite 6 bundler.

**Rationale:**
- React 19 Server Components + Actions provide ergonomic data mutation patterns without extra state-management ceremony.
- Vite is the fastest dev-feedback loop for large SPAs (~10× HMR vs webpack). Critical for developer productivity across 18 modules.
- TypeScript strict mode enforced project-wide — eliminates entire classes of runtime bugs in a 500+ procedure codebase.
- TanStack Router (type-safe, file-based) eliminates string-based route navigation errors.
- TanStack Query provides optimistic updates + cache invalidation critical for kanban drag-to-stage and inbox unread counts.

**Trade-offs:**
- React 19 is recent; minor ecosystem lag on some library compatibility. Mitigated by pinning compatible versions.
- Vite PWA plugin (Workbox) requires careful cache strategy for offline-first views (dashboard, calendar).

---

### 2. API Server: Hono (over Express)

**Decision:** Hono v4 as the HTTP server framework for `apps/api`.

**Rationale:**
- **Performance:** Hono benchmarks at ~3–6× higher req/s than Express on Node.js in CPU-bound scenarios. For a CRM with 60 req/min/user baseline and bursts from BullMQ callbacks, lower per-request overhead directly reduces Fly.io machine costs.
- **TypeScript-native:** Hono's router is fully typed end-to-end. Route handler types, middleware context types, and validator types compose without casting. Express's type definitions are bolted-on via `@types/express` and do not flow through middleware.
- **tRPC compatibility:** `@hono/trpc-server` adapter provides first-class Hono→tRPC bridging. tRPC continues to own all internal procedure routing; Hono handles HTTP concerns (CORS, rate-limit middleware, auth cookie injection, CSRF).
- **Edge-compatible:** Hono runs unchanged on Cloudflare Workers, Deno Deploy, and Bun. This is not a current requirement but preserves optionality if we ever move API workers to CF Workers for latency.
- **Middleware ecosystem:** Built-in middleware covers CORS, rate-limiting (Redis), bearer auth, request ID, logger — less boilerplate than hand-wiring Express middleware.

**Express trade-offs (why rejected):**
- Untyped `req.body`, `req.params` require manual Zod casting at every handler boundary.
- Middleware execution order is implicit (no type-level composition).
- No native streaming primitives; SSE for AI streaming requires manual `res.write()` loops.
- 17-year-old architecture with accumulated API debt.

**Hono risks:**
- Smaller ecosystem than Express. Mitigated: all critical integrations (tRPC, Zod, Drizzle, Sentry) have explicit Hono adapters or are framework-agnostic.
- Less Stack Overflow coverage. Mitigated: team is senior and the Hono docs are excellent.

---

### 3. ORM: Drizzle

**Decision:** Drizzle ORM v0.30+ for all Postgres access.

**Rationale:**
- **Type safety without magic:** Drizzle generates TypeScript types directly from schema definitions — no runtime reflection, no code generation step, no `prisma generate` in CI.
- **SQL-close API:** Drizzle's query builder maps 1:1 to SQL constructs. Developers who know SQL can read Drizzle queries without learning a DSL. Critical for a schema with 150+ tables and complex joins (pipeline funnel, portal sync status, ai_chunk queries).
- **RLS compatibility:** Drizzle does not abstract away `SET LOCAL` session variables needed for our tenant isolation pattern. Prisma and TypeORM both fight you on per-connection settings.
- **Migration control:** `drizzle-kit` generates SQL migration files we version-control and review as PRs. No opaque migration history.
- **Performance:** Drizzle adds ~0.1ms overhead per query vs raw `pg`. Prisma adds ~1–3ms (query engine IPC). At 500ms p95 budget for writes, Drizzle's overhead is negligible.

**Trade-offs:**
- Drizzle has less community content than Prisma. Mitigated: the Drizzle docs are comprehensive for our use cases.
- No built-in pagination helper — implement cursor pagination once in `packages/core`.

---

### 4. API Layer: tRPC v11

**Decision:** tRPC for all internal client↔server communication; OpenAPI 3.1 + REST for public/partner API.

**Rationale:**
- **Type safety across the wire:** tRPC infers router types on the client — no manual type exports, no OpenAPI code-gen, no runtime schema validation on the client. A server-side type change propagates as a TypeScript error in the browser immediately.
- **Zod integration:** tRPC v11's Zod validators run both on the server (input sanitization) and are statically reflected for the auto-generated OpenAPI spec via `trpc-openapi`.
- **Streaming:** tRPC v11 supports SSE-based subscriptions natively. AI copilot streaming, kanban live updates, inbox message push all use this path without WebSocket overhead.
- **Middleware chain:** `tenant → user → rbac → rateLimit → auditLog → tx` composes cleanly as tRPC middleware. Each middleware adds typed context fields accessible in downstream procedures.

**Trade-offs:**
- tRPC is internal-only — mobile Capacitor and third-party integrations need the REST/OpenAPI layer. `trpc-openapi` handles this; REST is a thin adapter over the same procedure logic.
- tRPC v11 is newer; some community plugins still target v10. Locked version in root `package.json`, upgrade path documented.

---

### 5. Database: Postgres 16 + pgvector + PostGIS (Neon)

**Decision:** Neon serverless Postgres 16 with pgvector 0.7 and PostGIS 3.4.

**Rationale:**
- **pgvector HNSW:** HNSW index on `ai_chunk.embedding` provides sub-10ms approximate nearest neighbor at 1M+ rows — required for semantic search latency budget (< 200ms RAG retrieval).
- **PostGIS:** `property.geom` geo queries (comp radius for appraisals, demand heatmap, map view clustering) require PostGIS. No viable alternative in Postgres ecosystem.
- **pg_trgm:** Trigram GIN indexes on contact name/email and property title power the fuzzy search across 18 modules without Elasticsearch.
- **RLS:** Native Postgres RLS is the only viable multi-tenant isolation strategy at our scale without duplicating per-tenant databases. All 150 tables enforce `tenant_id = current_setting('app.tenant_id')`.
- **Neon branching:** Per-PR Neon branches give each developer + each GitHub Actions run an isolated DB with copy-on-write snapshotting. Critical for our migration-heavy schema.

**Trade-offs:**
- Neon cold-start latency (~200ms for autoscale-to-zero). Mitigated: API pool connection keeps the compute warm; autoscale-to-zero only on branch envs.
- pgvector HNSW requires ~8GB RAM for 1M embeddings at vector(1536). Monitor and upgrade Neon compute tier as embedding count grows.

---

### 6. Background Jobs: BullMQ + Upstash Redis

**Decision:** BullMQ on `apps/worker` backed by Upstash Redis.

**Rationale:**
- **Reliability:** BullMQ's job lifecycle (waiting → active → completed/failed → delayed) with configurable retry backoff is precisely what portal sync requires (1m, 5m, 30m, 2h, 8h → dead-letter).
- **Rate limiting:** Per-portal Redis token buckets prevent exceeding ZonaProp/Argenprop API quotas.
- **Upstash:** Serverless Redis with per-request billing. No Redis cluster ops. Upstash's global replication (São Paulo + Miami) reduces BullMQ polling latency from the Fly.io primary.

---

### 7. State Management: TanStack Query (no Redux/Zustand)

**Decision:** TanStack Query for all server state; React context for ephemeral UI state only. No Redux, no Zustand.

**Rationale:**
- 90% of client state in a CRM is server-derived (listings, leads, threads). TanStack Query's cache + invalidation model handles this with zero boilerplate compared to Redux thunks.
- tRPC React client wraps TanStack Query — mutations auto-invalidate dependent queries.
- Zustand would add a third layer between tRPC cache and React context with no clear benefit.

---

### 8. Mobile: Capacitor (not React Native)

**Decision:** Capacitor wrapping the PWA web app for iOS/Android shells.

**Rationale:**
- One codebase. The web app is already responsive and PWA-optimized. Capacitor produces App Store-compliant binaries without a separate React Native codebase.
- Corredor's primary mobile use case is field agents checking listings and inbox — this is read-heavy and works well in a web view.
- Maintained React Native parity would require duplicating 500+ UI components. Not justified for MVP.

**Trade-offs:**
- No native push notification deep links without Capacitor plugins (`@capacitor/push-notifications`). Acceptable — included in Phase H scope.
- Web view performance on older Android devices. Mitigated: Lighthouse Performance ≥ 90 target enforced; React 19 transitions smooth expensive renders.

---

## Consequences

- All packages must export TypeScript source and ship a `tsconfig.json` extending `@corredor/config/tsconfig`.
- Hono adapter for tRPC is installed in `apps/api`; Express is not a dependency.
- Drizzle schema lives exclusively in `packages/db`; no ORM imports in `apps/api` directly — go through `packages/core` domain logic.
- RLS session variable injection (`SET LOCAL app.tenant_id`) is the responsibility of the tRPC `tenant` middleware — not optional, not skippable.
- Every mutation in `packages/core` must be idempotent (idempotency key pattern documented in `docs/runbooks/mutations.md`).
