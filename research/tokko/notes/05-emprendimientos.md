# Tokko — Emprendimientos (Developments / New Construction Projects)

URL list: `https://app.tokkobroker.com/developments`
URL detail: `https://www.tokkobroker.com/development/{id}/`

⟶ **Domain concept:** In Argentina/LATAM, "emprendimiento" = a real estate project (building, gated community, lot subdivision, condo tower, "barrio abierto", "barrio cerrado"). The project has many units (lots / apartments / offices) that share marketing identity, delivery date, developer, and sometimes a dedicated microsite.

## List page
- Title "Emprendimientos" / tagline "Creá y visualizá tus emprendimientos"
- CTA "+ Nuevo emprendimiento"
- Search: "Filtrar por nombre del emprendimiento"
- Filters row: **Tipos**, **Ubicación**, **Estado de la construcción**, **Estado**, **Período de entrega**
- List card: thumbnail + title + chips (Tipo de emprendimiento, Dirección, Fecha de entrega, Características) + "Ir a este emprendimiento"

## Submenu under Emprendimientos
- Lista (default)
- Mapa
- Borrados

## Preview modal (from list row)
- Quick-actions bar: Vista previa · Ir a este emprendimiento · Sitio web · **Buscar unidades disponibles**
- Photo mosaic ("Fotos" with "+5" overflow)
- Ref code "MBA43041" + type "Barrio abierto"
- Title, location hierarchy (Barrio | Partido | Zona)
- Dedicated microsite URL (`http://laslomadasdeescobar.com.ar`)
- Chips: "Construcción terminada", "Fecha de entrega Junio 2022"
- Amenity chips (Electricidad, etc.)
- "Información interna" accordion
- Descripción section

## Detail page structure

**Header** (mirrors Property detail):
- Thumbnail + title + ref + type + ES/EN toggle + favorite + share
- Fields: Dirección (ES), Dirección para publicar (ES), Ubicación, Estado
- Quick-action bar: **Mapa · Acciones de Excel · Estadísticas · Vista previa**

**Acciones sidebar:** Nueva propiedad (create unit linked to this emprendimiento) · Borrar emprendimiento

**Tabs:**
1. **Detalles** — general info, custom tags, description
2. **Propiedades** — the units that belong to this development (scoped property search)
3. **Multimedia**
4. **Archivos**
5. **Actividad**
6. **Difusión** — per-portal publishing controls

**Detalles fields:**
- Estado de la construcción
- Fecha de entrega
- Página web (dedicated microsite)
- Título de publicación
- Etiquetas personalizadas (custom tags)

**Propiedades tab** = same global property search UX but pre-filtered with `Emprendimiento: <name>` chip + operation preselected. Also has AI search. "+ Nueva propiedad" creates a unit under this development.

## Data model implications

- **Emprendimiento = Project (parent)** with many Property (child unit) records
- Vinculación from a Property to an Emprendimiento confirmed (seen in Property detail Acciones: "Vincular a emprendimiento")
- Project has: own ref code, own name, own location, own microsite URL, own status (construction state), own delivery date, own multimedia, own custom tags, own publishing controls (Difusión tab)
- Project has divisions / state filters (URL params `division_filters`, `state_filters`) — likely unit stacks (towers / blocks) and unit states (available/reserved/sold)
- **Dedicated microsite** per project — first-class "project website" feature
- **Stats + owner report** at project level, not just per unit

## UX issues

1. **Property search UX duplicated at 3+ scopes** — global, inside contact, inside development. Same component but each stands alone; no shared saved views.
2. **"Dirección para publicar" placeholder "Hacé click para editar"** — inline-edit is a click-first form (not true inline)
3. **"Estado: Cargando información"** suggests async load that wasn't surfaced cleanly (looks like a hanging spinner)
4. **No unit-inventory grid view** — can't see "10 available, 2 reserved, 3 sold" at a glance in a stacked format; you see units through the Propiedades tab as a flat list
5. **No floorplan/site-map unit selector** — modern developer tools let prospects click a lot/unit on an interactive plan; Tokko offers only a map and a list
6. **No pricing table or unit-type comparison matrix** — sales teams for developments want "2BR: from $X, 3BR: from $Y, penthouse: from $Z"
7. **"Acciones de Excel"** = export to spreadsheet. Data lives in the app, but analyses happen in Excel. Symptom of missing in-product analytics.
8. **No reservation/booking workflow tied to units** — Tokko has a separate "Reservas" module at the Properties level, not unified with development flow

## Simplification opportunities → Our product

- **Unit inventory grid** — "33 units, 12 available, 7 reserved, 14 sold" header. Table rows = each unit with stack/floor/orientation/type/size/price/status color-tagged.
- **Interactive floor-plan / site-map** — upload a site plan or floor plan; hotspot each unit; click to see status/price; prospects interact with it on the microsite
- **Unit-type pricing matrix** — one row per unit type, columns = stack/floor variations; drives both internal forecasting and the public microsite "Tipologías" table
- **Release waves** — developments are sold in phases ("pre-venta", "pozo", "estreno", "entrega"); price per wave, inventory per wave; forecasting by wave
- **Project microsite auto-generated** from development data — no need to register a separate domain + manage content twice. Custom domain optional, microsite included.
- **Developer / Broker split** — emprendimiento may be owned by a developer client (not the agency); agency sells on commission. Model `developer` as a Contact entity with per-project commission terms.
- **Reservation workflow unified** at unit level: Reserva → Boleto → Escritura per unit, status visible on the inventory grid
- **Commission plan per project** — tiered (volume bonuses), shared with cobrokers, paid on each milestone
- **Construction timeline** / Gantt per project — entrega date + construction milestones, visible to internal team and (selected milestones) to buyers
- **Per-unit audit log** — price changes, reserva cancelations, agent switches — all visible on a single Activity stream
- **AI-generated unit descriptions** from base project copy + unit-specific attributes
- **Typology comparison in public site** — side-by-side "2A vs 3B" with photos, plans, sizes, prices, amenities
