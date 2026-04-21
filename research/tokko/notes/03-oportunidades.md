# Tokko — Oportunidades (Pipeline)

URL: `https://www.tokkobroker.com/leads/?only_with_perm=false` (list view)
Kanban view: `https://app.tokkobroker.com/leads` (newer app subdomain)

⟶ **Key naming insight:** Module is called "Oportunidades" in the UI but URL/API calls it `leads`. The data model treats leads and opportunities as the same entity — different from a Salesforce-style split.

## Two view modes (toggle top-right)
- **List/table view** — classic rows
- **Vista en columnas** (kanban) — newer feature, flagged "🙌 Nueva vista en columnas" (promo tooltip)
- Toggle icons: one shows table-with-checkmark (list), one shows kanban columns

## Pipeline stages (confirmed from UI)
5 columns with color coding:
1. **Pendiente contactar** (red/pink) — new, not yet contacted
2. **Esperando respuesta** (orange) — contacted, waiting
3. **Evolucionando** (green) — active/engaged
4. **Tomar Acción** (blue) — needs agent action
5. **Congelado** (indigo) — on hold / cold

⟶ Matches the 8 lead_statuses IDs seen in Contactos URL (105178–105185). Probably: the 5 visible + 3 terminal (won/lost/archived) not shown by default.

## List columns
- Contacto
- Búsqueda / Propiedad (what they're looking for or property they're interested in)
- Vigencia (validity / freshness window)
- Notas
- Actualizado (last update timestamp)

All columns sortable.

## Kanban cards show
- Avatar + Contact name
- Assignee name ("Julieta Yabo")
- 🏠 Property reference ("Estomba 2400")
- Age badge ("1h")
- Last activity timestamp ("Act. 10:00")
- Inline quick actions (icons): calendar, clock/reminder, WhatsApp

⟶ **Drag-and-drop** between columns changes the lead status (onboarding tooltip confirmed: "Al arrastrar un contacto a otra columna cambiarás su estado").

## Filter row (when "Filtrar" clicked)
- **Sucursales** (branch filter)
- **Agente** (assignee — defaults to current user)
- **Etiquetas** (tags)
- **Fecha de creación** (created date range)
- Active filter chips with X to remove
- "Limpiar filtros" clear all

## Other controls
- **Mostrar estados para reasignar** toggle — shows leads needing reassignment (e.g., agent unavailable)
- Bulk checkbox per card/row + per-column "select all"
- Search icon (opens search input)
- Counter: "0 Oportunidades" (total matching filters)

## UX issues

1. **Duplicate "Ayuda rápida" help modal blocks on every visit** — same pattern as Contactos
2. **Promo tooltip for kanban view** ("🙌 Nueva vista en columnas") auto-shows — also blocks
3. **Onboarding tutorial about drag-and-drop** auto-shows — third blocking modal
4. **Filter button has an unlabeled notification dot** (red badge) — unclear what it signals
5. **Pipeline columns below horizontal scroll threshold** — only 3 visible at 1512px, must scroll to see columns 4–5. On smaller screens even worse.
6. **Two subdomain split** (`www.tokkobroker.com/leads` for list, `app.tokkobroker.com/leads` for kanban) suggests a half-finished rewrite — inconsistent chrome, slight visual drift
7. **"Vigencia" column** without explanation — unclear semantics (expiry? days-since-contact?)
8. **No explicit forecast view** — no weighted pipeline value, no close date, no deal amount visible. Tokko's "opportunity" concept is really "lead with stage" — lacks Salesforce-style deal economics (amount × probability, expected close date)
9. **Pipeline stage is on the Contact, not a separate Opportunity record** — one contact = one position in pipeline. Modeling problem: what if the same contact is both a buyer and an owner, or has two active deals?

## Data model implications

- **Lead/Opportunity = Contact + lead_status** (no separate Opportunity entity in the data model as seen)
- Lead is linked to either a saved search (Búsqueda) *or* a specific property (Propiedad) — single slot, which constrains multi-deal scenarios
- Lead has: assignee, branch, tags, created_at, updated_at, last activity timestamp, notes
- Stage transitions happen by drag-and-drop (single field mutation)
- No deal amount, commission projection, or probability field visible
- No expected close date
- No won/lost reason field visible in pipeline view (likely on contact detail)
- Reassignment workflow is first-class (dedicated toggle)

## Simplification opportunities → Our product

- **Separate Opportunity from Contact.** One contact can have multiple active deals (e.g., buyer on Unit A + owner of Unit B). Opportunity = Contact × Property (or Contact × Search) × lifecycle
- **Deal economics built-in** — price, commission %, expected net to agent/agency, probability weighting, expected close date. Pipeline total shown at column header.
- **Forecast view** — "This quarter you'll close ~$X across N deals. Risk: 3 deals stalled >14 days"
- **AI-driven stage suggestions** — "This lead hasn't responded in 5 days. Auto-move to Congelado?" / "Opened email 3x, matched 2 listings — bump to Evolucionando"
- **One pipeline view, responsive** — kanban on desktop, stacked cards on mobile. No subdomain split.
- **Configurable stages per agency** — some want 4 stages, some 8. Stage editor in settings.
- **Activity-rich cards** — show last channel (WhatsApp last), not just timestamp; show match count ("4 listings match")
- **Reassignment as a bulk + rule-based feature** — "Reassign all leads idle >7 days from agent X to agent Y"
- **Remove blocking modals entirely** — help lives in persistent side panel; new-feature announcements go in a bell/what's-new panel
- **Clear stage definitions** — hover a column header to see "Definition: Contacted, awaiting reply for ≤5 days" so agents/teams align
- **Kill the list/kanban split as separate toggles** — make kanban default on desktop, list = secondary (via density control), mobile = stacked list
- **Smart inbox → pipeline link** — every Consulta (inquiry) auto-creates a lead in "Pendiente contactar" with AI pre-classification (hot/warm/cold)
