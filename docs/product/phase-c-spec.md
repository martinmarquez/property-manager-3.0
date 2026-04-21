# Phase C Product Spec — CRM, Pipelines & Calendar

**Phase:** C (weeks 11–16)  
**Status:** Draft — can be refined after Phase B exits  
**Owner:** Product Manager  
**Updated:** 2026-04-20  
**Exit criteria:** Full end-to-end sales workflow — portal lead → contact → deal → won — with SLA enforcement and calendar integration.

---

## 1. Module: Oportunidades (`/leads`)

### 1.1 Pipeline Configuration UX

**Route:** `/settings/pipelines`  
**Access:** `admin` and above.

#### Pipeline list
- Table: Pipeline name, Type (ventas/alquileres/desarrollos/custom), Stage count, Lead count, Default badge, Actions (Edit, Archive, Set as default).
- "+ Nuevo pipeline" CTA: opens create modal.
- Each tenant has at least one pipeline; the default is used when a lead is created without specifying one.

#### Create/Edit pipeline modal
**Step 1 — Pipeline info:**
- Name (required, max 60 chars)
- Type: `ventas | alquileres | desarrollos | custom` (cosmetic only — no behavior difference)
- Set as default (toggle)

**Step 2 — Stage editor:**
- Drag-to-reorder stage list.
- Each stage row: color swatch picker (12 preset colors), name (required), Stage kind (`open | won | lost`), SLA hours (optional integer — "leads older than N hours in this stage trigger SLA warning").
- "+" button adds a new stage row at the bottom.
- Trash icon removes a stage (if stage has 0 leads; otherwise prompts "Move existing leads to stage X before deleting").
- At least one `won` stage and one `lost` stage required.
- Stage order is the visual order in the kanban.

**Visual preview:**
- As stages are edited, a live mini-kanban preview renders on the right side of the modal showing the column names and colors.

**Save:** validates (min 2 stages, at least 1 won + 1 lost), then saves. If stages were renamed/reordered, `lead_stage_history` entries are preserved (no data loss).

#### Per-stage SLA hours behavior
- When a lead enters a stage with `sla_hours` set, a background timer starts.
- After `sla_hours * 0.75`, the stage header in kanban shows an amber clock badge (warning).
- After `sla_hours`, the card badge turns red (overdue). The card is also surfaced in the Dashboard "SLA vencido" widget.
- Agents with leads overdue receive an in-app notification (+ email if configured).
- SLA timer resets when the lead moves to any new stage.

---

### 1.2 User Stories

#### US-C01: Lead Kanban Board

**As** an agent,  
**I want** to manage my deals on a visual kanban board,  
**so that** I can see where every deal stands at a glance and move them forward with minimal friction.

**Given** I navigate to `/leads`,  
**When** the page loads,  
**Then** I see the kanban board for my default pipeline: one column per stage, each column showing total lead count and total expected value at the header, cards in that stage below, newest-created first by default.

**Given** I drag a card from column A to column B,  
**When** I drop it,  
**Then**: the card animates to the new column; the move is optimistically reflected; the server writes `lead_stage_history` row; a `lead.stage_changed` event fires; other users viewing the board see the change within 500ms via WebSocket subscription.

**Given** I click a card,  
**When** the lead detail sheet opens,  
**Then** I see: contact name/avatar (linked to `/contacts/:id`), property of interest (linked), pipeline stage, expected value + currency, expected close date, assigned agent, lead score badge, last activity, notes, linked inquiries, and timeline of events.

---

#### US-C02: Pipeline List View

**As** an agent,  
**I want** to view my leads in a sortable table view,  
**so that** I can analyze many leads at once and apply bulk actions.

**Given** I click the "Lista" view toggle,  
**When** the list renders,  
**Then** I see columns: Contact, Property of interest, Stage, Expected value, Expected close date, Score, Assigned agent, Last activity, SLA status. All columns sortable.

**Given** I select multiple leads and click "Mover a etapa",  
**When** I choose a target stage from the dropdown,  
**Then** all selected leads move to that stage; one `lead_stage_history` row per lead; bulk action is undoable within 5 seconds via undo toast.

---

#### US-C03: Lead Creation

**As** an agent,  
**I want** to create a new lead from any context (inquiry triage, contact profile, property detail, or +New button),  
**so that** I can track every sales opportunity without leaving my current workflow.

**Given** I click "+ Nueva oportunidad" from anywhere,  
**When** the create modal opens,  
**Then** the form pre-fills: Pipeline (default), Stage (first open stage), Assigned agent (me). Required fields: Contact (search/create inline), Pipeline. Optional: Property, Expected value, Expected close date, Source.

**Given** I create a lead from an Inquiry record,  
**When** the lead is saved,  
**Then**: the inquiry is linked to the lead; the inquiry's contact is auto-linked to the lead contact; a `lead.created` event fires; the lead appears in the kanban; the inquiry moves to status "converted".

---

#### US-C04: Funnel Analytics

**As** an agency manager,  
**I want** to see conversion rates between pipeline stages and average time spent per stage,  
**so that** I can identify where deals are stalling.

**Given** I navigate to `/leads/funnel`,  
**When** the view loads,  
**Then** I see a funnel chart (top = first stage, narrowing to last) with: lead count per stage, percentage conversion from previous stage, average days in stage.

**Given** I filter by date range and agent,  
**When** the chart updates,  
**Then** the funnel reflects only leads created (or closed) in that range, for the selected agents. The calculation uses `lead_stage_history` to compute time-in-stage.

---

### 1.3 Lead Scoring

Lead score is a 0–100 integer, computed by a background job on lead create/update and by the AI pipeline insights feature.

#### Scoring inputs

| Signal | Weight | Notes |
|---|---|---|
| Inquiry criteria vs. available listings | 25 pts | How many active listings match the inquiry (scaled to 25) |
| Response recency | 20 pts | Last contact < 24h → 20; < 7d → 10; < 30d → 5; > 30d → 0 |
| Engagement depth | 15 pts | # of inbox messages (in + out); capped at 15 for 5+ messages |
| Email open rate | 10 pts | If campaign emails sent, open rate × 10 |
| Contact completeness | 10 pts | # of non-null key fields (email, phone, address, DNI, notes) / 5 × 10 |
| Stage advancement | 10 pts | If lead has advanced ≥ 2 stages from initial, +10 |
| Agent manual override | 10 pts | Agent can set a +10 "hot" flag on any lead |

#### Score display
- Badge on kanban cards: 0–30 = gray (cold), 31–60 = blue (warm), 61–85 = orange (hot), 86–100 = red (fire).
- On lead detail: score shown as number + color badge + "Ver detalle" link that expands which signals contributed and how much.
- Score rationale text (AI feature #8): "Score 78: has 3 matching listings (ZP, Arg, ML), responded to last 2 emails within 1h, inquiry is 12 days old."

#### AI-driven stage suggestions
- If a lead has been in a non-final stage for > `sla_hours * 2`, the AI pipeline insights job suggests: "Este lead lleva 10 días sin actividad. Opciones: contactar hoy, mover a Congelado, o cerrar como perdido."
- Suggestions appear as a dismissible banner on the lead card in kanban (hovering the card).

---

### 1.4 Acceptance Criteria

#### Pipeline Configuration
- [ ] Pipeline CRUD validates: name required, ≥ 2 stages, ≥ 1 won stage, ≥ 1 lost stage
- [ ] Stage delete blocked if stage has active leads; user prompted to move them first
- [ ] SLA hours field: integer ≥ 1; if blank = no SLA for that stage
- [ ] Pipeline reorder (drag stages) preserves all existing leads' stage assignment
- [ ] Multiple pipelines supported; filter in kanban to switch pipeline

#### Kanban Board
- [ ] Drag-and-drop works with mouse and touch (mobile-compatible)
- [ ] Optimistic update: card appears in target column immediately; rolls back with error toast if server rejects
- [ ] WebSocket update: another agent's move reflects < 500ms on my open board
- [ ] Column totals (count + expected value sum) update in real-time without reload
- [ ] "Select all in column" checkbox; bulk-move available
- [ ] Kanban URL includes `?pipeline=<id>` so specific pipeline is bookmarkable/shareable

#### Lead Create/Edit
- [ ] `lead_stage_history` written on every stage change (initial create = first entry)
- [ ] `lead.created/updated/stage_changed/won/lost` events emitted; `audit_log` written
- [ ] Won/Lost actions require: Won → close date + final value + won_reason; Lost → lost_reason (dropdown + optional note)
- [ ] Re-open a closed lead: allowed for any `won` or `lost` lead; moves back to first open stage; writes history entry

#### Funnel Analytics
- [ ] Conversion % = leads that entered stage B / leads that entered stage A (same pipeline, same date window)
- [ ] Average days in stage = median of `lead_stage_history` time-in-stage for completed transitions
- [ ] Funnel view exportable as CSV and PNG image

---

## 2. Module: Consultas (`/inquiries`)

### 2.1 Match Score Display

Inquiries represent a buyer's or renter's search criteria. The match engine scores each active listing against each active inquiry.

#### Score computation (0–100)

| Criterion | Max pts | Logic |
|---|---|---|
| Operation match | 15 | inquiry.operation_kind == listing.operation_kind → 15, else 0 |
| Property type match | 10 | exact match → 10; same group (e.g. apt vs PH) → 5; else 0 |
| Price within range | 20 | price within ±5% of max → 20; within max → 15; within +20% of max → 5; else 0 |
| Bedrooms ≥ min | 15 | ≥ inquiry.bedrooms_min → 15; bedrooms_min - 1 → 8; else 0 |
| Zone match | 20 | same neighborhood → 20; same locality → 12; same province → 5; else 0 |
| Required features present | 10 | pct of required_features present on listing × 10 |
| Semantic similarity | 10 | embedding cosine similarity (inquiry text ↔ listing description) × 10 |

**Score is recomputed:**
- When a new listing is created or a listing is updated (price, status, type, location, features).
- When an inquiry is created or its criteria are updated.
- On-demand via `inquiry.refreshMatches(id)` procedure.

#### Score display in UI

**On inquiry detail (`/inquiries/:id`):**
- Matches list shows: property cover photo, address, price, matched score badge (color-coded: 0–39 gray, 40–69 blue, 70–89 orange, 90–100 green), and a "Por qué coincide" tooltip expanding the individual criterion scores.

**Score explanation tooltip content:**  
```
Score: 82/100
✔ Operación: Venta +15
✔ Tipo de propiedad: Departamento +10
✔ Precio: $195.000 USD (dentro del rango) +20
✔ Dormitorios: 3 (cumple mínimo 2) +15
✔ Zona: Palermo Soho (coincide barrio) +20
△ Características requeridas: 1/2 presente +5
△ Similitud semántica: 78% +7
Total: 92/100 (redondeado a 92)
```

**On property detail (Análisis tab):** shows which inquiries match this listing with scores, and a "Notificar contacto" button per inquiry.

---

### 2.2 Notify Contact Flow

When an agent finds matching listings for an inquiry, they can send a personalized shortlist to the contact.

#### Trigger points
1. From `inquiry.matches` list: "Enviar selección" button → opens notify modal.
2. From property Análisis tab: "Notificar a N contactos con consultas similares" → opens notify modal with property pre-selected.
3. Automated: if `notify_on_new_match` flag is set on an inquiry and a new listing scores ≥ configured threshold (default 70), a notification job is queued automatically.

#### Notify modal (manual flow)

**Step 1 — Select listings:**  
Matches shown as a grid; user selects 1–10 listings to include in the shortlist. Each card shows: photo, address, price, score badge.

**Step 2 — Preview message:**  
AI drafts a personalized message (AI feature #4) in the contact's preferred channel:
- If contact has WhatsApp: WhatsApp template pre-filled (using approved Business template if first outreach).
- If email-only: HTML email with a responsive property card layout.
- Agent can edit the draft before sending.

**Message template (email):**
```
Hola [Nombre],

Te compartimos propiedades que coinciden con tu búsqueda de [tipo] en [zona] 
hasta [precio]:

[Property card: photo, address, bedrooms, m², price, "Ver detalles" button]
[Property card: ...]

¿Querés coordinar una visita? Respondé este email o escribinos al [phone].

Saludos,
[Agent name] — [Agency name]
```

**Message template (WhatsApp):**  
```
Hola [Nombre], tenemos propiedades que se ajustan a tu búsqueda 🏠
[Link to shortlist page on agency website]
¿Coordinamos una visita esta semana?
```

**Step 3 — Send:**  
Clicking "Enviar" dispatches via `inbox_thread` (creates new thread or appends to existing thread for this contact). A `lead.inquiry_notified` event fires. If the contact doesn't yet have an open lead, a lead is created in the first open stage of the default pipeline.

#### Shortlist public page (on agency website)
Each notification includes a link to a shortlist page: `[agency-site]/shortlist/[token]`  
- Token is a short-lived (30 days) URL-safe token.
- Page shows the selected listings with contact form to request visits.
- Page view events fire back to `inquiry_match.notified_at` and increment analytics.

---

### 2.3 User Stories

#### US-C05: Inquiry List View

**As** an agent,  
**I want** to view all buyer/renter search criteria in one place,  
**so that** I can match incoming inquiries to my active listings efficiently.

**Given** I navigate to `/inquiries`,  
**When** the page loads,  
**Then** I see a list of active inquiries with: contact name, operation type, property type, zone(s), price range, # of matches (with score distribution), status, created date, assigned agent.

**Given** a new listing is published that matches existing inquiries,  
**When** the match engine runs (triggered by `property.created` event),  
**Then** affected inquiries show an updated match count within 30s; a badge "N nuevas coincidencias" appears on the inquiry card.

---

#### US-C06: Inquiry Create/Edit

**As** an agent,  
**I want** to capture a buyer's or renter's search criteria in a structured form,  
**so that** the match engine can continuously surface relevant listings.

**Given** I click "+ Nueva consulta",  
**When** the form loads,  
**Then** I see: Contact (required), Operation (required), Property types (multi-select), Bedrooms min, Rooms min, Price min/max + currency, Area min m², Zones (multi-select with geographic hierarchy), Required features (tags), Notes, Notify automatically toggle (threshold: 0–100 slider).

**Given** I save the inquiry,  
**When** the match engine runs,  
**Then** within 2 minutes I see a match count on the inquiry detail page.

---

### 2.4 Acceptance Criteria

#### Match Engine
- [ ] Score recomputes within 30s of triggering event (listing created/updated, inquiry created/updated)
- [ ] 1,000 inquiries × 10,000 listings full refresh completes < 2 minutes (nightly cron job)
- [ ] Score is deterministic: same inquiry + listing always produces same score
- [ ] Score criteria are shown in UI per match (no black-box scoring)

#### Notify Contact Flow
- [ ] Manual notify: agent selects 1–10 listings, previews AI-drafted message, edits if needed, sends
- [ ] Automated notify: fires when `notify_on_new_match=true` AND score ≥ threshold AND contact not notified about this listing in last 30 days
- [ ] Sending creates inbox_thread (or appends to existing); thread is linked to inquiry and lead
- [ ] Shortlist page token is unpredictable (32-char random); expires 30 days after generation
- [ ] Page view on shortlist page records `inquiry_match.viewed_at`; fire-once dedup by session

---

## 3. Module: Calendario (`/calendar`)

### 3.1 User Stories

#### US-C07: Calendar View

**As** an agent,  
**I want** to see all my events, visits, and tasks in a unified calendar,  
**so that** I can manage my time and never miss a scheduled visit.

**Given** I navigate to `/calendar`,  
**When** the page loads,  
**Then** I see a monthly view (default) with events color-coded by event type; I can switch to week, day, or agenda (list) view using keyboard or toggle.

**Given** I click an empty calendar slot,  
**When** the event create popover opens,  
**Then** it is pre-filled with that date/time; I can set: title, event type, linked entity (contact/property/lead), attendees (agents from my tenant), location, description, recurrence rule; clicking "Guardar" creates the event.

---

#### US-C08: Google / Microsoft 365 Calendar Sync

**As** an agent,  
**I want** to connect my Google or Outlook calendar and have events sync bidirectionally,  
**so that** I don't have to manage two calendars.

**Given** I navigate to `/settings/integrations` and connect my Google Calendar,  
**When** the OAuth flow completes,  
**Then** Corredor events are pushed to Google Calendar immediately; Google Calendar events are pulled and displayed in Corredor (read-only by default, configurable).

**Given** I create an event in Corredor,  
**When** the sync job runs,  
**Then** the event appears in Google Calendar within 1 minute.

**Given** someone deletes or modifies an event in Google Calendar,  
**When** the sync job runs,  
**Then** the change propagates to Corredor within 1 minute.

---

#### US-C09: Event Types

**As** an agency admin,  
**I want** to define and customize event types with colors and default durations,  
**so that** agents can quickly distinguish visits from calls and internal meetings on the calendar.

**Given** I navigate to `/settings/event-types` (or `/calendar/types`),  
**When** the page loads,  
**Then** I see the default event types (Visita, Llamada, Reunión, Tarea, Seguimiento, Nota) plus any custom types created by my agency.

**Given** I create a new event type "Firma de contrato" with color purple and default duration 60 minutes,  
**When** I create an event of this type,  
**Then** the calendar shows it in purple, the duration input defaults to 60 minutes, and the description template (if set for this type) is pre-filled.

---

### 3.2 Sync Conflict Resolution UX

Conflicts arise when the same event is modified in both Corredor and an external calendar between sync runs.

#### Conflict types

| Scenario | Resolution |
|---|---|
| Modified in Corredor, not in Google | Corredor wins; push update to Google |
| Modified in Google, not in Corredor | Google wins; update Corredor record |
| Modified in both (conflict) | Show conflict resolution modal to agent |
| Deleted in Corredor, exists in Google | Delete from Google |
| Deleted in Google, exists in Corredor | Present "restore or keep deleted" choice to agent |

#### Conflict resolution modal

Appears on the calendar page as a banner: "N conflictos de sincronización requieren tu atención."

**Modal layout:**
- Event title + date/time
- Two columns: "Tu versión (Corredor)" vs "Versión externa (Google)"
- Highlighted differences (time, title, description, attendees)
- Action buttons: "Usar versión de Corredor" | "Usar versión de Google" | "Fusionar manualmente"
- "Fusionar manualmente" opens the event editor pre-filled with Corredor values; agent edits and saves; conflict marked resolved.

#### Sync polling and conflict window

- Sync runs every 1 minute via BullMQ scheduled job (not on every API request).
- Conflict detection window: if an event's `updated_at` in both systems is within the last sync interval, it's a conflict.
- `calendar_event.external_etag` stored per sync to detect external changes.
- Maximum pending conflicts shown: 10 at a time; older unresolved conflicts auto-resolved to "Corredor wins" after 7 days with notification to admin.

---

### 3.3 Event Types: Visual Distinction

#### Default event types

| Type | Color | Icon | Default duration | Description template |
|---|---|---|---|---|
| Visita | Green (`#22c55e`) | 🏠 House | 60 min | "Visita a propiedad [property.title] con [contact.name]" |
| Llamada | Blue (`#3b82f6`) | 📞 Phone | 15 min | "Llamada de seguimiento con [contact.name]" |
| Reunión | Purple (`#8b5cf6`) | 👥 People | 60 min | "Reunión con [contact.name] sobre [lead.description]" |
| Tarea | Orange (`#f97316`) | ✅ Check | 30 min | "" (free-form) |
| Seguimiento | Yellow (`#eab308`) | 🔔 Bell | 15 min | "Seguimiento a [lead.description]" |
| Firma de documentos | Red (`#ef4444`) | ✍️ Pen | 90 min | "Firma de [document.title] con [contact.name]" |

**Custom types:** created per tenant; inherit all properties above (color, icon from fixed set of 20 icons, default duration, template).

#### Calendar visual rendering rules

- Event blocks are color-filled with the event type color (10% opacity fill, solid left border).
- Event type icon shown as a 16×16 glyph at start of event block text.
- All-day events shown as solid color pill at top of day column.
- Tasks (from `/tasks`) appear as a checkmark-prefixed entry; tasks have no time block (point-in-time, shown at due time).
- Google Calendar events (synced, not native) shown with a small Google icon badge to distinguish them.
- Conflicted events (unresolved sync conflict) shown with a ⚠️ amber outline.

---

### 3.4 Acceptance Criteria

#### Calendar
- [ ] Supports event views: month, week, day, agenda; keyboard shortcuts: `m` month, `w` week, `d` day, `a` agenda; `j/k` navigate forward/back
- [ ] Drag-and-drop reschedule within the week/day view updates event time immediately (optimistic)
- [ ] Events linked to contact/property/lead show mini-card on hover with link to the related entity
- [ ] Recurrence rules: daily, weekly (select days), monthly (nth day or nth weekday), yearly; "this event only" vs "this and following" edit options
- [ ] Attendees: add by name (agents in tenant); each attendee gets an in-app notification + optional email invite (iCal attachment)
- [ ] Team view: admins/managers can view any agent's calendar in read mode; "switch to agent" dropdown

#### Google / M365 Sync
- [ ] OAuth connection flow: agent clicks "Conectar Google Calendar" → OAuth → redirected back with token stored encrypted; token refresh automated
- [ ] Events created in Corredor appear in Google within 60s
- [ ] Events modified/deleted in Google propagate to Corredor within 60s
- [ ] No duplicate events created on round-trip (ETag tracking prevents double-creation)
- [ ] Disconnect clears all synced external event records; Corredor-native events unaffected
- [ ] M365 sync: same behavior via Microsoft Graph API + OAuth 2.0

#### Conflict Resolution
- [ ] Conflicts appear in a dismissible banner on `/calendar`
- [ ] "Usar versión de Corredor" resolves conflict and pushes to external calendar
- [ ] "Usar versión de Google" overwrites Corredor record and logs resolution
- [ ] Manual merge: opens editor, saves resolved version, syncs to external calendar
- [ ] Resolved conflicts are logged in `audit_log`

#### Event Types
- [ ] Default types pre-seeded for every new tenant
- [ ] Admin can create/edit/delete custom types; delete blocked if type has scheduled events
- [ ] Color picker: 20 preset colors; no custom hex (keeps calendar visually legible)
- [ ] Icon picker: 20 preset icons from Lucide set

---

## 4. Module: Dashboard (`/dashboard`)

Phase C completes the Dashboard KPI widgets that depend on pipeline + calendar data.

### 4.1 Dashboard Widgets (Phase C additions)

| Widget | Data source | Update frequency |
|---|---|---|
| Hoy: Visitas programadas | `calendar_event` where type=visita AND starts_at = today | Realtime (WS) |
| Oportunidades por etapa | `lead` count per stage for my pipeline | Realtime (WS on lead board update) |
| SLA vencidos | Leads where SLA timer expired | Realtime |
| Leads sin actividad > 7 días | `lead` where last activity > 7d | Hourly |
| Pipeline total esperado | Sum of `lead.expected_value_amount` for open leads | On lead update |
| Nuevas consultas hoy | `inquiry` created today | Realtime |
| Tasa de conversión (últimos 30d) | Won leads / Total leads closed (30d window) | Daily MV |

### 4.2 Acceptance Criteria

- [ ] Dashboard loads within 1.5s including all widget data
- [ ] Realtime widgets update < 500ms via WebSocket without page reload
- [ ] Widgets are draggable and resizable; layout persisted per user in `localStorage` with server sync
- [ ] "Hoy: Visitas" widget links to calendar filtered to today's visits

---

## 5. Auto-Assignment Rules & SLA Policies

### 5.1 User Stories

#### US-C10: Auto-assignment Configuration

**As** an agency admin,  
**I want** to define rules that automatically assign incoming inquiries and leads to agents,  
**so that** no lead sits unassigned and agents work their area of expertise.

**Given** I navigate to `/settings/assignments`,  
**When** I click "+ Nueva regla",  
**Then** I configure: trigger event (new inquiry / new lead from portal / new lead from website), conditions (contact zone, property type, operation, source portal, branch), and action (assign to specific agent / round-robin among a group / assign to branch manager).

**Given** an inquiry arrives matching rule conditions,  
**When** the assignment engine evaluates rules (in priority order),  
**Then** the first matching rule's action is applied; if no rule matches, inquiry goes to the default agent or branch inbox.

#### US-C11: SLA Policy

**As** a branch manager,  
**I want** to set response-time SLA targets per channel and escalate when breached,  
**so that** our team maintains a < 2h response time to all new leads.

**Given** I configure an SLA policy: "First response within 2 hours for WhatsApp inquiries",  
**When** a new WhatsApp thread is created (via `inbox_thread`) and no reply is sent within 2 hours,  
**Then** the thread SLA timer expires, the thread is flagged "SLA vencido" in red in the inbox, and the agent's manager receives an in-app + email notification.

### 5.2 Acceptance Criteria

- [ ] Rules are evaluated in priority order (drag to reorder priority in settings)
- [ ] Rule conditions support AND logic across multiple criteria
- [ ] Round-robin assigns to the agent who has gone longest without a new lead in the pool
- [ ] SLA timer: starts when thread is created or inquiry is received; pauses outside configured business hours (optional per policy); resets when first reply is sent
- [ ] SLA breach notification: in-app to agent + manager; email if configured; no SMS/WhatsApp (to avoid channel costs)
- [ ] SLA adherence visible in `/reports` (SLA adherence report: % of leads responded within SLA by agent and period)

---

*End of Phase C spec.*
