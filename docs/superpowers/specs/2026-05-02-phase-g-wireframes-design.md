# Phase G Wireframes — Design Spec
**Date:** 2026-05-02  
**Author:** UX/UI Designer (Paperclip agent dd6be961)  
**Issue:** RENA-115  
**Status:** Delivered — wireframe specs + components for all 4 Phase G modules

---

## Summary

Phase G adds four new product surface areas. This spec documents the wireframes delivered as production-ready React components:

1. **Sitio (Website Builder)** — Puck editor canvas, block palette, theme selector, page management, custom domain wizard, form submissions list, mobile/desktop preview toggle
2. **Reportes (Analytics Dashboards)** — Dashboard index grid, individual report view with filter bar, KPI cards, chart placeholders, date range picker, CSV/Excel export, scheduled digest config
3. **Billing/Suscripción** — Plan comparison table, subscription status, payment method management (Stripe + Mercado Pago), invoice history, upgrade/downgrade flow, trial banner
4. **Tasaciones (Appraisals)** — Appraisal list, multi-step new appraisal wizard (property → purpose → comps on map → AI narrative → PDF preview)

All modules extend the established dark-mode-first design system. No new tokens are introduced.

---

## Design System Tokens

Inherited from Phase E/F. No additions for Phase G.

| Token | Value | Usage |
|---|---|---|
| `bgBase` | `#070D1A` | Page background |
| `bgRaised` | `#0D1526` | Cards, panels |
| `bgElevated` | `#131E33` | Hover states, selected rows |
| `brand` | `#1654d9` | Primary actions, active states |
| `brandFaint` | `rgba(22,84,217,0.12)` | Active filter backgrounds |
| `ai` | `#7E3AF2` | AI-generated content (narrative, suggestions) |
| `aiFaint` | `rgba(126,58,242,0.12)` | AI feature backgrounds |
| `success` | `#18A659` | Published states, successful actions |
| `warning` | `#E88A14` | Trial banners, overdue, past-due subscriptions |
| `error` | `#E83B3B` | Errors, cancelled states |
| `textPrimary` | `#EFF4FF` | Main content |
| `textSecondary` | `#8DA0C0` | Supporting text |
| `textTertiary` | `#506180` | Labels, timestamps |
| `border` | `#1F2D48` | Dividers |

**Fonts:** `Syne` (display/headings), `DM Sans` (body), `DM Mono` (codes, prices, timestamps)

---

## Files Delivered

| Module | File | Route | Status |
|---|---|---|---|
| Sitio | `apps/web/src/pages/site/SiteEditorPage.tsx` | `/site/pages/:slug/edit` | ✅ Exists |
| Sitio | `apps/web/src/pages/site/SitePagesPage.tsx` | `/site/pages` | ✅ Exists |
| Sitio | `apps/web/src/pages/site/SiteDomainsPage.tsx` | `/site/domains` | ✅ Exists |
| Sitio | `apps/web/src/pages/site/SiteFormsPage.tsx` | `/site/forms` | ✅ Exists |
| Reportes | `apps/web/src/pages/reports/ReportsPage.tsx` | `/reports` | ✅ Exists |
| Reportes | `apps/web/src/pages/reports/ReportViewPage.tsx` | `/reports/:slug` | ✅ Exists |
| Reportes | `apps/web/src/pages/reports/ReportsDashboard.tsx` | `/reports/dashboard` | ✅ Exists |
| Billing | `apps/web/src/pages/settings/billing/BillingPage.tsx` | `/settings/billing` | ✅ Created (RENA-115) |
| Tasaciones | `apps/web/src/pages/appraisals/AppraisalListPage.tsx` | `/appraisals` | ✅ Created (RENA-115) |
| Tasaciones | `apps/web/src/pages/appraisals/AppraisalWizardPage.tsx` | `/appraisals/new` | ✅ Created (RENA-115) |

---

## Module Designs

### 1. Sitio (Website Builder)

#### SiteEditorPage — `/site/pages/:slug/edit`

Three-column layout:
- **Left panel (260px):** Block palette with categorized block chips (Content, Media, Listings, etc.). Drag-to-canvas or click-to-insert. Tabs for Blocks | Layers | Settings.
- **Center (flex):** Puck editor canvas. Shows the live page with blocks. Topbar has: breadcrumb nav ← Pages / [page name], preview toggle (Desktop/Mobile with icons), publish button, unsaved badge.
- **Right panel (280px, slides out):** Block inspector — appears when a block is selected. Shows editable props (text, image URL, color, listing query). Collapses when no block selected.

**Responsive breakpoints:**  
- ≥1280px: three columns visible  
- 1024–1279px: right panel hidden by default (toggle via inspector button)  
- <1024px: left panel becomes a bottom sheet, canvas fills screen (mobile editing mode)

**Interaction states:**
- Block drag-over: canvas shows drop zone highlight (dashed `brand` border)
- Block selected: ring highlight + resize handles on corners
- Publish button states: idle → loading (spinner) → success (checkmark + "Publicado" for 3s) → idle
- Preview toggle: canvas wraps to 375px for mobile preview

#### SitePagesListPage — manages pages, themes, domains, forms

Tabbed navigation within `/site`:
- **Páginas:** Page cards grid (2–3 columns). Each card shows: page thumbnail placeholder, page name, slug, status badge (Publicada/Borrador), last modified date, kebab menu (Edit/Duplicate/Delete).
- **Temas:** 5 theme cards in a grid. Each shows a mock preview screenshot, theme name, active indicator. Click → applies theme (confirmation modal).
- **Dominio:** Wizard-style: 3 steps (Enter domain → DNS instructions with copy-to-clipboard records → Verification status). Stepper at top, step content in center, Next/Back buttons at bottom.
- **Formularios:** Table of form submissions. Columns: Fecha, Nombre, Email, Teléfono, Propiedad, Estado. Filter by date range, status. Export CSV button.

---

### 2. Reportes (Analytics Dashboards)

#### ReportsIndexPage — `/reports`

Page header: "Reportes" title + brief description.  
Search/filter bar: text search + category filter (Operacional / Estratégico).  
Dashboard grid: 2×N cards. Each card shows: icon, name, description (1 line), category badge, last refreshed timestamp. Click → navigates to `/reports/:slug`.  
22 dashboards grouped: **Operacional** (12): Conversión de Funnel, Productividad de Agentes, Performance de Propiedades, ROI de Portales, SLA de Consultas, Actividad de Inbox, Calendario de Cierres, Pipeline por Rama, Tasas de Reserva, Vencimiento de Documentos, Captaciones del Mes, Listados Nuevos vs Vendidos. **Estratégico** (10): Tendencia de Ingresos, Pronóstico de Pipeline, Participación de Mercado, Análisis de Retención, Evolución de Precios, Costo de Adquisición, LTV por Segmento, Análisis de Portales, Expansión de Cartera, Reporte Ejecutivo.

#### ReportDetailPage — `/reports/:slug`

Full-width layout inside AppShell:
- **Filter bar (sticky):** Date range picker (with presets: Hoy, Últimos 7 días, Este mes, Último trimestre, Año, Personalizado), pipeline selector, branch multi-select, agent filter (RBAC-gated). "Exportar" dropdown → CSV / Excel. "Programar envío" button opens digest config sheet.
- **KPI card row:** 3–5 metric cards. Each: label, large number (DM Mono), delta badge (↑↓ % vs prior period), sparkline (7-day).
- **Chart grid:** Responsive 2-column grid of chart containers. Each container: title, subtitle, chart placeholder area (labeled with chart type: Funnel / Line / Bar / Scatter / Heatmap / Donut / Table), fullscreen icon.
- **Data table (bottom):** Full-width table with column headers, sort indicators, pagination, row click → drill-through.

**Digest config sheet:** Slides in from right. Fields: recipients (comma-separated emails), frequency (Diario/Semanal/Mensual), day/time selector, format (PDF/Excel), preview button.

---

### 3. Billing/Suscripción — `/settings/billing`

Single-page scrollable layout with four sections:

#### Section A: Current Plan + Trial Banner
- **Trial banner** (conditional, shown when `trialDaysLeft !== null`): amber top strip with days remaining, dismissible with ✕ button (`aria-label="Cerrar banner de prueba"`). Last-day variant shows 50%-off offer.
- **Current plan card:** plan name (Syne 22px bold) + active status badge (success green). Next billing date + active payment method. "Cambiar plan" button toggles inline plan comparison table. "Cambiar método" inline text link.
- **Usage meters:** 3 compact metric cards — Usuarios (with progress bar, turns `warning` at 80%), Propiedades, Portales activos.

#### Section B: Plan Comparison Table (expandable inline)
- 4-column table: Solo ($12/mes), Agencia ($45/mes), Pro ($120/mes), Empresa (consultar).
- Monthly/annual billing toggle (annual = 20% off) — recalculates prices inline.
- Feature rows: Usuarios, Propiedades, Portales, IA Copilot, Sitio web, Reportes, Facturación AFIP, Soporte.
- Current plan column highlighted with `brand` 2px border + `brandFaint` background.
- CTA per column: "Plan actual" (disabled italic), "Actualizar"/"Bajar" (brand button), "Contactar" for Empresa.

#### Section C: Payment Methods
- Card list — Stripe (last 4 + expiry) and Mercado Pago (email). "★ Principal" success badge. "Usar como principal" text button on non-primary. ✕ remove (disabled when last method).
- "+ Agregar método" button in section header.

#### Section D: Invoice History
- Table: Fecha · Período · Monto (DM Mono) · Estado badge · CAE AFIP (DM Mono, tertiary) · PDF button.
- Status: ✅ Pagada / ⏳ Pendiente / ⚠️ Vencida with color-coded badges.

#### Upgrade Wizard (3-step modal overlay)
- Step 1: Plan confirmation card with price + annual savings note.
- Step 2: Payment method selector — Stripe card form OR Mercado Pago redirect.
- Step 3: Success state with next billing date + AFIP email confirmation + two navigation CTAs.

#### Downgrade / Cancel
- Downgrade: inline warning listing features to be lost → scheduled at period end.
- Cancel: full-screen retention modal with reason selector + "Quedarme" ghost CTA.

---

### 4. Tasaciones (Appraisals)

#### AppraisalListPage — `/appraisals`

Page header: "Tasaciones" title + "Nueva tasación" CTA button (primary).  
Filter bar: search by address/client, status filter (Borrador/En progreso/Completada/Entregada), date range.  
Table: Dirección, Cliente, Finalidad, Valor estimado (DM Mono), Estado badge, Fecha, Acciones (Ver PDF / Duplicar / Eliminar).

#### AppraisalWizardPage — `/appraisals/new`

5-step wizard. Persistent left sidebar shows step list with completed/active/pending states. Main content area on right.

**Step 1 — Propiedad:** Search-as-you-type for existing properties. Selected property card shows thumbnail + address + key attributes. Or "Nueva propiedad" inline mini-form.

**Step 2 — Finalidad:** Radio card group:
- Venta (selling price estimate)
- Alquiler (rental price estimate)
- Garantía (guaranty valuation)
- Refinanciación (refinancing)
- Herencia (estate valuation)
Brief description under each option. Purpose affects comparable filter in Step 3.

**Step 3 — Comparables:** Split layout:
- Left (400px): Comparable list. Filters: radius (500m/1km/2km/5km), operation type, bedrooms, m². Each comparable row: address, price, price/m², DOM, distance. Checkbox to include/exclude.
- Right (flex): MapLibre map with radius circle centered on subject property. Comparable markers (green = included, gray = excluded). Subject property marker (brand color). Adjust radius → map + list re-filter.

**Step 4 — Narrativa IA:** Two-column:
- Left: Property attributes summary card + editable notes textarea.
- Right: AI-generated narrative text area. Shows typing indicator (`ai` purple animated dots) while generating. Regenerate button. Copy button. Character count.

**Step 5 — Vista previa PDF:** Full PDF preview in an iframe placeholder. Shows cover page, subject property details, comps table, AI narrative, signature block. Action buttons at bottom: "Guardar borrador" (secondary), "Finalizar y descargar PDF" (primary).

---

## Responsive Breakpoints

All modules support three breakpoints:

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 768px | Single column, side panels become bottom sheets/drawers |
| Tablet | 768–1279px | Two columns where applicable, condensed nav |
| Desktop | ≥ 1280px | Full layout as described above |

---

## Accessibility

- All interactive elements have `aria-label` or visible text labels
- Focus ring: `outline: 2px solid brand, outlineOffset: 2px`
- Color is never the sole differentiator — status badges always include text
- Wizard steps: `aria-current="step"` on active step, `aria-disabled` on future steps
- Map (Step 3): screen-reader fallback table of comparables replaces the map for keyboard users
- Minimum touch target: 44×44px for all clickable elements
- Contrast ratio ≥ 4.5:1 for all body text on dark backgrounds (verified against token values)
