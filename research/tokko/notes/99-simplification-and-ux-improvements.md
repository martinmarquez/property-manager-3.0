# Cross-cutting Simplification & UX Improvements vs Tokko

This is the running catalog of ways our product simplifies and outperforms Tokko.
Grouped by theme; each item ties back to a module.

## 1. Navigation & IA (information architecture)

**Tokko has:** 13 top-level modules + many submodules, each with its own "list" page pattern.
**Simplify:**
- Collapse to 5 top-level workspaces: **Inbox, Properties, Contacts, Pipeline, Insights**
- Everything else (developments, documents, reports, settings) lives inside those workspaces or under a single "More" drawer
- Red Tokko Network-equivalent becomes a toggle/filter inside Properties, not a separate module
- Websites, Difusión, Reservas, Tasaciones become tabs or side panels on the relevant record, not top-level pages

## 2. Global search → Command palette

**Tokko:** fat text input in top bar, unified search across 4 types.
**Us:**
- ⌘K command palette: search entities + run actions ("create property", "go to reports", "send WhatsApp to Juan")
- Entity results group with icons and inline actions
- Recent searches + smart suggestions
- Keep a small search bar as a fallback, but command palette is the primary entry

## 3. Kill every modal popup

Tokko uses modals for: help, preview, inline detail, bulk actions, confirmations, creation.
**Us:**
- Right-side drawers for preview/detail (resizable, pinnable)
- Help content lives in a persistent help panel with deep links, never blocking
- Creation flows open in drawers too — stay in context
- Dialog modals reserved only for destructive confirmations

## 4. Inline editing everywhere

Tokko uses placeholder-text "Hacé click para editar" — every field is click-first, then form.
**Us:**
- Notion-style inline edit — click to put the field in edit mode directly, save on blur
- Bulk editing via shift-select + apply
- Undo snackbar always present after any change

## 5. Density controls that actually help

Tokko has "Compacta / Expandida" toggles on some screens and many always-on panels (right rail).
**Us:**
- One global density setting (Comfortable / Compact), remembered per user
- Empty fields auto-collapse (not hidden — collapsed with expand affordance)
- Right rail is collapsible and remembers state per page

## 6. AI-native, not AI-bolted-on

Tokko has "Buscar con IA" as a secondary button on one screen.
**Us (AI threaded through):**
- Command palette understands natural language ("listings in Palermo under $200k, 3BR, sunny")
- Auto-draft property descriptions from attributes + photos (ES + EN + PT)
- Lead scoring on every inquiry
- Smart reply drafts for inquiries across channels (WhatsApp/email/site forms)
- Listing-to-lead matching suggestions surfaced in the inbox
- Photo intelligence: auto-tag rooms, detect missing shots, suggest hero image, upscale
- "Insights" module is AI-driven, not static reports: "3 listings got zero views this week — consider refresh"

## 7. Keyboard-first

Tokko: no visible shortcuts.
**Us:**
- ⌘K palette, J/K navigation in lists, E to edit, S to save, W to WhatsApp, / to focus search
- Shortcut cheat sheet (⌘/) always available
- Bulk selection with shift-click and range select

## 8. Single ficha — smart, not two modes

Tokko: "Ficha Compacta | Expandida" toggle, attribute search box because there are too many fields.
**Us:**
- Dynamic ficha: only show fields that match the property type; fields that are "common" + "filled" visible, rest behind "Show all attributes"
- AI pre-fills ~70% of fields from photos + address (geocoding + vision models)
- Attribute catalog is curated, not 500 fields deep

## 9. Accordion-by-letter is dead

Tokko Contactos: A/B/C accordion + parallel A-Z rail for 285 contacts.
**Us:** Virtualized list + instant search + smart filters. Type-to-jump keyboard shortcut covers alphabet-scan use case.

## 10. Legacy terminology → modern terminology

- "Agenda" → "Contacts"
- "Difusión" → "Publishing" / "Portals"
- "Ficha" → "Listing card" / "Property card"
- "Consultas" → "Inquiries" (keep, it's fine) but show it as a unified **Inbox**
- "Reportes" → "Insights" (AI-driven, not static)
- "Sitios web" → "Agency sites"
- "Mi empresa" → "Workspace settings"

## 11. Global creation shortcut

Tokko has a big red "+ Crear" in the sidebar that opens a menu.
**Us:**
- "+ New" button in top bar + ⌘N shortcut → palette-style entity picker
- Context-aware: if you're inside a contact, "+ New" defaults to "Inquiry" or "Opportunity" linked to them

## 12. Empty states that teach

Tokko shows blank lists with no guidance.
**Us:**
- First-time states walk through the 3 most valuable actions per module
- Later empty states suggest actions based on the user's existing data

## 13. Notifications that triage themselves

Tokko shows "+99" badge with no apparent triage.
**Us:**
- AI-ranked notifications (urgent / followup / info)
- Bulk-dismiss, snooze, turn any notification into a task
- Per-channel preferences (in-app, email, push, WhatsApp)

---

*(Running list — expand as we continue the teardown.)*
