# Phase E Wireframes — Design Spec
**Date:** 2026-04-26  
**Author:** UX/UI Designer (Paperclip agent dd6be961)  
**Issue:** RENA-61  
**Status:** Delivered — 6 wireframe components

---

## Summary

Phase E introduces the document lifecycle (template engine → generation → e-signature) and the reservation lifecycle (Reserva → Boleto de compraventa → Escritura). This spec documents the wireframes delivered as production-ready React components, the UX decisions made, and the design system elements introduced.

---

## Design System Tokens

All wireframes use the shared dark-mode-first token set already established in the codebase (`ContactDetailPage.tsx`, `InboxPage.tsx`). No new tokens were introduced.

| Token | Value | Usage |
|---|---|---|
| `bgBase` | `#070D1A` | Page background |
| `bgRaised` | `#0D1526` | Cards, panels, modals |
| `bgElevated` | `#131E33` | Hover states, selected rows |
| `brand` | `#1654d9` | Primary actions, active states |
| `brandSubtle` | `rgba(22,84,217,0.12)` | Tag backgrounds, selected states |
| `ai` | `#7E3AF2` | AI-only features (Q&A, AI draft) |
| `aiSubtle` | `rgba(126,58,242,0.12)` | AI feature backgrounds |
| `success` | `#16A34A` | Completed stages, resolved fields |
| `warning` | `#D97706` | Overdue milestones, ambiguous fields |
| `danger` | `#DC2626` | Missing required fields, errors |
| `textPrimary` | `#EFF4FF` | Main content text |
| `textSecondary` | `#8DA0C0` | Supporting text |
| `textTertiary` | `#506180` | Labels, timestamps, placeholders |

**Fonts:**
- `Syne` — display, headers (fontFamily: `'Syne', system-ui, sans-serif`)
- `DM Sans` — body, UI labels
- `DM Mono` — prices, codes, identifiers

---

## Wireframe Components

### 1. TemplateEditorPage
**Path:** `/documents/templates/:id/edit`  
**File:** `apps/web/src/pages/documents/TemplateEditorPage.tsx`

#### Layout
Full-height 3-column layout:
- **Left (240px):** Variable browser panel — collapsible entity sections (Propiedad, Contactos, Operación, Agente, Inquilino), search, click-to-insert `{{variable}}` syntax
- **Center (flex):** Rich text editor area with formatting toolbar + validation banner at top
- **Right (drawer):** Hidden by default; opens as: Clause picker modal (overlay) or Version history panel

#### Tabs
- **Editor** — main rich-text editing view
- **Vista previa** — A4 preview with `BORRADOR` watermark diagonal
- **Historial** — revision list with numbered circles + restore option

#### Key UX Decisions
- Variable tokens render as blue pills (`VarPill`) inside editor content — prevents accidental editing of variable names
- Clause picker is a full-screen overlay (not inline) to allow browsing long clause libraries
- Save state is auto-save with "Guardado hace X" indicator in toolbar
- Validation banner (red, sticky at editor top) lists undefined variables referencing `{{var}}` tokens not in the schema
- Version history numbers from latest downward; each entry shows author + timestamp + character diff count
- Jurisdiction filter on clause picker (Todas / Nacional / CABA / Buenos Aires) addresses Argentine multi-jurisdiction legal compliance

#### Accessibility
- All toolbar buttons have `aria-label`
- Variable browser has keyboard navigation (Tab + Enter to insert)
- High-contrast error banner meets WCAG AA 4.5:1 ratio

---

### 2. DocumentViewerPage
**Path:** `/documents/:id`  
**File:** `apps/web/src/pages/documents/DocumentViewerPage.tsx`

#### Layout
Split panel: **62% PDF viewer** + **38% metadata sidebar**

**PDF Viewer (left):**
- Paginated A4 pages (mock: 3 pages)
- Zoom slider 50–200%
- Page counter (Página X de Y)
- `BORRADOR` diagonal watermark for draft documents only

**Metadata Sidebar (right):**
- Document title + status badge
- 3 subtabs: **Detalles** / **Firmantes** / **Consultar IA**

#### Status → Action Buttons Mapping
| Status | Actions |
|---|---|
| `borrador` | Enviar para firma · Descargar · Regenerar |
| `pendiente_firma` | Ver estado · Recordatorio · Cancelar firma |
| `firmado` | Descargar PDF · Ver auditoría |
| `vencido` | Regenerar · Archivar |
| `cancelado` | Regenerar · Ver historial |

#### Firmantes Subtab
- Progress bar + percentage for overall signing completion
- Per-signer row: avatar initials, name, role, status chip, reminder button
- Reminder button disabled after already sent (no spam)

#### Consultar IA Subtab
- AI chat interface using `#7E3AF2` brand (AI-only purple per brand guidelines)
- Answers include citation cards: page number + quoted snippet
- Input box with send button + keyboard shortcut hint

#### Demo Controls
- Status switcher in top bar (wireframe-only) lets reviewers cycle through all 5 document statuses

---

### 3. ESignModal
**File:** `apps/web/src/pages/documents/ESignModal.tsx`

#### 3-Step Wizard
**Step 1 — Firmantes:**
- Flow type selector: Secuencial (signed in order) vs. Paralelo (all simultaneously)
- Signer list with drag handles (sequential mode only)
- Per-signer fields: Nombre, Rol, Email, Nivel de firma (Firma electrónica / Firma digital certificada / Firma manual con testigo), Presencial toggle
- Add signer button

**Step 2 — Configuración:**
- Expiry slider: 1–90 days (shows computed date)
- Reminder frequency: Diario / Cada 2 días / Semanal / Sin recordatorio
- AI-drafted message textarea (purple AI pill label)

**Step 3 — Vista previa:**
- Summary cards grid (signers, flow, expiry, message)
- Signing order diagram — signer avatars with connector lines (sequential) or radial (parallel)
- PDF thumbnail
- "Enviar para firma" CTA button

#### Success State
Full overlay green checkmark + confirmation text after sending — then auto-closes modal

#### Legal Note
Firma digital certificada maps to Ley 25.506 Art. 2 (digital signature) with full legal weight. Firma electrónica is Art. 5 (electronic signature, lesser legal weight). Corredor matrícula field is required for legal validity per CUCICBA regulations.

---

### 4. ReservationDetailPage
**Path:** `/reservations/:id`  
**File:** `apps/web/src/pages/reservations/ReservationDetailPage.tsx`

#### Layout
- **Main area (flex):** header + tabs + tab content
- **Right sidebar (320px):** Activity timeline (fixed width, scrollable independently)

#### Header
- Property address (large Syne display font)
- Status badge
- Quick info grid: comprador, vendedor, precio, agente responsable
- KPI cards: fecha de escritura, cuotas pendientes, comisión estimada

#### TransactionStepper
Vertical 3-stage timeline:
- **Reserva** (green ✓) — shows reservation date, seña amount, signed doc link
- **Boleto** (green ✓) — shows boleto date, sale price, signers, overdue milestone count
- **Escritura** (grayed/pending) — shows target date, escribano, placeholder CTA

Connector lines between stages; pending stages use `textTertiary` color and `italic` placeholders.

#### Tabs
| Tab | Content |
|---|---|
| Línea de tiempo | TransactionStepper with per-stage actions |
| Cuotas | MilestonesTab: progress bar + milestone table + register payment modal |
| Comisiones | CommissionsTab: total % + per-agent splits (internal/external/cobrokering) |
| Documentos | DocumentsTab: linked docs list + "Generar nuevo documento" CTA |

#### Activity Timeline (sidebar)
Event types with emoji+color dots: created, doc_generated, doc_signed, milestone_paid, milestone_overdue, comment

---

### 5. ReservationListPage
**Path:** `/reservations`  
**File:** `apps/web/src/pages/reservations/ReservationListPage.tsx`

#### KPI Bar (4 metrics)
| Metric | Description |
|---|---|
| Reservas activas | Count of non-completed/cancelled operations |
| Pipeline total | Sum of USD sale prices on active boletos |
| Escrituras este mes | Count of escrituras scheduled in next 30 days |
| Cuotas vencidas | Total overdue milestone count across all operations |

#### Filter Bar
- Text search (property address, buyer, seller, agent)
- Stage pills: Todas / Reserva / Boleto / Escritura
- Status dropdown: Todos / Activa / Completada / Vencida / Cancelada
- Agent dropdown
- Sort: Actividad / Escritura / Monto

#### Table Columns
Propiedad · Comprador · Vendedor · Etapa · Estado · Precio · Escritura · Agente · Actividad

- Property column: icon per type (departamento/casa/local/terreno/ph) + address + type label
- Overdue badge inline in Status column (amber pill with count)
- Escritura date shows relative countdown ("en 4d" in amber if <14 days)
- Price uses DM Mono font, formatted with Argentine locale (USD X.XXX or $XXXm)
- Row click selects/highlights (no navigation yet — spec TBD for detail view transition)

#### Status Bar (footer)
"X de Y reservas" counter with active filter labels

---

### 6. DocumentGenerationModal
**File:** `apps/web/src/pages/documents/DocumentGenerationModal.tsx`

#### 2-Tab Flow
**Tab 1 — Plantilla:** Template selection cards (Boleto / Reserva / Locación / etc.)  
**Tab 2 — Campos:** Field completion interface

#### Field Status System
| Status | Color | Behavior |
|---|---|---|
| `resolved` | Green | Auto-filled from entity data; collapsed by default; editable if expanded |
| `missing` | Red | Expanded by default; free-text input; blocks generation |
| `ambiguous` | Amber | Expanded by default; option picker (chips); blocks generation |

#### Completion Summary
- Progress bar: resolved/total with percentage
- 3 stat badges: Auto / Faltantes / Confirmar

#### Field Grouping Order
1. Missing (required, red — blocking) — shown first
2. Ambiguous (confirm, amber — blocking) — shown second
3. Resolved (auto-complete, green) — shown last, collapsed

#### Generate Button State Machine
- Disabled (gray) when any missing or ambiguous fields unresolved
- Enabled (brand blue) when all fields complete
- Loading (spinner + "Generando…") during generation
- Success (green ✓ + "Generado") after 1.8s mock delay

---

## UX Patterns Introduced

### Variable Token Pills
`{{variable_name}}` rendered as interactive blue pills in the template editor. Clicking focuses the variable browser. Non-deletable by keyboard alone (requires explicit delete action) to prevent accidental removal.

### Document Status Badge System
5 statuses with consistent color/icon mapping used across DocumentViewer, DocumentList, and ESignModal:
- `borrador` — gray
- `pendiente_firma` — amber (in-progress)
- `firmado` — green
- `vencido` — red
- `cancelado` — dark gray

### Stage Chip (Reservations)
3-stage reservoir lifecycle chip (Reserva/Boleto/Escritura) used in both list and detail views. Color: Reserva=accent-blue, Boleto=brand-blue, Escritura=green (matches transaction progression intensity).

### AI-only Styling
All AI-generated content (clause suggestions, Q&A answers, AI-drafted email) uses `#7E3AF2` purple to clearly distinguish AI from human content, consistent with brand guidelines.

---

## Accessibility Checklist

- [x] All buttons have descriptive `aria-label` or visible text
- [x] Color never used as sole status indicator (always paired with text or icon)
- [x] Focus management: modal closes return focus to trigger element
- [x] Keyboard-navigable: Tab through all interactive elements
- [x] Contrast ratios: primary text on bgBase > 7:1 (AAA), secondary > 4.5:1 (AA)
- [x] Input fields have associated visible labels

---

## Open Questions / Follow-ups

1. **Rich text editor library** — The wireframe uses a mock div; implementation will need Tiptap or Lexical. Recommend Tiptap (already evaluating for WhatsApp composer).
2. **PDF rendering** — Wireframe uses mock A4 divs. Implementation needs `pdfjs-dist` or iframe with signed URL.
3. **Drag-to-reorder signers** — Wireframe shows drag handle icons; implementation needs `@dnd-kit/sortable`.
4. **Real-time signer status** — Pending decision: webhook → Supabase Realtime vs. polling. See `doc_signature_request` webhook spec in phase-e-spec.md.
5. **ReservationListPage row click** — Currently selects row but doesn't navigate. Navigation to `/reservations/:id` should be confirmed with PM.

---

## Files Delivered

| File | Route | Status |
|---|---|---|
| `apps/web/src/pages/documents/TemplateEditorPage.tsx` | `/documents/templates/:id/edit` | ✓ Complete |
| `apps/web/src/pages/documents/DocumentViewerPage.tsx` | `/documents/:id` | ✓ Complete |
| `apps/web/src/pages/documents/ESignModal.tsx` | Modal (any page) | ✓ Complete |
| `apps/web/src/pages/documents/DocumentGenerationModal.tsx` | Modal (reservation detail) | ✓ Complete |
| `apps/web/src/pages/reservations/ReservationDetailPage.tsx` | `/reservations/:id` | ✓ Complete |
| `apps/web/src/pages/reservations/ReservationListPage.tsx` | `/reservations` | ✓ Complete |
