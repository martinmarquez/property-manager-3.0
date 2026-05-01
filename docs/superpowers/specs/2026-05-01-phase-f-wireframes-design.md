# Phase F Wireframes — Design Spec
**Date:** 2026-05-01  
**Author:** UX/UI Designer (Paperclip agent dd6be961)  
**Issue:** RENA-78  
**Status:** Delivered — 4 wireframe components across 3 modules

---

## Summary

Phase F introduces AI-powered features across the product. This spec documents the wireframes delivered as production-ready React components for:

1. **AI Copilot** (`/copilot`) — conversational AI assistant with session history, citation pills, and action confirmation cards
2. **Smart Search** — Cmd+K command palette + full-page search results
3. **AI Property Descriptions** — modal triggered from the property form for AI-generated listing copy

All three modules extend the established dark-mode-first design system with the `ai` purple token (`#7E3AF2`) as the AI-content differentiator.

---

## Design System Tokens

No new tokens were introduced. All wireframes use the shared token set established in Phase E.

| Token | Value | Usage |
|---|---|---|
| `bgBase` | `#070D1A` | Page background |
| `bgRaised` | `#0D1526` | Cards, panels, modals |
| `bgElevated` | `#131E33` | Hover states, selected rows |
| `brand` | `#1654d9` | Primary actions, active states |
| `brandFaint` | `rgba(22,84,217,0.12)` | User message bubbles, active filter bg |
| `ai` | `#7E3AF2` | AI-only features — ALL AI content |
| `aiFaint` | `rgba(126,58,242,0.12)` | AI feature backgrounds, AI bubbles |
| `aiLight` | `#9B59FF` | AI text on dark backgrounds |
| `success` | `#18A659` | Confirmed actions |
| `warning` | `#E88A14` | Pending/overdue states |
| `error` | `#E83B3B` | Errors |
| `textPrimary` | `#EFF4FF` | Main content |
| `textSecondary` | `#8DA0C0` | Supporting text |
| `textTertiary` | `#506180` | Labels, timestamps, placeholders |
| `border` | `#1F2D48` | Dividers |

**Fonts:** `Syne` (display), `DM Sans` (body), `DM Mono` (codes/timestamps)

---

## Wireframe Components

### 1. CopilotPage
**Path:** `/copilot`  
**File:** `apps/web/src/pages/copilot/CopilotPage.tsx`

#### Layout (Full-page mode)
Two-panel layout:
- **Left (280px, collapsible):** Session history sidebar — date-grouped sessions (Hoy/Ayer/date), collapse toggle, "Nueva conversación" button
- **Right (flex):** Chat area — topbar with sidebar toggle + BETA badge, scrollable message list (max-width 800px centered), sticky input bar at bottom

#### Layout (Floating button mode)
- **Floating button:** Fixed bottom-right, 52px circle, gradient `ai→brand`, glow shadow
- **Compact sheet:** Fixed 400×600px panel above the button, full chat interface in miniature

#### Message bubbles
| Role | Alignment | Background | Bubble radius |
|---|---|---|---|
| User | Right | `brand` (#1654d9) | `16px 4px 16px 16px` |
| AI | Left | `bgElevated` + border | `4px 16px 16px 16px` |

- AI avatar: 32px circle, `aiFaint` bg, `✦` symbol in `ai` color
- User avatar: 32px circle, initials, `brandFaint` bg

#### Citation pills
- Inline below AI message text
- Shape: pill with `aiFaint` bg + `ai`-tinted border
- Content: entity type emoji + entity code in `DM Mono`
- Hover: brightens border and background
- Clickable → navigates to entity detail

#### Action confirmation cards
- Appear inline in AI message thread
- Card: `bgElevated` bg, rounded 12px
- Icon block: 36px, entity icon
- 3 states: **pending** (Confirmar / Editar / Cancelar buttons) → **confirmed** (green success) → **cancelled** (muted)
- Confirm uses `brand` primary button, Edit uses ghost, Cancel is text-only

#### Empty state
- Centered `✦` icon in 72px rounded square
- Headline: "¿En qué puedo ayudarte?" (Syne)
- 2×2 grid of suggested prompt chips (hover: `aiFaint` bg + `ai` border)

#### Typing indicator
- 3-dot bounce animation, `ai` color, 0.2s stagger between dots
- Shown in AI bubble position while waiting for response

#### Accessibility
- `aria-label` on floating button, compact sheet dialog, send button
- Keyboard: Enter sends (textarea), Shift+Enter newline
- Hint shown below input: "Enter para enviar · Shift+Enter nueva línea"

---

### 2. CommandPalette
**Trigger:** `⌘K` / `Ctrl+K` (global hotkey)  
**File:** `apps/web/src/pages/search/CommandPalette.tsx`

#### Layout
- Centered floating palette — 620px max-width, `top: 20%`
- Backdrop: `rgba(7,13,26,0.85)` + `blur(4px)` — **does not close main layout**
- Border: `1px solid border`, shadow: `0 32px 80px rgba(0,0,0,0.7)`

#### Search input row
- SVG search icon (left), placeholder text, `Esc` kbd chip (right)
- Spinner replaces search icon during debounced search (180ms)
- Bottom border separates from results (omitted when no results)

#### Results grouping
Results are grouped by entity type in this order: Propiedades → Contactos → Operaciones → Documentos → Tareas. **Max 3 per group.**

Per group:
- Section header: entity icon (colored per type) + label, `DM Mono` uppercase 11px
- Each result row: 32px entity icon square + title / subtitle / (snippet on active only)
- Active row (keyboard or hover): `bgElevated` bg + left `2px solid entityColor` accent
- Relevance score: `DM Mono` 10px, right-aligned, colored when active

#### Keyboard navigation
- `↑`/`↓` moves active index through flat result list
- `Enter` opens active result (or navigates to full search page if no results)
- `Esc` closes
- Visual indicators shown in empty state

#### Footer
- "Ver todos los resultados" row when results exist → opens SearchPage with current query
- `↵` kbd chip shown right-aligned

---

### 3. SearchPage
**Path:** `/search?q=...`  
**File:** `apps/web/src/pages/search/SearchResultsPage.tsx`

#### Layout
- Full-width page (max-width 1100px centered)
- Header: H1 "Resultados de búsqueda" + inline search refinement input + count line
- Body: 2-column — left sidebar (240px, sticky) + right results list (flex)

#### Left sidebar filters
- Label: "Filtrar por tipo" (DM Mono uppercase)
- One button per entity type: icon + label + count badge
- Active filter: colored bg + colored left border 1px + bold text
- Count badge: `brand` bg when active, `bgElevated` otherwise
- "Quitar filtros" reset button (shown when any filter active)
- Keyboard shortcuts reference panel below filters

#### Result cards
- `bgRaised` base → `bgElevated` on hover; border lightens on hover
- Left: 40px entity icon square with `color/18` bg
- Right: title (bold) + inline tag chips + right-aligned relevance % / subtitle (secondary) / snippet (tertiary, 12px)
- Full anchor tags (`<a href>`) for native navigation

#### Pagination
- Centered, page numbers + prev/next
- Active page: `brand` bg, white text
- 5 results per page

#### CommandPalette integration
- `⌘K` opens CommandPalette from SearchResultsPage
- `onOpenSearchPage` callback updates query in-page

---

### 4. AIDescriptionModal
**Trigger:** "Generar descripción IA" button on `/properties/:id` form  
**File:** `apps/web/src/pages/properties/AIDescriptionModal.tsx`

#### Trigger button placement
- Located in the Descripción field area of the property form
- Style: `aiFaint` bg, `ai`-tinted border, `✦` icon + "Generar descripción IA" text
- Hover: brighter aiFaint + stronger border

#### Modal structure
- Max-width 680px, centered, `max-height: 90vh` with `overflowY: auto`
- Sticky header with `✦` icon, title, property ID badge, `✕` close
- Sticky footer with action buttons
- Body: 3 input sections + preview area

#### Section 1: Tone selector
3-column grid of tone cards:
| Tone | Icon | Description |
|---|---|---|
| Formal | 🏛️ | Profesional y preciso |
| Casual | 😊 | Cercano y conversacional |
| Lujo | ✨ | Premium y aspiracional |

Active card: `aiFaint` bg + `ai` border. Inactive: `bgElevated`.

#### Section 2: Portal selector
Pill buttons: ZonaProp / Argenprop / MercadoLibre / Inmuebles24  
Active portal: `brandFaint` bg + `brand` border. Helper text: "La descripción se optimizará para el límite de caracteres y el estilo de este portal."

#### Section 3: Destacar (free text)
Optional input field — features the user wants emphasized. Placeholder: "Ej: cochera cubierta, luminoso, ideal inversión…"

#### Generation states
| State | UI |
|---|---|
| `idle` | Full-width "Generar descripción" gradient button (`ai→brand`) |
| `streaming` | Pulsing `●` label + `aiFaint` preview box with streaming text + blinking cursor |
| `done` | Preview box complete + char count + "Ver comparación" link |
| Footer (done) | "Guardar descripción" (brand) + "Regenerar" (ghost) + "Cancelar" (text) |

#### Draft comparison view
Side-by-side 2-column layout:
- **Left (Descripción actual):** `error/08` tinted bg, `error/25` border
- **Right (Descripción generada):** `aiFaint` bg, `ai/30` border, `✦` header label

Toggled by "Ver comparación" link when generation is done. "Volver a la vista simple" returns to single preview.

#### Accessibility
- `role="dialog"` on modal container
- `aria-label="Cerrar"` on close button
- `htmlFor` linking label to Destacar input
- Focus trap implied (modal backdrop covers rest of page)

---

## Interaction States Coverage

| Feature | Loading | Empty | Error | Typing | Success |
|---|---|---|---|---|---|
| Copilot | Typing indicator | Empty state + chips | — | Textarea | Action confirmed |
| Command palette | Spinner in search icon | "Empieza a escribir" / "No resultados" | — | — | Navigate on Enter |
| Search page | — | "No resultados" card | — | — | Result cards |
| AI description | — | — | — | Streaming cursor | "Guardado" |

---

## Responsive Breakpoints

### Desktop (≥1024px)
All components render at full spec above.

### Tablet (768–1023px)
- CopilotPage: sidebar starts collapsed; toggle shows it as overlay
- SearchPage: filter sidebar collapses to horizontal chips row above results
- AIDescriptionModal: full spec (680px fits)
- CommandPalette: full spec

### Mobile (<768px)
- CopilotPage: single column; session history accessible via sheet from topbar button
- SearchPage: filter chips in horizontal scroll row; results full-width
- AIDescriptionModal: full-screen modal (border-radius 0 on sides)
- CommandPalette: max-width 100% - 32px; top: 10%

---

## UX Decisions

1. **AI purple is non-negotiable.** Every AI-generated content surface uses `#7E3AF2`. This distinguishes AI from human-authored content at a glance — critical for trust when AI writes listing descriptions or answers questions about contracts.

2. **Citation pills are inline, not footnotes.** Placing citations directly after the AI response text keeps the source attribution visible without requiring the user to scroll. Each pill links to the referenced entity.

3. **Action confirmation cards require explicit Confirmar.** AI-triggered mutations (create task, send message) use a 3-button card (`Confirmar / Editar / Cancelar`) before executing. This prevents accidental automation.

4. **Command palette is 3-per-type max.** Showing at most 3 results per entity type keeps the palette compact and scannable. The footer "Ver todos" row provides the escape hatch for deeper searches.

5. **Streaming preview with cursor.** The AI description modal streams text character-by-character with a blinking cursor. This communicates "generation in progress" without a progress bar, and lets users abort early if the direction is wrong.

6. **Diff view is opt-in.** The "Ver comparación" link only appears after generation completes. Default is the single-column preview, which is less overwhelming for most users.

7. **Floating Copilot button gradient.** Using `gradient(ai → brand)` on the floating button visually bridges the AI purple with the brand blue, signalling that Copilot is an AI-powered part of the core product — not an external tool.

---

## Files Delivered

| Component | File | Lines |
|---|---|---|
| AI Copilot (full-page + floating) | `apps/web/src/pages/copilot/CopilotPage.tsx` | ~1074 |
| Command Palette | `apps/web/src/pages/search/CommandPalette.tsx` | ~310 |
| Search Page (full results) | `apps/web/src/pages/search/SearchResultsPage.tsx` | ~350 |
| AI Description Modal | `apps/web/src/pages/properties/AIDescriptionModal.tsx` | ~750 |
| This spec | `docs/superpowers/specs/2026-05-01-phase-f-wireframes-design.md` | — |

---

## Exit Criteria Status

- [x] Annotated wireframes (this doc + inline component comments)
- [x] All 3 modules covered: Copilot, Smart Search, AI Description
- [x] Responsive breakpoints documented (desktop + tablet + mobile)
- [x] Interaction states: loading, empty, error, streaming, success
- [ ] PM approval — pending review
