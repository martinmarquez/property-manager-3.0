# Tokko — Contact Detail Page

URL: https://www.tokkobroker.com/contact/{id}/

## Left panel (identity)
- Avatar (placeholder ring)
- Favorite star (top right)
- Name
- Email
- Phone
- Channel indicator: "Celular/WhatsApp"
- Status chip: "Cerrado" (Closed) — lead state visible at a glance
- 4 counters (unlabeled icons): property match / building / search / key — likely: property matches, opportunities, saved searches, properties owned

## Top bar (contact header)
- "Agente: {assignee}" — owning agent
- **"Smart Lead" badge** — confirms: Tokko already has AI lead scoring
- Action icon cluster (7): info, search, calendar, chat, email, WhatsApp, phone, mobile — launch direct channel from the contact

## Tags row
- Multi-colored chip list. Example values: `Origen de contacto > Zonaprop`, `Web`, `Venta`, `Terreno`, `Consulta`, `Matheu` (neighborhood)
- Hierarchical tag (`Origen de contacto > Zonaprop`) — tag taxonomy supports parent/child
- Shows lead source (portal/channel), operation type, property type, interest category, location interest

## Metadata strip
- Fecha de creación + Última actualización timestamps

## Two-role CTAs (key insight about the data model)
- **"¿ESTÁ AGENTE BUSCANDO UNA PROPIEDAD?"** → start a search for this contact (buyer role)
- **"¿ES AGENTE PROPIETARIO?"** → Crear propiedad para Agente (owner role) — references `Propietar.io` (Tokko's side product for owners)

⟶ **Contact has two first-class roles: Buyer (with saved searches) and Owner (with linked properties).** Not two separate records — one contact, multiple roles.

## Tabs on contact
- **BUSCADOR** — property search scoped to the contact (saved searches + unified inventory: own / Red Tokko / Zonaprop)
- **ACTIVIDAD** — activity log / timeline

## BUSCADOR inside contact
Same property search UX as the global module, but:
- Scope is "for this contact" — results can be sent via WhatsApp/email/link from here
- 25 (own), 369,845 (Red Tokko), 598,216 (Zonaprop) — same multi-source federation

## Data model implications
- Contact ↔ Property: saved-search relationship (buyer side)
- Contact ↔ Property: ownership relationship (owner side), with commission %
- Contact ↔ Agent: ownership ("belongs to agent")
- Contact ↔ Inquiry (Consulta): origin/source
- Contact ↔ Tags: many-to-many with hierarchical taxonomy
- Contact ↔ Status: lead state (8 statuses)
- Contact ↔ Activity: timeline of interactions

## Simplification opportunities → Our product

- **Unified identity, role toggles** — one Contact record, surface role-specific affordances contextually, not as two big CTA cards
- **Timeline-first** — the ACTIVIDAD tab should be the default view (what's happened recently > blank search)
- **Channel actions are one click, not seven** — primary action = "Continue conversation" (opens last thread); secondary actions available in a small menu
- **Smart Lead score visible + explained** — show *why* the AI ranked them (e.g., "High match on 3 active listings, opened 4 emails last week")
- **Contextual nudges** from AI — "3 new listings match their saved search. Send?"
- **Merge/split** for duplicates (Tokko doesn't seem to have a visible merge tool)
