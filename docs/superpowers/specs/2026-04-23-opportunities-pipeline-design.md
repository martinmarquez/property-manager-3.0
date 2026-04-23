# RENA-33: Opportunities Pipeline Design Spec

## Overview

A full CRM pipeline module for Corredor: pipeline configuration (stages, colors, SLA), a drag-and-drop kanban board with real-time sync, a sortable list view with bulk operations, and funnel analytics with export. This covers US-C01 through US-C04 from the Phase C spec.

---

## 1. Database Schema

### 1.1 `pipeline` table

Tenant-scoped pipeline definitions. Multiple pipelines per tenant, one marked as default.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | RLS-isolated |
| `name` | text NOT NULL | e.g. "Ventas Departamentos" |
| `type` | enum `pipeline_type` | `ventas`, `alquileres`, `desarrollos`, `custom` |
| `is_default` | boolean NOT NULL DEFAULT false | Exactly one default per tenant (enforced via partial unique index) |
| `position` | integer NOT NULL DEFAULT 0 | Display ordering |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `created_by` | uuid FK → user | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_by` | uuid FK → user | |
| `version` | integer NOT NULL DEFAULT 1 | Optimistic concurrency |

**Constraint**: `CREATE UNIQUE INDEX pipeline_default_per_tenant ON pipeline (tenant_id) WHERE is_default = true AND deleted_at IS NULL;`

### 1.2 `pipeline_stage` table

Ordered stages within a pipeline. Each stage has a kind (open/won/lost), a color preset, and optional SLA hours.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | RLS-isolated |
| `pipeline_id` | uuid FK → pipeline ON DELETE CASCADE | |
| `name` | text NOT NULL | e.g. "Contacto inicial" |
| `kind` | enum `stage_kind` | `open`, `won`, `lost` |
| `color` | text NOT NULL DEFAULT '#4669ff' | Hex from 12 presets |
| `sla_hours` | integer | NULL = no SLA |
| `position` | integer NOT NULL | 0-indexed display order |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**Validation (application-level)**:
- Min 2 stages per pipeline
- At least 1 `won` and 1 `lost` stage
- Delete blocked if stage has active (non-deleted) leads

### 1.3 `lead` table

The core opportunity record linking a contact to a pipeline stage with value and timeline.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | RLS-isolated |
| `pipeline_id` | uuid FK → pipeline | |
| `stage_id` | uuid FK → pipeline_stage | Current stage |
| `contact_id` | uuid FK → contact | The prospect |
| `property_id` | uuid FK → property | Nullable — the linked property |
| `title` | text | Optional descriptive title |
| `expected_value` | numeric(15,2) | |
| `expected_currency` | enum `currency` | Reuses existing `ARS`/`USD` |
| `expected_close_date` | date | |
| `score` | integer NOT NULL DEFAULT 0 | 0-100, synced from contact.lead_score or overridden |
| `owner_user_id` | uuid FK → user | Agent/broker assigned |
| `lost_reason` | text | Populated when moved to a `lost` stage |
| `won_at` | timestamptz | Set when moved to a `won` stage |
| `lost_at` | timestamptz | Set when moved to a `lost` stage |
| `stage_entered_at` | timestamptz NOT NULL DEFAULT now() | When the lead entered the current stage (for SLA calc) |
| `deleted_at` | timestamptz | Soft delete |
| `deleted_by` | uuid FK → user | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `created_by` | uuid FK → user | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_by` | uuid FK → user | |
| `version` | integer NOT NULL DEFAULT 1 | |

### 1.4 `lead_stage_history` table

Immutable log of stage transitions. Powers funnel analytics (avg time-in-stage, conversion rates).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid NOT NULL | RLS-isolated |
| `lead_id` | uuid FK → lead ON DELETE CASCADE | |
| `stage_id` | uuid FK → pipeline_stage | The stage entered |
| `entered_at` | timestamptz NOT NULL DEFAULT now() | |
| `exited_at` | timestamptz | NULL while lead is in this stage |
| `moved_by` | uuid FK → user | Who triggered the move |

### 1.5 Color Presets

12 presets available in stage configuration:

```
#4669ff (brand blue), #22c55e (green), #f59e0b (amber), #ef4444 (red),
#8b5cf6 (violet), #06b6d4 (cyan), #ec4899 (pink), #f97316 (orange),
#14b8a6 (teal), #6366f1 (indigo), #84cc16 (lime), #64748b (slate)
```

### 1.6 Enums

```sql
CREATE TYPE pipeline_type AS ENUM ('ventas', 'alquileres', 'desarrollos', 'custom');
CREATE TYPE stage_kind AS ENUM ('open', 'won', 'lost');
```

### 1.7 Migration

Single migration file `0005_pipelines_leads.sql`:
- Creates enums, tables, indexes, RLS policies
- Seeds a default "Ventas" pipeline with stages: Contacto inicial (open) → Visita (open) → Propuesta (open) → Negociacion (open) → Ganado (won) → Perdido (lost)

---

## 2. API Design (tRPC)

### 2.1 Router Structure

Two new routers registered on the app router:

```typescript
appRouter = router({
  // ...existing
  pipelines: pipelinesRouter,
  leads:     leadsRouter,
});
```

### 2.2 `pipelines.*` Procedures

| Procedure | Type | Input | Notes |
|-----------|------|-------|-------|
| `pipelines.list` | query | — | All non-deleted pipelines with stages, ordered by position |
| `pipelines.get` | query | `{ id }` | Single pipeline with stages |
| `pipelines.create` | mutation | `{ name, type, isDefault, stages[] }` | Validates min 2 stages, ≥1 won, ≥1 lost |
| `pipelines.update` | mutation | `{ id, name?, type?, isDefault?, stages[]? }` | Full stage replacement (upsert by id or create new) |
| `pipelines.delete` | mutation | `{ id }` | Blocked if pipeline has active leads |
| `pipelines.reorder` | mutation | `{ ids[] }` | Reorder pipeline display positions |

### 2.3 `leads.*` Procedures

| Procedure | Type | Input | Notes |
|-----------|------|-------|-------|
| `leads.list` | query | `{ pipelineId, stageId?, ownerId?, search?, sort?, page? }` | Paginated, joins contact + property |
| `leads.kanban` | query | `{ pipelineId }` | Grouped by stage with counts + value sums; limited cards per stage (configurable, default 50) |
| `leads.get` | query | `{ id }` | Full lead with contact, property, stage history |
| `leads.create` | mutation | `{ pipelineId, stageId, contactId, propertyId?, title?, expectedValue?, ... }` | Creates lead + first history entry |
| `leads.update` | mutation | `{ id, ...fields }` | General field update |
| `leads.moveStage` | mutation | `{ id, targetStageId, lostReason? }` | Updates stage, records history, fires event, handles won/lost timestamps |
| `leads.bulkMoveStage` | mutation | `{ ids[], targetStageId }` | Batch move with single response |
| `leads.delete` | mutation | `{ id }` | Soft delete |
| `leads.funnel` | query | `{ pipelineId, dateFrom?, dateTo?, ownerId? }` | Aggregated: count per stage, % conversion, avg days-in-stage |

### 2.4 Real-Time (WebSocket via tRPC Subscriptions)

Use tRPC's built-in subscription support with WebSocket transport.

**Subscription**: `leads.onStageChange`
- Input: `{ pipelineId }`
- Emits: `{ leadId, fromStageId, toStageId, updatedLead }` whenever any lead moves stage
- Backend bridges EventBus `lead.stage_moved` events to the tRPC subscription observable
- Target latency: < 500ms from server persist to client render

**Frontend consumer**: The kanban board subscribes on mount. On receiving an event from another session, it patches the React Query cache (optimistic for own moves, reactive for others).

---

## 3. Frontend Architecture

### 3.1 New Dependencies

| Package | Purpose |
|---------|---------|
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | Kanban DnD (mouse + touch + keyboard accessible) |
| `recharts` | Funnel chart rendering |

### 3.2 Route Structure

```
/leads                          → KanbanPage (default, ?pipeline=<id>)
/leads?view=list                → ListViewPage
/leads/funnel                   → FunnelPage
/leads/new                      → LeadFormPage (create)
/leads/$leadId                  → LeadDetailSheet (slide-over)
/settings/pipelines             → PipelineListPage
/settings/pipelines/new         → PipelineEditorPage
/settings/pipelines/$pipelineId → PipelineEditorPage (edit)
```

### 3.3 Pipeline Configuration (`/settings/pipelines`)

#### PipelineListPage
- Card grid of existing pipelines showing name, type badge, stage count, lead count, default badge
- "Create pipeline" CTA button
- Click card → navigate to editor

#### PipelineEditorPage
- **Header**: Pipeline name input, type selector (dropdown: ventas/alquileres/desarrollos/custom), "Set as default" toggle
- **Stage editor**: Vertical list with DnD reorder (@dnd-kit/sortable). Each row:
  - Drag handle
  - Color dot (click → popover with 12 preset swatches)
  - Name input
  - Kind selector (open/won/lost) — dropdown
  - SLA hours input (number, optional)
  - Delete button (disabled with tooltip if stage has active leads)
  - "Add stage" button at bottom
- **Live mini-kanban preview**: Horizontal strip showing stage columns with names and colors. Updates in real-time as user edits stages. No data, just structure preview.
- **Validation**: Real-time validation badges — red if <2 stages, no won, or no lost. Save button disabled until valid.
- **Save**: Calls `pipelines.create` or `pipelines.update` with full stage array

### 3.4 Kanban Board (`/leads`)

#### Layout
- **Toolbar**: Pipeline selector dropdown (synced to URL `?pipeline=`), view toggle (kanban/list), "New lead" button, search input
- **Board**: Horizontal scrolling container of stage columns

#### Column
- **Header**: Stage color accent bar, stage name, lead count badge, expected value sum (formatted currency)
- **Body**: Vertical list of LeadCards, scrollable if overflow
- **Drop zone**: Full column body is a droppable target

#### LeadCard
- Contact avatar (initials fallback) + name
- Property reference code (if linked)
- Score badge: color-coded (green ≥70, amber ≥40, red <40)
- Age: "3d" / "2w" relative from created_at
- Last activity: relative timestamp
- SLA status badge:
  - **Green** (default): SLA not breached and <75% elapsed
  - **Amber**: ≥75% of SLA hours elapsed
  - **Red**: ≥100% SLA hours elapsed
  - Hidden if stage has no SLA
- Click → opens LeadDetailSheet (slide-over panel via Radix Dialog/Sheet)

#### Drag & Drop Behavior
- @dnd-kit with `PointerSensor` (mouse) + `TouchSensor` (mobile) + `KeyboardSensor` (a11y)
- **Optimistic update**: On drop, immediately move card in UI. Mutate via `leads.moveStage`. On error, roll back.
- **Cross-column**: Move between any open/won/lost stages. When dropping on a `lost` stage, prompt for lost reason (small dialog).
- **Same-column reorder**: Not tracked (leads within a stage are sorted by stage_entered_at DESC by default)
- **WS broadcast**: After server confirms, fires `lead.stage_moved` event → other open sessions update via subscription

#### Mobile
- Touch drag with activation distance threshold (8px) to avoid interfering with scroll
- Columns scroll horizontally via native scroll + snap points

### 3.5 List View (`/leads?view=list`)

Uses @tanstack/react-table (already installed).

#### Columns
| Column | Sortable | Content |
|--------|----------|---------|
| Contact | Yes | Avatar + name, click → contact detail |
| Property | Yes | Reference code + type |
| Stage | Yes | Color dot + name |
| Expected value | Yes | Currency-formatted |
| Expected close | Yes | Date |
| Score | Yes | Color-coded badge |
| Agent | Yes | Owner name |
| Last activity | Yes | Relative timestamp |
| SLA status | Yes | Badge (green/amber/red) |

#### Bulk Operations
- Checkbox column for multi-select
- Floating action bar appears on selection: "[N] selected — Move to stage: [dropdown] — [Apply]"
- Calls `leads.bulkMoveStage`
- **Undo toast**: 5-second toast with "Undo" action. Uses Radix Toast. On undo, calls `leads.bulkMoveStage` to revert to original stages.
- Undo implementation: Store `previousStages: Map<leadId, stageId>` in closure. On undo, call individual `moveStage` for each (or batch revert endpoint).

### 3.6 Lead Detail Sheet

Slide-over panel (Radix Sheet) showing full lead details:
- Contact info (name, phone, email)
- Property info (reference, address, type)
- Current stage with pipeline context
- Value + expected close
- Stage history timeline (from `lead_stage_history`)
- SLA countdown
- Quick actions: move stage, edit, delete

### 3.7 Funnel Analytics (`/leads/funnel`)

#### Chart
- Recharts `<Funnel>` or custom SVG trapezoid funnel
- Each tier = a stage (in pipeline position order, open stages only — won/lost shown as separate metrics)
- Per tier: stage name, lead count, conversion % from previous stage, avg days in stage
- Color matches stage color preset

#### Filters
- Date range picker (from/to)
- Agent dropdown (filter by owner_user_id)
- Pipeline selector (same as kanban toolbar)

#### Export
- **CSV**: Download tabular data (stage, count, conversion%, avg_days)
- **PNG**: Use `html2canvas` or `recharts`' built-in `toDataURL` to capture chart as image

#### Data Source
- `leads.funnel` query aggregates from `lead_stage_history`:
  - Count: leads that entered each stage in the date range
  - Conversion: `count_in_stage_N / count_in_stage_N-1 * 100`
  - Avg days: `AVG(exited_at - entered_at)` for completed transitions

---

## 4. SLA Timer Logic

SLA is computed client-side from `stage_entered_at` + `pipeline_stage.sla_hours`:

```
elapsed = now() - stage_entered_at
slaLimit = sla_hours * 3600 * 1000
percentage = elapsed / slaLimit * 100

if percentage >= 100 → red badge "SLA breached"
if percentage >= 75  → amber badge "SLA warning"
else                 → green badge (or hidden)
```

- Client updates SLA badges via a 60-second `setInterval` (no server polling)
- Backend does NOT enforce SLA — it's informational only

---

## 5. i18n

Extend existing locale files with keys under `leads.*` and `pipelines.*` namespaces:

```
leads.kanban.title, leads.kanban.newLead, leads.kanban.emptyColumn
leads.list.title, leads.list.bulkMove, leads.list.undoToast
leads.funnel.title, leads.funnel.conversion, leads.funnel.avgDays, leads.funnel.export
leads.card.sla.breached, leads.card.sla.warning, leads.card.age
leads.detail.title, leads.detail.stageHistory, leads.detail.moveStage
leads.form.title, leads.form.contact, leads.form.property, leads.form.value
pipelines.list.title, pipelines.list.create, pipelines.list.default
pipelines.editor.title, pipelines.editor.stages, pipelines.editor.preview
pipelines.editor.minStages, pipelines.editor.needWon, pipelines.editor.needLost
pipelines.editor.cantDeleteActive, pipelines.editor.slaHours
pipelines.types.ventas, pipelines.types.alquileres, pipelines.types.desarrollos, pipelines.types.custom
```

All five locales (en, es, es-AR, es-MX, pt-BR). es-AR is the primary locale.

---

## 6. Events Integration

Existing events in `packages/core/src/events/types.ts` already define:
- `lead.created`
- `lead.stage_moved` (fromStage, toStage)
- `lead.won`
- `lead.lost` (reason?)

The API router will emit these via EventBus after mutations. The tRPC subscription bridges `lead.stage_moved` to connected WebSocket clients.

---

## 7. Design Decisions & Trade-offs

### DnD Library: @dnd-kit vs react-beautiful-dnd
**Chosen: @dnd-kit**. react-beautiful-dnd is unmaintained. @dnd-kit has first-class touch/keyboard support, better performance with virtualization, and is actively maintained. ~12KB gzipped.

### Charting: Recharts vs custom SVG
**Chosen: Recharts**. Already well-tested with React 19. The funnel chart is the only visualization needed; Recharts provides it with minimal config. If bundle size becomes a concern, can swap to a custom SVG trapezoid later.

### Real-time: tRPC subscriptions vs Socket.IO
**Chosen: tRPC subscriptions (WSS)**. Stays within the existing tRPC stack, no new dependency. Uses the existing EventBus Redis Streams as the backend source. The client already has the tRPC provider configured.

### Optimistic updates strategy
Lead stage moves use React Query's `onMutate` → immediate cache patch → `onError` → rollback. This gives instant UI feedback while the server persists. The WS subscription acts as a secondary confirmation and handles cross-session sync.

### Stage reorder within column
**Not tracked**. Cards within a stage column are sorted by `stage_entered_at DESC` (most recent first). This avoids needing a `position` column on the lead table and simplifies DnD logic. Users can sort differently in the list view via table headers.

---

## 8. Accessibility

- @dnd-kit provides built-in `KeyboardSensor` with arrow-key navigation for keyboard-only users
- Drag announcements via `aria-live` regions (built into @dnd-kit)
- Color-coded badges include text labels (not color-only)
- Score and SLA badges use appropriate `aria-label` attributes
- Funnel chart includes tabular data alternative below chart for screen readers
- All interactive elements are focusable and keyboard-operable

---

## 9. File Structure

```
packages/db/src/schema/leads.ts          — lead, pipeline, pipeline_stage, lead_stage_history tables
packages/db/migrations/0005_pipelines_leads.sql

apps/api/src/routers/pipelines.ts        — pipelines.* tRPC procedures
apps/api/src/routers/leads.ts            — leads.* tRPC procedures

apps/web/src/pages/leads/
  KanbanPage.tsx                          — Board layout + toolbar + pipeline selector
  KanbanBoard.tsx                         — DnD context + columns
  KanbanColumn.tsx                        — Stage column (droppable)
  LeadCard.tsx                            — Draggable card component
  ListViewPage.tsx                        — Table view with bulk ops
  FunnelPage.tsx                          — Analytics chart + filters + export
  LeadDetailSheet.tsx                     — Slide-over panel
  LeadFormPage.tsx                        — Create/edit lead form
  useSlaStatus.ts                         — Hook: SLA badge computation with timer
  useLeadSubscription.ts                  — Hook: tRPC WS subscription for real-time updates

apps/web/src/pages/settings/pipelines/
  PipelineListPage.tsx                    — Pipeline card grid
  PipelineEditorPage.tsx                  — Full pipeline + stage editor
  StageEditor.tsx                         — DnD sortable stage list
  MiniKanbanPreview.tsx                   — Live preview strip
  ColorPicker.tsx                         — 12-preset popover

packages/core/src/i18n/messages/*.json   — Updated with leads.* and pipelines.* keys
```
