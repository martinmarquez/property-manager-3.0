# Phase C Wireframes — Pipelines, Calendar, Inquiries

**Issue:** RENA-43  
**Date:** 2026-04-23  
**Author:** UX/UI Designer Agent (dd6be961)  
**Status:** Approved (spec from issue description)

---

## 1. Design System Baseline

All Phase C modules inherit the established Corredor dark design system:

| Token | Value |
|-------|-------|
| Background base | `#070D1A` |
| Background raised | `#0D1526` |
| Border subtle | `#1F2D48` |
| Brand primary | `#1654d9` |
| Brand light | `#4669ff` |
| Text primary | `#EFF4FF` |
| Text secondary | `#8DA0C0` |
| Text tertiary | `#506180` |
| Display font | Syne |
| Body font | DM Sans |

- shadcn/Radix UI primitives from `@corredor/ui`
- `react-intl` for all user-visible strings
- TanStack Router routes under authenticated shell
- Mobile-responsive (PWA target)

---

## 2. Pipelines / Oportunidades (`/pipelines`)

### 2.1 Kanban Board (`PipelineKanbanPage`)

**Layout:** Horizontal scroll of stage columns. Each column is fixed 280px wide with sticky header.

**Stage column anatomy:**
- Header: stage name, color dot, deal count, total ARS/USD sum
- SLA indicator: green (on time) / amber (approaching) / red (overdue) pill
- Cards: scrollable list of `OpportunityCard` items
- Footer: "+ Nueva oportunidad" ghost button

**OpportunityCard anatomy:**
- Contact avatar + name (top)
- Property reference pill (if linked)
- Stage age in days + SLA color coding
- Agent initials badge (bottom right)
- Drag handle (grab cursor on hover)

**Default stages:** Nuevo Contacto → Calificado → Visita Agendada → Oferta → Negociación → Cierre

**Drag-and-drop:** Native HTML5 drag API. Dragging card highlights target column with brand-color left border. Drop moves card to target stage with optimistic update.

**Empty state:** "Tu pipeline de ventas. Los leads llegan automáticamente cuando conectás tu bandeja."

### 2.2 Opportunity Detail Drawer (`OpportunityDrawer`)

Slide-over Sheet from the right (480px wide).

**Sections:**
1. Header: contact name, stage badge, close button
2. Contact info block: avatar, email, phone, last contacted date
3. Property link: thumbnail, reference code, price (or "Sin propiedad")
4. Timeline: vertical list of stage-change events + notes with timestamps
5. Notes textarea: add note inline with send button
6. Quick actions: schedule visit, send WhatsApp, move stage dropdown

### 2.3 Pipeline Config (`PipelineConfigPage` at `/pipelines/config`)

**Layout:** Settings-style single-column centered form.

**Stage list:** Draggable rows showing color swatch, name input, SLA hours input, delete button.

**Controls:**
- Drag handle to reorder stages
- Color picker: 8 preset swatches
- SLA hours: number input (default 48h)
- "Agregar etapa" button at bottom
- Save/Cancel buttons at top right

### 2.4 Funnel Analytics (`PipelineFunnelPage` at `/pipelines/funnel`)

**Layout:** Full-width funnel chart + stats table below.

**Funnel chart:** SVG trapezoid bars, one per stage, with:
- Stage name label
- Count + percentage of previous stage
- Color-coded (matching stage colors)
- Hover tooltip: avg days in stage, total value

**Stats table below:**
- Columns: Etapa | Cantidad | % Conversión | Días promedio | Valor total
- Footer row: totals

---

## 3. Calendar / Calendario (`/calendar`)

### 3.1 Main Calendar (`CalendarPage`)

**View tabs:** Mes | Semana | Día | Agenda — persistent selection in URL/state.

**Month view:** 7×N grid. Each day cell shows up to 3 event pills with "+N más" overflow.

**Week view:** 7 columns × 24 hour rows. Events as positioned blocks with height = duration.

**Day view:** Single column × 24 hour rows. Wider event blocks.

**Agenda view:** Date-grouped list of upcoming events, infinite scroll or paginated.

**Event types and colors:**
| Type | Color | Label |
|------|-------|-------|
| visita | `#4669ff` (brand-light blue) | Visita |
| llamada | `#18A659` (success green) | Llamada |
| seguimiento | `#E88A14` (warning amber) | Seguimiento |
| tasación | `#9B59B6` (purple) | Tasación |
| escritura | `#E83B3B` (error red) | Escritura |

**Sync indicator:** Top-right badge showing "Google Calendar sincronizado" (green dot) or "M365 sincronizado" or disconnected state with "Conectar" link.

**Conflict indicator:** Red striped overlay on overlapping events with tooltip "Conflicto de horarios".

### 3.2 Event Creation Modal (`EventModal`)

Triggered by clicking empty slot or "+ Nuevo evento" button.

**Fields:**
- Título (text)
- Tipo (segmented control: visita / llamada / seguimiento / tasación / escritura)
- Fecha y hora inicio + fin (datetime pickers)
- Contacto vinculado (typeahead search)
- Propiedad vinculada (typeahead search)
- Descripción / notas (textarea)
- Recordatorio (select: 15min / 30min / 1h / 1 día antes)

---

## 4. Inquiries / Consultas (`/inquiries`)

### 4.1 Inquiry List (`InquiryListPage`)

**Layout:** Table/list hybrid — each row is a card-style row.

**Row anatomy:**
- Match score badge (0–100, large pill left-aligned):
  - 80–100: `#18A659` green
  - 50–79: `#E88A14` amber
  - 0–49: `#E83B3B` red
- Contact avatar + name + email
- Inquiry summary (1-line truncated: "3 amb, Palermo, hasta USD 250k")
- Matched properties count pill ("12 propiedades")
- Date received
- Status chip (nueva / vista / notificada / archivada)
- "Ver detalle" action button

**Filters:** By score range (slider), by status, by date range.

**Empty state:** "Todavía no hay consultas. Las nuevas consultas aparecen aquí automáticamente."

### 4.2 Inquiry Detail (`InquiryDetailPage` at `/inquiries/:inquiryId`)

**Layout:** Two-column on desktop, stacked on mobile.

**Left panel — Criteria & Contact:**
- Contact card: avatar, name, email, phone, last contacted
- Match criteria explanation panel:
  - Tags for each criterion: operation (sale/rent), neighborhoods, property types, price range, size range, rooms
  - "Cómo funciona el match" expandable explanation accordion

**Right panel — Matched Properties:**
- Grid of `PropertyMatchCard` (3 columns desktop, 1 mobile)
- Each card: thumbnail, reference, price, score contribution bar, "Incluir" / "Excluir" toggle
- "Notificar contacto" primary CTA button (sends email with curated list)
- Contact shortlist: checkbox multi-select + "Armar selección" button

---

## 5. Component Specs for Front-End Handoff

All components follow the pattern established by PropertyListPage/ContactListPage:
- `C` object for color constants
- `F` object for font families
- `defineMessages` for all i18n keys
- Props typed with TypeScript interfaces
- Mock data via local `useMock*` hooks (replace with `trpc.*` hooks)
- Mobile breakpoint at 768px via inline media-style logic or CSS class

**Files created:**
- `apps/web/src/pages/pipelines/PipelineKanbanPage.tsx`
- `apps/web/src/pages/pipelines/OpportunityDrawer.tsx`
- `apps/web/src/pages/pipelines/PipelineConfigPage.tsx`
- `apps/web/src/pages/pipelines/PipelineFunnelPage.tsx`
- `apps/web/src/pages/calendar/CalendarPage.tsx`
- `apps/web/src/pages/inquiries/InquiryListPage.tsx`
- `apps/web/src/pages/inquiries/InquiryDetailPage.tsx`

**Routes added:**
- `/pipelines` → `PipelineKanbanPage`
- `/pipelines/config` → `PipelineConfigPage`
- `/pipelines/funnel` → `PipelineFunnelPage`
- `/calendar` → `CalendarPage`
- `/inquiries` → `InquiryListPage`
- `/inquiries/:inquiryId` → `InquiryDetailPage`
