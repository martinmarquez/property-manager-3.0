# Top-bar, Personal Options, Calendario, Chat, Favoritos

Covers the always-visible chrome that wraps every page, plus per-agent
personal configuration.

---

## 1. Top bar — global chrome

Observed elements, left → right:

- **Logo** → `/home/`
- **Global search** (text input `"Buscar contactos, propiedades, emprendimientos o agentes"`) — single search bar, searches across 4 entity types.
- **Primary nav** (links to modules — Propiedades, Contactos, Oportunidades, Consultas, Emprendimientos, Red Tokko, Difusión, Reportes, Sitios Web, Mi Empresa)
- **Calendario** icon — opens a React iframe modal: `https://app.tokkobroker.com/outsidelayout/calendar?jwt=...`
- **Chat** icon (with unread badge `#pending_unread_messenger`) — opens the Red Tokko messenger iframe: `https://app.tokkobroker.com/.../chat`
- **Favoritos** icon (but no `/properties/favorites` URL — 404). Favoritos appears to be a flyout in the top bar that lists star-marked properties; there is no standalone favorites index page. (Minor finding: the favorites UI is non-addressable and not shareable.)
- **Notificaciones** (bell, with heading "Notificaciones") — dropdown with "Ver todas" and "Marcar todas como leidas" actions. Notifications are driven by the user's per-event subscriptions (see §3).
- **User avatar** → dropdown with:
  - `Mi Perfil` → `/profile/`
  - `Configuración personal` → `/options/`
  - `Cambiar contraseña` → `/change_password/`
  - `Salir` → `/logout/`

### UX issues

1. Favoritos has no index URL (404 on `/properties/favorites`). Not shareable, not bookmarkable.
2. No global keyboard shortcut for the search bar (no `/` or `cmd-k`).
3. Search is one undifferentiated input for 4 entity types — no scoping, no type filter, no recent-search history visible.
4. Notifications panel doesn't group by entity or type; one flat list.
5. Calendar + Chat are React iframes rendered inside the Django page. Two frontends stitched with `postMessage` — any state change on the SPA side has to round-trip.
6. Chat iframe requires microphone permission prompt on load (`requestMicPermission()`) — intrusive.
7. Cross-tab: calendar and chat are modals inside the current tab — you cannot pop them out to a separate window.

### Simplification opportunities

- **One frontend** — no iframes. Global chrome, calendar, chat, favorites all in the same SPA.
- **Cmd-K command palette** as the global navigator + searcher — scoped by prefix (`p:` propiedades, `c:` contactos, `o:` oportunidades, etc.).
- **Favorites as an addressable view** (`/favorites` with URL-persisted filters). Shareable as a quick-link.
- **Notifications grouped** by entity + type, with per-group mute.
- **Mic permission** requested only on first use of voice chat, not on page load.

---

## 2. Calendario

Embedded React app at `https://app.tokkobroker.com/outsidelayout/calendar?jwt=<JWT>`.

### Auth

JWT is passed as a URL query parameter. Observed token (truncated):
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL3d3d3cudG9ra29icm9rZXIuY29tLyIsI...`.

JWT claims from decoded body: `aud`, `iss`, `session_id`, `exp` (~30 min), `iat`, `lite` (bool), `uid`, `email`, `permissions[]`.

### postMessage API (host ↔ iframe)

Host → iframe:
- `openModal` (or custom action string) — open the calendar modal on the SPA side.
- `closeModal` — close it.
- Custom action strings can be passed as `act`.

iframe → host:
- `reactCalendarReady` — SPA finished hydrating, host swaps fake loader to real iframe.
- `closeModal`
- `eventCreated` / `eventEdited` / `eventDeleted` / `eventFinished` / `eventRejected` — each triggers a toast on the host page.

### Data model (inferred from event names)

- **Event**
  - `id`, `title`, `type_id` (FK → EventType, configured in Mi Empresa → Tipos de eventos)
  - `starts_at`, `ends_at`, `all_day: bool`
  - `agent_id`, `branch_id`
  - `related_entity`: polymorphic — linked to Contact, Property, Opportunity, Reservation, Appraisal
  - `participants[]` — other agents invited
  - `status`: `scheduled | finished | rejected | deleted`
  - `location`, `notes`
  - Recurrence (Tokko supports "eventos recurrentes" observed earlier in the teardown)

### UX issues

1. Passing JWT in URL — visible in server logs, browser history, referrer headers. Classic leak.
2. Modal calendar can't be popped out. Heavy enough to warrant a full page.
3. JWT is ~30 min — if user leaves the calendar modal open past expiry, next action fails silently.
4. Events tied to a specific agent only — no shared team calendar view (only per-agent switcher).

### Simplification opportunities

- Calendar is a first-class page at `/calendar` (not an iframe, not a modal).
- Auth via session cookie, not URL JWT.
- Agent view / branch view / company view toggles (all with permission gates).
- Team availability view (find-a-free-slot across multiple agents).
- Event types are unified across the product (see Mi Empresa) and each type has a default duration + default color + default template (description).

---

## 3. Personal Options — `/options/`

Per-agent personal configuration. Distinct from Mi Empresa (which is
agency-wide). Observed fields:

### Fields

- **Email** — display name for signature, SMTP connection status (`No conectado` when not linked), firma del email (signature template).
- **Zona horaria** — per-user timezone override (falls back to agency default).
- **Idioma** — per-user UI language (falls back to agency default).
- **Foto de perfil** (implied from `/profile/`).
- **Opciones de Notificaciones** — see below.

### Notification preferences — 48 checkboxes in a 24×2 grid

Master toggle: `"Habilitar o deshabilitar todas las notificaciones"`.

For each event below there are two columns: in-app notification and email.
Captured events (not exhaustive — ~24 total observed):

**Asignaciones**
- Soy asignado como productor o tasador.
- Soy asignado como agente de un contacto.
- Fui removido como productor o tasador de una propiedad.
- Me asignaron una consulta.
- Un seguimiento me ha sido asignado.

**Seguimientos (follow-ups / oportunidades)**
- Alguien comenta en uno de mis seguimientos.
- Alguien empieza a seguir uno de mis seguimientos.
- Alguien deja de seguir un seguimiento al cual yo estoy monitoreando.
- Alguien termina un seguimiento al cual yo estoy monitoreando.
- Alguien reactiva un seguimiento al cual yo estaba suscripto.

**Contactos**
- Alguien cambia información de uno de mis contactos.

**Consultas (leads)**
- Se ha recibido una nueva consulta (requiere permisos).
- Recibo una consulta de uno de mis contactos.

**Eventos**
- Alguien me invito a un nuevo evento.
- (plus created/edited/deleted/finished/rejected per earlier postMessage signals).

**Reservas**
- Nueva reserva.
- Modificación de reserva.

### Data model

- **NotificationPreference**
  - `user_id`
  - `event_code` (enum of ~24)
  - `in_app: bool`
  - `email: bool`
  - `master_enabled: bool` (global kill switch)

### UX issues

1. **24×2 = 48 checkboxes in a grid** is overwhelming. No "sensible defaults", no "mute this for today", no quiet hours.
2. Each agent has to configure this from scratch — no agency-level default template.
3. No channel diversification beyond in-app + email — no push (mobile), no SMS, no WhatsApp (critical in Argentina where WhatsApp is the default messaging medium).
4. Email SMTP is set per agent at `/options/` and also per-agency at `/company/configuration` — two places, unclear precedence.
5. No mute-by-entity (e.g. "stop notifying me about this one opportunity").
6. No digest (daily/weekly summary email instead of real-time).

### Simplification opportunities

- **Sensible defaults** + "quiet mode" toggle per user. 80% of users won't touch the matrix; they should be served by defaults.
- **Agency templates**: admins set default notification preferences for new agents; agents can override per-row.
- **Unified channel model**: in-app / email / push / whatsapp / sms — each channel independently toggleable, global quiet hours, daily digest option.
- **Per-entity mute**: star / mute toggle on any follow-up, opportunity, contact, or property.
- **Subscribe/unsubscribe is explicit**: every list screen has a "notify me about changes" toggle that writes a subscription row (richer than Tokko's implicit owner-based subscriptions).
- Collapse the ~24 events into 6 groups (Asignaciones / Seguimientos / Contactos / Consultas / Eventos / Reservas) with "advanced" expansion for fine-grained control.

---

## 4. Chat (Red Tokko Broker)

React app embedded as an iframe from `https://app.tokkobroker.com/...`,
talking to `https://messenger.tokkobroker.com`.

### Endpoints observed

- `GET https://messenger.tokkobroker.com/users/me/unreads?can_manage_webcontacts=True`
  - Header: `AUTHORIZATION: <JWT>`
  - Response: `{unread_amount: N, colleagues: M}`
  - Polled every 120 seconds from the host page (`setInterval 120000`).
- Two unread counts:
  - **"Colegas"**: messages from other Red Tokko Broker agents (peer-to-peer cobrokering chat).
  - **"Webcontacts"**: unread web leads (from portal consultations, landing pages, the agency site). The `can_manage_webcontacts=True` flag gates visibility.

### postMessage API

- Host → iframe: `{action: 'openChatModal', url, CID, message, property}` — CID = channel ID; message + property optional for pre-filling a message attached to a property.
- iframe → host: `reactChatReady`, `{msg: 'closeTokkoChat'}`, `{msg: 'updateLeads'}`, `{msg: 'removeWebContactElement', data: web_contact_id}`, `{msg: 'actionRequestMic'}`.

### UX issues

1. Two distinct conversation types (peer-agent messages, web lead inboxes) merged into one "Chat" icon. A web-contact is not a conversation with a colleague.
2. `get_unread_messenger` polls every 2 minutes via HTTP — no websockets, no push.
3. Microphone permission prompted on load.
4. Chat modal blocks host page interaction until closed.

### Simplification opportunities

- **Split into two first-class inboxes**: `Colleagues` (messaging) and `Leads` (unified web-contacts from all sources). Both indexed under `/inbox`.
- Websockets / SSE for realtime; no 2-minute polling.
- Leads inbox supports WhatsApp + email + portal consult threads in one unified timeline (the "unified inbox" the user listed as a locked requirement).
- Composable "reply with template" (quick responses configured in Mi Empresa → Respuestas rápidas).
- Mic permission requested only when the user clicks "record voice note".

---

## 5. Favoritos (summary)

Non-addressable flyout in the top bar. No dedicated URL. Implementation
is likely a `localStorage` or session-scoped list rendered by the host
Django template + a hidden dropdown.

### Simplification opportunities

- `/favorites` as a first-class page, filterable like the main list.
- Server-persisted (sync across devices).
- Shareable with a colleague ("share my favorites list" → read-only URL).
- Quick-compare view: 2-4 favorites side by side.

---

## Cross-cutting findings (add to master list)

### Security / architecture

- **JWT-in-URL pattern for iframe embeds** (`/outsidelayout/calendar?jwt=...`, `.../chat?jwt=...`) — leaks via logs/history/referrer. Replace with session cookie on same origin or short-lived per-frame token fetched by `postMessage` handshake.
- **Polling over WS/SSE** for unread counts — every 2 minutes, always. At scale this is wasteful and slow.
- **Host ↔ iframe `postMessage`** as the primary integration contract between the Django legacy and the React SPA. Fragile, hard to type, hard to version. Our product uses a single SPA — no such contract.

### UX patterns to fix

- Non-addressable UI (favoritos flyout). Every meaningful list in our product is addressable.
- Notification grid of 48 checkboxes — replace with defaults + grouped advanced.
- Two settings surfaces (Mi Empresa vs Personal Options) with overlapping concerns (SMTP, timezone, language) and unclear precedence. Document a single precedence: per-user overrides agency defaults, explicitly shown in UI as `"(using agency default: ...)"`.
- Chat conflates peer messaging with lead inbox. Separate them.

### Data model additions

- `NotificationPreference { user_id, event_code, channels: set<{in_app,email,push,whatsapp,sms}>, quiet_hours, digest_mode }`
- `NotificationSubscription { user_id, subject_type, subject_id }` — per-entity subscribe/mute.
- `CalendarEvent { id, title, type_id, starts_at, ends_at, all_day, agent_id, branch_id, related_entity_type, related_entity_id, participants[], status, recurrence_rule }`
- `EventType { id, name, default_duration, default_color, default_description_template }` (from Mi Empresa).
- `InboxThread { id, type: enum{colleague, web_lead}, last_message_at, unread_count }` — unified inbox.
- `Favorite { user_id, entity_type, entity_id, created_at, notes }` — server-persisted favorites across entity types.
