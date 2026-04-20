# Portal API Matrix — Phase D Research

**Prepared:** 2026-04-20
**Author:** Researcher Agent (RENA-15)
**Purpose:** Pre-Phase D architecture reference — portal connectivity options for Corredor CRM

---

## Summary

| Portal | API Exists? | Auth Method | Listing Sync | Inbound Leads | Rate Limits | Sandbox | XML Fallback Needed? |
|---|---|---|---|---|---|---|---|
| ZonaProp | Yes (partner) | API Token | Yes | Polling likely | Undocumented | No (partner env) | No (if approved) / Yes (otherwise) |
| Argenprop | Yes (partner) | API Token | Yes | Polling/webhook | Undocumented | Unknown | No (if approved) |
| MeLi Inmuebles | Yes (public) | OAuth 2.0 | Yes | Webhook | 1,500 req/min | Yes (Stage env) | No |
| Remax Network | Yes (EU Datahub) | API Token | Yes | Unknown | Undocumented | Test env (EU) | Likely for AR |
| Inmuebles24 | No public API | — | XML feed | Unknown | — | — | **Yes** |
| Properati / Proppit | Yes (partner) | API Token | Yes | Unknown | Undocumented | Unknown | Fallback via Proppit |
| Idealista | No AR presence | — | — | — | — | — | **N/A — skip** |
| Generic XML | N/A (format) | None | Push XML | N/A | N/A | N/A | N/A |

---

## Portal Details

### 1. ZonaProp

**Owner:** Navent Group → acquired by QuintoAndar (Brazil, 2021)
**URL:** zonaprop.com.ar
**Market position:** Largest real estate portal in Argentina

**API availability:**
- Yes. ZonaProp migrated from an async XML push system to a synchronous REST API in 2024 (per Mapaprop blog). Publications are now instantaneous rather than taking hours.
- Access is **partner/CRM-gated** — not open to all developers. CRMs must be certified integrators.
- Contact: `atencionainmobiliarias@zonaprop.com.ar`

**Auth method:** API token issued to approved CRM integrators.

**Listing capabilities:**
- Full listing CRUD (create, update, unpublish/republish)
- Fields: location (neighborhood, street), price, property type, rooms, area, photos
- Photo limits: not publicly documented; expect standard JPEG/PNG, likely 5–10 MB per image, 20+ photos per listing

**Inbound leads:**
- Not publicly documented; CRM integrators typically receive leads via polling endpoint or email forward. Webhook support unconfirmed — contact partner team.

**Rate limits:** Not publicly documented.

**Sandbox:** No dedicated public sandbox. Partner integrators work in a staging environment by arrangement.

**Known issues / pitfalls:**
- The old async XML system had multi-hour publication delays — the new synchronous API resolves this.
- CRM certification process is mandatory and can take time; plan for a lead time of 2–4 weeks to get API credentials.
- ZonaProp is owned by QuintoAndar (same parent as Tokko Broker), which may provide a streamlined partner process.

**XML fallback required?** Not if partner certification is obtained. If certification is rejected or delayed, XML feed is the interim fallback.

---

### 2. Argenprop

**Owner:** Grupo Clarín (media conglomerate, Argentina)
**URL:** argenprop.com
**Market position:** Second-largest portal in Argentina; >530,000 listings

**API availability:**
- Yes. A documented API for listing publication exists (older PDF spec on Scribd titled *"API de Publicación de Avisos Argenprop"*).
- Access is partner-gated; requires approval from Argenprop.
- Contact: `soporte@argenprop.com`

**Auth method:** API token (per Scribd documentation and CRM partner references).

**Listing capabilities:**
- CRUD operations: publish, update, status change (active/inactive/paused)
- Fields: address (neighborhood IDs from Argenprop's catalog), room specs, price, property type, photos
- Location catalog (neighborhood and street IDs) must be fetched from Argenprop's reference data endpoints

**Inbound leads:**
- CRM integrations mention "consultation intake" — likely polling. Webhook support is not confirmed in available documentation.

**Rate limits:** Not publicly documented.

**Sandbox:** Unknown. Contact Argenprop partner team.

**Known issues / pitfalls:**
- Neighborhood/street IDs must match Argenprop's internal catalog — requires an initial catalog sync step.
- API documentation is dated (Scribd doc circa 2015); may not reflect current state — confirm with Argenprop before implementing.

**XML fallback required?** No, if partner API access is granted.

---

### 3. MercadoLibre Inmuebles (MeLi)

**Owner:** MercadoLibre (Argentina — MLA)
**URL:** inmuebles.mercadolibre.com.ar
**Market position:** Massive general marketplace with large real estate vertical; widest reach in Argentina

**API availability:**
- **Yes — fully public REST API**, best-documented of all portals.
- Developer portal: `developers.mercadolibre.com.ar`
- No approval required to start development; app registration gives sandbox access immediately.

**Auth method:** OAuth 2.0 — Authorization Code flow (server-side). Access tokens expire in 3 hours; refresh tokens provided. Token endpoint: `https://api.mercadolibre.com/oauth/token`.

**Listing capabilities:**
- Full CRUD for property listings under category MLA1459 (Argentina real estate)
- Fields: title, description, price, currency, address, geolocation (lat/lng), bedrooms, bathrooms, floor area (m²), photos, amenities, property type, operation type (sale/rent)
- Photos: up to ~12 MB per image; multiple photos per listing supported; JPEG preferred

**Inbound leads (webhooks):**
- Full webhook support: subscribe to `items`, `questions`, `messages` topics
- Two environments: Production (`api.mercadolibre.com`) and Stage (test)
- Webhooks use HTTPS POST to your endpoint with event payload

**Rate limits:** 1,500 requests/minute per seller. HTTP 429 on breach.

**Sandbox:** YES — Stage environment available for all developers. Separate base URL for testing.

**Known issues / pitfalls:**
- MeLi is a general marketplace, not real estate-specific; buyer/seller UX differs from dedicated portals
- OAuth token rotation required every 3 hours — implement a background refresh job
- Real estate features (visit intention, reservation) are a separate workflow on top of standard listings

**XML fallback required?** No. Full REST API available.

---

### 4. Remax Network

**Owner:** RE/MAX LLC (USA, franchise model); RE/MAX Argentina operates 160+ offices, ~4,800 agents, ~50,000 listings
**URL:** remax.com.ar
**Market position:** Dominant franchise network; strong presence in premium/residential segment

**API availability:**
- RE/MAX EU operates a **Datahub Listings API** (`apidocs.datahub.remax.eu`) supporting REST operations (GET, POST, PUT, DELETE)
- Argentina is part of the RE/MAX global network; access via the RE/MAX global/EU datahub is the most likely path
- No Argentina-specific standalone API found; confirm with RE/MAX Argentina whether they use the EU Datahub or a local system

**Auth method:** Likely API token (EU Datahub model); confirm with RE/MAX Argentina partner/tech team.

**Listing capabilities:**
- Standard listing fields via Datahub; specific field mapping for Argentina properties unclear — requires partner onboarding
- Photo support assumed; limits not documented publicly

**Inbound leads:** Not documented publicly for the Argentina market.

**Rate limits:** Not documented publicly.

**Sandbox:** EU Datahub has a test environment (`listingsapi-test.datahub.remax.eu`); Argentina applicability TBC.

**Known issues / pitfalls:**
- RE/MAX franchise structure means local offices may have separate listing data not centrally accessible via the global API
- Franchise integration requires RE/MAX Argentina's commercial agreement, not just technical API access
- Many RE/MAX agents use local systems (Tokko Broker is frequently referenced) — check if Tokko Broker's integration already covers this

**XML fallback required?** Possibly, if Argentina-specific Datahub access is not granted. XML feed is a known fallback for RE/MAX integrations.

---

### 5. Inmuebles24

**Owner:** Navent Group → QuintoAndar (same parent as ZonaProp); Inmuebles24 is **Mexico-focused**
**URL:** inmuebles24.com (Mexico); no Argentina-specific portal under this brand
**Note:** In Argentina, the equivalent Navent portal is ZonaProp — Inmuebles24 is not an active separate portal in Argentina.

**API availability:**
- No public API found for direct publishing integration
- Tokko Broker's integration list includes Inmuebles24, suggesting a private partner XML/API feed exists
- For Argentina, this portal is effectively covered by ZonaProp (same parent)

**Auth method:** Unknown; likely XML feed with token-based access for CRM partners.

**Listing capabilities:** Standard real estate listing fields; photo support assumed.

**Inbound leads:** Unknown.

**Rate limits:** Not documented.

**Sandbox:** Not found.

**Known issues / pitfalls:**
- **Inmuebles24 is primarily a Mexican portal.** If the brief includes it, clarify whether the target is the Mexican market or if this was included in error — the Argentine Navent asset is ZonaProp.
- If Argentina relevance is confirmed (e.g., cross-posting to Mexico), contact Navent/QuintoAndar Argentina team directly.

**XML fallback required?** Yes — no public API found.

---

### 6. Properati / Proppit

**Owner:** LIFULL Connect (acquired from OLX Group, 2022)
**URL:** properati.com.ar; marketing platform: proppit.com
**Market position:** Part of LIFULL Connect network covering Argentina + 5 other LATAM countries

**API availability:**
- Access is via the **Proppit marketing platform** — publishing to Proppit simultaneously publishes to: Properati, iCasas, Trovit, Mitula, Nuroa, Nestoria
- This is a strong multiplier: one API call = 6+ portals
- Contact LIFULL Connect / Proppit Argentina for partner API access

**Auth method:** API token likely (consistent with other LIFULL Connect portal APIs).

**Listing capabilities:**
- Standard real estate fields; exact schema via Proppit partner documentation
- Photo support assumed

**Inbound leads:** Not publicly documented; contact Proppit support.

**Rate limits:** Not publicly documented.

**Sandbox:** Unknown.

**Known issues / pitfalls:**
- Properati is no longer a standalone portal with its own separate API; the integration point is Proppit
- The Proppit/LIFULL Connect network is particularly strong for reach across LATAM — consider this a high-value single integration

**XML fallback required?** No, if Proppit partner access is granted.

---

### 7. Idealista

**Owner:** Grupo Idealista (Spain)
**URL:** idealista.com (Spain, Italy, Portugal)
**Market position:** Top European real estate portal; NO Argentina presence

**API availability:**
- Official API available at `developers.idealista.com` (requires account + API key request)
- Coverage is **Spain, Italy, and Portugal only**

**Argentina applicability:** None. Idealista does not operate in Argentina or Latin America.

**Recommendation:** Remove from Phase D scope. If there is a reason Idealista appears in the brief (e.g., a future European market expansion), flag to product team for scoping. For now: **N/A — skip**.

---

### 8. Generic XML Feed

**Description:** XML feed publishing is the industry-standard fallback for portals that lack a REST API or require an intermediate format. Multiple Argentine portals and all international portals use XML feeds as either the primary or fallback integration method.

**Standard format:** A structured XML document containing property listings, pushed to a portal-provided endpoint on a scheduled basis (typically every 15–60 minutes).

**Auth:** Usually none (URL-based security) or a simple token in the URL/header.

**Known portals using XML as primary:** Inmuebles24 (Argentina use case), some smaller portals.

**Known portals where XML is a fallback:** ZonaProp (pre-2024 async system), Remax (if Datahub is unavailable).

**Implementation approach:** Build a generic XML feed generator that maps internal listing fields to a common schema; parameterize per-portal field differences.

---

## Key Risks & Recommendations

1. **ZonaProp is critical path** — largest portal, partner certification required. Start outreach immediately. Expect 2–4 week onboarding lead time.

2. **MeLi is the easiest integration** — fully public OAuth API, staging environment available, well-documented. Build this first as the reference implementation.

3. **Properati/Proppit is high-leverage** — one integration covers 6 portals. Prioritize alongside ZonaProp.

4. **Idealista should be dropped** from scope — no Argentina presence.

5. **Inmuebles24 needs clarification** — is this the Mexican market or a scope error? If Mexico is not in scope, remove.

6. **XML feed adapter is required** regardless — at minimum for Inmuebles24 and as fallback for ZonaProp/Remax during onboarding gaps.

7. **Leads infrastructure** is underdocumented across most portals — assume polling with webhooks as an upgrade path. MeLi is the only portal with confirmed webhook support.

8. **External account provisioning needed** (per Section 15.2 of brief): ZonaProp partner account, Argenprop partner account, MeLi developer app registration, RE/MAX Datahub access, Proppit partner account.
