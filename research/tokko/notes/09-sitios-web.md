# Tokko — Sitios Web (Agency Website Builder)

URL list: `https://app.tokkobroker.com/webmanager`
URL editor: `https://app.tokkobroker.com/webmanager/templateconfig?id={siteId}`

⟶ **Domain concept:** "Sitios web" is a templated agency-website generator. Tokko hosts a public-facing site (`{slug}.tuinmobiliaria.com.ar` subdomain) and lets agencies point their own domain at it (`marquezinmo.com.ar`). The site consumes the agency's listing inventory directly from Tokko — zero manual re-upload.

## List page

Title: "**Generador de sitios web**"
Subtitle: "Administrá tus sitios web provistos por Tokko Broker."

**Site row shows:**
- URL: custom domain (`marquezinmo.com.ar`)
- **Página temporal:** Tokko subdomain (`marquez.tuinmobiliaria.com.ar`)
- "Editar este sitio" CTA

⟶ Multi-site per agency supported (list view suggests you can add more). Site model: one primary + zero-to-many alts.

## Editor page (`/webmanager/templateconfig?id=11509`)

**Header:**
- Custom domain (large)
- Plantilla + number (e.g., "Plantilla 09") — template picker
- `Cambiar plantilla` — swap to a different pre-built template
- `Borrar este sitio` — delete
- `Hacer este mi sitio principal` — set as primary

**Tabs:**
1. **General** — logo upload, favicon (with live browser-tab preview), language selector
2. **Inicio** — homepage config (hero, featured, etc. — not fully explored)
3. **Secciones** — menu-section toggles + drag reorder
4. **Resultados** — search/listing results page config
5. **Detalles de la propiedad** — per-listing public-page config
6. **Configuración avanzada** — advanced (GA, meta tags, custom scripts, probably)

### General tab
- **Logo** — upload (PNG/JPG, appears in header)
- **Favicon** — 16×16px, with a mini-browser-tab preview so user sees how it'll look
- **Idioma** — language selector (Español / other)

### Secciones tab
"Podés elegir qué secciones querés que tenga tu sitio web y especificar el contenido de cada una de ellas."
"También podés elegir el orden en el que se mostrarán... arrastrándolas desde el ícono del lateral derecho."

Each section = checkbox toggle + draggable re-order handle + explanation:
- **Inicio** — main menu button → homepage
- **Propiedades** — main menu button → all properties
- **Emprendimientos** — main menu button → all developments
- **Alquiler** — shortcut to rentals
- **Venta** — shortcut to sales
- ...(likely more: Nosotros, Contacto, Tasaciones, Blog, etc. — not scrolled to bottom)

⟶ **Section builder = menu-item toggle, not content blocks.** This is a pre-structured template; agency picks which sections are on/off + reorders them. Zero page-level layout freedom (no drag-to-add hero/testimonials/CTAs).

## Data model implications

- **Site** per agency: id, custom_domain, temp_subdomain (`{slug}.tuinmobiliaria.com.ar`), template_id, is_primary, logo, favicon, language, sections (ordered list), theme settings
- **Template** registry — numbered templates ("Plantilla 09"); templates are agency-configurable but not fully editable — layout/structure is fixed by the template
- **Section** (per site) — id, key (Inicio/Propiedades/Emprendimientos/Alquiler/Venta/...), enabled, order, content overrides (title, description, custom copy)
- **Site → Inventory** — live feed from the agency's Properties + Emprendimientos; published/available filter applied
- **Domain mapping** — DNS CNAME from custom domain to Tokko subdomain; Tokko terminates TLS

## UX issues

1. **Black-box templates** — "Plantilla 09" tells you nothing. No thumbnails visible until you click "Cambiar plantilla". Picking by number is 2010 Wordpress-marketplace energy.
2. **Section toggles ≠ content blocks** — no hero editor, no testimonial module, no CTA builder, no blog, no FAQ section, no team page with per-agent photos — you get what the template ships with.
3. **No per-section rich content editor visible on this tab** — "specify the content of each section" is promised but actual editing happens per-tab (Inicio / Resultados / Detalles de la propiedad), scattering the authoring workflow
4. **No live preview** — edits happen in a form; to see results, open the temp URL in another tab. No SPA preview pane.
5. **No mobile preview** — favicon preview exists, but no "how does the homepage look on phone?"
6. **No A/B testing or landing pages** — can't say "run a campaign landing at /promo-escobar with different hero copy"
7. **"Hacer este mi sitio principal"** is present but unclear — does it affect DNS? Canonical URL? SEO?
8. **No SEO editor visible** on this tab — meta descriptions, OpenGraph, sitemap, robots all assumed hidden under "Configuración avanzada"
9. **No analytics integration** — no built-in visit/conversion tracking; must paste GA code manually (presumably in advanced)
10. **No custom page creator** — can't add "/about-our-founder" or "/neighborhood-guide-palermo"
11. **Template-switching likely destructive** — changing plantilla resets customization; no warning visible
12. **No i18n for the public site** — idioma is single-select, not multi-language site

## Simplification opportunities → Our product

- **Block-based site builder** (modern Webflow/Framer/Shopify-style):
  - Pre-built blocks: Hero, Property grid, Featured, Typology showcase, Map search, Testimonials, Team, About, Contact, FAQ, CTA, Blog, Newsletter
  - Drag/drop to compose pages; save as reusable
  - Theme tokens (brand colors, fonts, spacing) applied globally
- **Live preview pane** — side-by-side, desktop + tablet + mobile toggles
- **Template gallery with thumbnails** — real screenshots, not "Plantilla 09" numbers; filter by industry subtype (residential / commercial / developer / rental-focused)
- **Custom pages** — unlimited: About, Neighborhood guides, Blog posts, Landing pages
- **Blog / Neighborhood content engine** — markdown or rich editor, SEO-friendly slugs, scheduled publishing, cover images, author byline, tags
- **SEO built-in** — per-page meta title/description/OG, auto-generated sitemap + robots, canonical URLs, structured data (JSON-LD for RealEstateListing, Residence, LocalBusiness)
- **Per-agent microsites** — optional sub-path `/agentes/{slug}` or subdomain; each agent gets their own page with listings filtered to their portfolio, testimonials, contact form
- **Campaign landing pages** — spin up `/promo-escobar-marzo` with custom hero + listing filter; track visits → conversions → leads
- **AI site builder** — "Build me a site for a 3-branch agency in Zona Norte focused on developments" → AI drafts structure, copy, theme; human edits
- **AI listing descriptions localized per channel** — same master listing, site-specific copy tone (more narrative on site, more technical on Zonaprop)
- **Integrated AI chat widget** — embedded AI receptionist: answers visitor questions about listings/neighborhoods; converts chat → lead in unified inbox
- **Multi-language toggle** — ES / EN / PT on the same site with per-listing translated content flowing from the Property record
- **Form/lead routing** — site contact forms + listing inquiry forms → Consultas → Pipeline with full attribution (site page, campaign, referrer)
- **Performance + accessibility defaults** — Core Web Vitals green by default; images CDN-optimized; lazy loading; WCAG AA
- **Native analytics dashboard** — pageviews, top listings, conversion funnel per page, bounce, heatmap optional; no need to paste GA manually (optional GA+GTM pass-through still available)
- **Custom domain with one-click TLS** — CNAME instructions + automatic cert provisioning; visual indicator when DNS is valid
- **Template switching is non-destructive** — content is block-based, so swapping theme re-skins rather than wiping
- **Public typology + unit-inventory pages for Emprendimientos** — integrates with the new Emprendimientos module's interactive floor-plan / pricing matrix
- **Integrated "Link para colegas" mode** — site has a broker-only auth gate for cobrokered listings (connects to Red Tokko network flow)
- **Webhooks & API** — let agencies extend (integrate with Slack, HubSpot, custom dashboards)
