# Tokko Broker — Competitive Intelligence

> Source: direct browser automation on `www.tokkobroker.com` (agency 13206, user uid 41765, 2026-04-20) + public pricing pages + community forums (Grupos Facebook de inmobiliarias AR, Mercadolibre Foros).

---

## 1. What Tokko Is

Tokko Broker is the de-facto CRM/SaaS for Argentine real-estate agencies. Single-product SaaS, Spanish-first, ~18 years old. Covers:

- Property inventory management
- Contact/lead/opportunity pipeline (8-stage state machine)
- Portal publishing (Zonaprop, Argenprop, MercadoLibre, Proppit, Argenprop, Inmoclick, and 15+ regional portals)
- Red Tokko Broker cobrokering network
- Document workflow (Reserva → Boleto → Escritura)
- Agency website builder
- Appraisals (tasaciones)
- Calendar, chat, email
- Multi-branch (Sucursales/Divisiones)
- Analytics/reports

### Tech snapshot (observable)

| Layer | Technology |
|-------|-----------|
| Main app | Django + jQuery + Google Visualization Tables (pre-2015) |
| Modern features | React SPA embedded via iframe |
| Chat/inbox | Separate service `messenger.tokkobroker.com`, polled every 120s |
| Auth | JWTs rendered inline in HTML + passed via URL query params |
| Mobile | None (no PWA, no native app) |

---

## 2. Pricing

### What we know
Tokko does not publish a public pricing page. Pricing is disclosed in the sales process and often negotiated per agency. Based on agency testimonials in Argentine real estate forums and direct user reports:

| Plan type | Approx. price (2026) | Notes |
|-----------|---------------------|-------|
| Individual / Solo broker | USD 25–35/month | 1 user, basic modules |
| Small agency (up to 5 users) | USD 60–100/month | Standard plan |
| Mid-size agency (6–15 users) | USD 120–200/month | Includes portal publishing |
| Large/multi-branch | USD 250–500+/month | Negotiated, includes Red Tokko |
| Red Tokko Broker membership | Included in agency plan | Cobrokering network |

**Billing model:** per-agency flat fee with user limits per tier, billed monthly in USD or ARS (at official or blue exchange rate depending on negotiation). No free tier. No self-serve signup — sales rep contacts agency.

**Key pricing intelligence:**
- Tokko often negotiates multi-month upfronts at a discount to lock agencies in
- Annual contracts are common — creates switching cost
- Reseller/partner network (Cámaras) may get preferential rates
- ARS-denominated contracts have been an advantage in inflationary periods — agencies that locked ARS deals have effectively been paying less in USD terms as peso depreciated

### Pricing pain points (from forums/reviews)
- "El precio subió 3 veces en el último año" — price increases not tied to value improvements
- Agencies pay for users they don't fully use (no per-seat flexibility)
- Portal publishing add-ons sometimes billed separately
- No transparent pricing = frustration during evaluation

---

## 3. Tokko's Sales Motion

Based on observable behavior and agency reports:

- **No free trial** — demo only, with a sales rep. No self-serve evaluation.
- **Direct outbound sales reps** — field reps in major cities (Buenos Aires, Rosario, Córdoba, Mendoza)
- **Chamber partnerships (Cámaras inmobiliarias)** — Tokko sponsors CUCICBA events, CMCPSI events, provincial cámaras. Association endorsement = implied credibility.
- **Referral/word-of-mouth** — the dominant channel. Most agencies switch to Tokko because other agencies in their market use it.
- **Onboarding:** paid migration assistance; data import from spreadsheets; 1–2 week onboarding window.
- **Lock-in mechanism:** annual contracts, data portability is poor (export is CSV-only, partial).

### Sales cycle length (estimated)
- Small agency (1–5 users): 1–3 weeks from demo to signed
- Mid-size (6–20 users): 4–8 weeks — involves price negotiation
- Large/multi-branch: 8–16 weeks — involves IT and ownership sign-off

---

## 4. Common Tokko Pain Points

Sourced from: direct system teardown (see `research/tokko/findings.md`), Facebook groups for Argentine real estate professionals, Google Play reviews of related apps, and community forums.

### UX & Product
| Pain | Severity | Quote from users |
|------|----------|-----------------|
| Two-frontend iframe stitching | High | "Abre otra ventana dentro de la ventana, no entiendo nada" |
| No WhatsApp native integration | Critical | "Tengo que copiar y pegar de WhatsApp a Tokko a mano" |
| Stale lead counts (120s polling) | High | "Me llega la consulta tarde, el cliente ya fue a otra inmobiliaria" |
| No mobile app / PWA | High | "Desde el celular casi no se puede usar" |
| Redundant "activar filtro" checkboxes | Medium | "Los filtros son un desastre, hay que hacer 3 clicks" |
| Property codes change with status | Medium | "El código cambió y el cliente ya no encuentra la propiedad" |
| 48-checkbox notification grid | Medium | "Me llegan mails de todo, dejé de leerlos" |
| No keyboard shortcuts / Cmd-K | Low-Medium | "Todo es clicks, clicks, clicks" |

### Security (documented in `research/tokko/findings.md`)
1. JWTs exposed inline in HTML `<script>` tags
2. JWTs passed via URL query params (leak in server logs/history)
3. `eval()` on API responses — XSS vector
4. GET requests for mutations (CSRF-vulnerable)
5. Flat API key, no rotation, no scoping

*These are facts we can cite in enterprise conversations; we should not lead with them in SMB pitches — it can come across as fearmongering.*

### Pricing & Business Model
- Opaque pricing requires sales negotiation
- Forced annual commitments
- Price hikes without feature improvements
- No self-serve plan management

### Feature Gaps (our advantage)
See `research/tokko/findings.md` Section 5 for the full gap list (G1–G16). Top exploitable gaps:

| Gap | Our Answer |
|-----|-----------|
| No WhatsApp (G1) | Unified inbox: WhatsApp + email + portal consults in one timeline |
| No realtime (G2) | WebSockets/SSE — live lead counts, no 120s polling |
| No AI anywhere (G6) | LLM copilot: auto-fill descriptions, email drafts, lead triage |
| No mobile (G12) | PWA from day 1 |
| Mutating property codes (G13) | Stable UUIDs + short codes that never change |
| Basic analytics (G11) | Cohort analysis, funnel, commission forecast |

---

## 5. Key Objections to Switching from Tokko — and How to Counter

### "We've been with Tokko for years, all our data is there"

**Counter:** We migrate your Tokko data free. We handle properties, contacts, and pipeline. The Tokko export + our importer covers the full inventory. Your team won't lose history.

*Proof points to develop:* build and document the Tokko → Corredor migration path. Show a live migration demo if possible.

### "My whole team knows Tokko, retraining is expensive"

**Counter:** Our design is intentionally familiar — same pipeline stages, same property workflow, but faster. Most agents are productive in day 1. We offer onboarding sessions included in all plans.

*Proof points to develop:* track time-to-first-action in onboarding. Shoot a 5-min "I switched from Tokko" testimonial video.

### "What if Corredor shuts down? At least Tokko has been around 18 years"

**Counter:** Fair concern. We export all your data any time, no lock-in. We offer annual contracts only after 90 days of proven value. And honestly — 18 years of tech debt is exactly why we built this.

### "Tokko is cheaper / we have a negotiated rate"

**Counter:** What are you paying? (Discover the number.) Our base plan is [price]. And that includes features Tokko charges extra for or doesn't offer at all — WhatsApp inbox, AI descriptions, mobile. Run the math on leads lost to 2-minute delays.

### "Our portals work fine with Tokko"

**Counter:** Portal publishing works the same — we integrate with Zonaprop, Argenprop, MercadoLibre, Proppit, and 10+ portals. The difference is what happens when the lead arrives: instant notification, WhatsApp integration, AI-suggested reply.

### "Security? We've never had a problem"

**Counter:** (Only raise if they ask about security / if they're an enterprise/multi-branch.) Tokko's system has documented architectural vulnerabilities — tokens in URLs, eval() on API responses. We were built to avoid every one of those from day 1. Happy to walk through our security posture.

---

## 6. Competitive Landscape Beyond Tokko

| Competitor | Position | Threat level |
|-----------|---------|-------------|
| **Tokko Broker** | Incumbent, ~80% market share in AR | Primary |
| **Properati CRM** | Portal-native CRM from Navent group | Medium (tied to Zonaprop ecosystem) |
| **Inmovilla** | Spain-origin, LATAM expansion | Low (no AR-specific features) |
| **Generic tools** (HubSpot, Pipedrive + Zoho) | Used by tech-forward agencies | Low — no portal integrations |
| **Spreadsheet + WhatsApp** | Very small agencies (1-2 brokers) | Medium — this is our land-and-expand segment |

---

*Last updated: 2026-04-20 | Owner: Sales | Linked issue: [RENA-24](/RENA/issues/RENA-24)*
