# Tokko — Mi empresa (Agency Settings / Admin)

URL root: `https://www.tokkobroker.com/company/`
⟶ Landing is empty (title + tagline only); content lives under 14 submenu items. "Mi empresa" is the admin/config catch-all — agency identity, users, permissions, pipeline customization, document templates, automations, branches, billing, network membership.

## Submenu inventory (14 items)

1. **Administrador de usuarios** — `/company/users` (agents CRUD + branch assignment)
2. **Configuración general** — `/company/configuration` (agency name, logo, watermark, description footers, SMTP)
3. **Configuración de oportunidades** — `/company/leads_configuration` (pipeline stages, close reasons)
4. **Configuración de propiedades** — `/company/properties` (property-module config)
5. **Configuración de reservas** — `/company/configure_reservations`
6. **Facturación** — `/company/billing` (Tokko subscription billing, not commission billing)
7. **Gestor de archivos** — `/company/file/manager` (shared agency documents repository)
8. **Permisos** — `/company/permissions` (API key + legal validation + global permission matrix + groups)
9. **Ficha y PDF** — `/load_pfdconfig` (PDF brochure template config)
10. **Respuestas rápidas** — `/fast_reply/config/` (canned email/WhatsApp templates)
11. **Seguimientos Automáticos** — `/mailing/auto_mailing` (drip campaigns)
12. **Sucursales y divisiones** — `/company/branches`
13. **Tipos de eventos** — `/company/event_types` (event-taxonomy editor)
14. **Redes y asociaciones** — `/company/networks-and-associations` (Red Tokko / cámaras)

⟶ Every sub-page is its own standalone form page — no unified settings shell with a nested sidebar. Navigation is flat, ordered alphabetically-ish, not grouped by concern.

## Configuración general

Sections:
- **Configuración básica**: Nombre de la empresa, Logo (upload)
- **Configuración avanzada (opcional)**: Zona horaria (default `America/Argentina/Buenos_Aires`), Idioma (`Spanish (Argentina)`), **Dirección web de propiedades** (`http://tuinmobiliaria.com.ar/p/$id$-prop` — requires literal `$id$` placeholder), **Dirección web del emprendimiento** (same pattern)
- **Sección de noticias**: Mostrar contactos de otros agentes en noticias (toggle); Mostrar noticias de Sucursal del agente / Todas las sucursales
- **Aplicación de marca de agua**: logo-as-watermark on property images, configurable position/size/opacity, Individual vs Doble layout preview, Habilitar marca de agua switch
- **Pie de descripción para propiedades**: global footer text appended to every listing published to portals + site. Supports `[[codigo_referencia]]`, `[[productor]]` placeholders.
- **Proveedor de email**: SMTP config (host + port) for outbound automated emails

⟶ **Significant centrally-configurable presentation policy.** Watermark, footer text, URL template all flow from here into every publication. Good idea; bad UX (scattered).

## Administrador de usuarios

- Tabs: `ACTIVOS (4)` / `SUSPENDIDOS (1)`
- Table columns: Nombre · Email · Sucursal · Contraseña (password reset button per row) · role badge (`Admin`)
- CTA "Nuevo Usuario"
- Per-user modal: "Asignar sucursal a [user]" with:
  - Primary sucursal (single select)
  - "El usuario puede ver consultas y contactos de otras sucursales" checkbox → opens **multi-branch visibility picker** with `Todos` toggle + per-branch checkboxes + "Consultas sin sucursal" pseudo-branch
- Active users seen: 4 agents + 1 suspended

⟶ User model: each user has one **home sucursal** + an allowlist of **cross-sucursal-visibility branches**. Two-tier scope for read access. Write/edit scope is controlled separately in Permisos.

## Permisos ("Seguridad y roles")

Three distinct blocks:

### API Key block
- Flat token (e.g., `d59c7c17f2...`) — single-key, no scopes, no rotation UX visible
- `ID de mi empresa: 13206` — tenant id
- Toggles: "Mostrar la información interna en el API" · "Mostrar propiedades no disponibles en el API"

### Validación legal / tributaria
- Radio: Requerido? (Sí/No)
- Checkbox "Publicar propiedades en portales aunque no tengan validación legal"
- `Texto de validación` — editable text rendered to published listings for legal compliance (AR-specific; e.g., matrícula del corredor)

### Permisos de seguridad globales (flat checkbox matrix, ~30 permissions grouped by domain)

Groups: **Configuración · Contactos · Emprendimientos · Gerencia · Marketing · Propiedades**

Selected permissions seen:
- Contactos: cambiar agente, cambiar nombre de contacto de otro, borrar contactos de otros, exportar a excel, ver contactos de otros en misma sucursal, ver como grilla, ver contactos de otras sucursales
- Emprendimientos: editar de todas las sucursales / de su sucursal
- Gerencia: editar archivos de empresa, editar respuestas rápidas, reasignar oportunidades, ver seguimientos de otros, ver reservas, ver/editar eventos de otros, ver historial de otros, ver tasaciones de otros, ver reportes
- Marketing: editar etiquetas, administrar panel de consultas, publicar en portales & redes sociales
- Propiedades: editar de todas las sucursales / de su sucursal, marcar como disponibles, cambiar propietario, cambiar productor/agente/mantenimiento, borrar propiedades de otros, edición rápida masiva, exportar >10 propiedades

### Grupos
"Puede crear grupos de permisos para luego asignarlos a cada usuario." → role/group system layered over the global matrix.

⟶ **Permission model = globals + groups + per-user overrides.** Globals apply to "TODOS en su empresa (excepto a la cuenta principal)". The main account is implicit super-admin. Groups override globals. No explicit role templates (Agent / Manager / Marketing) — agency has to define their own.

## Configuración de oportunidades

**Estados de Oportunidades** — editable pipeline stages with:
- Name, color (HEXA picker)
- Description
- `Mover contactos a` → next_status (auto-transition)
- `Cerrado después de [N] días` → trigger condition
- Trigger kind radio: "Sin acciones sobre el contacto" vs "En este estado"
- "Solo usuarios con permiso para reasignar contactos pueden ver este estado" — stage-level visibility gate
- "Deshabilitar notificaciones de nuevas propiedades a agentes de contactos en este estado"

Default 8-stage pipeline (drag-sortable):
1. **Sin Contactar** — contacts needing reassignment; 60d idle → Cerrado; visibility gated
2. **Sin Seguimiento** — contacts not receiving follow-up; 60d idle → Cerrado; gated
3. **Pendiente contactar** — inbound default on reassignment; 4d → Sin Contactar
4. **Esperando respuesta** — 4d → Tomar Accion
5. **Evolucionando** — creation default; 10d idle → Tomar Accion; also: "Cuando un contacto esta en estado Cerrado y se le crea un nuevo seguimiento o propiedad destacada, pasara a este estado" (resurrection rule)
6. **Tomar Accion** — 20d → Sin Contactar
7. **Congelado** — 90d → Tomar Accion
8. **Cerrado** — terminal

**Asignación de estado** (state-machine entry points):
- Estado asignado a contactos en su creación → `Evolucionando`
- Estado asignado a contactos cuando es derivado → `Pendiente contactar`
- Estado asignado cuando oportunidad finalizada pero carga búsqueda/destaca propiedad → `Evolucionando`
- Estado por defecto para contactos asignados como propietarios → `Cerrado`
- Estado por defecto luego de enviar email/WhatsApp → `Esperando respuesta`
- Estado para mover a contactos que reaccionan a propiedad enviada (me gusta / no me gusta) → `No cambiar`

**Motivos de cierre de oportunidad** — close reasons, each with Positivo/Neutro/Negativo rating:
- Compro con nosotros (+) · Alquilo con nosotros (+) · Compro con otro (−) · Alquilo con otro (−) · Fantasma (−) · Busqueda suspendida (·) · Tasacion exitosa (Ingreso la propiedad) (+) · Tasacion suspendida (No ingreso la propiedad) (−)

⟶ **Pipeline is a configurable state machine with time-based auto-transitions.** This is one of Tokko's strongest pieces — agencies actually configure per-stage SLAs. Close reasons feed reports.

## Sucursales y divisiones

- Simple list of Sucursal cards: Nombre · Dirección · Celular/WhatsApp · Teléfono · Email
- CTA "Crear Sucursal"
- Warning: "Los cambios de información de contacto pueden tardar hasta 48hs para ser refrescados en portales." (!!)
- "Divisiones" is in the page title but no division UI surfaced on this account — likely sub-teams within a sucursal

⟶ **48-hour portal sync SLA for branch info = async, unpredictable.** No sync status indicator, no "retry now" button.

## Data model implications

- **Agency (Company)** — id (tenant, `13206`), name, logo, timezone, language, property_url_template, development_url_template, watermark_config, description_footer_template, smtp_config, api_key, show_internal_info_in_api (bool), show_unavailable_in_api (bool), requires_legal_validation (bool), legal_validation_text, publish_without_legal_validation (bool)
- **Branch (Sucursal)** — id, company_id, name, address, phone, whatsapp, email
- **Division** — sub-unit of Branch (not explored)
- **User (Agent)** — id, name, email, primary_branch_id, visible_branches[] (cross-sucursal read scope), is_admin, is_suspended, role_group_ids
- **PermissionGroup** — named bundle of permissions assignable to users
- **GlobalPermission** — ~30 boolean flags grouped by domain (Configuración/Contactos/Emprendimientos/Gerencia/Marketing/Propiedades)
- **LeadStatus (OpportunityStatus)** — id, name, color, description, order, next_status_id, days_to_transition, transition_trigger (idle vs in_state), visible_only_to_reassigners (bool), disable_property_notifications (bool), is_default_for (set of entry-point enums)
- **LeadCloseReason** — name + rating (Positivo/Neutro/Negativo); links to reports
- **DescriptionFooterTemplate** — with placeholders `[[codigo_referencia]]`, `[[productor]]`
- **Watermark** — logo_ref, position, size, opacity, layout (individual/double), enabled
- **FastReplyTemplate** — email/WhatsApp canned content
- **AutoMailing (drip)** — triggered by lead status + time
- **FileManagerEntry** — shared docs
- **EventType** — configurable per-agency calendar event taxonomy
- **NetworkAssociation** — agency membership in Red Tokko + local cámaras

## UX issues

1. **14 top-level config pages with no grouping** — user must know alphabetical order or hunt. Permissions and Users are unrelated-adjacent; pipeline and close reasons split; templates (fast reply, auto mailing, PDF) scattered.
2. **Mi empresa landing is empty** — tagline-only hero wastes the screen
3. **Host mismatch across submenu** — some links go to `app.tokkobroker.com` (React SPA), others to `www.tokkobroker.com` (legacy). User sees different chrome per page.
4. **API key = single flat token** — no scopes, no multiple keys, no rotation history, no masked copy, no "last used" timestamp, no IP allowlist
5. **`ID de mi empresa: 13206` printed raw** — tenant ID exposed casually; fine but signals primitive multi-tenancy UX
6. **Permissions = ~30 flat checkboxes** — no presets (Agent/Manager/Marketing/Owner), no "what does this grant?" tooltip on hover; must learn the semantic mapping yourself
7. **"Todos los agentes puede(n)..."** Spanish agreement is broken in the label (singular verb form). Copy quality issue.
8. **User ↔ Branch visibility is a modal-inside-a-table** — hard to audit "who can see what" at a glance; no matrix view
9. **Lead-status editor couples 3 concepts** (auto-close, auto-transition, visibility) into a dense form — error messages only when submit fails
10. **Close reasons rating is 3-valued but linked to nothing visible** — presumably feeds "Análisis de contactos" report, but no preview of impact
11. **48h portal-sync lag on branch info** — no sync state indicator, no live validation that portal accepted the new branch data
12. **No audit log** visible in any settings page (who changed what when) — regulatory exposure
13. **No agency-wide status/health page** — "is your Tokko instance healthy?" combines API quota, portal sync health, billing state, permission anomalies — absent
14. **Watermark editor, PDF template, site builder, fast reply, auto mailing** all define "agency-wide presentation artifacts" — all live in different corners of the app
15. **Default lead pipeline ships with 8 stages** — opinionated but non-obvious; new agencies may not understand why Sin Contactar/Sin Seguimiento are gated behind "reasigners only"
16. **No SSO / SAML / SCIM** visible — each agent is password-only

## Simplification opportunities → Our product

- **One Settings workspace with grouped navigation** — left rail sections: `Agency identity` · `People & access` · `Sales pipeline & stages` · `Templates & branding` · `Channels & integrations` · `Billing` · `Automations` · `Network membership` · `Developer (API/webhooks)` · `Audit log`
- **Role presets out of the box** — Owner, Manager, Agent, Marketing, Assistant — editable. Custom roles allowed. Presets explain "what this can do" in plain language.
- **Unified permissions + scope matrix** — one screen: rows = users or roles, columns = capabilities (grouped), cells = yes/no/scoped-to-branch. Print/export for compliance.
- **Per-user cross-branch scope in the same matrix** — no separate modal.
- **API keys first-class** — multiple keys, scoped permissions per key, rotation with expiration, last-used timestamp, IP allowlist, webhook signing secret, usage quota.
- **Tenant ID + agency slug exposed cleanly** — useful for support.
- **Pipeline editor as a visual state machine** — drag stages, draw arrows for auto-transitions, inline SLA labels, what-triggers-what diagram. Non-technical managers can edit without reading a form.
- **Close-reason analytics baked in** — show Positivo/Neutro/Negativo breakdown + conversion-rate-by-reason directly in the editor
- **Drip/automation editor unified with fast-reply templates** — one template library, one trigger UI (on stage enter, on idle, on event, on form submit).
- **Shared brand kit** — logo, colors, typography, watermark, footer, email signatures, PDF cover — edited once, flows to site + portals + emails + PDF brochures. Today Tokko has six different places to change the logo.
- **Branch CRUD with live portal-sync state** — per-branch card shows "Zonaprop: synced · Argenprop: pending · ML: last sync 3h ago" instead of a blanket 48h warning.
- **SSO/SAML/SCIM** for multi-branch agencies + brokerage groups; magic-link login + 2FA default.
- **Audit log** (who, what, when) covering user changes, permission changes, listing publishes, pipeline edits, billing — exportable for regulator requests.
- **Agency health page** — API quota usage, portal sync health, publish queue backlog, stale-user review, billing state, integration tokens nearing expiry, onboarding completion %.
- **Template gallery** for pipelines — "Sales-heavy", "Rental-heavy", "Developer-focused" presets; start from a template, customize from there.
- **Plain-language permission descriptions** — instead of 30 flat "agentes puede(n)..." lines, show grouped capabilities with hoverable examples ("This lets Manager reassign leads between branches. Example: moving a Zona Norte inquiry to a Palermo agent.")
- **Migrations/imports as a first-class settings tab** — bring data from Tokko, spreadsheet, etc.
- **Developer tab** — API key, webhooks, OAuth apps, sandbox mode, event log; replaces Tokko's buried API key under Permisos
- **Legal validation tied to jurisdiction** — agency picks AR/UY/etc., system enforces the right rules (CUCICBA, matrícula, etc.) without manual text fields
- **Copy consistency & Spanish correctness** — QA pass on every setting label; "Todos los agentes pueden..." not "puede(n)..."
