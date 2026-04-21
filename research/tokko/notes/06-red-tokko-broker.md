# Tokko — Red Tokko Broker (Inter-Agency Network / Cobrokering)

URL: same as Propiedades — `https://www.tokkobroker.com/properties/?...network=...`

⟶ **Red Tokko Broker is NOT a separate module.** The sidebar item actually routes to the same BUSCADOR DE PROPIEDADES, but pre-selects the **Red Tokko Broker** source tab (369,850 properties from other Tokko-using agencies in the network).

## What Red Tokko is

A **cobrokering network**: Tokko agencies opt-in to share their listings with other Tokko agencies. Agency A can sell Agency B's listing; commission splits according to agreed-upon %.

**Confirmed count at time of teardown:** 369,850 shared properties across the network.

## UI differences vs own-inventory Propiedades

**Filters row gains COMISIÓN filter:**
- ☑ 50% (show listings offering 50% commission split)
- ☑ 30%
- ☐ No comparte (exclude non-sharing listings — these just advertise, no cobroker)

**Result rows gain:**
- **Commission chip** per row (yellow "50%" badge)
- **Agency short-code** per row (e.g., GRSEI, AUBYA, VANGO, FLOPR — 5-letter agency codes)
- **ID Compartido column** — separate ref code for the shared version of the listing
- **Cod. Ref.** shows two codes stacked (e.g., `FPN26967 / LA7965064`) — own-agency code + network-wide code
- Some rows have a placeholder house icon (no photo from the cobroker)

**Toolbar on right rail:**
- "Exportar listado completo" — export the entire Red Tokko inventory (as opposed to bulk-edit your own listings)
- Favorite + contact actions still work (send a Red Tokko listing to your own contact)

**Inventory tabs visible:**
- `25 Propiedades disponibles` (own)
- `369.850 Red Tokko Broker` (network)  ← active
- `598.190 Zonaprop` (external portal scrape)
- Arrow buttons suggesting more sources (likely Argenprop, MercadoLibre)

## Cobrokering economics seen in-app

- Property detail (from 01b) showed "Comisión compartida: 50%" card on the Red Tokko Broker feature panel
- Publish toggles on Property: ordinary publish, plus shareable to network with set commission %
- Property preview modal had "**Link para colegas**" — shareable link specifically for fellow brokers (keeps listing out of public indexing)

## Data model implications

- **Agency ↔ Network membership** — opt-in, per agency (via Mi empresa settings presumably)
- **Property ↔ SharedListing** — when an agency shares a property to the Red, it gets a network-wide ref code (`ID Compartido`), a commission offer %, and a visibility policy (network-only / public)
- **Cobroker request flow** — likely: another agency clicks "Quiero operar" → message to owning agency → handshake → shared lead/opportunity
- **Commission record** — Property has: seller-side commission (own), buyer-side commission (own), cobroker commission (if sold by a network agency)
- Each **agency** has a unique short-code (e.g., "FLOPR") — likely generated from agency name; functions like a MLS participant ID

## UX issues

1. **"Red Tokko Broker" as a sidebar item is misleading** — the click goes to Propiedades with a tab preselected. It looks like its own module.
2. **No dedicated cobroker inbox** — if you want to operate on a network listing, no visible "Request to cobroker" workflow in this screen
3. **Agency short-codes (FLOPR, AUBYA)** are opaque — need hover or click to see "Flores Propiedades" etc.
4. **Stacked Cod. Ref. rows** (own + shared) are visually cluttered in an already-wide table
5. **No network-level search by agency** — can't say "show me all listings from Agency X" directly
6. **Exclude/include network filter** is buried inside the "Red Tokko Broker" filter inside search options URL params (`"exclude_my_properties": false`, `"network": []`); not exposed as a first-class control

## Simplification opportunities → Our product

- **Not a sidebar item** — treat the cobroker network as a **source filter** inside Properties + an opt-in toggle in agency settings. Sidebar stays clean.
- **Unified Property search with source filter** — "own / network / portals" as filter chips, not tabs that pretend to be different modules
- **Dedicated Cobroker workflow** — request → approval → shared opportunity → commission tracking, all in-app, visible to both sides
- **Agency directory** — click an agency code → profile page (name, branches, total listings, avg commission offered, reviews from other brokers)
- **Trust signals** — verified badge, response time, deal volume, dispute record — otherwise cobrokering is blind trust
- **Smart cobroker matching** — AI suggests "These 3 own listings + these 2 network listings match your client's search. Commission projection: $X."
- **Per-listing commission calculator** — live: buyer's broker gets 50% of 3% = 1.5% of $X = $Y; net-to-seller-agency after costs
- **Network chat** — inline messaging between agencies around a specific listing (not email back-and-forth)
- **Deal room** — when a cobroker deal is in motion, a shared space: docs, timeline, status, commissions, comms — accessible to both agencies
- **API-level cobroker offer** — when a listing goes on the network, the system auto-surfaces it to agencies whose contacts match, rather than waiting for a passive search
