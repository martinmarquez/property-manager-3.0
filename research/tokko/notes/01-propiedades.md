# Tokko — Propiedades (Properties)

URL: https://www.tokkobroker.com/properties/?search_options=... (entire filter state serialized in URL)

## Submenu (left sidebar when Propiedades expanded)
- Buscar (Search) — default
- Etiquetas (Tags) — custom taxonomy mgmt
- Mapa (Map) — geo search
- Reservas (Reservations) — booked/reserved properties
- Tasaciones (Appraisals / valuations)
- Borradas (Deleted / archived)

## Search screen: "BUSCADOR DE PROPIEDADES"

**Header:**
- Title: "BUSCADOR DE PROPIEDADES"
- "Limpiar filtros" (clear filters)
- CTA: "+ Nueva propiedad" (red button)

**AI search bar:**
- Natural language input: "Buscar características de la propiedad (por ej. Casa en venta con 3 ambientes)"
- Dedicated "Buscar con IA" button — Tokko already has AI search (at least branded as such)

**Filter row:**
- Operación (operation type — Sale/Rent/Temporary)
- Tipo de propiedad (property type)
- Currency selector (USD default)
- Price range ("Sin límite")
- Ubicación (location)
- "Más filtros" expansion

**Source tabs (horizontal scrollable):**
- `25 Propiedades disponibles` (user's own active listings)
- `369.826 Red Tokko Broker` (entire Tokko network — other agencies' shareable inventory)
- `598.139 Zonaprop` (live search of Zonaprop portal inventory)
- Arrows suggest more sources beyond (likely Argenprop, MercadoLibre, etc.)

⟶ **Key insight:** Tokko positions itself as a *portfolio aggregator* — an agent can search Tokko + Red + Zonaprop from one place and propose any result to a client. This is a differentiator Tokko already ships.

**View modes:** Table | Grid | Map (icon toggles, upper right of result area)

**Result list columns (after loading):**
- Checkbox (bulk-select)
- Foto (thumbnail)
- Cod. Ref. (MHO/MLA-prefixed internal reference — `MHO` = Marquez "House/Operation"?, `MLA` = Marquez "Land"?)
- Dirección / Ubicación (address + neighborhood)
- Valor (Operation type "Venta" + price with currency)
- Dormitorios / Baños
- S. Cubierta (covered surface) / Total construido (total built) — m² with "Cubm²"
- Amb (ambientes / rooms) / S. Cubierta
- Dorm Frente (front bedrooms)

⟶ Columns reveal key attributes: operation, price+currency, rooms, bathrooms, covered m², total built m², "ambientes", front bedrooms. Very Argentine-real-estate specific.

**Bulk action toolbar (bottom, appears when selection > 0):**
- `0 Propiedades seleccionadas` counter
- Collapse arrow
- Export PDF
- Export Excel
- Generate document (?)
- Add to favorites (star)
- Send by email
- Send by WhatsApp
- Share/send with link
- Edit (bulk)
- Save search (disk icon, right side)

## UX / Modern observations

- The URL-as-state pattern is good (shareable filter views)
- Table is wide and dense; skeleton suggests 7+ columns — will likely feel cluttered
- "Buscar con IA" is a secondary button; feels bolted-on, not the primary interaction
- Bulk toolbar has many icons without labels — hover-to-discover; poor first-time discoverability
- 25 properties for this tenant suggests the small-medium agency is their core market
- Floating help orb + chat widget in bottom-right — accumulating clutter

## Opportunities for our product

- **AI search as the primary input** — replace traditional filters with a hybrid conversational + faceted UI that learns from the query
- **Unified inventory search** from day one: own listings + network + portals (Zonaprop, Argenprop, MercadoLibre) with clear source badges
- **Saved views** with named presets instead of only URL-based state
- **Better bulk actions** with labeled buttons and a properly designed action bar; quick keyboard shortcuts (e.g., select-all → press "F" for favorites, "W" for WhatsApp)
- **Richer map view** — heatmaps, commutes, school overlays, market comps
- **Side-panel preview** on row hover/click (Gmail-style) rather than navigating away

## Entities & relationships inferred

- Property → belongs to: Agent, Branch, Agency
- Property has: Type, Operation (Sale/Rent/Temporary), Currency, Price, Location, Tags (system + custom), Status (available/reserved/sold/not-available)
- Property links to: Reservations, Appraisals, Favorites
- Network: Properties can be shared to "Red Tokko Broker" for inter-agency co-brokering
- Properties have a lifecycle: Draft → Available → Reserved → Sold/Rented → Archived/Deleted
