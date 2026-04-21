# Tokko Teardown — Findings Synthesis

Synthesis across the 16 teardown notes in `./notes/`. Source material:
direct browser automation on `www.tokkobroker.com` as a paying customer
(agency 13206, user uid 41765), 2026-04-20. Framing: Option A — full
Tokko replacement, Argentina-first, multi-tenant CRM + Listings +
Portals + Website Builder + Documents + Analytics + AI, PWA mobile.

---

## 1. What Tokko actually is

Tokko Broker is the de-facto CRM/SaaS for Argentine real-estate
agencies. Single-product SaaS, Spanish-first, ~18 years old, running on
a hybrid stack:

- **`www.tokkobroker.com`** — Django + jQuery + Google Visualization
  Tables. Renders the majority of operational pages (property list,
  contact list, reservations, appraisals, admin). Inline `<script>` tags
  with hardcoded JWTs and `eval()` on API responses.
- **`app.tokkobroker.com`** — a React SPA embedded as iframes into the
  legacy pages for Calendar, Chat, and a handful of modern modals. JWTs
  passed via URL query params. Host ↔ iframe communication via
  `postMessage`.
- **`messenger.tokkobroker.com`** — separate service for chat +
  unread-lead counts. Polled every 120 s from every page.

Tokko covers: property inventory, contacts, leads/opportunities (8-stage
state machine), portal publishing (Zonaprop, Argenprop, MercadoLibre,
Proppit, etc.), cobrokering network (Red Tokko Broker), document
workflow (reservas → boletos → escrituras), appraisals, calendar,
email/chat, analytics, per-agency website builder, multi-branch
(sucursales y divisiones), permission matrix, custom property tags,
event types, auto-follow-up rules.

## 2. Why users complain

Cross-cutting UX issues that appear in every module:

### Two-frontend stitch
Iframes for modern features create double auth flows, double styles,
state that can't cross the frame boundary, popups blocked by popup
blockers, and URL-based JWTs that leak to logs.

### "Activar este filtro" redundant toggles
Every multi-select filter has a checkbox next to it to "activate" it.
Empty multi-selects already mean "no filter." This is redundant UI
friction on every list page.

### Stateful semantic codes
Property reference codes encode status + type + agent initials. When
status changes (e.g. Pendiente → Tasado) the code changes. Users can't
reliably screenshot, reference, or deep-link.

### Non-addressable views
Favorites is a top-bar flyout with no URL. Can't share, can't bookmark,
can't deep-link. Same for many modals.

### 48-checkbox notification grid
Notification preferences = 24 events × 2 channels (in-app + email) +
master toggle. No defaults, no quiet hours, no digest, no per-entity
mute, no WhatsApp/push.

### Placeholder data masquerading as real data
When appraisals are bulk-ingested without a contact, the owner field is
auto-filled with `"Propietario de :id-:address"`. Indistinguishable
from real owners in list views.

### Soft-delete without context
"Borradas" page shows who deleted but not when, not why. Restore is a
GET request. No unified trash across entity types.

### Legacy tech signals
Google Visualization Tables (pre-2015), twbs-pagination, string-concat
DOM building, `google.setOnLoadCallback`, `eval()` on AJAX responses,
jQuery `$.ajax`.

### Admin surface sprawl
Mi Empresa has 14 submenus. Agency admin and personal options overlap
(SMTP, timezone, language) with unclear precedence. API key is a flat
token shown once with no rotation UI.

## 3. Security issues (to avoid day 1)

Explicitly catalogued so the replacement product never ships them:

1. **JWTs rendered inline** in HTML `<script>` on every page; visible to
   any XSS.
2. **JWTs in URL query params** for iframe embeds (`/outsidelayout/calendar?jwt=...`);
   leak via server logs, browser history, referrer headers.
3. **`eval()` on API responses** (`/properties/filter_reservations`);
   trivial XSS vector if any user-controlled field is insufficiently
   sanitized.
4. **GET for mutations** (`/property/restore_property?id=:id`);
   CSRF-vulnerable, cached, logged.
5. **Flat API key** with no scoping, no rotation UI, no audit trail.
6. **Hardcoded `AUTHORIZATION` header value** in inline JS; prevents CSP
   `script-src` hardening.

Our product: HttpOnly session cookies (same-origin), no inline JWTs, no
`eval`, strict CSP, scoped API tokens with rotation, POST/PATCH/DELETE
for mutations, audit log on every mutation.

## 4. Domain taxonomy (Argentina-specific)

Captured from the live system and locked as baseline for our data model.

### Property types
Terreno, Departamento, Casa, Quinta, Oficina, Local, Cochera, PH,
Galpón, Campo, Hotel, Edificio, Fondo de comercio. Emprendimiento
(development) is a distinct top-level entity aggregating multiple
properties.

### Operation types
Venta, Alquiler, Alquiler temporario. Each can have its own price,
currency (ARS / USD / UF), commission config.

### Lead pipeline (8 stages, captured verbatim)
Sin Contactar → Sin Seguimiento → Pendiente contactar → Esperando
respuesta → Evolucionando → Tomar Acción → Congelado → Cerrado.
6 entry-point state-machine hooks (lead source → initial stage mapping).
Auto-transitions: idle 60d → Cerrado; 4d in stage → Tomar Acción; etc.
8 close reasons, each rated Positivo / Neutro / Negativo.

### Document workflow
Reserva (seña) → Boleto de compraventa → Escritura. Notary (escribano)
involved in the escritura stage; the first two are brokerage
documents. E-sign must be added at Boleto; Reserva today is often a
signed PDF or even a printed receipt.

### Portals (AR market)
Zonaprop, Argenprop, MercadoLibre Inmuebles, Proppit (Grupo Navent
aggregator), Inmuebles24, Remax, Properati, ZonaProp, Inmoclick, plus
15+ smaller/regional. 48-hour sync SLA to each portal is industry
standard.

### Cobrokering
Red Tokko Broker is the network where agencies share listings and split
commissions. `SP_` prefix on listings indicates "shared property" from
the network. Chat iframe has a specific view for colleague messages
about cobrokered deals.

### Multi-branch
Agencies have Sucursales (branches) and Divisiones (sub-teams within a
branch). Permissions cascade. Users can be visible to one or many
branches.

## 5. Competitive gaps we can exploit

Features Tokko does not have or does poorly:

| # | Gap | Why it matters |
|---|---|---|
| G1 | Unified inbox (WhatsApp + email + portal consults in one timeline) | WhatsApp is the #1 lead channel in Argentina; Tokko has no first-class WhatsApp integration |
| G2 | Realtime via WebSockets/SSE | Tokko polls every 120 s; counts stale |
| G3 | Draw-polygon map search | Industry standard in 2026, Tokko has only rectangle |
| G4 | Cmd-K command palette | No keyboard-first navigation anywhere in Tokko |
| G5 | First-class Reservation / Appraisal / Boleto / Escritura entities | Tokko treats these as metadata on Property, not typed records |
| G6 | LLM agent copilot (autofill descriptions from photos, email drafts, lead triage, semantic search, translation) | Tokko has no AI |
| G7 | Agency-level notification default templates | Every agent configures 48 checkboxes from scratch |
| G8 | Deletion with reason + unified Trash | Tokko has per-entity soft-delete, no reason |
| G9 | Shareable/addressable Favorites | Tokko favorites are a flyout with no URL |
| G10 | Modern document e-sign workflow | Tokko's Ficha y PDF is for listing PDFs, not contracts |
| G11 | Advanced analytics (cohort, funnel, commission forecast) | Tokko has table-style reports only |
| G12 | PWA mobile | Tokko has no PWA, no mobile app |
| G13 | Stable UUIDs + short codes | Tokko's reference codes mutate on status change |
| G14 | Draft-polygon + isochrone + "near subway" smart filters | Tokko has flat category filters only |
| G15 | Open API + webhooks | Tokko has a flat API key, basic REST, no webhooks |
| G16 | Modern UI with a single design system | Tokko has inconsistent styling across legacy + SPA |

## 6. Simplification backbone (UX principles)

Derived from the patterns that hurt every module in Tokko.

1. **One frontend.** Single SPA + server-rendered public site; no iframe
   stitching.
2. **URL is the state.** Every list, filter, view mode, sort, and
   pagination persisted in URL. Shareable. Bookmarkable.
3. **Command palette (Cmd-K) as the universal navigator.** Scoped by
   prefix.
4. **Typed entities.** Reservation, Appraisal, Boleto, Escritura,
   Commission all first-class with their own detail pages.
5. **Stable UUIDs; short codes that never mutate.**
6. **Unified list page with view switcher** (table / cards / map /
   kanban) per entity.
7. **Unified inbox** for colleague chat + web leads (WhatsApp + email +
   portal).
8. **Sensible defaults + grouped advanced.** 48-checkbox grid →
   6-group template with "defaults" + progressive disclosure.
9. **Delete with reason; unified Trash.**
10. **Precedence shown in UI.** Per-user override vs. agency default is
    always labeled (`"Using agency default: …"`).
11. **Realtime by default.** WebSockets / SSE for counts, new leads,
    chat, calendar updates. No polling.
12. **Accessibility + i18n built in.** ES-AR primary, EN + PT-BR as
    launch secondary, full keyboard nav, WCAG AA.

## 7. Data model backbone

Stable core entities identified across the teardown. This is the
starting point for the spec's data model section, not the final schema.

```
Agency
 ├─ Branch (Sucursal)
 │   ├─ Division
 │   └─ Member (User) ← role + permission-group
 ├─ PropertyCustomTagGroup
 │   └─ PropertyCustomTag
 ├─ EventType
 ├─ LeadStatus (pipeline stage definition)
 ├─ LeadCloseReason
 ├─ QuickReply (Respuesta rápida)
 ├─ AutoFollowUpRule (Seguimiento automático)
 ├─ PermissionGroup
 ├─ NotificationDefault
 ├─ SmtpConfig
 └─ AgencySite (website builder root)

User
 ├─ NotificationPreference (overrides agency default)
 ├─ PersonalSmtp
 └─ CalendarEvent

Property
 ├─ Operation (venta/alquiler/temporario) × 1..n
 │   └─ Price (multi-currency + history)
 ├─ Photo
 ├─ Video
 ├─ FloorPlan
 ├─ CustomTag (M:N with PropertyCustomTag)
 ├─ Location (lat/lng, address, zona, sub-zona)
 ├─ Owner (Contact)
 ├─ Producer (User) / Appraiser (User × n)
 ├─ AssignedAgents (User × n)
 ├─ PortalPublication × n (status per portal)
 ├─ SoftDelete { deleted_at, deleted_by, deletion_reason }
 └─ derived: Reservation × n, Appraisal × n

Contact
 ├─ ContactMethod × n (phone, email, whatsapp, telegram)
 ├─ Tag × n
 ├─ Opportunity × n
 ├─ Consultation × n
 ├─ SavedSearch × n
 └─ AssignedAgent (User)

Opportunity
 ├─ status (FK → LeadStatus)
 ├─ close_reason (FK → LeadCloseReason, when closed)
 ├─ FollowUp × n
 ├─ Comment × n
 ├─ Subscriber (User × n, opted-in)
 └─ Property × n (interested-in)

Consultation (web lead / portal lead)
 ├─ source (portal / site / direct / referral)
 ├─ Contact (nullable, resolved on triage)
 ├─ Property (nullable)
 └─ → Opportunity (when promoted)

Reservation
 ├─ Property, Contact
 ├─ amount, currency, commission
 ├─ status { active, signed, cancelled }
 ├─ est_date
 └─ → Boleto? → Escritura?

Appraisal
 ├─ Property?, Owner (Contact?)
 ├─ Producer, Appraiser × n
 ├─ status { draft, completed, cancelled, reappraisal_of: id }
 └─ Value

Boleto (contract document)
 ├─ Reservation
 ├─ signatures[] (e-sign)
 └─ pdf

Escritura (deed)
 ├─ Boleto
 ├─ escribano (notary info)
 └─ pdf

InboxThread
 ├─ type { colleague_chat, web_lead }
 ├─ channel { whatsapp, email, portal, site, telegram, sms }
 ├─ participants[]
 └─ Message × n

Notification (emitted event)
 ├─ event_code
 ├─ recipient (User)
 ├─ channel
 └─ read_at

Favorite { user_id, entity_type, entity_id, notes }
AuditLog { who, when, what, entity_type, entity_id, before, after }
Subscription { user_id, entity_type, entity_id }  ← per-entity mute/subscribe
```

## 8. AI / LLM capability surface

Locked as a horizontal capability. Concrete surfaces where LLM adds
differentiation, prioritized by user-value-per-build-week:

| Feature | Tech | Value |
|---|---|---|
| Lead triage: classify incoming WhatsApp/email/portal message → intent + urgency + property match + suggested reply | LLM + pgvector retrieval | Very high — agents waste hours on this |
| Semantic search across properties ("quinta con pileta y parrilla cerca de Escobar bajo USD 200k") | pgvector + BM25 hybrid | High |
| Autofill property description from photos + structured specs | Vision LLM | High — 30 min/property saved |
| Auto-translate incoming/outgoing messages (ES/EN/PT) | LLM | High for tourist-heavy markets |
| Email/WhatsApp draft suggestions based on lead stage + history | RAG over contact history | High |
| Contact deduplication | embedding similarity | Medium |
| Lead scoring (likelihood to close) | LLM + signals | Medium |
| Summarize long follow-up threads for handoff | RAG | Medium |
| Agency copilot: "show me all leads that went cold this week on Zonaprop from Pilar" | text-to-filter | High — replaces Cmd-K with natural language |
| Pricing suggestion (CMA assistant) using comparable listings | RAG over own inventory + public data | Medium — needs care with accuracy claims |

### Retrieval architecture
- pgvector (Postgres) for embeddings; no separate vector DB at launch.
- Hybrid retrieval: BM25 (Postgres FTS) + embedding similarity + metadata
  filters + per-tenant RLS.
- Context scope per call: always tenant-isolated; property/contact
  embeddings keyed by `(tenant_id, entity_type, entity_id)`.
- Model routing: cheap model (Haiku / GPT-4o-mini) for classification,
  frontier model (Sonnet / GPT-4o) for drafts + vision.
- Strict output schemas (structured outputs / JSON mode) — no free-form
  responses into production flows.

### Safety rails
- No AI agent autonomously sends messages to external contacts; always
  draft-then-human-approve by default. Optional auto-reply mode only for
  clearly-out-of-office / FAQ queries, with agency admin opt-in.
- Clear source attribution on RAG outputs ("based on these 3 properties
  in your inventory").
- Per-tenant isolation of embeddings; no cross-tenant training or
  retrieval.
- Auditable: every LLM call logged with prompt, retrieval set, response.

## 9. PWA / mobile strategy

- **Single codebase, responsive from day 1.** No separate native app at
  launch.
- **PWA with service worker** for offline property browsing (cached
  photos, inventory snapshot).
- **Push notifications** via Web Push (VAPID) — covers iOS 16.4+ and all
  Android.
- **Camera capture + geolocation** for on-site agents walking properties.
- **Install prompt** on return visit.
- **Background sync** for offline lead creation / property edits.
- Native wrappers (Capacitor) deferred to phase 2 if push or share-target
  UX demands it.

## 10. Multi-tenancy model

- **Row-level security** (Postgres RLS) with `tenant_id` on every row;
  policy enforced in DB, not just application.
- **Per-tenant Postgres schemas** rejected (bloat; migration pain).
- **Shared cluster, logical isolation** via RLS + tenant-scoped JWTs.
- **Domain model:** Tenant = Agency. Sub-units are Branches / Divisions,
  not tenants.
- **White-label:** custom domain + theming per Agency, served by the
  same SPA.
- **Data export / GDPR-style deletion** as first-class admin action per
  tenant.

## 11. Non-goals (stated for scope discipline)

- No Web3 / blockchain / smart contracts / tokenization.
- No fractional ownership / RWA.
- No crypto payments / stablecoin escrow.
- No native iOS/Android apps at launch (PWA only).
- No MLS integration outside Argentina at launch.
- No automated portal-rule arbitrage (we follow each portal's published
  rules; no growth-hacking).
- No agent auto-reply to leads without explicit per-agency opt-in.
- No resale of agency data across tenants.
- No free-form LLM output directly to external contacts.

## 12. Open questions (to resolve in design sections)

Flagged here so they don't get lost when we enter the section-by-section
design phase.

1. Payments/billing: which processor for SaaS subscription billing —
   Stripe? Mercado Pago (for AR tax treatment)? Both?
2. Portal sync mechanics: scraping vs. official APIs per portal (most AR
   portals are scraping-only).
3. E-sign provider: DocuSign LATAM, Signaturit, native build on top of
   Argentine firma digital Ley 25.506?
4. Deployment target: managed (Vercel + Supabase/Neon + Upstash) vs.
   self-hosted on a cloud (AWS/GCP)?
5. Realtime transport: WS (Pusher/Ably/self-hosted) vs. SSE?
6. Photo/video storage + CDN: S3+CloudFront vs. Cloudflare R2+Images vs.
   Bunny vs. Mux (for video)?
7. Observability stack: Sentry + OTel + Grafana? Datadog?
8. LLM provider: OpenAI-only, Anthropic-only, or multi-provider with
   routing?
9. Website-builder approach: form-driven templates vs. block-based
   visual editor (Puck / Plate)?
10. Monorepo structure: Turborepo? Nx? What's the split (web / api /
    workers / shared / mobile-pwa)?
