# Tokko — Property Detail Page

URL: https://www.tokkobroker.com/property/{id}/

## Header section
- Thumbnail + status chip "Disponible" (green)
- Title line: "Dirección — Los Platanos 90" + ES/EN language toggle + favorite (star) + share
- "MHO7888878 | Casa" (ref code + type)
- Fields: `Dirección para publicar (ES)`, `Ubicación` (admin hierarchy: G.B.A. Zona Norte > Escobar > Ynca Huasi > Los Platanos 90), `Estado`
- Toggle: **Publicar** on/off (with "Ver" mode), separate **Con Precio** toggle — can publish with or without price shown
- Red Tokko Broker card: "Comisión compartida: 50%" — cobrokering commission sharing

## Quick-action bar
Mapa | Exportar | Estadísticas | Reporte al propietario | Vista previa

- **Reporte al propietario** is key: owner-facing marketing report (views, inquiries, activity) — table-stakes Argentine broker feature
- **Estadísticas** per-property (views, leads, where from)

## Visits panel
"No hay próximas visitas" + CTA "Ver todas las visitas"

## Tabs (property detail)
1. **Detalles** — attributes (rooms, sizes, amenities), custom tags, legal info, comments
2. **Multimedia** — photos, videos, virtual tours, floor plans
3. **Archivos** — documents (deeds, contracts, owner paperwork)
4. **Historial** — change log / audit trail
5. **Difusión** — per-portal publishing controls (which portals, with/without price, with/without address)
6. **Contactos** — linked contacts (owners, buyers interested, previous inquiries)

## Details tab UX
- Attribute **search box** "Buscar atributos (Ej.: Dormitorios)" — attribute catalog is vast enough to need search
- **Ficha Compacta | Expandida** toggle — density switch on the same form
- Banner: "Los atributos disponibles para completar son los configurados para este tipo de propiedad. Podés modificarlos desde Configuración de propiedades"
- **Custom tags** section (Etiquetas personalizadas) editable

## Right rail "Acciones"
- Borrar propiedad (delete)
- Copiar propiedad (duplicate) — good for near-identical units
- Vincular a emprendimiento (link to development project)

## Internal-info fields (scrolled bottom)
- Usuario de mantenimiento (maintenance user / property caretaker)
- Propietario(s) — linked Contact + per-owner commission (%) entry
- Comisión del comprador (buyer commission %)
- Ubicación de llaves (key location — physical tracking)
- Información Legal/Impuestos (legal/tax notes)
- Comentarios internos (internal comments, e.g., "Casa de Patricia Rodriguez")
- Audit: Created by + timestamp

## Preview modal (when clicking row from list)
Opens over list with: Vista previa, Ir a la propiedad, Sitio web, Link para colegas, Exportar a PDF, favorite, like/match, share, more (⋮)
- `Link para colegas`: specific shareable link for fellow brokers (Red Tokko Broker)
- `Sitio web`: public site link for the property
- Quick metrics strip: 200 m² cubierta | 6 ambientes | 6 dormitorios | 4 baños | 2 toilettes | 2 cocheras | 30 años

## Key modeling insights

- **Per-language publishing** (ES/EN) — multi-language is first-class per property (supports touristic markets and LATAM)
- **Owner linked as Contact with commission %** — owner-broker relationship is a first-class entity with economic terms
- **Key tracking** — physical key location is tracked
- **Maintenance user** — separate role from owner
- **Compaction vs Expanded ficha** — same underlying data, different form density
- **Attribute catalog is type-dependent** — configurable per property type (Casa vs Terreno vs Departamento...)
- **Commission sharing** — built into the property record, both per-owner and for cobrokering
- **Per-portal publishing controls** live under a dedicated "Difusión" tab

## Opportunities for our product

- **Inline editing** everywhere — Tokko uses "Hacé click para editar" placeholders which require click-first UX; we can do Notion-style instant edit
- **Single ficha, smart density** — auto-collapse empty fields, don't split into "compact/expanded" modes
- **AI-assisted ficha completion** — from a handful of photos + address, pre-fill 70% of fields
- **Photo intelligence** — auto-tag rooms, detect missing shots, suggest reorder for listing appeal
- **Owner portal** — let owners log in and see their property's stats, instead of emailed PDF reports
- **Version history with diff view** — Historial tab should be visual, not just a log
- **Live commission calculator** — with cobrokering, taxes, and net-to-owner preview
- **Key tracking that actually works** — QR/NFC tag per key, check-out/check-in log per agent
