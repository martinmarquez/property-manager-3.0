# Phase B Product Spec — Listings & Contacts Core

**Phase:** B (weeks 5–10)  
**Status:** Draft — pending CEO review  
**Owner:** Product Manager  
**Updated:** 2026-04-20  
**Exit criteria:** Agency can load its full portfolio and contacts via CSV importer in < 1 hour and browse fluently.

---

## 1. Module: Propiedades (`/properties`)

### 1.1 User Stories

#### US-B01: Property List View

**As** a real estate agent,  
**I want** to view all my agency's active listings in a fast, filterable list with multiple view modes,  
**so that** I can quickly find the right property to share with a client or update.

**Given** I am logged in and navigate to `/properties`,  
**When** the page loads,  
**Then** I see a virtualized table of all non-deleted properties for my tenant, sorted by `updated_at DESC` by default, with columns: thumbnail, reference code, address/neighborhood, operation type + price, bedrooms, bathrooms, covered m², status.

**Given** I have 100,000 properties in my portfolio,  
**When** the list renders,  
**Then** p95 load time is < 800ms and virtual scrolling keeps the DOM lean (< 200 rendered rows at once).

**Given** I click the map icon in the view switcher,  
**When** the map view loads,  
**Then** MapLibre renders clustered property markers within 1s, and the URL updates to `?view=map` (shareable link).

---

#### US-B02: Property Filtering

**As** an agent,  
**I want** to combine multiple filters and save them as named views,  
**so that** I can repeatedly run my common searches without re-entering criteria.

**Given** I open the filter panel,  
**When** I set filters,  
**Then** the URL updates immediately to reflect all active filter values (deep-linkable, shareable).

**Given** I have active filters applied,  
**When** I click "Guardar vista",  
**Then** a dialog prompts for a name and saves the filter state as a named saved view, accessible from a "Vistas guardadas" dropdown.

**Given** a multi-select filter is empty,  
**When** I submit the search,  
**Then** that filter is treated as "all" (no "Activar este filtro" checkbox needed — absence of selection = no constraint).

---

#### US-B03: Property Create/Edit

**As** an agent,  
**I want** to create or edit a property with all Argentina-market fields in a single-page form,  
**so that** I can maintain accurate listing data without context-switching.

**Given** I click "+ Nueva propiedad",  
**When** the form loads,  
**Then** I see: type selector → subtype → basic dims → geo → operation + price → description (with AI generate button) → owners → status. Required fields are starred; empty optional fields are collapsed.

**Given** I fill required fields and click "Guardar",  
**When** validation passes,  
**Then** the property is created, `property.created` domain event fires, `audit_log` row is written, and I land on the property detail page.

**Given** I click "Generar descripción con IA",  
**When** the AI description generator returns,  
**Then** a draft title + description is pre-filled in the form; I can accept, edit, or discard it.

---

#### US-B04: Media Gallery

**As** an agent,  
**I want** to upload, reorder, caption, and per-portal-flag property photos,  
**so that** my listings look their best on every portal without duplicating uploads.

**Given** I open the Medios tab of a property,  
**When** I drag-and-drop up to 100 image files,  
**Then** each file is validated (JPEG/PNG/WebP, ≤ 20MB each, ≤ 200 total) and uploaded to Cloudflare Images, producing responsive variants (thumb 160×120, medium 800×600, large 1920×1440).

**Given** images are uploaded,  
**When** I drag a photo to a new position in the gallery grid,  
**Then** the `sort_order` is updated server-side and all portal publications re-use the new order on next sync.

**Given** I click the ⋮ menu on an image,  
**When** I select "Ocultar en portal > ZonaProp",  
**Then** a `portal_override` record is created that excludes this image from ZonaProp syncs without affecting other portals.

---

#### US-B05: Property History & Audit Trail

**As** an agency admin,  
**I want** to see a full chronological diff of every change made to a property,  
**so that** I can audit edits and recover from accidental changes.

**Given** I open the Historial tab of a property,  
**When** the tab loads,  
**Then** I see a timeline of every change event: `{timestamp, user, field, old_value, new_value}` ordered newest-first.

**Given** a price change is logged,  
**When** I expand that event,  
**Then** I see the previous price, new price, currency, and the operation type affected.

**Given** a property is soft-deleted,  
**When** an admin opens `/properties/trash`,  
**Then** the deleted property appears with `deleted_at`, `deleted_by`, and the deletion reason captured at delete time.

---

#### US-B06: Bulk Edit

**As** an agent,  
**I want** to select multiple properties and update their status, price, or featured flag in one action,  
**so that** I can perform batch operations without editing each property one by one.

**Given** I select 15 properties using the list checkboxes,  
**When** I click "Editar selección",  
**Then** a modal shows only fields that can be bulk-edited: Status, Featured, Branch assignment, Tag add/remove. Fields that require per-property values (address, price) are not offered.

**Given** I set all selected properties to status "Pausado" and click "Aplicar",  
**When** the update completes,  
**Then** each property emits `property.status_changed`, all `audit_log` rows are written, and the list view refreshes with the new statuses.

---

#### US-B07: CSV Import (Tokko → Corredor)

**As** a migrating agency,  
**I want** to import my existing Tokko property CSV export into Corredor with a column-mapping wizard,  
**so that** I can migrate my portfolio without manual data entry.

**Given** I upload a Tokko property CSV export on the import page,  
**When** the wizard loads,  
**Then** Corredor auto-maps known Tokko column names to Corredor fields (see Tokko→Corredor mapping table below) and highlights unmapped columns for manual assignment.

**Given** I complete the column mapping and click "Importar",  
**When** the import job runs,  
**Then** 10,000 properties import in < 5 minutes via BullMQ, and the result shows: imported / skipped (duplicate reference code) / failed rows with reasons.

---

### 1.2 Filter Combinations

All filters are additive (AND logic). Each filter panel section:

| Filter | Type | Values |
|---|---|---|
| Operación | Multi-select | Venta, Alquiler, Alquiler temporario, Comercial en alquiler, Comercial en venta |
| Tipo de propiedad | Multi-select (grouped) | See taxonomy below |
| Subtipo | Multi-select | Populated based on selected Tipo |
| Estado | Multi-select | Disponible, Reservado, Vendido/Alquilado, Pausado, Archivado |
| Precio | Range (min/max) + Currency selector | ARS, USD |
| Superficie cubierta | Range (min/max m²) | |
| Superficie total | Range (min/max m²) | |
| Ambientes | Range (min/max) | |
| Dormitorios | Range (min/max) | |
| Baños | Range (min/max) | |
| Antigüedad | Range (años) | |
| Ubicación | Geo hierarchy: Provincia → Partido/Departamento → Localidad → Barrio | |
| Radio geográfico | Draw-polygon on map OR circle radius from point | |
| Etiquetas custom | Multi-select (by tag group) | Per-tenant custom tags |
| Agente asignado | Multi-select | Users in tenant |
| Sucursal | Multi-select | Branches in tenant |
| Fecha de carga | Date range | |
| Publicado en portal | Multi-select | ZonaProp, Argenprop, MeLi, etc. |
| Destacado | Boolean | |
| Con precio | Boolean | |

**Saved views:** Named presets stored per user. URL reflects full filter state. "Limpiar filtros" resets all.

---

### 1.3 Media Gallery Requirements

| Attribute | Specification |
|---|---|
| Accepted formats | JPEG, PNG, WebP, HEIC (auto-converted to WebP on upload) |
| Max file size | 20 MB per file |
| Max photos per property | 200 |
| Min photos for publishing | 1 (portal-specific minimums enforced per adapter) |
| Video | MP4 / MOV, max 500 MB, transcoded by Mux (HLS, thumbnails, captions auto-generated) |
| Floor plans | PDF / PNG / SVG, max 50 MB, displayed in dedicated "Planos" section |
| 3D tour | URL embed (Matterport, etc.) |
| Ordering | Drag-and-drop in gallery; sort_order int on `property_media`, 0-indexed |
| Captions | Per-photo caption (plain text, max 200 chars); shown on portal if portal supports |
| Cover photo | First photo in sort_order is cover; can be pinned explicitly |
| Per-portal hide | `portal_override` row per photo per portal to exclude from specific portal sync |
| CDN | Cloudflare Images; responsive variants: thumb 160×120, card 800×600, full 1920×1440, original stored in R2 |
| Watermark | Optional per-tenant watermark overlay config in Settings |

---

### 1.4 Property Type + Subtype Taxonomy (Argentina Market)

| Tipo (Type) | Subtipo (Subtype) |
|---|---|
| Departamento | Monoambiente, 1 dormitorio, 2 dormitorios, 3+ dormitorios, Duplex, Triplex, Loft, Piso, Semipiso |
| PH | PH dúplex, PH tríplex, PH planta baja |
| Casa | Casa chorizo, Casa moderna, Casa quinta, Casa en barrio cerrado, Casa en country |
| Quinta | Quinta de fin de semana, Quinta productiva |
| Terreno | Lote urbano, Lote en barrio cerrado, Terreno rural, Lote industrial |
| Oficina | Oficina estándar, Piso de oficinas, Coworking |
| Local | Local comercial, Galería, Shopping/mall |
| Cochera | Cochera individual, Cochera cubierta, Box |
| Galpón | Galpón industrial, Nave logística, Depósito |
| Campo | Campo agrícola, Campo ganadero, Tambo, Establecimiento mixto |
| Hotel / Apart-hotel | Hotel boutique, Apart-hotel, Hostel |
| Edificio | Edificio completo, Propiedad multifamiliar |
| Fondo de comercio | Gastronómico, Salud/farmacia, Servicios, Comercio minorista |
| Emprendimiento | Emprendimiento en pozo, En construcción, Entregado |

**Notes:**
- Emprendimiento is a top-level entity (`development`) distinct from individual property records; it aggregates units.
- "Tipo de propiedad" filter groups by the primary type; subtipo is a secondary filter.
- New types can be added by Corredor staff (not per-tenant).

---

### 1.5 Bulk Edit UX Behavior

1. User selects 1–N properties via row checkboxes or "Select all matching" (applies to full filtered result set, not just visible page).
2. Bottom action bar slides up: "N propiedades seleccionadas · [Edit] [Export] [Delete] [Publish] [Add to Favorites]".
3. Clicking "Edit" opens a modal with these bulk-editable fields only:
   - **Estado** — dropdown, apply same status to all
   - **Destacado** — toggle on/off for all
   - **Sucursal** — reassign branch
   - **Agente** — reassign assigned agent
   - **Etiquetas** — add tags (additive, does not remove existing tags) or remove specific tags
4. Non-bulk-editable fields (address, price, bedrooms, etc.) are excluded from the modal.
5. Clicking "Aplicar" fires one mutation per property (batched in BullMQ), each writes `audit_log`. On completion: success toast with count; failures listed in expandable panel.
6. "Select all matching" warning: if count > 500, user must type the count to confirm.

---

### 1.6 CSV Import Field Mapping: Tokko → Corredor

| Tokko CSV Column | Corredor Field | Notes |
|---|---|---|
| `referencia` / `cod_ref` | `reference_code` | Preserve as-is for traceability |
| `titulo` | `title` | |
| `descripcion` | `description` | |
| `tipo` | `property_type` | Normalize to our taxonomy (fuzzy match + manual override) |
| `subtipo` | `subtype` | |
| `operacion` | `operation.kind` | Map: Venta→sale, Alquiler→rent, Alquiler temporario→temp_rent |
| `precio` | `listing.price_amount` | |
| `moneda` | `listing.price_currency` | USD/ARS |
| `superficie_cubierta` | `covered_area_m2` | |
| `superficie_total` | `total_area_m2` | |
| `ambientes` | `rooms` | |
| `dormitorios` | `bedrooms` | |
| `banos` | `bathrooms` | |
| `toilettes` | `toilets` | |
| `cocheras` | `garages` | |
| `antiguedad` | `age_years` | |
| `pais` | `country` | Default AR |
| `provincia` | `province` | |
| `localidad` | `locality` | |
| `barrio` | `neighborhood` | |
| `calle` | `address_street` | |
| `numero` | `address_number` | |
| `latitud` | `geom` (lat) | |
| `longitud` | `geom` (lng) | |
| `estado` | `status` | Map: Disponible→active, Reservado→reserved, Vendido→sold |
| `agente` | `created_by` (user lookup by name/email) | Best-effort match; fallback to import-runner user |
| `sucursal` | `branch_id` | Name lookup; unmapped → default branch |
| `propietario` | `contact` → `property_owner` | Create contact if not found by name/email/phone |
| `comision` | `listing.commission_pct` | |
| `fecha_carga` | `created_at` (override) | Preserve original load date |
| `etiquetas` | `property_custom_tag` | Create tags if new; assign to property |
| `foto_principal` | `property_media` (cover) | URL or skip if 404 |

**Column auto-detection:** Corredor performs fuzzy header matching (Levenshtein distance ≤ 2) for known aliases. Unmapped columns are shown in the wizard for manual assignment or skip.

**Deduplication:** If a property with the same `reference_code` already exists, the import row is flagged as "duplicate" and skipped (not overwritten) unless the user explicitly enables "Overwrite on duplicate code".

---

### 1.7 Acceptance Criteria

#### Create/Edit Form
- [ ] All mandatory fields validated client-side before submission (Zod schema mirrors server)
- [ ] Form auto-saves draft to `localStorage` every 30s; draft restored on reload
- [ ] Geo picker: type an address → Google Places autocomplete → lat/lng populated; user can drag pin on map
- [ ] Property type change clears incompatible subtype
- [ ] "Con precio" toggle: if off, price is still stored but not shown publicly on portal
- [ ] Save completes in < 500ms p95 (excluding media uploads)
- [ ] Post-save: `audit_log` row written, `property.created/updated` event emitted, AI chunk upserted within 30s

#### Gallery Editor
- [ ] Upload progress shown per file (byte-level progress bar)
- [ ] Failed uploads (size/format) rejected with error message, others continue
- [ ] Drag reorder is optimistic (UI updates immediately, server persisted within 1s)
- [ ] Deleting a photo prompts "Are you sure?" if it is the cover photo and no other photo exists
- [ ] Per-portal hide: toggled from ⋮ menu; persisted in `portal_override` table

#### Map View
- [ ] Markers cluster at zoom < 13; expand on zoom in or click cluster
- [ ] Clicking a marker opens a side-panel with property summary (address, price, bedrooms, m², status, cover photo)
- [ ] Draw-polygon tool: freehand draw → filters list to properties inside polygon; polygon serialized in URL
- [ ] Heatmap layer (demand from `inquiry.zones`): toggle button

#### History Tab
- [ ] All `property_history` rows shown in reverse chronological order
- [ ] Each row: timestamp, acting user avatar + name, field label (human-readable), old value → new value
- [ ] Price history: shown as a mini sparkline chart at the top of the history tab, then listed below
- [ ] Audit trail retained for the lifetime of the property (no truncation)

#### Trash (Borradas)
- [ ] Deletion always captures: `deleted_at`, `deleted_by`, `deletion_reason` (required dropdown: Duplicado / Se vendió por fuera / Propietario retiró / Error de datos / Otro)
- [ ] Trash page: filterable by who, when, type; searchable by address/reference
- [ ] Restore button: POST mutation; restores to previous status; `audit_log` row written; property.restored event emitted
- [ ] Auto-purge after 180 days (configurable in Settings); purge sends email notification to agency admin 7 days before
- [ ] Bulk restore: select multiple → restore all

---

## 2. Module: Contactos (`/contacts`)

### 2.1 User Stories

#### US-B08: Contact List View

**As** an agent,  
**I want** to view all contacts in a fast, searchable, filterable list,  
**so that** I can quickly find clients, owners, and companies to contact or review.

**Given** I navigate to `/contacts`,  
**When** the page loads,  
**Then** I see a virtualized list (not accordion-by-letter) of all contacts sorted by `updated_at DESC`, with columns: avatar, name, primary phone, primary email, lead score badge, assigned agent, last activity.

**Given** I type in the search bar,  
**When** I type at least 2 characters,  
**Then** results filter in real-time via trigram + FTS search on name, email, phone; results update as I type (debounced 200ms).

---

#### US-B09: Contact Create/Edit (CRUD)

**As** an agent,  
**I want** to create and edit contact records with all relevant fields for the Argentine market,  
**so that** I have complete client profiles linked to their interactions and properties.

**Given** I click "+ Nuevo contacto",  
**When** I select contact type "Persona",  
**Then** the form shows: first name, last name, DNI/CUIT/CUIL/Passport (type + number), birth date, gender, phone(s) with type (celular/WhatsApp/fijo/oficina), email(s), address(es), assigned agent, source, notes, tags.

**Given** I select contact type "Empresa",  
**When** the form loads,  
**Then** it shows: legal name, CUIT, industry, fiscal address, primary contact person (relationship link), phones, emails, assigned agent, notes.

**Given** I save a contact with an email that already exists in the tenant,  
**When** the deduplication check runs,  
**Then** I see a warning banner: "Un contacto con este email ya existe: [Name] — ver perfil / continuar de todas formas / fusionar". No silent duplicate is created.

---

#### US-B10: Relationship Management

**As** an agent,  
**I want** to link contacts to each other with typed relationships,  
**so that** I know a buyer is married to an owner, or that a contact is a lawyer representing a company.

**Given** I open a contact and click "+ Agregar relación",  
**When** I search for another contact by name,  
**Then** I can select them and choose a relationship type: Cónyuge de, Progenitor de, Empleado de, Socio de, Abogado de, Corredor de, Propietario de (property-linked), Inquilino de, and any custom type added in Settings.

**Given** I add a relationship "Contact A – Cónyuge de – Contact B",  
**When** I view Contact B,  
**Then** the Relaciones tab shows Contact A listed as their cónyuge — relationships are bidirectional.

---

#### US-B11: Segment Builder

**As** a marketing manager,  
**I want** to define named contact segments using criteria (tags, lead score, location, last activity, source),  
**so that** I can target campaigns and saved searches to specific groups.

**Given** I navigate to `/contacts/segments` and click "Nuevo segmento",  
**When** I define criteria (e.g. lead_score > 70 AND tag = "Comprador Palermo" AND last_activity > 30 days ago),  
**Then** the preview shows a live count and sample of matching contacts.

**Given** I save the segment,  
**When** I navigate to Marketing → Campañas,  
**Then** this segment appears as a recipient option for email/WhatsApp campaigns.

**Given** a contact's attributes change,  
**When** they now match a dynamic segment's criteria,  
**Then** they are added to the segment automatically (segment membership is recomputed nightly or on relevant field change).

---

#### US-B12: Duplicate Detection & Merge

**As** an agency admin,  
**I want** to see all suspected duplicate contacts and merge them with one click,  
**so that** my CRM stays clean and agents aren't working with fragmented contact histories.

**Given** I navigate to `/contacts/duplicates`,  
**When** the page loads,  
**Then** I see clusters of suspected duplicates, grouped by similarity score (embedding cosine + trigram on name/email/phone), highest confidence first.

**Given** I click "Fusionar" on a duplicate pair,  
**When** the merge modal opens,  
**Then** I see a side-by-side comparison of both contacts' fields, with a "winner" pre-selected per field (the more complete/recent value wins by default). I can override any field.

**Given** I confirm the merge,  
**When** the merge completes,  
**Then**: the losing contact is soft-deleted with `deletion_reason = 'merged_into'`; all linked leads, inquiries, threads, reservations, and property ownerships are re-attributed to the winning contact; a `contact.merged` audit event is written; no data is lost.

---

#### US-B13: DSR (Data Subject Request) Flow — Ley 25.326

**As** an agency admin,  
**I want** to process data subject requests (access, rectify, delete, portability) for contacts,  
**so that** my agency complies with Argentine data protection law (Ley 25.326).

**Given** a contact submits a request (or an admin initiates one on their behalf),  
**When** I open `/settings/data-protection` and create a new DSR,  
**Then** the DSR workflow tracks: request type (access / rectify / delete / portability), contact linked, received_at, deadline (30 days per law), status (pending / in_progress / completed / disputed).

**Access request flow:**  
Given I process an "Access" DSR,  
When I click "Generar exportación",  
Then the system compiles: contact record, all linked leads, inquiries, threads (sanitized), calendar events, documents, audit trail entries into a JSON bundle; the download is available within 30s; the DSR is marked completed.

**Delete request flow:**  
Given I process a "Delete" DSR,  
When I click "Eliminar datos",  
Then: the contact is hard-deleted (PII fields nulled, not just soft-deleted); all linked PII in threads, documents, and audit_log is scrubbed to `[REDACTED]`; the contact shell record is retained for 90 days (legal obligation audit trail) then fully purged; a `contact.dsr_delete` audit event is written.

**Portability flow:**  
Given I process a "Portability" DSR,  
When I click "Exportar en formato portable",  
Then a JSON-LD and CSV bundle is generated with all of the contact's personal data in a machine-readable format.

---

#### US-B14: CSV Import (Contacts)

**As** a migrating agency,  
**I want** to import contacts from Tokko, Google Contacts, or a generic Excel/CSV,  
**so that** I can bring my existing client base into Corredor without manual entry.

**Given** I upload a CSV on `/contacts/import`,  
**When** the wizard loads,  
**Then** Corredor auto-detects column format (Tokko, Google, generic) and pre-maps known columns (see mapping table below). I can override any mapping and preview the first 5 rows.

**Given** I start the import,  
**When** the job runs,  
**Then** 50,000 contacts import in < 10 minutes; deduplication check runs per contact (email + phone + DNI); duplicates are flagged (not overwritten) and shown in the results.

---

### 2.2 DSR Screen Detail

**Route:** `/settings/data-protection`  
**Access:** `admin` role and above only.

**Page layout:**
- Counter row: "N solicitudes abiertas · N vencen esta semana"
- Table: Request ID, Contact name/link, Type, Received, Deadline (color-coded: green → amber → red), Status, Actions
- "+ Nueva solicitud" CTA

**DSR statuses:** `pending` → `in_progress` → `completed` | `disputed`

**What data is exported (Access request):**
- Contact base record (name, emails, phones, addresses, notes, lead_score)
- All linked leads (pipeline stage history)
- All linked inquiries (criteria + match results)
- Inbox thread summaries (message count, last message date — not full message bodies unless specifically requested and legally required)
- Calendar events linked to contact
- Documents linked to contact (metadata only, PDF if explicitly requested)
- Audit log entries for the contact entity

**What is scrubbed on Delete:**
- `first_name`, `last_name`, `national_id`, `birth_date`, `gender` → nulled
- `emails`, `phones`, `addresses` → emptied
- `notes` → `[REDACTED]`
- `inbox_message.body_text / body_html` where from_address matches contact → `[REDACTED]`
- `audit_log.diff` fields containing contact PII → `[REDACTED]`

---

### 2.3 CSV Import Field Mapping: Source → Corredor

#### Tokko Contact Export

| Tokko Field | Corredor Field | Notes |
|---|---|---|
| `nombre` + `apellido` | `first_name` + `last_name` | |
| `email` | `emails[0].value` | |
| `telefono` | `phones[0].e164` | Normalize to E.164 (+54...) |
| `celular` | `phones[1].e164` with `whatsapp=true` | |
| `dni` | `national_id` with `national_id_type='DNI'` | |
| `tipo` | `kind` | Persona→person, Empresa→company |
| `empresa` | `legal_name` (if kind=company) | |
| `etiquetas` | `contact_tag` | Create if new |
| `agente` | `owner_user_id` | Name/email lookup |
| `fecha_creacion` | `created_at` | |
| `notas` | `notes` | |
| `origen` | `source` | |
| `estado_lead` | `lead` (stage in default pipeline) | Map Tokko 8 statuses to closest stage |

#### Google Contacts Export (CSV)

| Google Field | Corredor Field |
|---|---|
| `Name` | split to `first_name` + `last_name` |
| `E-mail 1 - Value` | `emails[0].value` |
| `Phone 1 - Value` | `phones[0].e164` |
| `Organization 1 - Name` | `legal_name` (if kind=company) |
| `Notes` | `notes` |

#### Generic Excel/CSV

Column mapping is fully manual in the wizard. Column header suggestions via fuzzy matching. Preview shows first 5 rows to validate mapping before import.

---

### 2.4 Acceptance Criteria

#### Contact CRUD
- [ ] Contact save completes < 500ms p95
- [ ] Duplicate check fires on save (email + phone + DNI); shows non-blocking warning with merge option
- [ ] Contact type switching (Persona ↔ Empresa) clears type-specific fields and resets validation
- [ ] `contact.created/updated/deleted` events emitted; `audit_log` row written on every mutation
- [ ] Soft-deleted contact accessible at `/contacts/trash`; hard-delete on DSR only

#### Relationship Management
- [ ] Relationship types are configurable in `/settings` (add custom types)
- [ ] Bidirectional: adding A→B automatically creates the inverse B→A in the UI
- [ ] Deleting a relationship requires confirmation; only affects the join record (contacts themselves unchanged)
- [ ] Relationships visible in Contact detail Relaciones tab and on mini-card in search results

#### Segment Builder
- [ ] Segments can combine: tags, lead_score range, location (province/locality), source, created_at range, last_activity range, has_open_leads boolean, operation_interest (sale/rent)
- [ ] Live preview count updates < 2s
- [ ] Segment membership recomputed on relevant contact field change (via domain event handler)
- [ ] Segment used as campaign target → campaign recipient list resolved at send time (not snapshot)

#### CSV Import
- [ ] Upload accepts `.csv`, `.xls`, `.xlsx` files up to 50MB
- [ ] Deduplication: email (case-insensitive) + phone (E.164 normalized) + DNI; if any match exists → row flagged `duplicate`
- [ ] Import result download: CSV with original row + status (imported / duplicate / error) + error message
- [ ] Async via BullMQ; progress bar on `/contacts/import`; email notification on completion

#### Duplicate Detection & Merge
- [ ] Duplicates page shows clusters sorted by match confidence (high → low)
- [ ] Each cluster shows: contact names, emails, phones, lead counts
- [ ] Merge conflict resolution: field-by-field winner selection with override
- [ ] Post-merge: FK rewrite verified by count (lead count on merged = sum of both; no leads lost)
- [ ] Merged contact's activity timeline shows history from both pre-merge contacts, labeled by source

---

*End of Phase B spec.*
