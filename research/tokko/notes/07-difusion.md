# Tokko — Difusión (Portal Publishing)

URL list: `https://www.tokkobroker.com/portals/portals/`
URL per-portal detail: `/portals/publications/{portalId}/`
Submenu: **Carrusel** (`/marketing/carrousel`) — marketing microsite/slideshow feature

⟶ **Domain concept:** "Difusión" = the publishing/syndication layer. Tokko pushes a listing to many external portals + social networks; each portal has its own account, credit quota, and publishing rules. This is the single biggest unit of value Tokko delivers for agencies — portals cost the agency money per month, and getting one listing onto all of them manually is a full-time job.

## Page layout

**Top banner** — "¡No pierdas oportunidades!" with `Configuración` + `Ver publicaciones` CTAs

**Header stats strip:**
- **Propiedades Disponibles** — total own inventory
- **Publicadas en la web** — subset currently published
- **Emprendimientos Disponibles** — total developments
- **Publicadas en la web** — subset

⟶ Tokko tracks "available" vs "published" as two distinct states. A property can be available but unpublished. Publishing is an explicit act per portal.

**Portal cards grid** (headline: "Publicaciones en portales y redes sociales" / "Haga clic aquí en cualquiera de los portales para ver detalles sobre las publicaciones."):

Each card shows:
- Portal logo
- **PUBLICACIONES SIMPLES** — standard-tier listings count
- **PUBLICACIONES PREMIUM** — highlighted/featured tier count
- **ALERTAS A REVISAR** — warnings (missing fields, photo problems, geocoding failures)
- **ERRORES (No publicadas)** — hard failures preventing publish
- **PROPIEDADES PUBLICADAS** / **SIN PUBLICAR** — counts

⟶ Two-tier publishing tier (simple vs premium) is a **portal-level contract** — agency pays for N premium slots, Tokko rotates which listings get them.

**Portal IDs seen in URL:**
- 4 (Zonaprop AR)
- 5 (Zonaprop Emprendimientos)
- 1 (Argenprop AR)
- 21 (Argenprop Emprendimientos)
- 2/4 (MercadoLibre — two-level ID suggests portal-group/portal structure)
- 2/7 (MercadoLibre variant)
- Instagram (`/publications/instagram`) — special path, newer integration

## Instagram-specific integration

Separate flow: "Conexión de cuenta de Instagram"
- Requires: Instagram must be a **professional account** linked to a **Facebook page**
- Error shown when requirements not met: "La cuenta de Instagram seleccionada no cumple con los requisitos necesarios"
- Connect / Disconnect flow; disconnecting warns: "las publicaciones hechas" (existing posts stay)
- Step-by-step guide ("Te guiamos paso a paso para hacerlo")
- Shows `@undefined` / `NaN` when not connected (data-binding leak — bug)

## Activación de portales y redes sociales (lower panel)

"Habilitá o deshabilitá en dónde querés difundir tus propiedades."

**Country filter dropdown** — 20 countries:
Argentina, Uruguay, Brasil, Peru, Colombia, Estados Unidos, Paraguay, España, Chile, Otro, Ecuador, Republica Dominicana, Panamá, México, Costa Rica, Honduras, Guatemala, Reino Unido, Emiratos Árabes Unidos, Venezuela

⟶ LATAM-wide portal coverage footprint, with some non-LATAM (US, UK, Spain, UAE) — multi-region SaaS, not AR-only.

**Argentina portal list (all visible as checkboxes, PAGO or GRATUITO badge + support email):**
| Portal | Type | Contact |
|---|---|---|
| Zonaprop | PAGO | atencionainmobiliarias@zonaprop.com.ar |
| Zonaprop (variant) | PAGO | atencionainmobiliarias@zonaprop.com.ar |
| Argenprop | PAGO | info@argenprop.com |
| MercadoLibre | PAGO | inmobiliarias@mercadolibre.com |
| MercadoLibre (variant) | PAGO | inmobiliarias@mercadolibre.com |
| Proppit | PAGO | hola@proppit.com.ar |
| Liderprop | GRATUITO | info@liderprop.com |
| Doomos | GRATUITO | luis.saavedra@doomos.com |
| LaCapital | PAGO | inmuebles@lacapital.com.ar |
| Club Inmueble | PAGO | Info@clubinmueble.ar |
| Propia | GRATUITO | info@propia.com.ar |
| Inmoclick | PAGO | comercial@inmoclick.com |
| Terrenos y Quintas | GRATUITO | info@terrenosyquintas.com |
| Buscadorprop | PAGO | info@buscadorprop.com.ar |
| Inmoup | PAGO | nicolas@inmoup.com.ar |
| Region20 | GRATUITO | region@region20.com.ar |

⟶ **~15+ AR portals integrated.** 10 PAGO, 5 GRATUITO. Each portal requires the agency to have its own paid account (Tokko syndicates, doesn't re-sell).
⟶ **Proppit** is a Grupo Navent aggregator — publishing to Proppit can fan out to Zonaprop + regional MercadoLibre-family portals. Both appear here, so agencies can pick direct or aggregator.
⟶ Support-email-per-portal suggests Tokko passes billing/listing-quota issues back to the portal itself — Tokko is the plumbing, not the contract owner.

**Activation toggle** on each portal = "is this portal accepting sync from this agency?" Separate from per-listing "publish to this portal" toggle on each Property.

**Country fallback:** "Integraremos portales para tu país a la brevedad." — if country has no integrated portals yet, just a "coming soon" message. Some LATAM countries (e.g., Honduras, Guatemala) may show this.

## Sidebar submenu
1. **Difusión** (default — this page)
2. **Carrusel** (`/marketing/carrousel`) — likely an email/featured-listings carousel generator. Not fully explored here; belongs to the same "marketing" namespace as Consultas (both under `/marketing/`).

## Onboarding callout
"Activar portales para publicar automáticamente" — suggests default is manual; agency opts in to automatic publish.

## Data model implications

- **Portal** is a first-class entity with id, name, country, type (PAGO/GRATUITO), support contact, premium-tier support, icon/logo
- **AgencyPortalConnection** — per agency: portal + activation flag + credentials/API key + premium quota
- **PropertyPublication** — Property × Portal × tier (simple/premium) × status (published / pending / error / alert) × external-id × last-sync-at
- **DevelopmentPublication** — same but for Emprendimiento (separate portal IDs for developments vs properties on same portal)
- **PublicationAlert** vs **PublicationError** — two severity levels surfaced
- Instagram is modeled differently — social-post entity, not a listing publication
- Countries drive which portals are selectable
- Aggregator relationship (Proppit → Zonaprop/ML-family) probably modeled as "fanout portal"

## UX issues

1. **Intrusive Intercom + HubSpot feedback overlays** visible on page load (support chat + "Submit HubSpot product feedback") — noisy
2. **Instagram card shows `@undefined` / `NaN` when not connected** — data binding leaks UI crud to user, unprofessional
3. **"Publicaciones simples / Publicaciones premium / Alertas / Errores" stacked as 6 lines on every portal card** — scannability breaks when you have 15 cards × 6 metrics each
4. **Two Zonaprop variants + two Argenprop variants + two MercadoLibre variants** (for properties vs emprendimientos) — same logo, confusing
5. **PAGO/GRATUITO badge is useful but no pricing visible** — user has no idea how much each paid portal costs
6. **No per-portal health/sync status** at a glance — a portal could be silently broken (API key expired) and the card would still show counts
7. **No publish queue/log** — when you hit "publish", you don't see a timeline of "queued → sent → accepted by portal → indexed"
8. **No per-portal rules** — can't say "only publish 3BR+ to Premium slot on Zonaprop"
9. **"Habilitá o deshabilitá" is a global agency toggle**; per-listing overrides live elsewhere (Property → Difusión tab) — two places to reason about the same thing
10. **Country dropdown shows 20 countries but most have no portals** — wastes the picker
11. **Support email as click-to-mail** — modern integration should surface Tokko-side error first, not push users to email the portal
12. **"Carrusel" submenu is orphan** — unrelated marketing tool bolted onto the same sidebar section
13. **No social beyond Instagram** — no Facebook Marketplace, no TikTok, no Twitter/X, no LinkedIn (for commercial), no YouTube (for video tours). The "redes sociales" framing oversells.

## Simplification opportunities → Our product

- **One clear mental model:** Property × Channel × State. "Channel" = portal / website / social / microsite / WhatsApp broadcast. Unified log, unified status.
- **Channel health dashboard** — a grid with green/yellow/red per channel: last successful sync, error count, quota remaining, next scheduled publish. If Zonaprop is down, every agency knows immediately.
- **Per-channel credentials & quota as first-class** — agency pastes API key / OAuths once; remaining premium slots ("7/20 Zonaprop Premium used") visible; auto-rotation rules selectable
- **Smart premium allocation (AI):** auto-rotate premium slots to the listings with best conversion potential (highest-scored leads, freshest photos, best match to active saved searches). Today Tokko requires manual premium toggle.
- **Bulk publish actions with preview** — "Publish these 12 to Zonaprop + Argenprop + Proppit" → preview what each portal will see (per-portal description, per-portal photos), confirm once, go.
- **Per-channel overrides UI** — side-by-side diff between master listing and per-channel version (different description, different photo order, price hidden for some channels). Today Tokko hides these on the Property → Difusión tab.
- **Publish queue + retry dashboard** — timeline view of every publish attempt: "queued → sent → accepted → indexed" with retry controls and structured errors
- **Structured errors, not just counts** — "3 errors" → click → "Photos below 800px: 2 listings / Missing EN translation: 1 listing" with one-click fix-in-context
- **Portal marketplace/catalog** — browse all available portals per country, see pricing, one-click activate (with link to partner onboarding for PAGO portals)
- **Social post generator** — AI-generated post copy + image selection + schedule, for Instagram/Facebook/TikTok/LinkedIn. Auto-tag property, track engagement back to lead source
- **Property → Inbox loop** — when a Zonaprop lead comes back via Consultas, automatic attribution: "This inquiry came from your Zonaprop Premium slot on listing X" — closes the ROI loop per portal
- **Portal cost vs lead ROI report** — "Zonaprop: $X/mo → 47 leads → 3 deals → $Y revenue. Argenprop: $X/mo → 12 leads → 0 deals. Drop?" Drive actual spend decisions.
- **Syndication templates** — "Standard AR pack" (Zonaprop+Argenprop+ML+Proppit), "Premium AR pack" (+ premium tier), "LATAM expansion pack"; one-click apply per listing
- **Unified social + portal + website publishing** — the target listing is the source of truth; every channel is a rendering. No "two Zonaprops" because properties and developments route to the same contract.
- **Aggregator detection** — if agency is already on Proppit (which fans out to Zonaprop+ML), warn against double-publishing to Zonaprop directly
- **Country-aware picker** — hide countries with no portals; for those, let agencies vote "we want portal X" so product prioritizes integrations by demand
- **Kill `@undefined` / `NaN`** — empty states must be designed, not leaked from the data layer
