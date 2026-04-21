# Tokko → Corredor Data Map

**Status:** Draft v1 — 2026-04-20
**Source:** Direct browser automation on tokkobroker.com, agency 13206, user 41765
**Purpose:** Authoritative field mapping for the `tools/tokko-importer` CLI

---

## 1. Tokko Export Formats

Tokko Broker does **not** offer a self-service data export portal. Agencies must request their data via support or use the Tokko REST API.

### Available export mechanisms

| Method | Formats | Coverage | Notes |
|--------|---------|----------|-------|
| Tokko REST API (`/api/v1/properties/search`, etc.) | JSON | Properties, Contacts, Opportunities | Requires per-agency API key; pagination via `limit`/`offset` |
| Manual export (admin request) | CSV | Properties only | Flattened rows; no relational joins |
| Portal XML feeds | XML (Zonaprop format) | Properties (published only) | Subset of fields; only published listings |
| Browser-scraped HTML | — | All screens | Fragile; last resort |

**Recommended import path:** API extraction via Tokko REST API → transform → Corredor import.

---

## 2. Entity Coverage & Field Maps

### 2.1 Properties (`Property`)

| Tokko Field | Type | Corredor Field | Notes |
|-------------|------|----------------|-------|
| `id` | int | `external_id` (tokko) | Stored for idempotency; not exposed in UI |
| `reference_code` | str | `legacy_reference` | Mutates in Tokko on status change — store original |
| `type.name` | str | `property_type` | Map via type table (§4) |
| `operations[].operation_type` | str | `operations[].type` | venta/alquiler/alquiler-temporario |
| `operations[].prices[].price` | decimal | `operations[].price.amount` | |
| `operations[].prices[].currency` | str | `operations[].price.currency` | ARS/USD |
| `operations[].prices[].period` | str | `operations[].rent_period` | monthly/daily (temporario) |
| `address` | str | `location.address` | Often partial; enrich with geocoding |
| `location.name` | str | `location.zona` | Barrio/localidad name |
| `geo_lat` / `geo_long` | decimal | `location.lat` / `location.lng` | Present for ~70% of properties |
| `surface_total` / `surface_covered` | decimal | `surface_total` / `surface_covered` | m² |
| `rooms` / `bedrooms` / `bathrooms` | int | `rooms` / `bedrooms` / `bathrooms` | |
| `age` | int | `building_age_years` | |
| `description` | str | `description` | HTML stripped; keep as markdown |
| `photos[].image` | url | `photos[].url` | Must mirror to Corredor CDN |
| `videos[].url` | url | `videos[].url` | YouTube/Vimeo embeds |
| `floor_plans[].image` | url | `floor_plans[].url` | |
| `tags[].name` | str | `custom_tags[]` | Map to agency's Corredor custom tags |
| `status` | str | `status` | Map via status table (§4) |
| `sale_status` | str | `sale_status` | Libre / Reservada / Vendida |
| `rental_status` | str | `rental_status` | Libre / Reservada / Alquilada |
| `web_price` | bool | `show_price` | |
| `created_at` / `updated_at` | datetime | `created_at` / `updated_at` | Preserve originals |
| `deleted` | bool | `deleted_at` | Soft-delete → set deleted_at if true |
| `producer.id` | int | `producer_id` (User.external_id) | Link after contacts imported |
| `appraiser.id` | int | `appraiser_ids[]` | |
| `branch.id` | int | `branch_id` | Link after branches imported |

**Not in Tokko export / not mappable:**
- Deletion reason (Tokko has none → import as `null`)
- E-sign status (Tokko doesn't have this)
- Corredor-native commission records

### 2.2 Contacts (`Contact`)

| Tokko Field | Corredor Field | Notes |
|-------------|----------------|-------|
| `id` | `external_id` | |
| `first_name` / `last_name` | `first_name` / `last_name` | |
| `email` | `contact_methods[].value` (type=email) | |
| `phone` / `cellphone` | `contact_methods[].value` (type=phone/whatsapp) | Tokko stores both as strings |
| `contact_type.name` | `type` | Propietario / Inquilino / Posible propietario |
| `tags[]` | `tags[]` | |
| `created_at` | `created_at` | |
| `assigned_broker.id` | `assigned_agent_id` | |
| `address` | `address` | |
| `notes` | Notes (embedded in first Opportunity comment) | |
| `birth_date` | `birth_date` | |
| `country` | `country_code` | Normalize to ISO 3166-1 |

**Messy data patterns:**
- Phone fields contain spaces, dashes, country code in inconsistent format → normalize to E.164
- Email may be empty or placeholder (`nomail@tokko.com`) → treat as null
- `first_name` may contain full name when `last_name` is blank → split on last space

### 2.3 Opportunities (`Opportunity`)

| Tokko Field | Corredor Field | Notes |
|-------------|----------------|-------|
| `id` | `external_id` | |
| `contact.id` | `contact_id` | |
| `properties[].id` | `interested_in_property_ids[]` | |
| `status.name` | `stage_name` | Map to Corredor pipeline (§4) |
| `close_reason.name` | `close_reason` | |
| `created_at` | `created_at` | |
| `updated_at` | `updated_at` | |
| `comments[].text` | `follow_ups[].note` | |
| `comments[].created_at` | `follow_ups[].created_at` | |
| `comments[].author.id` | `follow_ups[].created_by_id` | |
| `budget` | `budget.amount` | |
| `budget_currency` | `budget.currency` | |
| `assigned_broker.id` | `assigned_agent_id` | |

**Not mappable:**
- Tokko's auto-follow-up rules (agency-level config; must be re-created manually)
- Subscriber list (Tokko doesn't expose per-opportunity subscribers)

### 2.4 Users / Agents

| Tokko Field | Corredor Field | Notes |
|-------------|----------------|-------|
| `id` | `external_id` | |
| `first_name` / `last_name` | `first_name` / `last_name` | |
| `email` | `email` | Must match or link to invited Corredor user |
| `branch.id` | `branch_id` | |
| `active` | `active` | |
| `role` | `role` | Map to Corredor role (§4) |

**Import note:** Users must be **invited to Corredor first**; the importer maps `external_id` to an existing Corredor user. It does not create auth accounts.

### 2.5 Agency Config

Import order: Agency → Branches → Divisions → Users → Properties → Contacts → Opportunities.

Tokko agency config fields that map directly:
- `name`, `fiscal_name`, `phone`, `email`, `website`, `logo` → Agency root
- `branches[]` → Branch records
- `custom_property_tags[]` → PropertyCustomTagGroup + PropertyCustomTag
- `lead_statuses[]` → LeadStatus (pipeline stages)
- `event_types[]` → EventType

---

## 3. Data Loss Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Deleted properties** — Tokko `deleted=true` are hidden from API by default | High | Add `?deleted=true` to API calls; import as soft-deleted |
| **Opportunity history** — only text comments imported; structured events (status changes, email opens) are not in Tokko API | Medium | Import as a single "Migrated from Tokko" note with all comments concatenated |
| **Reference code mutation** — Tokko codes encode status; post-import codes are Corredor UUIDs | Medium | Store Tokko ref code in `legacy_reference` field; surface in UI search |
| **Portal publication state** — which portals a property is live on | Medium | Import publication history as metadata; agency must republish to Corredor portals |
| **Document files** — Reserva/Boleto/Escritura PDFs are not in Tokko API | High | Agencies must upload PDFs manually post-migration; warn in migration report |
| **Calendar events** — not exported by Tokko API | Low | Warn in migration report; prompt agency to re-enter |
| **Appraisal records** — partial: Tokko API includes `appraisals` but without internal value history | Medium | Import as Corredor Appraisal records; value history lost |
| **Co-brokered listings** — `SP_` properties belong to partner agencies | Low | Skip or import as read-only; agency must confirm |

---

## 4. Value Mapping Tables

### Property type mapping

| Tokko `type.name` | Corredor `property_type` |
|-------------------|--------------------------|
| Terreno | land |
| Departamento | apartment |
| Casa | house |
| Quinta | country_house |
| Oficina | office |
| Local | commercial |
| Cochera | garage |
| PH | ph |
| Galpón | warehouse |
| Campo | farm |
| Hotel | hotel |
| Edificio | building |
| Fondo de comercio | business |
| Emprendimiento | development |

### Property status mapping

| Tokko `status` | Corredor `status` |
|----------------|-------------------|
| Disponible | available |
| Pendiente | pending_appraisal |
| Tasado | appraised |
| Reservado | reserved |
| Vendido / Alquilado | sold / rented |
| Fuera de mercado | off_market |
| Borrado | deleted |

### Lead pipeline stage mapping

| Tokko stage | Corredor stage |
|-------------|----------------|
| Sin Contactar | new |
| Sin Seguimiento | unresponsive |
| Pendiente contactar | to_contact |
| Esperando respuesta | awaiting_response |
| Evolucionando | evolving |
| Tomar Acción | action_required |
| Congelado | cold |
| Cerrado | closed |

### Role mapping

| Tokko role | Corredor role |
|-----------|---------------|
| Admin | agency_admin |
| Supervisor | manager |
| Corredor | agent |

---

## 5. Top 10 Messy Data Patterns

1. **Placeholder owner contact** — `first_name: "Propietario de"`, `last_name: "123-some-address"`. Detection: `first_name` starts with "Propietario de". Action: mark `owner_is_placeholder=true`; surface in post-migration report as "N properties need a real owner assigned."

2. **Duplicate contacts** — same person entered multiple times across different agents. Detection: fuzzy-match on (email OR normalized phone) OR (first_name + last_name similarity > 0.85). Action: cluster candidates; present dedup review UI before import; let agent confirm merge or keep separate.

3. **Malformed phone numbers** — spaces, dashes, country code mixed formats (e.g. `+54 11 1234-5678`, `01112345678`, `1134567890`). Action: normalize to E.164 (`+54...`). If ambiguous, store as-is with `phone_raw` field.

4. **Empty / placeholder email** — `nomail@tokko.com`, `null`, `""`, addresses with typos. Action: treat as null; flag in report.

5. **HTML in description field** — Tokko description may contain raw HTML (`<b>`, `<br>`, `<p>`, inline styles, stray `&nbsp;`). Action: strip HTML tags; convert `<br>`/`<p>` to newlines; trim whitespace.

6. **Price = 0 or null** — properties with no price set. Action: import with `show_price=false`; flag in report for review.

7. **Missing geolocation** — ~30% of properties have no lat/lng. Action: attempt geocoding via address string on import; if no match, import without coords and flag.

8. **Duplicate properties** — same address, same type, different reference code (often listed by multiple agents). Detection: exact match on (address + type + surface_total). Action: flag as suspected duplicate; do not auto-merge.

9. **Photos with dead URLs** — Tokko CDN URLs sometimes 404 on old properties. Action: HEAD-check each photo URL during import; skip dead URLs; log in error report.

10. **Opportunity with no contact link** — orphaned opportunities where the contact was deleted. Action: create a placeholder "Unknown Contact" record with `migrated_orphan=true`; link opportunity to it.

---

## 6. Import Ordering

```
1. Agency metadata (name, logo, settings)
2. Branches + Divisions
3. Users (agents) — match by email to invited Corredor users
4. Custom tag groups + tags
5. Lead status pipeline stages
6. Event types
7. Properties (with photos, operations, tags)
8. Contacts (dedup step here)
9. Opportunities (link to contacts + properties)
10. Appraisals (link to properties)
```

---

*Next step:* Hand this document to Back-End Developer with `importer-spec.md` to build `tools/tokko-importer` CLI in Phase H.
