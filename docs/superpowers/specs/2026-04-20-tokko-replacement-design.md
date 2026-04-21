# Tokko Replacement — Product Design Spec

**Date:** 2026-04-20
**Status:** Design locked, pending user review
**Scope:** Full Tokko Broker replacement with feature parity at launch + differentiators
**Owner:** mmarquez@gmail.com

---

## 0. Context & Non-Goals

### Context
Tokko Broker is Argentina's dominant real estate CRM. A 16-note teardown (see `research/tokko/findings.md` and `research/tokko/notes/01`–`16`) catalogued its feature surface, six security issues (JWT in URL, `eval()` on API responses, GET for mutations, etc.), UX friction points, and 16 competitive gaps (G1–G16). This spec defines a multi-tenant SaaS that matches Tokko's functional surface at launch and exceeds it on UX, AI, portal sync, website builder, documents, and analytics.

### Target users
- Independent brokers (solo)
- Agencies (2–50 agents, multi-branch)
- Franchises / networks (white-label, cobrokering)
- LATAM-ready after Argentina launch (MX, CL, UY, CO)

### Locked scope
- **Feature parity** with Tokko at launch. Nothing is deferred — only sequenced.
- **Spanish UI labels, English URL slugs** (e.g. `/properties`, `/leads`, `/calendar`).
- **Argentina-first**: AFIP invoicing, Ley 25.326 (data protection), Ley 25.506 (e-sign), CABA + provincial regs.
- **Multi-tenant**: agencies → branches → users, plus white-label domains.
- **Listings + CRM are equal pillars** (Tokko treats CRM as second-class; we don't).
- **Hybrid portal auto-sync** with per-portal overrides.
- **PWA + native shells** (Capacitor) day 1.

### Non-goals (explicit)
- No Web3, blockchain, tokens, smart contracts, or escrow crypto.
- No on-chain identity, wallet auth, or decentralized storage.
- No generic "property marketplace" — this is a B2B SaaS for real estate professionals.
- No in-house e-sign stack (use Signaturit + DocuSign).
- No in-house video transcoding (use Mux).
- No in-house email delivery infra (AWS SES + Postmark).

---

## 1. Scope & Module Map

### Top-level navigation (Spanish labels / English slugs)

| Label (ES) | Slug (EN) | Purpose |
|---|---|---|
| Panel | `/dashboard` | Home, KPIs, today's agenda, alerts |
| Propiedades | `/properties` | Listings CRUD, media, features, valuations |
| Contactos | `/contacts` | People + companies, unified profiles |
| Oportunidades | `/leads` | Multi-pipeline deal/lead management |
| Consultas | `/inquiries` | Buyer/renter search requests with matching engine |
| Calendario | `/calendar` | Visits, meetings, tasks, reminders |
| Bandeja | `/inbox` | Unified inbox: email + WhatsApp + portal msgs + SMS + chat widget |
| Tareas | `/tasks` | Todos, follow-ups, SLA timers |
| Documentos | `/documents` | Templates, generated docs, e-sign workflow |
| Reservas | `/reservations` | Reserva → Boleto → Escritura lifecycle |
| Tasaciones | `/appraisals` | CMA, valuation reports, market comps |
| Difusión | `/publishing` | Portal publishing, per-portal overrides, status |
| Mapa | `/map` | Geo view of portfolio + demand heatmap |
| Reportes | `/reports` | Operational + strategic analytics |
| Sitio | `/site` | Agency website builder (Puck-based) |
| Marketing | `/marketing` | Email/WhatsApp campaigns, saved searches, nurture |
| IA | `/ai` | Copilot, semantic search, generators, insights |
| Configuración | `/settings` | Tenant, users, pipelines, custom fields, integrations, billing |

### Configuración sub-panels
`/settings/organization`, `/settings/users`, `/settings/pipelines`, `/settings/custom-fields`, `/settings/integrations`, `/settings/billing`.

### Propiedades subpages (preserved from Tokko)
Listado, Nueva, Editar, Medios, Etiquetas, Mapa, Borradas, Historial, Análisis.

### Contactos subpages
Personas, Empresas, Segmentos, Importar, Duplicados.

### Oportunidades subpages
Tablero (kanban), Lista, Embudo, Conversiones, Cerradas.

**Everything Tokko has is preserved** — top-bar Favoritos becomes `/favorites` (addressable, unlike Tokko), Chat folds into `/inbox`, Options become `/settings/notifications` with proper UX (not 48 checkboxes).

---

## 2. Architecture & Stack

### Frontend
- **Framework**: React 19 + Vite + TypeScript (strict)
- **Routing**: TanStack Router (type-safe, nested layouts)
- **Data**: TanStack Query + tRPC client
- **UI**: shadcn/ui + Radix primitives + Tailwind v4
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table v8
- **Maps**: MapLibre GL + OpenStreetMap + MapTiler tiles
- **Charts**: Recharts + visx for custom
- **Rich text**: TipTap (descriptions, email composer)
- **PWA**: Vite PWA plugin + Workbox (offline for viewed entities, background sync for writes)
- **Native shells**: Capacitor (iOS + Android) — shares codebase, wraps PWA, adds push + camera + contacts
- **i18n**: FormatJS / react-intl, ES-AR primary, ES, PT-BR, EN scaffolded

### Backend
- **Runtime**: Node 22 + TypeScript (strict), ESM
- **API**: tRPC for internal (web + mobile), REST + OpenAPI 3.1 for public/partner API day 1
- **Realtime**: native WebSocket server + Redis pub/sub fan-out
- **Queues**: BullMQ on Redis (sync jobs, email, LLM calls, portal pushes)
- **Search**: Postgres FTS + pgvector hybrid (Reciprocal Rank Fusion merge)
- **ORM**: Drizzle (typed schema, migrations, zero runtime)
- **Validation**: Zod everywhere (inputs, outputs, LLM structured outputs)
- **Auth**: Lucia-style session auth + Argon2id + TOTP 2FA + WebAuthn passkeys + SSO (SAML/OIDC) for enterprise

### Data plane
- **Primary**: Postgres 16 (Neon) with RLS per tenant
- **Extensions**: `pgvector`, `pg_trgm`, `pgcrypto`, `uuid-ossp`, `postgis` (geo)
- **Cache / pub-sub / queues**: Redis (Upstash)
- **Object storage**: Cloudflare R2 (no egress fees)
- **Images**: Cloudflare Images (responsive variants, watermarks)
- **Video**: Mux (HLS, thumbnails, captions)
- **Email**: AWS SES (transactional + campaigns) + Postmark (fallback)
- **SMS**: Twilio
- **WhatsApp**: 360dialog (default, cheaper), Meta Cloud API (enterprise)

### Infra
- **App hosting**: Fly.io (multi-region, primary São Paulo + secondary Santiago)
- **Edge/CDN**: Cloudflare (WAF, DDoS, custom domains for white-label)
- **Observability**: Sentry + OpenTelemetry → Grafana Cloud (metrics, logs, traces) + PostHog (product analytics)
- **CI/CD**: GitHub Actions → Fly deploys, preview envs per PR
- **Monorepo**: Turborepo + pnpm workspaces

### Package layout (monorepo)
```
apps/
  web/              # React SPA (PWA)
  mobile/           # Capacitor shells
  api/              # Node tRPC + REST server
  worker/           # BullMQ consumers
  site/             # Next.js website builder runtime
  admin/            # Internal tenant-admin console
packages/
  db/               # Drizzle schema + migrations
  core/             # Domain logic, zero deps on transport
  ai/               # LLM routing, RAG, prompts, eval harness
  portals/          # Portal adapters (ZonaProp, Argenprop, MeliInm, etc.)
  documents/        # Template engine + e-sign adapters
  ui/               # shadcn components, theme tokens
  sdk/              # Public REST SDK (auto-generated)
  config/           # tsconfig, eslint, tailwind presets
  telemetry/        # OTel + Sentry wrappers
```

### Architectural principles
- **Domain events everywhere**: every state change emits an event → realtime + audit + webhooks + analytics consumers.
- **Adapter pattern for externalities**: portals, e-sign, SMS/WA/email, LLM providers all behind stable interfaces.
- **Optimistic concurrency** on writes with ETag / `updated_at` guard.
- **Idempotency keys** on every mutation (portal pushes, payments, email sends).
- **Never trust the client**: RLS + explicit tenant scope in every query.

---

## 3. Data Model

### Top-level entities (15 groups)

**Tenancy**: `tenant`, `branch`, `user`, `role`, `user_role`, `api_key`, `webhook`, `audit_log`, `feature_flag`.

**Contacts**: `contact` (person OR company via `kind`), `contact_relationship` (many-to-many, typed: owner-of, tenant-of, lawyer-of, …), `contact_tag`, `segment`, `segment_member`.

**Properties**: `property`, `property_owner` (M:N with % share), `property_media` (image/video/plan/doc), `property_feature` (typed key/value), `property_tag`, `property_custom_tag_group`, `property_custom_tag`, `property_history`, `property_price_history`, `property_soft_delete`.

**Transactions**: `operation` (sale/rent/temp-rent/commercial-rent/…), `listing` (property + operation + price + status), `reservation`, `boleto` (preliminary sale contract), `escritura` (deed), `commission_split` (for cobrokering).

**Pipelines**: `pipeline` (user-defined), `pipeline_stage`, `lead`, `lead_stage_history`, `inquiry` (buyer/renter criteria), `inquiry_match` (property ↔ inquiry scored matches).

**Calendar/Tasks**: `calendar_event`, `event_type`, `event_attendee`, `task`, `task_reminder`.

**Inbox/Messaging**: `inbox_thread`, `inbox_message`, `channel_account` (WhatsApp number, email inbox, portal creds), `message_template`, `auto_assignment_rule`, `sla_policy`.

**Documents**: `doc_template`, `doc_document`, `doc_field_binding`, `doc_signature_request`, `doc_signer`, `doc_audit_trail`.

**Portals**: `portal_connection`, `portal_publication`, `portal_override` (per-portal field overrides), `portal_sync_job`, `portal_lead` (inbound leads attributed to portal).

**Appraisals**: `appraisal`, `appraisal_comp` (comparables), `appraisal_report`.

**Marketing**: `campaign`, `campaign_recipient`, `saved_search`, `nurture_flow`, `nurture_step`, `nurture_enrollment`.

**Website (Sitio)**: `site`, `site_page`, `site_block`, `site_theme`, `site_domain`, `site_form_submission`.

**AI/RAG**: `ai_document` (chunked knowledge), `ai_embedding` (pgvector), `ai_conversation`, `ai_message`, `ai_tool_call`, `ai_eval_run`.

**Billing**: `subscription`, `plan`, `invoice` (AFIP CAE), `payment`, `usage_counter`.

**Analytics**: materialized views per report (`mv_pipeline_conversion`, `mv_listing_performance`, `mv_agent_productivity`, …).

### Key design decisions
- **`contact` unifies person + company** with `kind` discriminator and polymorphic relationships.
- **Property ownership is M:N** (`property_owner` with ownership %), supports coop/inheritance cases Tokko can't.
- **Pipelines are per-tenant and multiple**: agency can have "Ventas", "Alquileres", "Desarrollos" pipelines in parallel. Each has its own stages.
- **Custom fields are typed** (`text|number|date|enum|multi-enum|currency|file`) with per-tenant definitions in `property_feature` / equivalent tables on each entity.
- **Everything soft-deletes** (`deleted_at`) with 90-day hard-delete grace period + "Borradas" recovery UI.
- **Audit trail**: every mutation writes `audit_log (tenant_id, user_id, entity_type, entity_id, action, diff jsonb, at)`.
- **RLS policy**: every table has `tenant_id uuid not null`; policy enforces `tenant_id = current_setting('app.tenant_id')::uuid`.

---

## 4. AI / RAG

### Capability surface (11 LLM features at launch)
1. **Semantic property search** — "departamento luminoso cerca de parques en Palermo bajo $200k" across listings.
2. **Lead ↔ property match explanations** — "Why is this lead a good fit? Which properties match and why?"
3. **Description generator** — from structured fields to marketing copy (ES/EN/PT), tone-adjustable.
4. **Email/WhatsApp drafter** — context-aware reply suggestions in the inbox.
5. **Meeting / call note summarizer** — transcribe (Whisper) + structured extract (action items, next steps, updated lead fields).
6. **Document Q&A** — ask questions over uploaded titles, building regulations, contracts.
7. **Appraisal assistant** — suggests comps, drafts CMA narrative, flags outliers.
8. **Pipeline insights** — weekly narrative "these 3 leads are stalled, likely reasons, suggested actions".
9. **Portal listing optimizer** — rewrite for each portal's strengths + flag missing required fields.
10. **Duplicate detector** — contacts + properties, with suggested merges.
11. **Copilot (ask anything)** — agent with tools to query CRM, compose messages, create tasks (human confirmation required for side-effects).

### Architecture
- **Multi-provider routing**: Anthropic (primary) + OpenAI (fallback) + Gemini (long-context eval). Per-feature model pinning. Cost/latency budgets enforced.
- **Retrieval**: pgvector (1536-d OpenAI-small) + Postgres FTS (tsvector) → hybrid via Reciprocal Rank Fusion (k=60).
- **Chunking**: structure-aware for documents (heading-based), semantic for free text. 512-token chunks, 64-token overlap.
- **Structured outputs**: every LLM call returns Zod-validated JSON; no free-text parsing.
- **Tool use**: agent tools are thin wrappers over tRPC procedures (same validation, same RLS).
- **Guardrails**: PII scrubber before logging, prompt-injection filter on user uploads, denylist for financial/legal advice phrasings.
- **Eval harness** (`packages/ai/eval`): golden-set per feature, regression runs per PR, human-labeled samples per month.
- **Cost controls**: per-tenant monthly token budget, graceful degradation (smaller model → cached → disabled feature).
- **Privacy**: tenant data never trains vendor models (zero-retention agreements). Embeddings stored in tenant's logical DB scope.

---

## 5. Portals & Unified Inbox

### Portals
**Adapter contract** per portal (`packages/portals/<portal>/adapter.ts`):
- `publish(listing) → publicationId`
- `update(publicationId, diff) → void`
- `unpublish(publicationId) → void`
- `syncStatus(publicationId) → {status, views, inquiries}`
- `fetchInboundLeads(since) → Lead[]`

**Launch portals**: ZonaProp, Argenprop, MercadoLibre Inmuebles, Remax Network, Inmuebles24 (MX), Properati, plus **generic XML feed** and **Idealista** (ES-ready for LATAM reach).

**Per-portal overrides**: `portal_override` lets user override title/description/price/featured-flag/photos-order for a specific portal without mutating the canonical listing.

**Sync**: scheduled background jobs (BullMQ) with exponential backoff on failures. Sync health per listing per portal is visible on the Difusión page with clear error messages.

**Inbound leads**: polling + webhook where supported. Portal leads auto-attributed to `portal_lead` → converted to `lead` with source tracking.

### Unified Inbox
**Channels (day 1)**: Email (IMAP/SMTP + Gmail/Outlook OAuth), WhatsApp Business (360dialog/Meta), SMS (Twilio), Portal messages (via adapters), Site chat widget, Instagram DM, Facebook Messenger, Internal notes.

**Features**:
- Single thread view across channels for the same contact.
- Auto-assignment rules (round-robin, by property zone, by language, by time-of-day).
- SLA timers with escalation to branch manager.
- Canned responses + AI-drafted replies (see Section 4).
- Templates with variable injection (contact name, property title, viewing time).
- Attachments, read receipts where supported, typing indicators.
- Full-text + semantic search across history.

### Difusión (`/publishing`)
Dedicated module to bulk-publish listings to portals, diff pending changes, view sync errors, compare portal performance, and manage portal credentials. Addresses Tokko pain point G5.

---

## 6. Documents & E-Sign

### Document lifecycle
**Reserva** (offer + deposit) → **Boleto** (preliminary contract with milestones) → **Escritura** (deed, escribano-signed externally).

### Template engine
- Handlebars-like syntax over typed field bindings (`{{property.address}}`, `{{contact.full_name}}`).
- Clause library with branches (`{{#if operation.kind == 'alquiler'}}`).
- Version-controlled templates per tenant; audit who edited what.
- PDF generation server-side (Playwright → PDF, honors print CSS).

### E-sign
- **Primary**: Signaturit (Argentina-compliant, Ley 25.506 advanced e-signature).
- **Enterprise option**: DocuSign.
- Full audit trail (IP, device, timestamp, biometric consent where required) stored in `doc_audit_trail`.
- Reminders + expiration + multi-signer sequential/parallel.

### Compliance
Ley 25.506 compliance mapping documented per document type. CABA/province-specific clauses flagged in template library.

---

## 7. Security, Multi-Tenancy & Compliance

### Auth
- Argon2id password hashing (memory-hard params).
- Session cookies (HttpOnly, Secure, SameSite=Lax, rotating).
- TOTP 2FA (required for admins, opt-in for agents).
- WebAuthn passkeys (preferred).
- SSO (SAML 2.0 + OIDC) for enterprise tier.
- API keys per integration (scoped, rotatable, hashed at rest).

### Authorization
- RBAC: `owner`, `admin`, `manager`, `agent`, `assistant`, `read-only`, `external-collaborator`.
- Resource-level scopes (branch, pipeline, listing).
- Explicit "view all" vs "view own" at role level.

### Multi-tenancy
- Postgres RLS on every table, enforced at connection level (`SET app.tenant_id = …` at request start).
- Tenant-scoped encryption keys for sensitive fields (documents, contact national IDs).
- Per-tenant subdomain + optional custom domain (white-label).

### Compliance
- **Ley 25.326** (AR data protection): DSR (access, rectify, delete, portability) endpoints, data-processing register, DPA templates, 90-day retention for deleted PII.
- **Ley 25.506** (e-signature): tracked per document.
- **AFIP**: CAE invoice emission + electronic invoice delivery, monotributo + IVA support.
- **WCAG 2.2 AA** target for web app.
- **SOC 2-ready** posture from day 1 (control mapping, logging, access reviews) even if formal audit comes later.

### Security operations
- Dependabot + Snyk in CI.
- Secrets in Fly secrets + 1Password for humans; never in env files committed.
- Penetration test before GA.
- Bug bounty program (HackerOne) post-GA.
- Incident response runbook.
- No `eval()`, no JWT in URLs, no GET-for-mutations — explicitly addresses the six Tokko security issues catalogued.

---

## 8. PWA, Offline, Realtime & Mobile

### PWA
- Installable, app-like shell.
- Workbox strategies: stale-while-revalidate for listings/contacts, network-first for inbox, cache-first for assets.
- Background sync for writes made offline (queue → flush when online).
- Push notifications via Web Push (VAPID).

### Native shells (Capacitor)
- iOS + Android from day 1.
- Native features: camera (listing photos direct-upload), contacts (CRM sync opt-in), push (APNs/FCM), deep links, share sheet integration, geolocation.
- Same React codebase; Capacitor plugins behind feature-detect.

### Realtime
- WebSocket subscriptions per entity/channel: inbox thread, lead board, dashboard KPIs, portal sync status.
- Server fans out through Redis pub/sub; clients subscribe by topic (`tenant:<id>:inbox:<thread>`).
- Fallback to SSE + long-poll.

### Accessibility & i18n
- WCAG 2.2 AA minimum.
- Keyboard-navigable throughout; skip links; focus traps in modals; ARIA live regions for realtime updates.
- ES-AR primary. ES (generic LATAM), PT-BR, EN, MX-ES scaffolded.
- Currency + number + date formats per locale.

---

## 9. Website Builder (Sitio)

### Stack
- Next.js 15 runtime, deployed to Cloudflare Pages with ISR.
- Puck as the block editor (open-source, React, drag-drop).
- Block library: Hero, Listing grid, Listing detail, Contact form, Agent bio, Testimonials, Map, Blog, CTA, Footer.

### Features
- 5 themes at launch (Clásico, Moderno, Minimal, Lujo, Urbano), each with design tokens.
- Per-tenant custom domain + automatic SSL (CF).
- SEO: per-page title/description/OG, auto-sitemap, structured data (RealEstateAgent, Property).
- Lead capture forms write directly to `lead` with source=`site`.
- Multilingual sites (per-page language variant).
- Live preview on edit.
- Publish / staging environments.

---

## 10. Reportes & Analíticas

### Operational reports (12)
Listado activo, Listado vencido, Leads por etapa, Leads por fuente, Conversión por agente, Tiempo promedio por etapa, Visitas agendadas vs realizadas, Tareas vencidas, Publicaciones por portal, Errores de sincronización portal, Comisiones pagadas, Facturación por período.

### Strategic dashboards (10)
Funnel conversion, Agent productivity leaderboard, Listing performance (views/inquiries/offers), Portal ROI (cost vs leads), Pipeline velocity, Revenue forecast (weighted pipeline), Churn/retention (contacts re-engaged), Market share (zone analysis), AI usage & value, Cohort analysis (leads by acquisition month).

### Implementation
- Materialized views refreshed on domain events.
- `/reports` landing shows pinned dashboards; each drills to detail.
- CSV + Excel export on every view.
- Scheduled email digests per user (daily/weekly).

---

## 11. Pricing, Billing & Onboarding

### Tiers (monthly, USD; ARS at spot)
- **Solo** — 1 user, 50 listings, 500 contacts, core CRM, 1 portal, PWA, basic AI. $29/mo.
- **Pro** — 10 users, 500 listings, 5k contacts, all portals, documents, e-sign (5/mo), full AI, website. $99/mo + $15/extra user.
- **Agencia** — 50 users, unlimited listings/contacts, unlimited portals, unlimited e-sign, white-label site, custom domain, API, advanced analytics. $299/mo + $12/extra user.
- **Enterprise** — SSO, SAML, dedicated region, SLA, custom integrations, DPA. Custom pricing.

### Billing
- **Stripe** (international cards) + **Mercado Pago** (AR local + Rapipago/Pago Fácil).
- **AFIP** CAE invoicing via Afip.ts or TusFacturas adapter.
- Usage-metered add-ons: SMS, WhatsApp, AI tokens, extra storage.
- Proration on plan changes; dunning flow for failed payments.

### Onboarding
- 14-day trial, no card required.
- Guided setup wizard: tenant info → branding → pipeline preset (Ventas / Alquileres / Mixto) → portal connections → CSV import of contacts + listings → invite team.
- CSV importers with column mapping + dedup preview.
- Tokko migration: importer for Tokko CSV exports + API (where possible) mapping to our schema. Priority path given Tokko is the primary source of converts.
- Interactive product tour (Driver.js) on first login.
- In-app chat support (Crisp) + knowledge base (Mintlify).

---

## 12. Phased Roadmap (7 phases, ~40 weeks)

> Nothing is deferred. Phases are sequencing of feature-parity + differentiators. Each phase ships production-grade, tested, observable, and usable by a subset of customers.

### Phase A — Foundations (weeks 1–4)
Repo scaffolding, CI/CD, monorepo + Turborepo, Drizzle schema skeleton, auth (email+password+2FA+passkeys), tenant/branch/user CRUD, RLS harness, base UI shell, i18n, observability. **Exit:** can create tenants, invite users, sign in, see empty app shell.

### Phase B — Listings & Contacts Core (weeks 5–10)
Properties CRUD + media (R2 + CF Images), property_owner M:N, features, tags, custom tag groups, borradas/recovery, history. Contacts CRUD (person + company), relationships, segments, import (CSV + Tokko export), dedup. Property + contact detail pages. Map view. **Exit:** agency can load its portfolio and its contacts.

### Phase C — CRM, Pipelines & Calendar (weeks 11–16)
Multi-pipeline leads, kanban board, stage history, inquiries + match engine, calendar events, tasks, reminders, dashboard KPIs. Auto-assignment rules. SLA policies. **Exit:** full sales workflow usable end-to-end.

### Phase D — Inbox, Portals & Publishing (weeks 17–23)
Unified inbox (email + WhatsApp + SMS + internal notes first, then portal channels). 3 portal adapters first (ZonaProp + Argenprop + MeLi Inmuebles), then remaining at 1/week. Difusión module. Per-portal overrides. Campaign sender (email). **Exit:** listings publish to portals, leads flow back, conversations unified.

### Phase E — Documents, E-Sign & Reservations (weeks 24–28)
Template engine, document generator, Signaturit integration, DocuSign integration, reservation lifecycle (Reserva → Boleto → Escritura), commission splits, audit trails, Ley 25.506 compliance mapping. **Exit:** full transaction lifecycle inside the product.

### Phase F — AI & RAG (weeks 29–33)
pgvector + FTS hybrid retrieval, 11 LLM surfaces, eval harness, multi-provider routing, cost controls, copilot agent with tool use. Evaluation golden sets per feature. **Exit:** every AI capability behind feature flags, measurable quality per feature.

### Phase G — Sitio, Analytics, Billing & Appraisals (weeks 34–38)
Next.js + Puck website builder, 5 themes, custom domains, SEO, form capture. 12 operational reports + 10 strategic dashboards. Stripe + Mercado Pago + AFIP invoicing. Full appraisal module (CMA with comps, report generator). **Exit:** tenant-facing website + analytics + paid plans live.

### Phase H — Polish, Mobile GA & Launch (weeks 39–40+)
Capacitor iOS + Android app store submissions. WCAG 2.2 AA audit + fixes. Pen test + fixes. Performance budget enforcement (Lighthouse ≥90 on all views). Load test (10k concurrent, 1M listings scenarios). Public API + SDK GA. Migration tooling from Tokko stable. Launch marketing site. **Exit:** public GA.

### Cross-cutting from day 1
- Security reviews every phase.
- Accessibility audits every phase.
- Eval runs on AI features as they ship.
- Observability (Sentry + OTel + PostHog) from phase A.
- Documentation (user + dev) written as features ship, not after.

---

## 13. Success Criteria (Launch)

- Tokko customer can migrate via importer in under 1 hour with zero data loss on core entities.
- Time-to-first-published-listing under 10 minutes from signup.
- Portal sync success rate > 99% (excluding portal outages).
- p95 page load < 1.5s on 4G (LATAM device baseline).
- AI feature satisfaction (thumbs-up rate) ≥ 80% on golden sets.
- Uptime SLA 99.9% (enterprise 99.95%).
- Zero criticals + zero highs on pen test at GA.

---

## 14. Open Questions for Planning Phase

These inform the implementation plan (not the design):
1. Exact Tokko CSV export columns (need a customer sample) — affects importer fidelity.
2. Which 3 launch design partners (agencies) — informs UX prioritization.
3. Pricing experimentation: freemium vs trial-only — A/B post-GA.
4. Mobile feature parity at GA vs post-GA (photo-first offline flows vs full parity).
5. Which LATAM country is priority 2 after AR — drives portal + compliance work.
6. Franchise/white-label go-to-market: self-serve vs sales-assisted.
7. Public API partner program timing.
8. Community/marketplace for agencies post-GA (template/theme sharing).
9. Data residency commitments per enterprise (AR vs BR vs US).
10. In-house vs partnered training/onboarding services.

---

**End of design spec.**
