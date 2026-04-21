# Corredor — Launch Site Brief

> **Owner:** CMO → Front-End Developer  
> **Version:** 1.0 | **Date:** 2026-04-20  
> **Build target:** Phase G (after billing ships)  
> **Related:** [RENA-17](/RENA/issues/RENA-17) | [Brand Positioning](../brand/positioning.md) | [Voice Guide](../brand/voice-guide.md)

---

## Overview

This brief defines every page, section, and content requirement for the Corredor public marketing site (`apps/site`). Front-End Developer should treat this as the complete spec to build from. Copy v1 will be delivered separately by Content Writer (see [RENA-25](/RENA/issues/RENA-25)).

**Site goal:** Convert Argentine real estate agency owners from awareness → trial signup. Secondary: establish credibility for Tokko migration conversation.

**Stack context:** `apps/site` in the monorepo. Tech stack defined by Front-End. SEO is critical — should be server-rendered (SSR or SSG). Performance target: Lighthouse 90+ on mobile.

---

## Site Map

```
corredor.ar/
├── /                          Homepage
├── /precios                   Pricing page
├── /features/
│   ├── /propiedades           Properties module
│   ├── /bandeja               Unified inbox
│   ├── /ia                    AI features
│   └── /sitio                 Website builder
├── /desde-tokko               Tokko migration landing
├── /blog                      Content (SEO) — Phase 2
└── /legal/
    ├── /terminos              Terms of service
    └── /privacidad            Privacy policy
```

**Phase G scope:** `/`, `/precios`, `/desde-tokko`, `/legal/*`  
**Phase H scope:** `/features/*`, `/blog`

---

## Page 1: Homepage (`/`)

### Purpose
Convert a first-time visitor (agency owner who heard about us or found us via search) into a trial signup.

### Sections

#### 1.1 Hero
- **Layout:** Full-width, above fold. Left text + right product screenshot (dashboard mock)
- **Headline:** 3 variants — Content Writer delivers in [RENA-25](/RENA/issues/RENA-25) (A/B test required, see §A/B Testing)
- **Subheadline:** One sentence max, supports the headline
- **Primary CTA:** "Empezar gratis" → `/registro` (trial signup)
- **Secondary CTA:** "Ver demo" → opens Loom/video overlay OR scrolls to demo section
- **Trust signals beneath CTA:** "14 días gratis · Sin tarjeta de crédito · Cancelás cuando querés"
- **Visual:** Animated or static dashboard screenshot showing properties list + lead inbox. Must look real, not placeholder.

#### 1.2 Social Proof Bar
- **Layout:** Full-width, single row
- **Content:** "Usada por inmobiliarias en [Ciudad 1], [Ciudad 2]..." + agency logo strip (beta participants) OR "X inmobiliarias en lista de espera" if pre-launch
- **Note:** Placeholder until we have real beta agencies. Use association logos (CUCICBA/CMAYDI) as trust badges if agency logos unavailable.

#### 1.3 Problem Statement
- **Layout:** Centered, 2-column text
- **Headline:** "¿Seguís usando Tokko porque no encontraste algo mejor?"
- **Content:** 3 pain bullets — current AR agency pain points (manual portal publishing, outdated security, opaque pricing)
- **Transition:** "Construimos Corredor para resolver exactamente eso."

#### 1.4 Feature Pillars (4)
- **Layout:** 2×2 grid on desktop, vertical scroll on mobile
- **Each pillar:**
  - Icon (custom illustration, not stock icons)
  - Headline (feature name in Spanish)
  - 2–3 line description
  - "Ver más" link to feature page (Phase H)
- **Pillars:**
  1. **Cartera** — Propiedades con publicación en portales en un clic
  2. **Bandeja** — WhatsApp, email y portales en un solo lugar
  3. **Inteligencia** — IA para leads, matching y búsqueda
  4. **Tu Sitio** — Web de tu inmobiliaria incluida en el plan

#### 1.5 Security Block
- **Purpose:** Trust signal for security-aware decision makers
- **Layout:** Full-width, dark background (contrast section)
- **Headline:** "Tu negocio, protegido con estándares de 2025"
- **Content:** 3 security feature tiles:
  - Acceso biométrico (WebAuthn passkeys)
  - Autenticación en dos pasos (TOTP)
  - Datos aislados por inmobiliaria (row-level security)
- **No jargon:** Each tile has a one-line plain-language explanation
- **Visual:** Shield icon / lock icon treatment

#### 1.6 Testimonials (post-beta)
- **Layout:** 3-column card grid
- **Each card:** Quote + name + agency name + city + optional photo
- **Pre-beta placeholder:** "Testimonios disponibles al lanzar beta — Q3 2026"

#### 1.7 Migration CTA
- **Layout:** Split — left: copy, right: "Antes/Después" illustration
- **Headline:** "¿Venís de Tokko? Los primeros 3 meses son nuestros."
- **CTA:** "Empezar migración" → `/desde-tokko`
- **Subtext:** "Migrá en 60 minutos. Tus datos, tus propiedades, tus clientes — todo."

#### 1.8 Final CTA
- **Layout:** Full-width, centered
- **Headline:** "Tu inmobiliaria, organizada desde hoy"
- **CTA:** "Empezar gratis 14 días" → `/registro`
- **Secondary:** "¿Tenés dudas? Hablemos" → opens chat / mailto:hola@corredor.ar

---

## Page 2: Pricing (`/precios`)

### Purpose
Convert a price-evaluating visitor to trial. Remove pricing uncertainty as a purchase blocker.

### Sections

#### 2.1 Header
- **Headline:** "Planes para cada inmobiliaria"
- **Toggle:** `[Mensual] [Anual — Ahorrá 2 meses]` — default to **Annual**
- **Currency toggle:** `[ARS] [USD]` — default to **ARS** for AR visitors, **USD** fallback

#### 2.2 Pricing Table
- **Layout:** 4 columns on desktop, horizontal scroll or accordion on mobile
- **Columns:** Solo | Agencia | Pro | Empresa
- **"Más popular" badge:** on **Pro** column
- **Migration offer banner:** above table — "¿Venís de Tokko? → [Ver oferta de migración]"

Per-column content:
```
┌─────────────────────────────────────────────────────────────────┐
│  [Tier name]                                                     │
│  [One-line positioning tagline]                                  │
│                                                                  │
│  $XX USD / mes          ARS $XX.XXX / mes                        │
│  [Annual price if toggle active]                                 │
│                                                                  │
│  [CTA Button]                                                    │
│  "Empezar gratis 14 días" (Solo/Agencia/Pro)                    │
│  "Hablar con ventas" (Empresa)                                   │
│                                                                  │
│  Incluye:                                                        │
│  ✓ Feature 1                                                     │
│  ✓ Feature 2                                                     │
│  ✓ Feature 3                                                     │
│    [ver todos →]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Feature comparison table** (below the cards):
- Full feature list, checkmarks by tier
- Collapsible by section: Propiedades | Contactos | IA | Portal | Sitio | Seguridad | Soporte

#### 2.3 ARS Pricing Note
- Small text block below table
- "Los precios en pesos se actualizan trimestralmente según el tipo de cambio oficial BNA + 15%. Tu precio en USD nunca cambia."
- Link to full pricing policy

#### 2.4 FAQ
Minimum 6 questions:
1. ¿Puedo cancelar en cualquier momento?
2. ¿Qué pasa con mis datos si cancelo?
3. ¿Cómo funciona el período de prueba?
4. ¿Aceptan pago en pesos argentinos?
5. ¿Qué incluye el plan Empresa?
6. ¿Tienen integración con ZonaProp y MercadoLibre?

#### 2.5 Money-back Guarantee
- "30 días de garantía en tu primer mes pago. Si no estás satisfecho, te devolvemos la plata."
- Must be visually distinct (badge or banner)

---

## Page 3: Tokko Migration (`/desde-tokko`)

### Purpose
Convert Tokko users to trial. Remove the migration risk as the #1 objection.

### Sections

#### 3.1 Hero
- **Headline:** "Dejá Tokko en 60 minutos"
- **Subheadline:** "Tus propiedades, contactos y operaciones — migrados sin perder nada"
- **CTA:** "Empezar migración gratis" → trial signup with migration flag
- **Trust signal:** "Sin tarjeta · 3 meses gratis para los primeros 100 · Garantía de devolución"

#### 3.2 Migration Steps (3-step visual)
```
1. Exportá de Tokko    →    2. Importá en Corredor    →    3. Listo
[Tokko icon]               [upload icon]                    [checkmark]
"Descargá tu ZIP"          "Arrastrá el archivo"            "Revisá y confirmá"
"desde Tokko"              "nosotros hacemos el resto"      "en menos de 60 min"
```

#### 3.3 What Moves
- **Table:** What migrates | What doesn't (yet) | Notes
- Transparency is trust — don't oversell
- Include: Propiedades ✓ | Contactos ✓ | Historial de operaciones ✓ | Fotos ✓ | Archivos adjuntos (Phase H) ...

#### 3.4 Migration Offer
- **Headline:** "Los primeros 100 en migrar reciben 3 meses gratis en plan Agencia o Pro"
- **Counter:** "X de 100 spots disponibles" (dynamic, update from DB)
- **CTA:** "Reservá tu lugar" → form with: nombre, email, agencia, ciudad, usuarios actuales

#### 3.5 Objection FAQs
See Sales Rep battlecard ([RENA-26](/RENA/issues/RENA-26)) for content source:
1. ¿Pierdo datos al migrar?
2. ¿Qué pasa si algo no sale bien?
3. ¿Puedo seguir usando Tokko mientras migro?
4. ¿Tienen soporte en español?

#### 3.6 Support CTA
- "¿Preferís que lo hagamos juntos? Coordinamos una llamada de migración de 30 min."
- Calendly or mailto link

---

## Technical Requirements

### Performance
- Lighthouse score: 90+ on mobile (Performance, Accessibility, SEO, Best Practices)
- First Contentful Paint: < 2s on 4G
- All images: WebP, lazy-loaded, with alt text in Spanish

### SEO
Primary targets (from CMO keyword strategy):
- "software inmobiliaria argentina"
- "CRM inmobiliario"
- "alternativa tokko broker"

Implementation requirements:
- SSR or SSG (no client-side only render for landing pages)
- `<title>` and `<meta description>` per page
- Open Graph tags for social sharing
- Structured data: `SoftwareApplication` schema on homepage
- Sitemap.xml at `/sitemap.xml`
- Canonical URLs

### Internationalization
- Language: Spanish (es-AR) only for v1
- No i18n framework needed — hardcoded AR Spanish

### Analytics
- PostHog already in stack (RENA-10) — use existing telemetry package
- Track: page views, CTA clicks (by variant), form submissions, scroll depth
- A/B test support: tagline variants on homepage hero (at minimum 2 variants)

### Forms
- Trial signup `/registro`: email + nombre + nombre agencia + ciudad + plan intent (optional)
- Migration form `/desde-tokko`: email + nombre + agencia + ciudad + usuarios actuales
- All forms: CSRF protection, rate limiting (server-side)

### Design Tokens
- Use design system from RENA-13 (UX/UI Designer)
- Dark mode not required for v1 — single theme
- Color: derive from brand (to be confirmed with UX/UI Designer)
- Typography: system font stack or single web font max (performance)

---

## A/B Testing Requirements

### Tagline Test (Homepage Hero)
- 3 variants (A/B/C — see [positioning.md](positioning.md))
- Implementation: server-side split via PostHog feature flags or simple cookie-based split
- Metric: email signup conversion rate within 7 days of landing
- Run for: minimum 30 days OR 500 visits per variant, whichever comes first
- Report winner to CMO

### CTA Copy Test (optional, Phase H)
- "Empezar gratis" vs "Probarlo gratis 14 días"
- Same metric: signup conversion rate

---

## Content Dependencies

| Page | Content from | Status |
|---|---|---|
| Homepage copy | Content Writer (RENA-25) | In progress |
| Pricing page feature list | CMO / Growth Strategist | Done (pricing-model.md) |
| Migration page copy | Content Writer (RENA-25) | In progress |
| Testimonials | Beta agencies (post-launch) | Not started |
| Feature page copy | Content Writer (Phase H) | Not started |

**Front-End can start building structure and layout immediately.** Placeholder copy blocks will be replaced once RENA-25 delivers.

---

## Phased Delivery

| Phase | Scope | Owner | Target |
|---|---|---|---|
| G.1 | Homepage + Pricing + Legal shells | Front-End | Phase G start |
| G.2 | Copy injected from RENA-25 | Front-End + Content Writer | Phase G mid |
| G.3 | A/B test live, analytics verified | Front-End + CMO | Phase G exit |
| H.1 | Migration page + feature pages | Front-End | Phase H |
| H.2 | Blog infrastructure | Front-End | Phase H |

---

## Sign-off Required Before Build

- [ ] CMO: This brief approved ✓
- [ ] CEO: Pricing tiers approved (pending — see board approval request)
- [ ] UX/UI Designer: Design tokens and component library confirmed
- [ ] Front-End Developer: Technical feasibility confirmed
