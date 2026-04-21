# Paperclip.ing Handoff Brief — Tokko Replacement SaaS

> **Audience:** Paperclip.ing (autonomous AI build company). Self-contained brief — no prior context required.
> **Source spec:** `docs/superpowers/specs/2026-04-20-tokko-replacement-design.md` (companion doc; read alongside this brief).
> **Research basis:** `research/tokko/findings.md` + `research/tokko/notes/01`–`16` (competitive teardown).

---

## 0. Paperclip Issue — Copy/Paste Payload

### Title
Build "Corredor" — a production-grade, multi-tenant Argentine real estate CRM SaaS (React 19 + Node 22 + Postgres 16 + AI) to replace Tokko Broker, with PWA, native mobile shells, portal sync, unified inbox, e-sign, website builder, and RAG-powered AI copilot

### Description (paste verbatim)

Build Corredor, a production-grade multi-tenant SaaS competing with Tokko Broker (Argentina's dominant real-estate CRM). Deliver feature parity at launch **plus** 16 documented competitive differentiators. Argentina-first, LATAM-ready.

**Pillars (equal weight):** Listings · CRM · Unified Inbox · Portals · Documents/E-Sign · Website Builder · AI/RAG · Analytics · Billing.

**Stack (locked):** React 19 + Vite + TypeScript + TanStack (Router/Query/Table) + shadcn/Radix/Tailwind 4 + MapLibre + Vite PWA + Capacitor · Node 22 + tRPC (internal) + REST/OpenAPI (public) + Drizzle + Zod · Postgres 16 + pgvector + pg_trgm + PostGIS + RLS · Redis (Upstash) + BullMQ · Cloudflare (R2 + Images + Pages + WAF) + Mux + AWS SES + Postmark + Twilio + 360dialog/Meta WhatsApp · Stripe + Mercado Pago + AFIP · Anthropic (primary) + OpenAI (fallback) + Gemini · Fly.io + Neon · Sentry + OpenTelemetry + Grafana Cloud + PostHog · Turborepo + pnpm.

**Deliverables:**
1. Monorepo `corredor` with apps (`web`, `mobile`, `api`, `worker`, `site`, `admin`) and packages (`db`, `core`, `ai`, `portals`, `documents`, `ui`, `sdk`, `config`, `telemetry`).
2. Complete Drizzle schema for 15 entity groups (Section 5), with RLS policies, migrations, and seed data.
3. 18 top-level modules (Section 4) implemented end-to-end: Panel, Propiedades, Contactos, Oportunidades, Consultas, Calendario, Bandeja, Tareas, Documentos, Reservas, Tasaciones, Difusión, Mapa, Reportes, Sitio, Marketing, IA, Configuración.
4. 8 portal adapters (ZonaProp, Argenprop, MeLi Inmuebles, Remax Network, Inmuebles24, Properati, Idealista, generic XML) with sync jobs and inbound-lead ingestion.
5. Unified inbox across 8 channels (Email IMAP/SMTP, Gmail/Outlook OAuth, WhatsApp, SMS, Portal messages, Site widget, Instagram DM, FB Messenger) with auto-assignment and SLA.
6. 11 LLM-powered features (Section 7) over pgvector+FTS hybrid retrieval with Reciprocal Rank Fusion, structured outputs (Zod), multi-provider routing, eval harness.
7. Document template engine + PDF generator + Signaturit + DocuSign integration + Reserva → Boleto → Escritura lifecycle + Ley 25.506 compliance.
8. Next.js + Puck website builder with 5 themes, custom domains, ISR on Cloudflare Pages.
9. 12 operational reports + 10 strategic dashboards (materialized views).
10. Stripe + Mercado Pago billing with AFIP CAE invoicing.
11. 4 pricing tiers + 14-day trial + CSV importers + Tokko migration tooling.
12. Capacitor iOS + Android shells shipped to App Store + Play Store.
13. WCAG 2.2 AA, Lighthouse ≥ 90 on all views, p95 < 1.5s on 4G.
14. Public REST API + auto-generated TypeScript SDK (OpenAPI 3.1).
15. SOC 2-ready posture, pen-test clean, zero criticals/highs at GA.

**Non-goals (do not build):** Web3, blockchain, tokens, smart contracts, crypto escrow, wallet auth, decentralized storage, in-house e-sign stack, in-house video transcoding, in-house email delivery.

**Compliance:** Ley 25.326 (AR data protection, DSR endpoints), Ley 25.506 (advanced e-signature), AFIP electronic invoicing, WCAG 2.2 AA, OWASP ASVS L2.

**Build order:** Follow the 8-phase plan in Section 13 of this brief. Each phase has exit criteria; do not advance until they are met. Commit frequently. TDD for domain logic. Every mutation idempotent. Every query tenant-scoped via RLS.

**Language conventions:** Spanish UI labels, English URL slugs (`/properties`, `/leads`, `/calendar`). ES-AR primary; ES, PT-BR, EN, MX-ES scaffolded via FormatJS.

**Security red-lines (explicit — Tokko failed these):**
- Never put JWT/session tokens in URLs.
- Never use `eval()` on API responses.
- Never use GET for mutations.
- CSRF protection on every state-changing endpoint.
- Argon2id password hashing (memory-hard params).
- Postgres RLS enforced on every table.
- No secrets in env files committed to git.

**Definition of Done:** see Section 16.

---

## 1. Product Summary (one-paragraph elevator pitch)

Corredor is a multi-tenant SaaS for Argentine (and soon LATAM) real estate agencies and independent brokers. It unifies listings management, contact/CRM, multi-pipeline deals, a cross-channel inbox (email + WhatsApp + portal leads), document generation + e-sign, automated portal publishing (ZonaProp, Argenprop, MeLi, etc.), a drag-drop agency website builder, and an AI copilot grounded in the tenant's own data — all behind one login, responsive on mobile, installable as a PWA, and available as native iOS/Android apps. It replaces Tokko Broker, fixes its documented UX and security failings, and adds 16 differentiators competitors lack.

## 2. Target Users & Tenancy Model

- **Tenant** = an agency (or solo broker operating as a tenant of one).
- **Branch** = optional sub-unit of an agency (multi-office chains).
- **User** = a person with login credentials, belongs to one tenant, possibly multiple branches.
- **Roles:** `owner`, `admin`, `manager`, `agent`, `assistant`, `read-only`, `external-collaborator`.
- **White-label:** tenants on the Agencia tier or above can bind a custom domain (`crm.miinmobiliaria.com`) and brand the login + app shell.
- **Cobrokering:** a property owned by Tenant A can be listed by Tenant B via a `commission_split` record — both see the listing in their respective scopes.

## 3. Non-Goals (explicit)

| Not building | Why |
|---|---|
| Web3 / blockchain / tokens | Scope, cost, regulatory risk, zero buyer demand |
| Smart-contract escrow | Tooling exists (Signaturit), users want fiat + notary |
| In-house e-sign stack | Signaturit + DocuSign solve this; Ley 25.506 compliance is theirs |
| In-house video transcoding | Mux is best-in-class |
| In-house SMTP/IMAP | SES + Postmark |
| Generic marketplace / consumer app | This is B2B SaaS for professionals |
| In-house mapping tiles | MapLibre + MapTiler |

## 4. Module Map (18 top-level)

Spanish UI label → English slug → purpose:

| Label | Slug | Purpose |
|---|---|---|
| Panel | `/dashboard` | Home: today's agenda, alerts, pinned KPIs |
| Propiedades | `/properties` | Listings: CRUD, media, features, valuations |
| Contactos | `/contacts` | People + companies, relationships, segments |
| Oportunidades | `/leads` | Multi-pipeline deal / lead management |
| Consultas | `/inquiries` | Buyer/renter criteria + match engine |
| Calendario | `/calendar` | Visits, meetings, tasks, reminders |
| Bandeja | `/inbox` | Unified inbox across 8 channels |
| Tareas | `/tasks` | Todos, follow-ups, SLA timers |
| Documentos | `/documents` | Templates + generated docs + e-sign |
| Reservas | `/reservations` | Reserva → Boleto → Escritura lifecycle |
| Tasaciones | `/appraisals` | CMA, valuation reports, comps |
| Difusión | `/publishing` | Portal publish, overrides, sync status |
| Mapa | `/map` | Geo portfolio + demand heatmap |
| Reportes | `/reports` | Operational + strategic dashboards |
| Sitio | `/site` | Agency website builder |
| Marketing | `/marketing` | Campaigns, saved searches, nurture flows |
| IA | `/ai` | Copilot, semantic search, generators |
| Configuración | `/settings` | Tenant, users, pipelines, custom fields, integrations, billing |

Sub-slugs are listed in Section 11 (module-by-module spec).

## 5. Data Model — Full Reference

### 5.1 Entity groups (15) and tables

**Tenancy**: `tenant`, `branch`, `user`, `role`, `user_role`, `api_key`, `webhook`, `audit_log`, `feature_flag`, `tenant_domain`.

**Contacts**: `contact` (`kind` ∈ {person, company}), `contact_relationship` (M:N typed: owner_of, tenant_of, lawyer_of, co_buyer, broker_of, …), `contact_tag`, `contact_tag_map`, `segment`, `segment_member`, `contact_consent` (Ley 25.326 consent ledger).

**Properties**: `property`, `property_owner` (M:N with `ownership_pct`), `property_media` (kind ∈ {photo, floorplan, video, doc, 3d_tour}), `property_feature` (typed key/value), `property_tag`, `property_custom_tag_group`, `property_custom_tag`, `property_history` (field-level diff), `property_price_history`, `property_soft_delete` (view).

**Transactions**: `operation` (kind ∈ {sale, rent, temporary_rent, commercial_rent, commercial_sale, development_sale}), `listing` (= property × operation × price × status), `reservation`, `boleto`, `escritura`, `commission_split`.

**Pipelines**: `pipeline` (per-tenant, named), `pipeline_stage` (ordered), `lead` (contact × pipeline + stage + score), `lead_stage_history`, `inquiry` (buyer/renter search criteria), `inquiry_match` (property × inquiry, scored).

**Calendar/Tasks**: `calendar_event`, `event_type`, `event_attendee`, `task`, `task_reminder`.

**Inbox/Messaging**: `inbox_thread`, `inbox_message`, `channel_account`, `message_template`, `auto_assignment_rule`, `sla_policy`, `sla_timer`.

**Documents**: `doc_template`, `doc_document`, `doc_field_binding`, `doc_signature_request`, `doc_signer`, `doc_audit_trail`.

**Portals**: `portal_connection`, `portal_publication`, `portal_override`, `portal_sync_job`, `portal_lead`.

**Appraisals**: `appraisal`, `appraisal_comp`, `appraisal_report`.

**Marketing**: `campaign`, `campaign_recipient`, `campaign_event` (open/click/bounce), `saved_search`, `nurture_flow`, `nurture_step`, `nurture_enrollment`.

**Website (Sitio)**: `site`, `site_page`, `site_block`, `site_theme`, `site_domain`, `site_form_submission`, `site_redirect`.

**AI/RAG**: `ai_document`, `ai_chunk` (with `embedding vector(1536)`), `ai_conversation`, `ai_message`, `ai_tool_call`, `ai_eval_run`, `ai_eval_case`.

**Billing**: `subscription`, `plan`, `plan_feature`, `invoice`, `payment`, `usage_counter`, `afip_invoice` (CAE details).

**Analytics**: materialized views: `mv_pipeline_conversion`, `mv_listing_performance`, `mv_agent_productivity`, `mv_portal_roi`, `mv_revenue_forecast`, `mv_retention_cohort`, `mv_zone_heatmap`, `mv_ai_usage_value`, `mv_sla_adherence`, `mv_commission_owed`.

### 5.2 Universal columns (every table)

```sql
id              uuid primary key default gen_random_uuid(),
tenant_id       uuid not null references tenant(id),
created_at      timestamptz not null default now(),
created_by      uuid references "user"(id),
updated_at      timestamptz not null default now(),
updated_by      uuid references "user"(id),
deleted_at      timestamptz,                 -- soft-delete
version         int not null default 1       -- optimistic concurrency
```

### 5.3 RLS policy (applied to every table)

```sql
alter table <t> enable row level security;
create policy tenant_isolation on <t>
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

The API request lifecycle runs `set local app.tenant_id = $1; set local app.user_id = $2;` at the start of each transaction.

### 5.4 Core table definitions (abridged — generate the rest from Section 5.1)

```sql
-- TENANCY
create table tenant (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country_code text not null default 'AR',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  currency text not null default 'ARS',
  locale text not null default 'es-AR',
  plan_code text not null references plan(code),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table "user" (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id),
  email citext not null,
  password_hash text,          -- argon2id; null if SSO-only
  totp_secret text,
  webauthn_credentials jsonb,
  locale text not null default 'es-AR',
  timezone text,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

-- CONTACTS
create table contact (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id),
  kind text not null check (kind in ('person', 'company')),
  -- person fields
  first_name text,
  last_name text,
  national_id_type text,       -- DNI, CUIT, CUIL, passport
  national_id text,
  birth_date date,
  gender text,
  -- company fields
  legal_name text,
  cuit text,
  industry text,
  -- shared
  emails jsonb not null default '[]'::jsonb,          -- [{label, value, verified}]
  phones jsonb not null default '[]'::jsonb,          -- [{label, e164, whatsapp}]
  addresses jsonb not null default '[]'::jsonb,
  owner_user_id uuid references "user"(id),           -- assigned agent
  source text,                                        -- portal:zonaprop, web, import, manual
  lead_score int not null default 0,
  notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  ... universal columns
);

create table contact_relationship (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  from_contact_id uuid not null references contact(id),
  to_contact_id uuid not null references contact(id),
  kind text not null,          -- spouse_of, parent_of, lawyer_of, employee_of, ...
  ... universal columns,
  check (from_contact_id <> to_contact_id)
);

-- PROPERTIES
create table property (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  reference_code text,                          -- e.g. "CAP-0142"
  title text not null,
  description text,
  description_generated boolean not null default false,
  property_type text not null,                  -- apartment, house, ph, land, office, local, warehouse, field
  subtype text,
  total_area_m2 numeric(10,2),
  covered_area_m2 numeric(10,2),
  semi_covered_area_m2 numeric(10,2),
  uncovered_area_m2 numeric(10,2),
  rooms int,
  bedrooms int,
  bathrooms int,
  toilets int,
  garages int,
  age_years int,
  condition text,                               -- new, good, refurbish, demolish
  orientation text,                             -- n, s, e, w, ne, ...
  floor text,                                   -- "PB", "3", "14A"
  total_floors int,
  -- geo
  country text not null default 'AR',
  province text,
  locality text,
  neighborhood text,
  address_street text,
  address_number text,
  postal_code text,
  geom geography(Point, 4326),
  location_hidden boolean not null default false,   -- show approx on public site
  -- meta
  status text not null default 'active',            -- active, reserved, sold, rented, paused, archived
  featured boolean not null default false,
  owner_contact_ids uuid[] not null default '{}',   -- denormalized for fast filter
  branch_id uuid references branch(id),
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}'::jsonb,
  ... universal columns
);
create index property_geom_gist on property using gist (geom);
create index property_tenant_status on property (tenant_id, status) where deleted_at is null;

create table property_owner (
  property_id uuid not null references property(id),
  contact_id uuid not null references contact(id),
  tenant_id uuid not null,
  ownership_pct numeric(5,2) not null default 100.00,
  primary key (property_id, contact_id)
);

create table listing (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  property_id uuid not null references property(id),
  operation_kind text not null,              -- sale, rent, temp_rent, ...
  price_amount numeric(14,2) not null,
  price_currency text not null,              -- ARS, USD, UYU, ...
  price_period text,                         -- monthly for rent
  expenses_amount numeric(14,2),
  commission_pct numeric(5,2),
  status text not null default 'active',
  listed_at timestamptz not null default now(),
  unlisted_at timestamptz,
  ... universal columns,
  unique (tenant_id, property_id, operation_kind, listed_at)
);

-- PIPELINES & LEADS
create table pipeline (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  kind text not null,               -- sales, rentals, developments, custom
  is_default boolean not null default false,
  ... universal columns
);

create table pipeline_stage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  pipeline_id uuid not null references pipeline(id),
  name text not null,
  sort_order int not null,
  stage_kind text not null,         -- open, won, lost
  sla_hours int,
  color text,
  ... universal columns
);

create table lead (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null references contact(id),
  pipeline_id uuid not null references pipeline(id),
  stage_id uuid not null references pipeline_stage(id),
  property_id uuid references property(id),      -- optional
  listing_id uuid references listing(id),
  owner_user_id uuid references "user"(id),
  source text,
  score int not null default 0,
  expected_close_at date,
  expected_value_amount numeric(14,2),
  expected_value_currency text,
  won_lost_reason text,
  ... universal columns
);

-- INQUIRIES (buyer search)
create table inquiry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null references contact(id),
  operation_kind text not null,
  property_types text[] not null,
  price_min numeric(14,2),
  price_max numeric(14,2),
  currency text,
  bedrooms_min int,
  rooms_min int,
  area_min_m2 numeric(10,2),
  zones jsonb,                       -- [{province, locality, neighborhood}]
  required_features text[],
  status text not null default 'active',
  ... universal columns
);

-- INBOX
create table inbox_thread (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid references contact(id),
  assigned_user_id uuid references "user"(id),
  channel_account_id uuid references channel_account(id),
  subject text,
  last_message_at timestamptz,
  status text not null default 'open',       -- open, snoozed, closed
  sla_due_at timestamptz,
  unread_count int not null default 0,
  ... universal columns
);

create table inbox_message (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  thread_id uuid not null references inbox_thread(id),
  direction text not null,                   -- in, out, note
  channel text not null,                     -- email, whatsapp, sms, portal, site_chat, ig, fb, internal
  from_address text,
  to_addresses text[],
  body_text text,
  body_html text,
  attachments jsonb not null default '[]'::jsonb,
  external_id text,                          -- provider message id
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  ai_suggested_reply text,
  ... universal columns
);

-- AI / RAG
create extension if not exists vector;
create table ai_chunk (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_kind text not null,              -- property, contact, document, thread, note
  source_id uuid not null,
  chunk_index int not null,
  content text not null,
  token_count int not null,
  embedding vector(1536) not null,
  fts tsvector,
  metadata jsonb,
  ... universal columns
);
create index ai_chunk_tenant_source on ai_chunk (tenant_id, source_kind, source_id);
create index ai_chunk_embedding on ai_chunk using hnsw (embedding vector_cosine_ops);
create index ai_chunk_fts on ai_chunk using gin (fts);

-- AUDIT
create table audit_log (
  id bigserial primary key,
  tenant_id uuid not null,
  user_id uuid references "user"(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,         -- create, update, delete, restore, publish, sign, ...
  diff jsonb,
  ip inet,
  user_agent text,
  at timestamptz not null default now()
);
create index audit_log_entity on audit_log (tenant_id, entity_type, entity_id, at desc);
```

Generate the remaining tables from Section 5.1 following the same conventions: universal columns, typed enums as `text check (col in (...))`, jsonb for semi-structured fields, indices on `(tenant_id, status)` patterns.

### 5.5 Indexes (non-exhaustive)

- `(tenant_id)` on every table (used by RLS + query planner).
- `(tenant_id, deleted_at)` partial indexes where soft-delete filtering dominates.
- GIN on `tags` arrays.
- GIN on `custom_fields` jsonb.
- Trigram GIN on `contact` name/email, `property` title/description for fuzzy search.
- pgvector HNSW on `ai_chunk.embedding`.
- PostGIS GIST on `property.geom`.

## 6. Monorepo Layout

```
corredor/
├── apps/
│   ├── web/                React 19 SPA + PWA (agent-facing app)
│   ├── mobile/             Capacitor shells (iOS + Android, wraps web)
│   ├── api/                Node 22 tRPC + REST server
│   ├── worker/             BullMQ consumers (portal sync, email, AI, etc.)
│   ├── site/               Next.js 15 runtime for tenant websites (Puck)
│   └── admin/              Internal tenant-admin console (Corredor staff only)
├── packages/
│   ├── db/                 Drizzle schema + migrations + seed
│   ├── core/               Domain logic (transport-agnostic)
│   ├── ai/                 LLM routing, RAG pipeline, prompts, eval harness
│   ├── portals/            Portal adapters + sync engine
│   ├── documents/          Template engine + PDF generator + e-sign adapters
│   ├── ui/                 shadcn components, tokens, theme
│   ├── sdk/                Public REST SDK (auto-generated from OpenAPI)
│   ├── config/             tsconfig, eslint, prettier, tailwind, vitest presets
│   └── telemetry/          Sentry + OpenTelemetry + PostHog wrappers
├── tools/
│   ├── tokko-importer/     CLI: CSV/export → Corredor import
│   └── eval-runner/        AI eval orchestrator
├── infra/
│   ├── fly/                Fly.io app + volume configs per app
│   ├── github/             GitHub Actions workflows
│   ├── cloudflare/         Wrangler configs for Workers, Pages, DNS
│   └── neon/               Neon branching + migration automation
├── docs/
│   ├── architecture/
│   ├── runbooks/
│   ├── compliance/         Ley 25.326, Ley 25.506, AFIP mappings
│   └── api/                OpenAPI spec + SDK docs
├── .github/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 7. AI Capability Surface (11 features)

Each feature has: **inputs** · **retrieval** · **prompt contract** · **output schema (Zod)** · **golden eval set**.

| # | Feature | Trigger | Retrieval | Model (primary) | Output |
|---|---|---|---|---|---|
| 1 | Semantic property search | `/properties` search bar | hybrid (pgvector + FTS on `ai_chunk` where `source_kind='property'`) + metadata filter | Claude Sonnet 4 | ranked `listing_id[]` + relevance score + 1-line rationale |
| 2 | Lead↔property match explain | Lead detail panel | inquiry criteria → listing candidates → rerank | Claude Sonnet 4 | `{listing_id, score, reasons[]}[]` |
| 3 | Description generator | Property form "generar" | structured fields | Claude Haiku | `{title, description_md, locale}` |
| 4 | Email / WA drafter | Inbox reply box | thread history + contact profile + property context | Claude Sonnet 4 | `{subject?, body, tone, citations[]}` |
| 5 | Call/meeting note summarizer | Post-meeting upload | transcript | Whisper + Claude Haiku | `{summary, action_items[], updated_fields{}}` |
| 6 | Document Q&A | Document viewer chat | pgvector over `ai_chunk` where `source_kind='document'` scoped to doc | Claude Sonnet 4 | `{answer, citations[{page, snippet}]}` |
| 7 | Appraisal assistant | Appraisal wizard | comp retrieval (PostGIS radius + filters) + market stats | Claude Sonnet 4 | `{estimated_range, narrative_md, comps_used[]}` |
| 8 | Pipeline insights | Weekly cron | pipeline state snapshot | Claude Sonnet 4 | `{stalled_leads[], narrative_md, suggested_actions[]}` |
| 9 | Portal listing optimizer | Publish button | listing + portal spec | Claude Haiku | `{per_portal: {title, description, missing_fields[]}}` |
| 10 | Duplicate detector | Nightly cron + contact/property create | embedding cosine + trigram | Claude Haiku | `{cluster_id, members[], merge_suggestion}` |
| 11 | Copilot (ask anything) | `/ai` chat | tool-use over typed tRPC procedures | Claude Sonnet 4 | streamed response + tool-call audit |

### Retrieval pipeline

```
query → embed(query) → [vector ANN top-k=50] ⨁ [FTS tsquery top-k=50]
     → Reciprocal Rank Fusion (k=60) → top-20
     → metadata filter (tenant, entity type, scope)
     → rerank (cross-encoder or LLM) → top-5 passed as context
```

### Multi-provider routing

```ts
// packages/ai/src/router.ts
type Provider = 'anthropic' | 'openai' | 'gemini';
type Capability = 'chat' | 'embed' | 'transcribe' | 'rerank';
interface ModelChoice { provider: Provider; model: string; fallback?: ModelChoice }

const ROUTES: Record<FeatureId, Record<Capability, ModelChoice>> = {
  'property.description': {
    chat: {
      provider: 'anthropic', model: 'claude-haiku-4',
      fallback: { provider: 'openai', model: 'gpt-4.1-mini' }
    }
  },
  // ...
};
```

### Structured outputs everywhere

```ts
import { z } from 'zod';
const DescriptionOutput = z.object({
  title: z.string().min(20).max(120),
  description_md: z.string().min(200).max(4000),
  locale: z.enum(['es-AR','es','en','pt-BR']),
});
const result = await ai.generate({ schema: DescriptionOutput, ... });
```

### Eval harness

- `packages/ai/eval/cases/<feature>.jsonl` — golden inputs + expected outputs or rubrics.
- `tools/eval-runner` runs all features nightly + per-PR for touched features.
- Metrics: structural validity (Zod pass rate), semantic accuracy (LLM-as-judge with human-reviewed sample), latency p50/p95, cost per call.
- Regression gate: new PR must match or beat main on the feature's golden set.

## 8. Portal Adapter Spec

### 8.1 Adapter interface

```ts
// packages/portals/src/types.ts
export interface PortalAdapter {
  id: PortalId;                                 // 'zonaprop' | 'argenprop' | ...
  displayName: string;
  authenticate(creds: unknown): Promise<AuthSession>;
  publish(session: AuthSession, listing: ListingPayload): Promise<PublishResult>;
  update(session: AuthSession, pubId: string, diff: ListingDiff): Promise<void>;
  unpublish(session: AuthSession, pubId: string): Promise<void>;
  syncStatus(session: AuthSession, pubId: string): Promise<PortalStatus>;
  fetchInboundLeads(session: AuthSession, since: Date): Promise<PortalLead[]>;
  validate(listing: ListingPayload): ValidationResult;      // pre-publish
  spec: PortalSpec;                             // field requirements, size limits
}
```

### 8.2 Launch adapters (8)

| Adapter | Auth | Publishing | Inbound leads |
|---|---|---|---|
| ZonaProp | API token | REST API | Webhook + polling |
| Argenprop | Username/pwd | XML feed + scrape | Email parsing + API |
| MercadoLibre Inmuebles | OAuth 2.0 | Official API | Official API |
| Remax Network | API token | REST API | Webhook |
| Inmuebles24 (MX) | API token | REST API | Webhook |
| Properati | API token | REST API | API |
| Idealista | API token | REST API | API |
| Generic XML feed | n/a | Scheduled XML gen + FTP/HTTP push | n/a (portal pulls) |

### 8.3 Sync engine

- BullMQ queues: `portal-publish`, `portal-update`, `portal-unpublish`, `portal-sync`, `portal-leads`.
- Rate limits enforced per-portal via Redis token bucket.
- Exponential backoff (1m, 5m, 30m, 2h, 8h, dead-letter).
- `portal_sync_job` row per attempt with full request/response logs (scrubbed for secrets).
- UI: `/publishing` shows per-listing per-portal status, errors, retry button.

## 9. Unified Inbox Channels

| Channel | Connector | Inbound | Outbound |
|---|---|---|---|
| Email (Gmail) | OAuth 2.0 | Gmail API push | Gmail API send |
| Email (Outlook) | OAuth 2.0 | Graph API push | Graph API send |
| Email (IMAP/SMTP) | Credentials | IMAP IDLE | SMTP |
| WhatsApp | 360dialog / Meta Cloud | Webhook | REST API |
| SMS | Twilio | Webhook | REST API |
| Portal messages | Portal adapter | Adapter poll/webhook | Adapter |
| Site chat widget | Corredor-hosted | WebSocket | WebSocket |
| Instagram DM | Meta Graph | Webhook | Graph API |
| Facebook Messenger | Meta Graph | Webhook | Graph API |
| Internal notes | Native | n/a | n/a |

### Auto-assignment rules

DSL stored in `auto_assignment_rule.rule` (JSON):
```json
{
  "when": { "channel": "whatsapp", "contact.zone": "Palermo" },
  "assign": { "strategy": "round_robin", "pool": ["user-a", "user-b"] },
  "sla_hours": 2
}
```

SLA timers materialized in `sla_timer` rows; expired timers escalate per policy.

## 10. Document & E-Sign Workflow

### 10.1 Template engine

- Handlebars-style syntax with typed bindings:
  ```
  {{property.title}} {{formatMoney listing.price_amount listing.price_currency}}
  {{#if operation.kind == 'alquiler'}} ... {{/if}}
  ```
- Bindings are declared in `doc_field_binding` and validated against the live schema — editing a template surfaces unbound variables inline.
- Versioned per tenant; audit diff on save.

### 10.2 PDF generation

- Server-side Playwright → headless Chromium → PDF.
- Print CSS with page breaks + headers/footers.
- Stored in R2, referenced from `doc_document.file_url`.

### 10.3 E-sign providers

- **Signaturit** (default, Ley 25.506 advanced signature).
- **DocuSign** (enterprise option).
- Adapter interface:
  ```ts
  interface ESignAdapter {
    createEnvelope(doc: DocumentFile, signers: Signer[], opts: EnvelopeOpts): Promise<EnvelopeRef>;
    getStatus(ref: EnvelopeRef): Promise<EnvelopeStatus>;
    downloadSigned(ref: EnvelopeRef): Promise<Buffer>;
    downloadAuditTrail(ref: EnvelopeRef): Promise<Buffer>;
    onWebhook(payload: unknown): Promise<EnvelopeEvent>;
  }
  ```

### 10.4 Transaction lifecycle

```
Property Listed
   │
   ├──▶ Reservation (Reserva): deposit + offer terms + expiry
   │        │
   │        └──▶ accepted → Boleto
   │
   ├──▶ Boleto: preliminary contract, signed by all parties, milestone schedule
   │        │
   │        └──▶ fulfilled → Escritura
   │
   └──▶ Escritura: notary-signed deed (external) — attach scan + register in Corredor
```

Commission splits triggered on Boleto status = `signed`.

## 11. Module-by-Module Build Spec

Each module block: **Sub-slugs · Entities · Server API · UI · AI hooks · Events · Acceptance criteria.**

### 11.1 Propiedades

**Sub-slugs:** `/properties` (list), `/properties/new`, `/properties/:id` (detail tabs: General, Medios, Características, Ubicación, Publicaciones, Historial, Análisis), `/properties/:id/edit`, `/properties/tags`, `/properties/reservations`, `/properties/appraisals`, `/properties/trash`.

**Entities:** `property`, `property_media`, `property_feature`, `property_owner`, `property_tag`, `property_custom_tag_group`, `property_custom_tag`, `property_history`, `property_price_history`, `listing`.

**Server API (tRPC procedures):**
```
property.list({ filters, sort, page, pageSize }) → { items, total }
property.get(id) → Property
property.create(input) → Property
property.update(id, diff) → Property
property.softDelete(id) → void
property.restore(id) → Property
property.addMedia(id, file) → Media
property.reorderMedia(id, order[]) → void
property.attachOwner(id, contactId, pct) → void
property.detachOwner(id, contactId) → void
property.listHistory(id) → Diff[]
property.priceHistory(id) → PricePoint[]
property.search(q, filters) → Property[]            # semantic + FTS hybrid
```

**UI highlights:**
- Virtualized table (TanStack Table + TanStack Virtual) for 100k+ rows.
- Gallery editor with drag-to-reorder + captions + per-portal "hide" flag.
- Map view toggle with cluster markers (MapLibre).
- Duplicate detection banner on save (AI feature #10).
- AI "generar descripción" button (AI feature #3).
- Bulk edit dialog for status/price/featured.
- Export CSV + Excel.

**Events emitted:** `property.created`, `property.updated`, `property.price_changed`, `property.status_changed`, `property.deleted`, `property.restored`, `property.media_added`.

**Acceptance:**
- Create 10,000 properties via CSV import in under 5 minutes.
- List view p95 load < 800ms at 50k properties/tenant.
- Property detail with 30 images loads < 1s.
- All mutations append `audit_log` rows.
- All mutations emit domain events consumed by `ai_chunk` upsert.

### 11.2 Contactos

**Sub-slugs:** `/contacts` (list), `/contacts/new`, `/contacts/:id` (tabs: Info, Relaciones, Oportunidades, Consultas, Actividad, Documentos), `/contacts/companies`, `/contacts/segments`, `/contacts/import`, `/contacts/duplicates`.

**Entities:** `contact`, `contact_relationship`, `contact_tag*`, `segment*`, `contact_consent`.

**Server API:**
```
contact.list / get / create / update / softDelete / restore
contact.addRelationship / removeRelationship
contact.merge(sourceId, targetId)       # merges + rewrites FKs
contact.import(csv, mapping)            # queued via BullMQ
contact.findDuplicates(id?)             # AI feature #10
segment.list / create / update / delete / members
contact.consent.grant / revoke / export   # Ley 25.326 DSR
```

**Acceptance:**
- Merge of 2 contacts preserves all relationships, deals, threads, media.
- CSV import handles 50k rows with < 0.1% error rate on clean data.
- DSR export returns JSON bundle within 30s.

### 11.3 Oportunidades

**Sub-slugs:** `/leads` (kanban default), `/leads/list`, `/leads/funnel`, `/leads/:id`, `/leads/conversions`, `/leads/closed`.

**Entities:** `pipeline`, `pipeline_stage`, `lead`, `lead_stage_history`.

**Server API:**
```
pipeline.list / create / update / delete / setDefault
pipeline.listStages(pipelineId) / reorderStages
lead.list / get / create / update
lead.moveStage(id, toStageId, reason?)    # writes lead_stage_history
lead.markWon(id, value, currency)
lead.markLost(id, reason)
lead.assign(id, userId)
lead.insights(pipelineId)                  # AI feature #8
```

**UI highlights:**
- Kanban with drag-to-stage, optimistic updates, WS subscription for multi-user live board.
- Funnel chart with stage conversion + avg time.
- Bulk stage move.
- Stage SLA badges (overdue, warning, ok).

**Acceptance:**
- Drag updates persist + propagate to other open sessions within 500ms via WS.
- `lead_stage_history` has entry for every stage change.
- Funnel report matches raw counts (invariant checked in test).

### 11.4 Consultas

**Sub-slugs:** `/inquiries`, `/inquiries/new`, `/inquiries/:id` (with live matches), `/inquiries/saved-searches`.

**Entities:** `inquiry`, `inquiry_match`.

**Server API:**
```
inquiry.list / get / create / update / close
inquiry.refreshMatches(id)
inquiry.matches(id, { page })
inquiry.notifyContact(id, matchIds[])    # sends personalized shortlist via inbox
```

**Match engine:** hybrid of structured filter (price/rooms/zone) + semantic (embed inquiry criteria → cosine against listings). Scored 0–100. Re-run on listing create/update or inquiry update.

**Acceptance:**
- 1000 inquiries × 10k listings refresh in < 2 minutes.
- Score is stable (same inputs → same score ± epsilon).

### 11.5 Calendario

**Sub-slugs:** `/calendar` (month/week/day/agenda), `/calendar/events/:id`, `/calendar/types`.

**Entities:** `calendar_event`, `event_type`, `event_attendee`, `task` (rendered alongside).

**Integrations:**
- Google Calendar OAuth 2-way sync.
- Microsoft 365 OAuth 2-way sync.
- iCal feed per user.

**Acceptance:**
- Creating an event in Corredor appears in Google within 1 minute.
- External event deletions propagate within 1 minute.
- No duplication on round-trip sync.

### 11.6 Bandeja (Unified Inbox)

**Sub-slugs:** `/inbox` (default: assigned to me), `/inbox/all`, `/inbox/unassigned`, `/inbox/channel/:channel`, `/inbox/thread/:id`.

**Entities:** `inbox_thread`, `inbox_message`, `channel_account`, `message_template`, `auto_assignment_rule`, `sla_policy`, `sla_timer`.

**UI highlights:**
- Three-pane layout (folders · thread list · message pane).
- Rich composer with template dropdown + variable injection + AI draft button.
- Attachments (images, PDFs, voice notes for WA).
- Snooze, close, merge threads.
- Typing indicators (WS).
- Channel badge per message.

**Acceptance:**
- 99.9% message delivery success across channels (excluding provider outages).
- SLA timer correctness verified by simulation test.
- Attachments up to 50MB per message supported via R2 presigned uploads.

### 11.7 Documentos

**Sub-slugs:** `/documents` (generated docs list), `/documents/templates`, `/documents/templates/:id/edit`, `/documents/:id` (viewer + Q&A), `/documents/:id/sign` (e-sign status).

**Entities:** `doc_template`, `doc_document`, `doc_field_binding`, `doc_signature_request`, `doc_signer`, `doc_audit_trail`.

**Acceptance:**
- Template renders with zero undefined bindings validated at save time.
- Signed PDFs downloadable with embedded audit trail.
- Webhook-driven status updates reflect in UI within 5s.

### 11.8 Reservas

**Sub-slugs:** `/reservations`, `/reservations/:id` (timeline view: Reserva → Boleto → Escritura).

**Flow:** reservation created → deposit recorded → offer accepted → auto-generate Boleto from template → signers flow → payment milestones tracked → escritura attached.

### 11.9 Tasaciones

**Sub-slugs:** `/appraisals`, `/appraisals/new` (wizard: property, purpose, comps, report), `/appraisals/:id`.

**Acceptance:**
- Comp search surfaces 10+ comparables within 2km by default (PostGIS radius + filter).
- AI narrative generated in ≤ 20s.
- PDF report with cover, comps table, photos, signature block.

### 11.10 Difusión

**Sub-slugs:** `/publishing`, `/publishing/listing/:id`, `/publishing/portals` (credentials), `/publishing/errors`.

**Capabilities:** bulk select → publish to multi; per-listing per-portal override editor; sync health dashboard; error triage view.

### 11.11 Mapa

**Sub-slugs:** `/map`.

**Layers:** listings (clustered markers, price labels) · demand heatmap (from inquiries) · drawing tool (polygon zone → filter/save).

### 11.12 Reportes

**Sub-slugs:** `/reports` (index), `/reports/:slug`.

**12 operational + 10 strategic** (listed in spec Section 13). Each materialized view refreshes on relevant domain events or nightly. CSV + Excel export on every view. Scheduled email digests.

### 11.13 Sitio

**Sub-slugs:** `/site/pages`, `/site/pages/:slug/edit` (Puck), `/site/themes`, `/site/domains`, `/site/forms`, `/site/settings`.

**Runtime:** Next.js 15 (App Router) on Cloudflare Pages with ISR. Blocks: Hero, ListingGrid, ListingDetail, ContactForm, AgentBio, Testimonials, Map, Blog, CTA, Footer. 5 themes at launch.

**Acceptance:**
- Publish latency < 30s from editor save to live.
- Listing updates in CRM propagate to public site within 60s (ISR revalidate tag).
- Custom domain + auto-SSL setup wizard completes in < 2 minutes from DNS propagation.

### 11.14 Marketing

**Sub-slugs:** `/marketing/campaigns`, `/marketing/campaigns/:id`, `/marketing/flows`, `/marketing/templates`, `/marketing/saved-searches`.

**Capabilities:** segment-based campaigns (email + WA), nurture flows (trigger → delay → action DAG), open/click tracking, unsubscribe + consent ledger.

### 11.15 IA

**Sub-slugs:** `/ai` (copilot chat), `/ai/history`, `/ai/settings`.

Copilot uses tool-calling over typed tRPC procedures scoped by user's RBAC. Every tool call that mutates requires explicit human confirmation.

### 11.16 Configuración

**Sub-slugs:** `/settings/organization`, `/settings/branches`, `/settings/users`, `/settings/roles`, `/settings/pipelines`, `/settings/custom-fields`, `/settings/notifications`, `/settings/integrations`, `/settings/api-keys`, `/settings/webhooks`, `/settings/billing`, `/settings/domain`, `/settings/import`, `/settings/data-protection`.

### 11.17 Panel

**Widgets:** today's agenda · overdue tasks · new leads · unread inbox · pipeline snapshot · listing performance · AI weekly narrative · goal progress. All draggable + resizable, layout persisted per user.

### 11.18 Tareas

**Sub-slugs:** `/tasks` (list), `/tasks/today`, `/tasks/overdue`, `/tasks/completed`.

## 12. API Conventions

### 12.1 tRPC (internal)

- Routers: one per module (`property.router.ts`, `lead.router.ts`, …).
- Every procedure validated with Zod on input + output.
- Middleware chain: `tenant → user → rbac → rateLimit → auditLog → tx`.
- Mutations are idempotent via `idempotency_key` header.
- Streaming for AI endpoints via tRPC's subscription/SSE support.

### 12.2 REST (public + partner)

- OpenAPI 3.1 spec generated from tRPC routers (using `trpc-to-openapi` or equivalent).
- Versioned under `/v1/`.
- Auth: `Authorization: Bearer <api_key>` — scoped per tenant.
- Pagination: cursor-based (`?cursor=...&limit=...`).
- Rate limit: 60 req/min default, configurable per tier.
- Webhook signatures: HMAC-SHA256 with rotating secret.
- SDK auto-generated to `packages/sdk` per release.

### 12.3 Standard responses

```json
{
  "data": { ... },
  "meta": { "requestId": "...", "timestamp": "...", "pagination": { ... } }
}
```

Errors:
```json
{
  "error": {
    "code": "validation.field.invalid",
    "message": "Human readable",
    "details": { "field": "...", "hint": "..." },
    "requestId": "..."
  }
}
```

## 13. Build Order (8 phases, ~40 weeks)

> **Do not advance past a phase until exit criteria are met.** Commit frequently. TDD for domain logic. All mutations audited.

### Phase A — Foundations (weeks 1–4)
1. Monorepo bootstrap: Turborepo + pnpm + TS strict + ESLint + Prettier.
2. Neon Postgres + base Drizzle schema (tenancy + user + audit + RLS harness).
3. `apps/api` skeleton: tRPC + Express (or Hono) + Zod + Sentry + OTel.
4. Auth: email+password (Argon2id), session cookies, TOTP 2FA, WebAuthn passkeys, password reset.
5. `apps/web` skeleton: Vite + React 19 + Tailwind 4 + shadcn + TanStack Router + PWA plugin.
6. i18n scaffold (FormatJS, ES-AR default).
7. CI/CD: GitHub Actions → Fly deploys + preview envs per PR.
8. Docker dev stack: Postgres, Redis, MinIO (R2 local), Mailhog.
9. Telemetry package wired into all apps.
10. README + dev setup docs.
**Exit:** sign up → create tenant → invite user → sign in → land on empty `/dashboard` with working telemetry, all in a deployed preview env.

### Phase B — Listings & Contacts Core (weeks 5–10)
Properties + media + features + owners; Contacts + relationships + segments; import wizard; map view; borradas/recovery; property history; audit.
**Exit:** load a real agency's portfolio + contacts via CSV importer in < 1 hour, browse fluently.

### Phase C — CRM, Pipelines & Calendar (weeks 11–16)
Pipelines + stages + leads + kanban + funnel; inquiries + match engine; calendar + Google/M365 sync; tasks + reminders; dashboard KPIs; auto-assignment + SLA.
**Exit:** end-to-end sales workflow — portal lead → contact → deal → won — with SLA enforcement.

### Phase D — Inbox, Portals & Publishing (weeks 17–23)
Unified inbox (8 channels); 8 portal adapters; Difusión with per-portal overrides; email campaigns; nurture flows.
**Exit:** listing publishes to 3+ portals; inbound leads flow to inbox; conversations unified per contact; campaigns deliver and track opens/clicks.

### Phase E — Documents, E-Sign & Reservations (weeks 24–28)
Template engine + PDF gen + Signaturit + DocuSign; Reserva/Boleto/Escritura lifecycle; commission splits; compliance mapping.
**Exit:** full transaction closed inside the product with valid e-signed Boleto.

### Phase F — AI & RAG (weeks 29–33)
pgvector + FTS hybrid + RRF; 11 features; multi-provider router; eval harness; cost controls; copilot with tool use.
**Exit:** every AI feature behind feature flag, with ≥ 80% eval pass rate, per-tenant monthly cost cap enforced.

### Phase G — Sitio, Analytics, Billing & Appraisals (weeks 34–38)
Next.js + Puck + 5 themes + custom domains + forms; 12 operational + 10 strategic reports; Stripe + Mercado Pago + AFIP; appraisal module with comps + AI narrative.
**Exit:** tenant publishes website with custom domain; runs paid subscription via Stripe/MP; AFIP invoices emitted with valid CAE.

### Phase H — Polish, Mobile GA, Launch (weeks 39–40+)
Capacitor iOS + Android submissions; WCAG 2.2 AA audit + fixes; pen test + fixes; load test (10k concurrent, 1M listings); performance budget enforcement (Lighthouse ≥ 90); public API + SDK GA; Tokko migration tooling stable; launch marketing site.
**Exit:** public GA — meets all success criteria in Section 16.

## 14. Cross-Cutting Requirements

### 14.1 Testing
- **Unit**: Vitest everywhere. Domain logic 100% covered.
- **Integration**: Vitest + Testcontainers (Postgres + Redis). Every tRPC procedure has happy + unhappy path tests.
- **E2E**: Playwright against preview env. Smoke per module on every PR. Full regression nightly.
- **Load**: k6 scripts in `tools/loadtest/`. Benchmarks before each phase exit.
- **AI eval**: mandatory regression gate per PR touching AI.

### 14.2 Observability
- Sentry for errors + releases.
- OpenTelemetry traces, metrics, logs → Grafana Cloud.
- PostHog for product analytics + feature flags + session replay.
- Structured logs (JSON) with `tenantId`, `userId`, `requestId`, `traceId` on every line.

### 14.3 Security
- Argon2id (m=64MB, t=3, p=4).
- Session cookies HttpOnly + Secure + SameSite=Lax, 30d rotating.
- CSRF double-submit tokens on REST.
- Rate limiting (Redis token bucket) per IP + per user + per tenant.
- Dependabot + Snyk in CI. Block PR on high severity.
- Secrets in Fly secrets + Doppler (no env files in git).
- Pen test pre-GA (required).
- Bug bounty (HackerOne) post-GA.
- SOC 2 control mapping documented.

### 14.4 Performance budgets
- API p95 < 200ms for reads, < 500ms for writes (excluding AI).
- Web: Lighthouse Performance ≥ 90 on Panel, Propiedades list, Oportunidades kanban, Bandeja.
- p95 LCP < 2.5s on 4G (LATAM baseline).
- Bundle budget: initial JS < 250KB gzipped on first paint.
- Images via CF Images, responsive srcset, AVIF/WebP.

### 14.5 Accessibility
- WCAG 2.2 AA minimum.
- Axe in CI (no serious violations).
- Keyboard navigation + visible focus + skip links.
- Screen-reader tested on NVDA + VoiceOver monthly.

### 14.6 Internationalization
- FormatJS (react-intl) everywhere; no hard-coded strings.
- Currency + date + number per locale.
- Language fallback chain: user → tenant → en.
- ES-AR primary; ES, MX-ES, PT-BR, EN scaffolded.

### 14.7 Compliance
- **Ley 25.326 (AR)**: DSR endpoints (access/rectify/delete/portability), data-processing register, consent ledger, 90d retention for deleted PII.
- **Ley 25.506 (AR)**: e-signature compliance via Signaturit; audit trails stored permanently.
- **AFIP**: CAE invoice emission per invoice type (A, B, C, E as applicable); monotributo + IVA regimes.
- **OWASP ASVS L2** control mapping.
- **GDPR**-compatible controls (for future EU expansion).

## 15. Environments, Secrets & Third-Party Accounts

### 15.1 Environments
- `local` (Docker compose)
- `preview` (per-PR, Fly + Neon branch)
- `staging` (pre-prod, shared)
- `production` (Fly primary São Paulo + secondary Santiago)

### 15.2 Required accounts (Paperclip provisions)
Fly.io · Neon · Upstash Redis · Cloudflare (R2 + Images + Pages + DNS) · Mux · AWS (SES + SNS) · Postmark · Twilio · 360dialog · Meta Developer (WA/IG/FB) · Google Cloud (OAuth for Gmail/Calendar) · Microsoft Entra (OAuth for M365) · Signaturit · DocuSign · Anthropic · OpenAI · Google AI (Gemini) · Stripe · Mercado Pago · AFIP (WSAA cert) · Sentry · Grafana Cloud · PostHog · GitHub Actions · Snyk · Doppler · Apple Developer · Google Play Console.

### 15.3 Secrets convention
- Never committed. Loaded from Doppler in all envs.
- Rotation schedule: 90d for API keys, 30d for signing secrets.

## 16. Definition of Done (GA)

A release is GA when **all** of the following are true:

1. All 18 modules deliver acceptance criteria in Section 11.
2. All 11 AI features meet ≥ 80% eval pass rate.
3. 8 portal adapters operational with < 1% sync-error rate over 7 days.
4. Unified inbox supports all 8 channels with ≥ 99.9% delivery success.
5. Documents + e-sign full lifecycle verified with Signaturit and DocuSign.
6. Website builder produces sites meeting Lighthouse ≥ 90 on Performance, SEO, Accessibility.
7. Reports: all 12 ops + 10 strategic views render < 2s at 100k listings.
8. Billing: Stripe + Mercado Pago + AFIP tested end-to-end with real test cards + sandbox CAE.
9. Capacitor iOS + Android apps approved in App Store + Play Store.
10. WCAG 2.2 AA audit passes with zero serious violations.
11. Pen test complete; zero critical + zero high findings.
12. Load test: sustains 10k concurrent users, 1M listings, 50k daily messages with p95 < 500ms.
13. Uptime instrumented; SLA targets (99.9% standard, 99.95% enterprise) monitored.
14. Tokko migration tool imports real export with < 0.1% data loss.
15. Public OpenAPI 3.1 spec + SDK published and documented.
16. Compliance docs complete: Ley 25.326, Ley 25.506, AFIP mappings, SOC 2 control table.
17. Runbooks for: deploy, rollback, DB migration, portal outage, provider outage, security incident.
18. User docs (Mintlify) covering every module at end-user level.
19. Dev docs covering architecture, contributing, local setup, testing, release.
20. Zero criticals + zero highs in Sentry over the 7 days preceding launch.

## 17. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Portal APIs undocumented/unstable | Adapter abstraction + fallback to XML feed + contract tests against recorded fixtures |
| WhatsApp provider changes policy | Support 360dialog + Meta Cloud; swap in < 1 day |
| AFIP invoice downtime | Queue + retry with transparent user-facing status; offline draft invoice |
| AI provider outage | Multi-provider routing with automatic fallback |
| AI cost explosion | Per-tenant monthly budget + degrade to cached answers + smaller models |
| LLM hallucination in doc Q&A | Strict citations; "no answer" path; structured output validation |
| Portal scraping blocked | Official APIs first; scraping as last resort with respectful rate limits |
| Neon branching limits | Upgrade plan or pair with read replicas as traffic grows |
| Multi-tenant data leak | RLS + integration tests with two tenants per procedure; quarterly audit |
| E-sign legal challenge | Pin to Signaturit's Ley 25.506-certified flow; keep full audit trail; DocuSign fallback |

## 18. Handoff Checklist (for Paperclip)

- [ ] Provision required accounts from Section 15.2.
- [ ] Create monorepo per Section 6.
- [ ] Execute Phase A exit criteria (Section 13).
- [ ] At each phase exit: run acceptance tests, present demo env URL, await human sign-off.
- [ ] Raise blockers within 24h of discovery — do not silently defer scope.
- [ ] Weekly status update: phase progress, blockers, risks, metrics snapshot.
- [ ] Final GA: complete Section 16 checklist; produce audit bundle (pen test report, WCAG audit, load test report, SOC 2 control map, compliance docs).

---

**End of brief. Total scope: ~40 engineering weeks equivalent, ~15 packages, ~150 tables, ~500 tRPC procedures, ~200 UI routes, 11 AI features, 8 portal adapters, 8 inbox channels, 4 pricing tiers, 2 native apps.**
