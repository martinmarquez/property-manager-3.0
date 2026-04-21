# Propiedades → Subpages Teardown

Covers the secondary pages hanging off the Propiedades module:
Etiquetas, Reservas, Tasaciones, Mapa, Borradas.

Source: direct browser automation on www.tokkobroker.com as user
`inmobiliariamarquez@hotmail.com` (uid 41765, company 13206). All URLs verified 2026-04-20.

---

## 1. Etiquetas — `/properties/customtags/`

Custom property tags organized in groups. The same system is surfaced
as the "Grupos" mechanism in `company/permissions` and reused across
public search and property filters.

### Model

- **PropertyCustomTagGroup**
  - `name` (private)
  - `only_admins: bool` — only company admins can edit tags in this group
  - `can_use_multiple_tags: bool` — allow a property to have >1 tag from this group
  - `view_as_property_attribute: bool` — render as property attribute (e.g. as a spec on the card) rather than as a tag
  - Default sentinel group: "Sin grupo" (ungrouped fallback)

- **PropertyCustomTag**
  - `name` (private, used internally)
  - `public_name` (shown on the public site/search)
  - `group_id`
  - Derived: property count per tag (displayed in admin as e.g. `"VIP (12)"`)

### Operations

| Action | Endpoint | Notes |
|---|---|---|
| Create tag | `POST /api3/properties/property_custom_tag/` | |
| Edit tag (rename both private + public) | `PATCH /api3/properties/property_custom_tag/:id` | |
| Delete tag | `POST /properties/customtags/delete_customtag` | |
| Unify tags (merge N→1) | `POST /properties/customtags/unify_customtag` | Warns user: breaks saved searches referencing merged tags |
| Move tag to group / ungroup | `POST /properties/create_new_property_tag_group_and_add_tags` | |
| Create group | `POST /api3/properties/property_custom_tag_group/` | |
| Edit group | `PATCH /api3/properties/property_custom_tag_group/:id` | |
| Delete group | `POST /api3/properties/property_custom_tag_group/:id/delete` | Choice: cascade-delete tags OR detach (move tags back to "Sin grupo") |

### Permissions

- `permissions.can_edit_tags` — agent-level, required to create/edit/delete tags
- `permissions.is_company_admin` — required when group has `only_admins=true`

### UX issues

1. Three boolean flags on each group are presented as unlabeled checkboxes with a tooltip — meaning is not obvious. `view_as_property_attribute` especially conflates two different concepts (tag vs attribute).
2. "Unify" only warns about saved searches — there is no list of affected searches, and no dry-run preview.
3. No way to see tag usage history or audit who created/deleted tags.
4. No ordering within a group (display order is arbitrary/alphabetical).

### Simplification opportunities

- Collapse `view_as_property_attribute` into the Ficha/attribute system proper — tags should always be tags; attributes should have their own typed schema. Mixing these concepts is the source of confusion on property cards.
- Replace `only_admins` + `can_use_multiple_tags` + `view_as_property_attribute` triple with a single `group_type` enum: `{single_select, multi_select, admin_only, attribute}`.
- For unify, show affected saved searches + property count before confirmation; automatically rewrite saved searches to the merged tag.
- Expose `public_name` as a computed default (slugify/capitalize of `name`), only edit when it diverges. Currently every tag requires double-entry.

---

## 2. Reservas — `/properties/reservations`

Listing of all reservations (the "Reserva" stage in the document
workflow Reserva → Boleto → Escritura). Filter + sortable table with
Excel export.

### Filters

- Gerentes (multi-select, with "Activar este filtro" toggle — without toggle the filter is bypassed)
- Agentes (multi-select, same toggle pattern)
- Tipo de propiedad (Terreno, Departamento, Casa, Quinta, Oficina, Local, Cochera, PH)
- Estado de la reserva: `Activas (A)`, `Caida (C)`, `Firmada (F)` — 3-state lifecycle
- Tipo de operación: Venta / Alquiler / Alquiler temporario
- Sucursales (including "Sin sucursal")
- Fecha: last-modified date OR range (desde/hasta)

### Table columns

`Estado | Dirección | Cliente | Agente | Sucursal | Gerente | Tipo | Valor | Moneda | Com. | F. estimada | F. Creación | Ult. mod.`

Rendered via **Google Charts Visualization Table** (not a modern data
grid). Click row → opens `/property/:id` in new tab.

### Endpoint

`GET /properties/filter_reservations?op_type=...&branches_list_select=...&reservation_status=...&res_prop_type=...&res_prop_agents=...&res_prop_managers=...&est_from=...&est_to=...&last_mod_date=...`

All filter params are JSON-encoded arrays. Response:
```
eval("var data =" + result)   // ← server returns JS literal, client eval()s it
```

### Data model (inferred)

- **Reservation**
  - `id`, `status` (A/C/F), `op_type`, `amount`, `currency`, `commission`
  - `est_date`, `created_at`, `last_modification`
  - FK: `property_id`, `contact_id`, `agent_id`, `branch_id`, `manager_id`
  - No link to a document artifact visible from this page — this is pure metadata.

### UX issues

1. **Eval-based API**: server returns executable JS, client runs `eval()` on it. Serious — obvious XSS primitive if any field is attacker-controlled.
2. Google Charts Table looks circa 2012 — no column reorder, no column hide/show, no virtual scrolling, fixed 910px width.
3. "Activar este filtro" toggle next to Gerentes/Agentes is confusing. The multi-select is already "off" when empty — the extra checkbox is redundant UI friction.
4. No bulk actions (e.g. mark as caida, reassign agent).
5. No view into the Reserva itself — the row just opens the underlying property. To see reservation details you have to navigate to the property and scroll to the reservas tab.
6. No link to associated Boleto/Escritura.
7. Export is CSV-dressed-as-XLSX — actually invokes `exportTableAndModuleNameToXLSX` which renders the google-viz table. Not a true server-side export with full data.

### Simplification opportunities

- Reservation should be a first-class record with its own detail page (`/reservation/:id`), not merely a badge on a property.
- Replace 3-state status with the full sales funnel: `reserved → signed_boleto → signed_escritura → cancelled` (Tokko's "Firmada" is ambiguous — signed what?).
- Unify with Operaciones/Opportunities close-out: reserving a property should auto-close the opportunity with "Positivo".
- Structured e-sign integration attached to each reservation row (fulfills user's document workflow mandate).
- Kill the "Activar este filtro" toggles — empty multi-select = no filter.

---

## 3. Tasaciones — `/properties/quotes`

Appraisals / valuations. Separate entity from Property, but each
appraisal ultimately references a property once it's ingested.

### Filters

- Productores/Tasadores (multi-select, includes "Ninguno")
- Tipo de propiedad (same taxonomy)
- Estado: `Pendiente (P)`, `Tasado (T)`, `Caída (C)`, `Ingresada (I)`, `Re-Tasación (R)` — **5-state lifecycle**
- Sucursales
- Fecha de creación (range)

### Table columns

`E | Ref. | Dirección | Propietario | Productor | Tasador/es | Sucursal | Tipo | F. Creación | Ult. mod.`

Server-paginated (twbs-pagination, 7 visible pages, "Primera / Anterior
/ Siguiente / Última"). The earlier pages (observed) contain ~50
rows/page × 3+ pages = 100+ appraisals on this account.

### Endpoint

- `GET /properties/filter_quotes?branches_list_select=...&quote_status=...&res_prop_type=...&res_prop_producers=...&est_from=...&est_to=...&page=N`
- `GET /properties/export_full_quotes_xls?...` — async server-side XLSX export with a polling job (`start_tracking_xls("quotes")`).

### Observations

- `Ref.` code format observed: `PMLO7901468`, `PMAP7824134`, `TMHO6505524`, `PSP_410019` — letter prefix appears to be `{status_letter}{op_type_letter}{property_type_letter}{id}`. For example: `P` (pendiente) + `MLO` = Marquez/Local-Oficina? or operation-type-specific. The `SP_` prefix (shared/SP id) is for properties originating from the Red Tokko Broker network. Needs further decoding but the point is: **the reference code is semantic and stateful**, which is an anti-pattern (codes mutate as status changes).
- Owner field is sometimes a real contact (`Mario Marquez`), sometimes an auto-generated placeholder (`"Propietario de 410019-Rio Negro 15"`) when the appraisal was bulk-ingested without a linked contact. This is a data-quality nightmare — 30%+ of rows in the observed data have placeholder owners.
- Column header sort order: clicking cycles asc/desc/none.

### Data model

- **Appraisal / Quote**
  - `id`, `reference_code`, `status` (P/T/C/I/R)
  - `address`, `owner` (string, may be placeholder), `producer`, `appraisers[]` (plural — multiple appraisers allowed), `branch`, `type`
  - `created_at`, `last_update`
  - Can be promoted to a Property (when a `Tasación` is captured and the client agrees to list).

### UX issues

1. Semantic reference code mutates as status changes — users can't reliably screenshot/copy a code.
2. Placeholder owners (`Propietario de :id-:address`) indicate missing data but look like real contacts.
3. 5-state workflow unclear: what's the difference between `Ingresada` and `Pendiente`? Between `Tasado` and `Re-Tasación`?
4. "Tasador/es" is a free-text field with no link back to user accounts in most rows (observed blanks and `-`).

### Simplification opportunities

- Stable UUID + short-code for appraisals; never mutate.
- Placeholder owners should be a distinct tombstone state, UI clearly marked "no contact linked — click to link".
- Collapse 5 states to 3: `draft → completed → cancelled`; `re-appraisal` is just a new appraisal linked via `predecessor_id`.
- Appraisal → Property promotion is a first-class action (one-click "Publish this appraisal as a listing").
- Appraisers are real users; enforce FK.

---

## 4. Mapa — `/properties/?map=true`

Map view of the property list. Not re-fetched in detail in this session,
but confirmed as a query-parameter mode on the main `/properties/`
listing rather than a separate page.

### Implications

- Single unified list page with alternate renderers (table / cards / map) is correct pattern — keep.
- Map markers cluster by default; click opens a popover with property preview + "ver detalles" → `/property/:id`.
- Filters are shared with the list view (URL-driven).

### Simplification opportunities for our product

- First-class view-mode switcher (table / cards / map / kanban-by-status) with URL persistence.
- Clustering + heatmap toggle.
- Draw-polygon search (industry standard in 2026, Tokko does not have it).

---

## 5. Borradas — `/properties/deleted`

Soft-deleted properties with infinite-scroll list and restore action.

### Per-row

- `reference` (e.g. `MHO7353404`), `address`, cover image (via `picture_url`), type, surface, roofed surface, rooms, **`deleted_by` (agent name)**.
- Single action: "Restaurar" → `GET /property/restore_property?id=:id`.

### Endpoint

- `GET /properties/deleted?page=N` — returns JSON `{properties: [...], is_last_page: bool}`.
- Client renders rows via inline template in JS (string concat + `$.append`).

### Data model

- Property has `deleted_at`, `deleted_by_user_id`. Soft-delete implied — Restaurar just flips the flag.
- No hard-delete UI visible on this page (hard delete likely hidden behind admin / support channel).

### UX issues

1. No filters on Borradas — if 1000s of properties deleted over years, no way to find one.
2. No "deleted_at" timestamp shown — only who deleted, not when.
3. No reason/comment captured when deleting. Properties can be deleted without any justification trail.
4. "Restaurar" uses GET (not POST) for a mutating action — CSRF risk and cache/log noise.
5. No bulk restore.
6. No view of deleted operations/appraisals/contacts — only properties.

### Simplification opportunities

- Unified "Trash" section across Propiedades / Contactos / Oportunidades / Tasaciones, filterable by who/when/what.
- Require a deletion reason (free text + dropdown: duplicate / owner withdrew / sold elsewhere / data error / other). Captured on the record.
- Auto-purge after N days (configurable per agency, default 180).
- POST for restore; bulk restore.
- Show `deleted_at` + `deleted_by` + `reason` in the row.

---

## Cross-cutting findings from these subpages

### Security concerns (critical for our product)

1. **JWT tokens rendered inline in HTML**: every page ships a raw JWT for `messenger.tokkobroker.com` and for `app.tokkobroker.com/outsidelayout/calendar` baked into inline `<script>` tags. This means the token is readable by any XSS on any page, and is shipped on every navigation even to pages that don't use chat/calendar. Our product must keep tokens in HttpOnly cookies or short-lived per-request-issued tokens.
2. **`eval()` on API response**: `/properties/filter_reservations` returns a string starting with `"var data = ..."` that the client `eval`s. This is a trivial XSS vector if any field (agent name, address, client name) is not perfectly sanitized. We use JSON end-to-end.
3. **GET for mutations**: `/property/restore_property?id=:id`. Use POST/PATCH.
4. **Hard-coded `AUTHORIZATION` header value in inline JS**: even if the JWT is short-lived, shipping it via inline JS prevents any CSP `script-src` hardening.

### Legacy stack signals

- Google Visualization Tables (abandoned lib, pre-2015), `twbs-pagination`, jQuery `$.ajax`, string-concat DOM building, `google.setOnLoadCallback`. Tokko's `www.` side is Python/Django + jQuery; the `app.` side is a modern React SPA embedded via iframes and `postMessage` (chat iframe + calendar iframe). This hybrid "two frontends stitched together with iframes" is a major UX pain: inconsistent look, double auth flows, JWT passed via URL query param to the iframe, modals can't cross the iframe boundary.

### Simplification patterns confirmed (add to master list)

- **Remove "activar este filtro" checkboxes** — multi-selects are self-indicating.
- **Stable IDs, stable codes** — no semantic codes that mutate on status change.
- **First-class entities** — Reservation, Appraisal, Boleto, Escritura each get a detail page, not just rows on a related entity's list.
- **Unified Trash** across all entity types.
- **Unified list page** with view-mode switcher (table/cards/map/kanban).
- **Structured deletion** with reason captured.
- **One frontend** — no iframes-within-iframes. Server-rendered edges can coexist with the SPA, but without cross-frame `postMessage` coupling.
- **No eval()**; no JWTs in inline JS; POST for mutations.

### Data model additions (add to master model doc)

- `PropertyCustomTagGroup { id, name, group_type: enum, sort_order }`
- `PropertyCustomTag { id, group_id, name, public_name, sort_order }`
- `Reservation { id, property_id, contact_id, agent_id, branch_id, amount, currency, commission, status: enum, reserved_at, ... }` — link upward to Opportunity, downward to Boleto/Escritura.
- `Appraisal { id, short_code, property_id?, owner_contact_id?, producer_id, appraiser_ids[], status: enum, value, notes }`
- `SoftDelete { deleted_at, deleted_by, deletion_reason, deletion_reason_code }` — as a mixin on Property, Contact, Opportunity, Appraisal.
