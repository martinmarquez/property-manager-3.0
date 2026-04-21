# Corredor CRM — Referral & Viral Mechanics

**Owner:** Growth Strategist  
**Status:** Draft — pending CEO review  
**Last updated:** 2026-04-20  
**Related:** [RENA-27](/RENA/issues/RENA-27)

---

## 1. Overview

Three distinct viral loops drive Corredor's organic growth flywheel:

1. **Referral Program ("Recomendá Corredor")** — B2B peer-to-peer referrals
2. **"Powered by Corredor" Attribution Loop** — PLG badge on tenant websites
3. **Cobrokering Network Loop** — structural network effect from shared deal flow

These loops compound with SEO and paid acquisition — they don't replace channels but dramatically reduce blended CAC as the user base grows.

---

## 2. Referral Program: "Recomendá Corredor"

### Program Design

**Availability:** Any paid subscriber (Solo, Agencia, Pro, Empresa)  
**Referral link:** Unique per account, generated on account creation. Format: `corredor.app/r/[6-char-slug]`  
**Shareable via:** Email, WhatsApp, LinkedIn (pre-filled sharing flows)

### Incentive Structure

| Event | Referrer reward | Referred (new account) reward |
|---|---|---|
| Referred completes trial signup | — | Standard 14-day Pro trial (no change) |
| Referred converts to any paid plan | **1 month free** (credited immediately) | **1 month at 30% off** first paid invoice |
| Referred upgrades to Pro or above | **2 months free** (credited on upgrade) | **2 months at 30% off** Pro billing |
| Referred signs an Empresa contract | **$100 USD account credit** | — (Empresa pricing is custom) |

**Credit mechanics:**
- Referrer credit applied to next billing cycle
- Both-sides rewards: asymmetric (referrer gets more) to maximize advocacy
- No self-referral: same email domain = ineligible for reward
- Credit only on successful paid conversion (fraud-resistant)
- Minimum 30-day paid tenure before credit issued (prevents trial abuse)

### K-Factor Model

K-factor = (invites sent per customer per month) × (invite → trial rate) × (trial → paid rate)

| Scenario | Invites/customer/mo | Invite → trial | Trial → paid | K-factor |
|---|---|---|---|---|
| Conservative | 0.5 | 20% | 25% | 0.025 |
| Base case | 1.2 | 25% | 25% | 0.075 |
| Optimistic | 2.0 | 30% | 30% | 0.180 |

**Target K-factor: 0.08–0.12**

At K=0.10 with 100 paying customers: ~10 new customers/month from referrals alone, compounding.

At K=0.10 with 500 paying customers: ~50 new customers/month from referrals alone — referrals become the #1 channel.

### Activation Triggers (when to prompt users to refer)

| Trigger | Channel | Message |
|---|---|---|
| Day 3 post-conversion | In-app modal | "¿Conocés a alguien que gestione propiedades? Te regalamos 1 mes gratis cuando se suman." |
| Day 30 | Email | "¿Querés reducir tu factura? Invitá a un colega y ganá 1 mes gratis." |
| After first portal sync completes | In-app tooltip | "¡Portal sincronizado! Compartí esto con tus colegas." |
| After cobroker deal closes | In-app notification | "Cerraste un deal en cobrokering — ¿tu colega ya tiene Corredor?" |
| Monthly billing email footer | Email | Persistent referral link + "Ganá 1 mes gratis por cada referido" |
| Agency dashboard | Persistent banner | "Invitá a un colega →" with referral link |

### Referral Dashboard (User-Facing)

Each account sees in their dashboard:
- Link de referido personal (copy-to-clipboard)
- Referidos invitados: N
- Referidos que convirtieron: N
- Créditos ganados: $X

### Fraud Prevention

- One referral reward per unique new company domain (prevents creating fake accounts)
- Minimum 30-day paid subscription before credit issued
- IP + device fingerprinting on trial creation to flag obvious abuse
- Referral not stackable with migration discount (choose one)

---

## 3. "Powered by Corredor" Attribution Loop

### Mechanic

Every website published via Corredor's tenant website builder includes a "Powered by Corredor" badge in the footer. The badge links to `corredor.app/?ref=powered-by&tenant=[slug]` with UTM tracking.

**Badge design requirements:**
- Small, tasteful — must not detract from agency brand
- Available in light and dark variants to match tenant theme
- Removable only on Pro and Empresa tiers (upsell hook: "Removable badge" as Pro feature)
- Non-removable on Solo and Agencia tiers

### Traffic Projection

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active tenant websites | 30 | 120 | 400 |
| Avg property pages per tenant | 30 | 40 | 50 |
| Total badge-bearing pages | 900 | 4,800 | 20,000 |
| Avg monthly visitors/page | 150 | 200 | 250 |
| Total badge impressions/mo | 135,000 | 960,000 | 5,000,000 |
| Badge CTR | 0.05% | 0.05% | 0.05% |
| Monthly badge-attributed visits | 67 | 480 | 2,500 |
| Badge visit → trial conversion (2%) | 1–2/mo | ~10/mo | ~50/mo |

**Month 12: badge loop contributes ~50 trial starts/month** — meaningful but not dominant. Its primary value is brand awareness (5M impressions/mo), not direct conversion.

### UTM Attribution

```
utm_source=corredor-badge
utm_medium=referral
utm_campaign=powered-by
utm_content=[tenant-slug]
```

Track in analytics: badge-attributed signups separate from referral program signups.

---

## 4. Cobrokering Network Loop

### How It Works

Corredor's MLS (cobrokering) feature allows Agency A to share an exclusive listing with Agency B to find a buyer, splitting commission on deal close. Critically: **both agencies must be on Corredor** to initiate a cobroker deal.

This creates:
1. **Demand pull** — Agency A on Corredor calls Agency B (not on Corredor): "Tengo un exclusivo, ¿te sumás a Corredor para cobrokear?" Agency B signs up to close the deal.
2. **Lock-in** — Once Agency B has done 3+ cobroker deals through Corredor, their cobroker network is built into the platform. Switching means rebuilding those relationships elsewhere.
3. **Market pressure** — As Corredor reaches 15–20% market penetration in a neighborhood, non-Corredor agencies lose access to deals. This creates adoption pressure independent of product marketing.

### Cobrokering Onboarding Flow

```
Agency A initiates cobroker invite to Agency B (email/WhatsApp)
  → Agency B gets invite: "Tu colega [Agency A] quiere cobrokear contigo"
  → CTA: "Creá tu cuenta gratis para ver el exclusivo"
  → Agency B creates account → views the listing → deal starts
  → Agency B is now a Corredor user (in trial)
```

**The invite email converts better than any ad** because it's from a trusted peer about a specific business opportunity.

### Cobrokering KPIs

| Metric | Target (month 6) | Target (month 12) |
|---|---|---|
| Cobroker invites sent/month | 50 | 300 |
| Invite → trial conversion | 20% | 25% |
| Trial → paid (cobroker-sourced) | 35% | 40% |
| Monthly new accounts from cobrokering | 10 | 75 |

**Note:** Cobrokering-sourced trials convert at higher rate (35–40%) than average (25%) because the prospect already saw a deal opportunity — they're motivated.

---

## 5. Pre-Launch Waitlist Mechanics

### Waitlist Landing Page Brief

**Goal:** 200 confirmed emails before beta (Week 28). 500 is stretch.

**Page structure:**
1. **Hero:** Headline + subheadline + email capture form
   - Headline: "El CRM inmobiliario que Argentina estaba esperando"
   - Subheadline: "Publicá en ZonaProp y Argenprop con un clic. Gestioná tu agencia con IA. Beta abierta en junio."
   - CTA: "Anotarme al beta gratuito →"
2. **Social proof bar:** Logos of early partner associations (CUCICBA, CMAYDI) when confirmed
3. **3 key features:** Portal sync, AI descriptions, cobrokering — with short copy
4. **Build in public updates:** Latest update card (LinkedIn/Twitter post embed or custom feed)
5. **FAQ:** "¿Cuánto va a costar?", "¿Cuándo sale?", "¿Migran mis datos de Tokko?"

**Form fields:** Email + Nombre + Nombre de la inmobiliaria (optional). Keep it minimal — 1 required field (email).

**Post-signup flow:**
1. Confirmation email immediately: "Te anotamos — te avisamos cuando abra el beta"
2. Welcome to the weekly "build in public" sequence (below)
3. 72-hour follow-up: "¿Tenés 20 minutos para una llamada? Estamos eligiendo las primeras 20 agencias"

### Lead Nurture: Weekly "Build in Public" Email Series

12-email pre-launch sequence. One email per week. Tone: conversational, behind-the-scenes, founder voice.

| Week | Email topic | Goal |
|---|---|---|
| W20 | "Por qué estamos construyendo Corredor" | Establish mission, create resonance |
| W21 | "Así funciona la sincronización de portales" | Product education |
| W22 | "La historia de cómo Tokko perdió a sus mejores clientes" | Competitor displacement |
| W23 | "Nuestro modelo de precios — y por qué es transparente" | Trust building |
| W24 | "Cómo la IA puede describir propiedades en 10 segundos" | AI differentiation |
| W25 | "Primeras 5 inmobiliarias que probaron el beta — qué dijeron" | Social proof |
| W26 | "Cómo funciona el cobrokering en Corredor" | Network effect education |
| W27 | "Abrimos el beta — estas son las condiciones" | Conversion email |
| W28 | Beta launch announcement | Urgency, FOMO |

**Email KPIs:**
- Open rate target: 40%+ (founder email series typically beats generic newsletters)
- CTR target: 15%+
- Unsubscribe rate: <2%/email

### Beta Cohort Selection Criteria (First 20 Agencies)

Scoring rubric (max 100 points):

| Criterion | Max points | How to assess |
|---|---|---|
| Active Tokko user | 25 | Ask directly — migration story validates tooling |
| CABA/GBA location | 15 | Proximity for in-person support |
| Agency size 2–8 users | 15 | Sweet spot for Agencia tier stress-test |
| CUCICBA member | 10 | Credibility for association channel |
| Strong referral network | 20 | LinkedIn connections, FB group activity, broker reputation |
| Feedback willingness | 15 | Pre-screened via founder call |

**Minimum qualifying score: 60/100**

Beta cohort incentive:
- **6 months free at Agencia tier** ($270 USD value)
- **In exchange for:** weekly 30-min check-in, permission for case study, commitment to 3 referrals by beta end

---

## 6. Viral Coefficient Summary

| Loop | K-factor (base) | K-factor (optimistic) | Ready |
|---|---|---|---|
| Referral program | 0.075 | 0.18 | Week 28 |
| Powered by Corredor badge | 0.01–0.02 | 0.05 | At site builder GA |
| Cobrokering network loop | 0.05 | 0.15 | At MLS feature GA |
| **Combined** | **~0.15** | **~0.40** | Month 3+ post-GA |

**At combined K=0.15:** For every 100 customers, the viral loops generate 15 new customers/month without any paid spend. At 500 customers, that's 75 new accounts/month purely from virality.

---

## 7. Implementation Priorities

| Feature | Priority | Dependency | Target week |
|---|---|---|---|
| Referral link generation on account creation | P0 | Billing system | W26 |
| Referral dashboard widget | P0 | Frontend | W27 |
| Badge embed code + tracking | P0 | Site builder | W28 |
| Cobroker invite email flow | P1 | MLS feature | W32 |
| Referral credit automation (billing) | P0 | Billing system | W28 |
| WhatsApp share link (pre-filled) | P1 | Referral system | W29 |
| Admin dashboard: referral analytics | P2 | Analytics | W32 |

---

## 8. CEO Review Requests

The following design decisions require CEO input before implementation:

1. **Badge removal as Pro gate** — Is it acceptable to keep the badge mandatory for Solo/Agencia? This is a meaningful upsell lever but could frustrate smaller agencies.

2. **Referral credit structure** — Is "1 month free" the right incentive? Alternative: flat cash discount ($15 USD credit). Cash may motivate solos more than billing credits.

3. **Beta incentive generosity** — 6 months free at Agencia ($270 USD) is generous. Is this the right trade for case study permission + 3 referrals? Or should it be shorter (3 months)?

4. **Cobrokering exclusivity requirement** — Should cobrokering be Corredor-only? This is the source of the network effect but may slow initial adoption if non-Corredor agencies feel excluded.
