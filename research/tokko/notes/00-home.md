# Tokko Broker — Home / Dashboard Teardown

URL: https://app.tokkobroker.com/home
Title: "Inicio | Tokko Broker"

## Global Chrome (visible on every page)

**Top bar (left → right):**
- Tokko logo (home link)
- Global search: "Buscar contactos, propiedades, emprendimientos o agentes" — unified search across 4 entity types
- 4 quick-access icon buttons (likely: contacts/properties/developments/agents shortcuts)
- Notification bell with badge "+99"
- Flag/bookmark icon (favorites or tasks?)
- User avatar + name ("mario")
- Settings gear
- Help (?)

**Left sidebar (primary nav, top→bottom):**
- Company logo (Marquez Inmobiliaria — tenant branding at top)
- `+ Crear` — global creation CTA (red button, prominent)
- Inicio
- Noticias (News)
- Chat
- Oportunidades (Opportunities / Deals pipeline)
- Contactos (Contacts / CRM) — has submenu
- Propiedades (Properties) — has submenu
- Red Tokko Broker (inter-agency property-sharing network)
- Emprendimientos (Developments / new construction) — has submenu
- Mi empresa (My Company) — has submenu
- Consultas (Inquiries) — badge "+99"
- Difusión (Distribution / portal publishing) — has submenu
- Reportes (Reports / Analytics) — has submenu
- Sitios web (Websites / public site builder)

**Right rail:**
- Calendario (Calendar) — with "+" quick add
- Visitas a propiedades (Property visits) — "No hay próximas visitas" + "Ver todas las visitas" CTA
- Favoritos (Favorites) — with tabs for counts per entity type (Contacts 3, Properties 2, People 0, Deals? 0)
- Floating chat widget (bottom right, red, badge 3) — likely internal team chat or support

## Main content area (dashboard body)

Greeting: "Hola, mario — Este es el resumen de tus contactos, propiedades y tareas pendientes"

**Tabs:** Pendientes (Pending) | Estado actual (Current state) | Performance

**Filters:** Sucursales (Branches) dropdown + Agent dropdown (mario andres marquez) + active filter chip row
- Agency-level multi-branch awareness baked in from the start
- Current view is filtered by individual agent — suggests default scope is "my pendings"

**Content:** (loading skeletons visible) — two-column card grid, likely "tareas pendientes" / "alertas" / "seguimientos"

## UX / Modern observations

- Visual density is moderate; red/white/gray theme feels 2018-era SaaS — clean but dated typography
- No keyboard shortcuts hinted (no "⌘K" affordance on global search)
- Right rail is always-on and eats significant screen real estate; not collapsible without clicking chevron
- "Crear" CTA is prominent and tenant logo is personalized — strong multi-tenant polish
- Notification badge "+99" suggests no good way to triage / dismiss in bulk
- Skeleton loaders present (good)

## Opportunities for our product

- **Command palette / ⌘K** over unified search
- **Collapsible panels** (left nav and right rail) with saved state per user
- **Dashboard widgets** user-configurable (drag/drop) — today it's a fixed tab set
- **Smart-triage inbox** for notifications (AI categorization, batch actions)
- **Calendar should own the real estate** for an agent's day; surface visits/tasks/calls inline with properties and contacts
- **Performance tab** is likely a static report — we can make it a live, personalized "insights" feed (AI-driven: "5 leads went cold this week", "2 listings need fresh photos", etc.)

## Entities discovered from this screen

- Contacts (contactos)
- Properties (propiedades)
- Developments (emprendimientos)
- Agents (agentes)
- Branches (sucursales)
- Inquiries (consultas)
- Visits (visitas)
- Opportunities / Deals (oportunidades)
- Favorites (multi-entity polymorphic favorites)
- News items (noticias)
- Calendar events
