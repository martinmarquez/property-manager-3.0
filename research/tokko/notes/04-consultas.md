# Tokko — Consultas (Inquiries / Inbox)

URL: `https://www.tokkobroker.com/marketing/webcontact/`
Config: `https://app.tokkobroker.com/marketing/webcontact/config`

⟶ **Naming insight:** URL path `/marketing/webcontact/` suggests inquiries started as a "marketing" feature capturing web-form contacts — never refactored. Tokko sidebar shows this as **Consultas +99** (heavy volume).

## Page purpose
"Asigná las consultas de los portales y tu sitio web a tus agentes." — assign portal + website inquiries to agents.

## Header row
- "0 reglas de automatización activas" chip (green)
- **Configuración** CTA (red) — opens rules engine
- Dropdown: "Ver las consultas de: Consultas Sin Sucursal, Zona Norte" — branch-scoped inbox

## Tabs
1. **PENDIENTES** (default) — unassigned, needs action
2. **ASIGNADAS** — assigned to an agent, in-flight
3. **BORRADAS** — dismissed/deleted

⟶ Simple 3-state lifecycle: Pending → Assigned → Deleted. No explicit "resolved/converted" terminal state.

## Inquiry card structure
- 💬 Name (contact submitted name)
- **Recibido:** relative time ("hace 1 semana, 1 día", "hace 1 mes")
- **Email:** address
- **Teléfono:** number
- **Propiedades:** thumbnail + property title + assigned agent ("mario andres marquez - Zona Norte")
  - If property unavailable/sold: title strikethrough
- **Mensaje:** free text message (typically auto-generated from portals like "Me gustaría recibir más información sobre la propiedad con referencia mho7353404")
- **Etiquetas:** auto-tags
  - Source: `Proppit` (publishing gateway)
  - Location hierarchy: `Argentina | G.B.A. Zona Norte | Pilar | Villa Buide`
  - Operation: `Alquiler`
  - Property type: `Casa`
- **"Crear un nuevo contacto"** CTA — primary action: convert inquiry → Contact
- Delete icon (trash) per card

## Automation rules (Configuración page)
- "Reglas de asignación" — rule-based auto-assignment to agents
- Example use case: "Si existe un agente destinado a las propiedades comerciales, se podría establecer una regla para que esas consultas se le asignen automáticamente"
- "Mostrar reglas inactivas" toggle
- **Default rule (always on):** "Las consultas de visitas a propiedades que no pertenezcan a ningún contacto serán asignadas a un agente que participe en la visita. Priorizaremos que sea el agente o productor y evitaremos duplicar los contactos siempre que sea posible"
  - ⟶ Tokko already tries to **avoid creating duplicate contacts** — good signal that dedup matters
  - Default routes inquiries to the listing's agent, falling back to branch

## Data model implications

- **Inquiry is NOT a Contact** initially — raw form submission, becomes a Contact when "Crear un nuevo contacto" clicked
- Inquiry → Property link (what listing triggered the inquiry)
- Inquiry → Source (Proppit/portal/web form — tagged)
- Inquiry → Location auto-tag hierarchy (derived from property)
- Inquiry → Agent (via assignment, either manual or rule-based)
- Inquiry state: pending / assigned / deleted
- Rules engine: condition (property-type/branch/source) → action (assign to agent/agents)

## UX issues

1. **Card-per-inquiry takes huge vertical space** — with +99 unread, agent scrolls forever. No bulk triage.
2. **"Crear un nuevo contacto" is the only conversion path** — what if the inquirer is already a contact? Manual search/match needed.
3. **No in-context reply** — cannot reply to email/WhatsApp without navigating away
4. **No thread history** — if same person inquired 3 times about 3 properties, each is a standalone card with no grouping
5. **Source tag "Proppit" means nothing to most users** — needs source-icon + channel-label (Zonaprop via Proppit, Argenprop, Website, WhatsApp)
6. **No unread/read state visible** — hard to pick up where you left off
7. **Filter is single-dimension** (branch only) — no filter by source, property, date range, keyword, agent
8. **Auto-tags mixed into user tags** — "Proppit" vs "Alquiler" have different semantic levels but look identical
9. **No SLA/response-time signal** — "hace 1 semana" on a pending inquiry is alarming but not flagged
10. **Link between Consultas and Contactos/Oportunidades is manual** — "Crear un nuevo contacto" jumps to contact create form; agent has to manually create lead/opportunity after

## Simplification opportunities → Our product

- **Unified Inbox** — merge Consultas (web/portal forms) + WhatsApp + email replies + chat into one inbox. Each conversation = thread, with all touchpoints collapsed.
- **Triage row, not card** — one line per inquiry: avatar, name, source, property, SLA-risk indicator, quick-actions (reply, assign, convert). Expand for details.
- **Smart dedup on arrival** — match by email/phone/name; if contact exists, auto-link the inquiry to them instead of forcing "Crear un nuevo contacto"
- **Auto-create Opportunity** from every inquiry (Pendiente contactar stage); no manual conversion
- **AI-suggested reply** — pre-drafted in the inquirer's language and channel (WhatsApp template vs email)
- **AI-scored urgency** — "High match (score 92) — 3 matching listings, high-intent wording, responded within 1h before"
- **Response SLA tracking** — color-coded "Responde en: 2h / 24h overdue" on each inquiry; ticks metrics for agent performance
- **Keyword search + filters** (source/property/agent/date/operation/location) built-in
- **Keyboard shortcuts**: `e` to reply, `a` to assign, `s` to snooze, `j/k` to navigate inquiries (Gmail-style)
- **Channel-aware reply** — one input, picks right transport (WhatsApp if phone present, email otherwise), with preview
- **Rules engine extended** — not just assignment, but also: auto-reply templates, tag application, property matching triggers, nudge creation ("if no reply in 24h → remind agent")
- **Auto-tags visually distinct from user tags** — auto-tags have a "bot" icon, user tags are flat chips
- **Deletion is soft + explanation** — "Spam / Duplicate / Not relevant" reason on delete (feeds the AI model)
- **Conversational archive on Contact** — an inquiry once processed becomes a message in the contact's timeline, not an isolated "web contact" record
