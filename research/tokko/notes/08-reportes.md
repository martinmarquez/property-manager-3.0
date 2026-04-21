# Tokko — Reportes (Analytics)

URL index: `https://www.tokkobroker.com/reports`
Per-report: `/reports/{report_slug}` (e.g., `/reports/properties_movement`)

⟶ **Module name:** "Reportes" — tagline: "Información estadística para analizar las operaciones de tu compañía." Classic enterprise-BI framing: pre-baked reports, not dashboards.

## Report catalog (7 reports visible at this agency tier)

| Report | Description (from UI) |
|---|---|
| **Contactos creados (por etiquetas)** | "Asignación de contactos por sucursal, agente y/o grupos de etiquetas." |
| **Análisis de contactos por cada usuario** | "Cuántos contactos fueron creados/asignados a cada usuario y cómo los gestionaron en un período de tiempo." |
| **Reservas para contactos** | "Cuántas reservas fueron realizadas en un período de tiempo." |
| **Movimiento de propiedades** | "Cómo tus propiedades disponibles están siendo involucradas en los diferentes tipos de eventos." |
| **Propiedades sin movimiento** | "Mirá qué propiedades no están recibiendo suficiente atención." |
| **Análisis de contactos** | "Medí la tasa de conversión de contactos creados en un período de tiempo." |
| **Patrones de búsqueda** | "Analizá el comportamiento de tus contactos basados en sus búsquedas y preferencias." |

⟶ Conspicuously missing: revenue/commission reports, deal/pipeline forecasting, portal ROI, agent leaderboard, listing conversion funnel, marketing-channel attribution, time-to-close, stale-lead report.

## Per-report UX (Movimiento de propiedades)
- Minimal form: `Tipos de eventos` dropdown + `Sucursal` dropdown
- Single red CTA: "**Generar reporte**"
- Results render beneath on submit (presumably table + export). No URL sharing, no saved views.

⟶ Classic legacy-BI pattern: pick params → click "Generate" → get static table → export to Excel. No interactive drill-down, no saved report configurations, no scheduled email delivery visible.

## Data model implications

- **Report = named query** with a small, fixed param set (date range, branch, agent, tag-group, event-type)
- Reports appear to be server-rendered; no client-side filtering after generation
- **"Movimiento de propiedades" concept** — properties involved in "events" (visits, emails, inquiries, price changes, publications). Event types are a configurable taxonomy (see Mi empresa → Tipos de eventos menu item).
- **"Tasa de conversión"** — Tokko tracks created-contact → some-terminal-state ratio but doesn't quantify $ value

## UX issues

1. **Identical card layout, text-only differentiation** — a list of near-identical white cards with tiny icons; scanning for the right report is hard
2. **No summary dashboard** — the Home page has "Performance" widgets, but a dedicated analytics workspace with charts doesn't exist
3. **Each report is an isolated micro-app** — generating three reports = three round-trips, no cross-filtering, no shared timeframe
4. **No scheduled delivery** — can't say "email me this report every Monday"
5. **No saved report configurations** — every time, re-enter the params
6. **No drill-down from a metric** — can't click a number in the Home widgets to jump into the underlying listing/contact rows
7. **"Acciones de Excel" pattern everywhere** — export button as universal escape hatch; signals missing in-product analytics ergonomics
8. **Missing money** — no commission/revenue/forecast report in the default set. Real-estate ops without revenue tracking is a red flag for the product's seriousness
9. **No agent leaderboard** — manager-visible ranking of agents by leads handled, conversion rate, revenue — absent
10. **No portal ROI** — despite Tokko owning the publishing layer, there's no report mapping portal spend → leads → deals → revenue

## Simplification opportunities → Our product

- **One analytics workspace, three modes:**
  - **Dashboards** — live, editable, shareable, per-role defaults (owner vs agent vs manager)
  - **Funnels & cohorts** — drop-in templates for listing-to-deal, inquiry-to-won, portal-to-revenue
  - **Ad-hoc explorer** — metric picker + dimension picker + time range + saved views
- **Money first** — revenue, pipeline value, commissions, forecast vs goal, portal ROI. Make the CFO-visible metrics default, not absent.
- **Live, not generated** — charts update as the data changes; no "Generar reporte" button
- **Drill everywhere** — click any number to see the rows behind it; filter/save from there
- **Scheduled reports** — per-report "email me this every Monday 8am" with PDF/Excel/link output
- **AI-narrated insights** — "Your Zonaprop Premium slots are generating 3× more leads than Argenprop Premium this month. Consider reallocating."
- **Agent leaderboard + coaching** — ranked agents, per-agent bottleneck identification ("Agent X loses most leads at Pendiente contactar — suggest faster response SLA")
- **Goals module** — per-agent/per-branch monthly/quarterly goals tracked against actuals, visible on Home widgets
- **Attribution model** — track lead origin end-to-end: portal → inquiry → contact → opportunity → deal → commission. Show per-channel CAC and LTV.
- **Listing health report** — automatic "Propiedades sin movimiento" but also "Propiedades con fotos débiles", "Propiedades con precio fuera de mercado", "Propiedades con descripción corta" — each with one-click fix
- **Public comparables report** — share with owner: "Your unit's 30-day performance vs 12 comparables in the neighborhood." Builds trust + upsells the price-review conversation
- **Real-time ops inbox** — instead of a weekly report of stale leads, surface "3 leads idle >72h" as a Home banner with inline actions
- **No export-first culture** — Excel export remains available but is the exception; default consumption is in-product
- **Report composer** — power users build custom reports (drag metrics + dimensions); save, share, pin to dashboard; replaces the fixed 7-report catalog
