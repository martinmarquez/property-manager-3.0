# Corredor CRM — Growth Model

**Owner:** Growth Strategist  
**Status:** Draft  
**Last updated:** 2026-04-20  
**Related:** [RENA-27](/RENA/issues/RENA-27) | [RENA-17](/RENA/issues/RENA-17)

---

## 1. Growth Thesis

Corredor enters the Argentine real estate SaaS market at a rare inflection point: Tokko Broker's aging UX, the emergence of AI-assisted property management, and post-stabilization real estate transaction volumes create a ~18-month window to capture displaced buyers before Tokko retaliates or a funded competitor arrives.

**Core bet:** Win Tokko's unhappy long-tail (solo brokers + small agencies) with a product that is meaningfully better on three dimensions — mobile UX, AI automation, and portal sync — then expand up-market into Agencia/Pro through referral network effects.

**Growth motion:** Bottom-up PLG → Community-led → Sales-assist (not top-down enterprise)

---

## 2. Target: 500 Paying Tenants by Month 12 Post-GA

### Required MoM Growth Rate

| Starting point | Month 12 target | Required MoM growth |
|---|---|---|
| 0 paying accounts at GA | 500 accounts | ~48% MoM (months 1–3), stepping down to ~12% by months 10–12 |
| 20 beta accounts at GA | 500 accounts | ~42% MoM (months 1–3), stepping down to ~10% by months 10–12 |

**Realistic path:** High-velocity early growth (40–50% MoM) fueled by migration offers + waitlist conversion, then normalizing to 10–15% MoM "steady state" by month 8+.

### Month-by-Month Account Targets (Post-GA)

| Month | New accounts | Churned | Net adds | Cumulative |
|-------|-------------|---------|----------|------------|
| 1 | 35 | 1 | 34 | 54 |
| 2 | 50 | 3 | 47 | 101 |
| 3 | 65 | 4 | 61 | 162 |
| 4 | 75 | 6 | 69 | 231 |
| 5 | 80 | 8 | 72 | 303 |
| 6 | 85 | 10 | 75 | 378 |
| 7 | 75 | 12 | 63 | 441 |
| 8 | 60 | 13 | 47 | 488 |
| 9 | 25 | 14 | 11 | 499 |
| 10 | 20 | 15 | 5 | 504 |

*Assumes 4% average monthly churn (Agencia-weighted), tapering new accounts as referral steady-state replaces migration-burst.*

---

## 3. Acquisition Channel Mix

### Tier Assignment by Channel

| Channel | Primary tiers | CAC | Scalability | Time to first conversion |
|---------|--------------|-----|-------------|--------------------------|
| Content SEO | Solo, Agencia | $15–40 | High (compounds) | 3–6 months |
| Association partnerships (CUCICBA/CMAYDI) | Agencia, Pro | $30–80 | Medium | 4–8 weeks |
| Referral program | All tiers | $20–60 | High (self-compounding) | Week 28+ |
| Migration campaign (Tokko churn) | Agencia, Pro | $25–50 | Medium | Immediate |
| Paid social (Meta) | Solo, Agencia | $8–20 CPL | High | Immediate |
| Google Search | All | $15–40 | Medium-High | Immediate |
| LinkedIn | Pro, Empresa | $40–80 | Low | 2–4 weeks |
| Direct outbound | Empresa | $500–1,500 | Low | 4–12 weeks |
| Community (FB groups, WhatsApp) | Solo, Agencia | $5–15 | Medium | 2–6 weeks |

### Channel Mix by Phase

| Phase | Weeks | Primary channel | Secondary | Budget/mo |
|-------|-------|----------------|-----------|-----------|
| Pre-launch | W20–27 | Content SEO | Community seeding | $0 |
| Beta | W28–31 | Referral + migration | Content SEO | $500 |
| Migration campaign | W32–39 | CUCICBA + migration | Meta ads | $1,500 |
| Post-GA (months 1–3) | W40–52 | Paid + referral | SEO (compounding) | $3,000 |
| Steady state | W53+ | Referral + SEO | Paid retention | $5,000+ |

*Budgets >$10k/mo require CMO approval.*

---

## 4. Full Acquisition Funnel

### Funnel Stages

```
Awareness → Interest → Trial → Activation → Retention → Expansion → Referral
```

### Stage Definitions & Metrics

| Stage | Definition | Metric | Target |
|-------|-----------|--------|--------|
| **Awareness** | First exposure to Corredor | Unique visitors/mo | 5,000 by month 3 post-GA |
| **Interest** | Visited pricing, features, or comparison page | Qualified visits/mo | 1,500 |
| **Trial start** | Account created + first property added | Trial starts/mo | 60–100 by month 3 |
| **Activation** | ≥3 properties listed + portal sync connected | Activation rate | ≥50% of trials |
| **Conversion** | Trial → paid plan | Trial-to-paid | 25% (target 30% by month 6) |
| **Retention** | Still active at 90 days | 90-day retention | >70% |
| **Expansion** | Upgraded tier | Expansion rate | 15% of accounts/yr |
| **Referral** | Referred ≥1 new account that converts | Referral rate | 10% of paying accounts |

### Funnel Conversion Benchmarks

| Funnel stage | Target rate | Industry range |
|---|---|---|
| Visitor → trial signup | 3–5% | 2–8% for B2B SaaS |
| Waitlist → trial (at launch) | 35% | 25–50% |
| Trial → activation | 50% | 30–60% |
| Activation → paid | 50% | 40–65% |
| Trial → paid (overall) | 25% | 15–40% |
| Monthly churn | <4% (Agencia), <3% (Pro) | 3–7% SMB SaaS |

---

## 5. North Star Metric

**Monthly Active Paying Accounts (MAPA)**

Definition: Paid accounts that logged in AND created/updated ≥1 property listing in the past 30 days.

**Why MAPA over alternatives:**

| Alternative | Problem |
|---|---|
| MRR | Doesn't catch dormant paid accounts (churn risk) |
| Monthly active users | Includes unpaid trial users, inflates metric |
| Total signups | Vanity — doesn't correlate with revenue health |
| Listings published | Noisy — one agency could dominate |

MAPA = Revenue health × product engagement in one number. An account that's paid but dark is a churn signal; MAPA catches this before MRR does.

**Supporting metrics:**
- Trial starts/week (leading indicator)
- Activation rate (product-market fit proxy)
- Referral rate (virality health)
- Weekly churn rate by tier (retention health)

---

## 6. Retention & Expansion Model

### Churn Risk Signals (30/60/90 day framework)

| Signal | Timeframe | Risk level | Response |
|--------|-----------|------------|----------|
| Never added a second property | Day 7 | High | Automated: property import nudge email |
| Portal sync not connected | Day 14 | High | In-app: 1-click ZonaProp connect CTA |
| No login in 7 days | Day 21 | Medium | Email: "¿Todo bien? Acá hay novedades" |
| Only 1 user active (Agencia+) | Day 30 | Medium | In-app: invite teammates banner |
| No listings published externally | Day 60 | High | CS check-in call (Agencia+) |
| Less than 10 properties (Agencia) | Day 60 | Medium | Upgrade nudge: Pro trial |
| No new listings in 14 days | Day 90 | Critical | Outbound: retention offer |

### Expansion Triggers (Starter → Pro)

| Trigger | Tier | Action |
|---------|------|--------|
| Approaches 80% of property limit | Solo → Agencia | In-app modal: "Estás creciendo 🚀 — pasá a Agencia" |
| Adds 8th team member | Agencia → Pro | Auto-offer: "Pro te da espacio para 30" |
| Uses AI feature 5+ times | Agencia → Pro | "Desbloqueá análisis avanzados en Pro" |
| MLS cobroker with 3+ agencies | Agencia → Pro | "Expandí tu red — Pro incluye cobrokering ilimitado" |

### Expansion Revenue Model (Month 12)

| Tier | Starting accounts | Expansions/yr | Expansion MRR added |
|------|-----------------|---------------|---------------------|
| Solo → Agencia | 200 | 20 (10%) | $660 (20 × $33 delta) |
| Agencia → Pro | 150 | 22 (15%) | $1,650 (22 × $75 delta) |
| Pro → Empresa | 50 | 5 (10%) | $1,400 (5 × $280 delta) |

**Total expansion MRR at month 12: ~$3,700/mo** (on top of new account MRR)

---

## 7. Product-Led Growth (PLG) Loops

### Loop 1: "Powered by Corredor" Attribution Loop

```
Tenant publishes website via Corredor
  → Property listing page shows "Powered by Corredor" badge
  → Visitor clicks badge → Corredor marketing landing page
  → Visitor signs up for trial
  → New tenant
```

**Expected volume:** If 200 active tenants each average 50 published properties = 10,000 listing pages with badge. At 500 visits/page/year and 0.05% CTR on badge → 2,500 qualified visits/year from badge alone.

### Loop 2: Cobrokering Network Loop

```
Agency A lists property on Corredor
  → Agency B (not on Corredor) is invited to cobroker via portal sync
  → Agency B experiences Corredor from the inside during cobroker deal
  → Agency B signs up for trial after deal closes
```

**Lock-in effect:** Agencies can only initiate cobrokering if both parties are on Corredor. This creates genuine switching cost for the cobrokering network.

### Loop 3: Migration Viral Loop

```
Agency migrates from Tokko → mentions to peers in WhatsApp group / CUCICBA event
  → Peer checks Corredor out (word of mouth referral)
  → Peer signs up via referral link from migrated agency
  → Migrated agency earns 1 month free
```

---

## 8. Pre-launch Waitlist Model

### Target: 500 Emails by Beta Launch (Week 28)

| Week | Weekly signups | Cumulative | Source |
|------|---------------|------------|--------|
| W20–22 | 5–10/week | 20–30 | Founder network |
| W23–24 | 15–20/week | 50–70 | LinkedIn posts + CUCICBA outreach |
| W25–26 | 30–40/week | 110–150 | First blog posts indexed, Facebook groups |
| W27 | 50–70 | 160–220 | Build-in-public post goes wide |

**Realistic scenario:** 150–220 emails by beta. 500 is aspirational — achievable only if a build-in-public post goes viral or CUCICBA newsletter feature runs in W26–27.

**Recommended revision:** Set internal target at 200 confirmed emails; 500 is stretch goal.

### Beta Cohort Selection (First 20 Agencies)

ICP for beta cohort:
1. **Size:** 2–8 users (Agencia tier sweet spot — big enough to stress team features, small enough to be nimble)
2. **Tokko users:** Actively using Tokko → migration story validates the migration tooling
3. **CABA/GBA location:** In-person support available, portal mix matches ZonaProp/Argenprop primary markets
4. **Willingness to give feedback:** Founder needs to pre-qualify via 30-min call
5. **Referral potential:** Broker with active professional network (LinkedIn, CUCICBA member, FB group admin)

**Beta incentive:** 6 months free at Agencia tier ($270 USD value) in exchange for: weekly check-in, documented case study permission, 3 referrals.

---

## 9. MRR Build Model

### Month 6 (Post-GA)

Assuming 250 paid accounts, tier mix: 50% Solo / 35% Agencia / 13% Pro / 2% Empresa

| Tier | Accounts | MRR/account | Tier MRR |
|------|----------|-------------|----------|
| Solo | 125 | $12 | $1,500 |
| Agencia | 87 | $45 | $3,915 |
| Pro | 33 | $120 | $3,960 |
| Empresa | 5 | $350 avg | $1,750 |
| **Total** | **250** | — | **$11,125** |

### Month 12 (Post-GA)

Assuming 500 paid accounts, tier mix: 45% Solo / 38% Agencia / 15% Pro / 2% Empresa

| Tier | Accounts | MRR/account | Tier MRR |
|------|----------|-------------|----------|
| Solo | 225 | $12 | $2,700 |
| Agencia | 190 | $45 | $8,550 |
| Pro | 75 | $120 | $9,000 |
| Empresa | 10 | $380 avg | $3,800 |
| **Total** | **500** | — | **$24,050** |

**Month-12 MRR target: $20,000–$30,000 USD**  
**Month-12 ARR target: $240,000–$360,000 USD**

---

## 10. Budget Summary

| Phase | Monthly budget | Primary use |
|-------|---------------|-------------|
| Pre-launch (W20–27) | $0 | Organic only |
| Beta (W28–31) | $500 | Referral tooling, minor Meta spend |
| Migration campaign (W32–39) | $1,500 | CUCICBA partnership, Google Ads |
| Month 1–3 post-GA | $3,000 | Paid acquisition (Meta + Google) |
| Month 4–6 post-GA | $5,000 | Full channel mix |
| Month 7–12 post-GA | $5,000–$8,000 | Scale what's working |

*Note: Budgets >$10,000/mo require CMO approval per governance policy.*
