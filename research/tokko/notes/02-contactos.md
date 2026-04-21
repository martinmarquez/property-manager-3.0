# Tokko — Contactos (CRM / Agenda)

URL: https://www.tokkobroker.com/contacts/
Module is labeled "AGENDA" (old-school address book framing — first dated concept)

Tagline: "Tu listado completo de oportunidades, clientes, y teléfonos útiles."

## Submenu
- Lista (default)
- Etiquetas (custom contact tags)
- Migraciones (import/migration tools)
- Borrados (deleted)

## Page layout
- "Nuevo" CTA (dropdown with more create options, suggested by chevron)
- Contact type filter icons (3): person, group (multiple persons), building (likely org/company)
- "Mostrando 285 Resultados"
- View toggle: list (accordion) | table
- **A-Z alphabet index fixed to right** — classic pre-web-2.0 pattern
- Accordion groups by first letter with count: #(0) A(10) B(4) C(7) D(6) E(10) F(2) G(9) H(1)…
- Filter icon + export icon in right rail of results
- Intrusive "Ayuda rápida" help popup on first visit — blocks interaction

## Inferred contact types
- Individuo (individual person)
- Grupo (group — couple, family, partners)
- Organización/Empresa (company/organization)

## Contact row (expanded)
Each row: checkbox + Name + phone-icon + email + "Ver perfil" link
- Checkbox supports bulk actions
- "Phone" icon is a badge (has phone?) rather than a call action — confusing

## Lead statuses (inferred from URL)
URL param `lead_statuses=[105178,105179,105180,105181,105182,105183,105184,105185]` — **8 discrete lead statuses exist** (typical pipeline: new / contacted / qualified / interested / negotiating / won / lost / archived). These live in Contactos, not in Oportunidades — interesting data model choice: Contact has a status, pipeline stages are on the Contact, not on a separate Opportunity.

## UX issues

1. **Accordion-by-letter for 285 records is painful** — must click each letter, 26 possible clicks to scan
2. **A-Z index duplicates the accordion** — two controls for the same navigation
3. **Toolbar icons unlabeled** — user must hover to discover
4. **Help modal is blocking** — intrusive UX on every first page visit per module
5. **No visible search/filter on this screen** despite 285 records (search is only global at top)
6. **"Agenda" framing is 1990s** — modern term is "Contacts" / "Clients" / "CRM"
7. **No inline preview** — must open each contact to see details

## Simplification opportunities → Our product

- **Kill the accordion.** Single virtualized list with inline search, filter chips, sort control
- **Kill the A-Z rail.** Type-to-jump (press "M" to jump to names starting with M) if alphabet nav is wanted at all
- **Rename "Agenda" → "Contacts"** — aligns with modern expectations and English-first LATAM expansion
- **Unified "people" entity** — prospects/clients/owners/colleagues/tenants are all Contacts with role labels, not separate modules
- **Rich preview panel** on hover/click (right-side drawer, not full navigation)
- **Help content lives in a side panel**, not a modal — accessible but not blocking
- **Labeled toolbar icons** or proper dropdown menu with text labels
