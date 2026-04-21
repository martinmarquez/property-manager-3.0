# Corredor — Brand Positioning

> **Versión:** 1.0 | **Fecha:** 2026-04-20 | **Owner:** CMO  
> **Related:** [RENA-17](/RENA/issues/RENA-17) | [Voice Guide](voice-guide.md)

---

## Name Rationale

**Corredor** = *corredor inmobiliario* — the licensed real estate broker in Argentina. The name is:

- **Instantly recognized** by the AR real estate industry — no explanation needed
- **Professional** — it's what the industry calls itself, not a startup neologism
- **Available** and ownable as a brand in the AR software space
- **Works in both formal and informal contexts:** "Usamos Corredor" sounds natural

---

## Positioning Statement

*Para las inmobiliarias argentinas que necesitan gestionar su negocio con seriedad y sin complicaciones, Corredor es el CRM moderno con IA que reemplaza Tokko Broker — con seguridad real, interfaz actualizada, precios transparentes en ARS+USD y migración en 60 minutos.*

**In English (internal use):**  
For Argentine real estate agencies that need to run their business seriously and without friction, Corredor is the modern, AI-powered CRM that replaces Tokko Broker — with real security, a modern interface, transparent ARS+USD pricing, and 60-minute migration.

---

## Category Definition

We are entering the **Argentine real estate agency management software** category. We are not:
- A portal (ZonaProp, MercadoLibre Inmuebles)
- A property listing tool
- A generic CRM with a real estate add-on

We are a **purpose-built vertical CRM** for the AR real estate agency. That specificity is a feature, not a limitation.

---

## Target Customer Profiles

### 1. Solo Broker (Corredor Individual)
- **Who:** Licensed corredor, works independently or from a shared space
- **Size:** 1 person, 10–50 active properties
- **Pain:** Manages everything in WhatsApp + Excel. No visibility on pipeline.
- **Hook:** Affordable, mobile-first, gets them organized without IT overhead
- **Plan fit:** Solo ($12 USD/mo)
- **Conversion trigger:** "Organizá toda tu cartera por lo que te cuesta un asado"

### 2. Small Agency (Agencia Chica)
- **Who:** Owner-operator with 2–10 agents, typically in Buenos Aires, GBA, or interior cities
- **Size:** 2–10 users, 100–500 active listings
- **Pain:** Tokko is expensive or dated. Coordination happens on WhatsApp groups. Portal publishing is manual and error-prone.
- **Hook:** Team features + portal sync + migration offer (3 months free)
- **Plan fit:** Agencia ($45 USD/mo)
- **Conversion trigger:** "Migrá de Tokko y los primeros 3 meses son nuestros"

### 3. Medium Agency (Agencia Mediana)
- **Who:** Professional agency with multiple locations or branches, 11–30 agents
- **Size:** 11–30 users, 500+ listings
- **Pain:** Multiple tools that don't talk to each other. Reporting is manual. AI tools are separate add-ons that don't integrate.
- **Hook:** All-in-one: CRM + IA + analytics + multi-branch. One price.
- **Plan fit:** Pro ($120 USD/mo)
- **Conversion trigger:** "Tus 20 agentes en un solo panel. Con IA incluida."

### 4. Enterprise Chain (Cadena / Franquicia)
- **Who:** Multi-branch franchise or regional chain, 30+ agents, possibly with a franchisor model
- **Size:** 30+ users, multiple branches, potentially their own client-facing portal
- **Pain:** No tool serves the franchisor + franchisee model. IT setup is complex. Security and compliance requirements.
- **Hook:** White-label, SSO, SLA, dedicated onboarding
- **Plan fit:** Empresa (custom, $350+ USD/mo)
- **Conversion trigger:** Direct outreach, personalized demo

---

## Win/Match/Concede Map vs Tokko Broker

### We Win
| Dimension | Our claim | Supporting evidence |
|---|---|---|
| **Security** | Argon2id password hashing, WebAuthn (passkeys), TOTP MFA, row-level security on all tenant data | Technical architecture (RENA-2, RENA-3, RENA-11) |
| **Modern UX** | Mobile-first design, built in 2025 from scratch | Design system (RENA-13) |
| **AI-native** | Lead scoring, property matching, smart search — built into all paid plans | Phase D roadmap |
| **Transparent pricing** | Public pricing page, ARS+USD, no hidden fees, cancel anytime | This document |
| **Migration** | One-click Tokko import, data mapping guide, 60-min onboarding call | RENA-19, tools/tokko-importer |
| **Local support** | Argentine team, Spanish-first support, responsive SLAs | Company structure |

### We Match
| Dimension | Notes |
|---|---|
| **Portal integrations** | ZonaProp, MercadoLibre Inmuebles — Phase D delivery |
| **Property management** | Full create/edit/publish workflow — Phase B |
| **Contact CRM** | Contacts, leads, pipeline — Phase C |
| **Website builder** | Agency mini-site included — Phase F |

### We Concede (Honestly)
| Dimension | Tokko advantage | Our response |
|---|---|---|
| **Market presence** | Tokko has years of customer trust | "Nuevos, pero construidos para durar. Tu data es tuya — exportala cuando quieras." |
| **Integrations breadth** | More portal integrations today | "Los portales más usados en el primer mes. El resto, roadmap público." |
| **Established community** | Tokko has user groups, events | "Comunidad en construcción — vas a ser de los fundadores." |

---

## Messaging Pillars (3 core)

### Pillar 1: Seguridad real
"Mientras Tokko usa tecnología de hace 10 años, Corredor usa los estándares de seguridad de 2025: contraseñas con Argon2id, acceso biométrico (WebAuthn) y autenticación en dos pasos. Tu data de clientes está protegida como debe estar."

### Pillar 2: IA que trabaja para vos
"Corredor no es un CRM con un chatbot pegado. La IA está integrada: te dice qué propiedades mostrarle a cada cliente, qué leads tienen más posibilidades de cerrar y qué acción tomar hoy."

### Pillar 3: Precio que tiene sentido en Argentina
"Precio en USD para que la inflación no te sorprenda, con opción de pago en pesos al tipo de cambio publicado. Sin letra chica. Sin sorpresas."

---

## Taglines Under Test (A/B)

Three variants to test on the waitlist landing page via email signup conversion rate:

| # | Tagline | Angle | Test hypothesis |
|---|---|---|---|
| A | **"El CRM que trabaja para tu inmobiliaria"** | Benefit-led | Most direct, highest clarity |
| B | **"Gestioná tu negocio inmobiliario sin fricción"** | Pain-led | Resonates with frustrated Tokko users |
| C | **"Hecho en Argentina, para inmobiliarias argentinas"** | Origin/trust | Strong with relationship-driven buyers |

**Winner selection:** Run for 30 days on waitlist page. Measure email signup conversion rate. Secondary metric: which segment self-selects (solo vs agency size from waitlist form).

---

## Competitive Differentiation Summary

```
         Tokko Broker          Corredor
         ──────────────        ──────────────────────────
Year     ~2010s tech           2025 stack
Security Basic                 Argon2id + WebAuthn + TOTP
UX       Desktop-first         Mobile-first, modern
AI       None                  Lead scoring, matching, search
Pricing  ARS only, opaque      ARS+USD, transparent, published
Support  Standard              Local AR team
Migration N/A                  One-click Tokko import
Trial    None (known)          14 days, full Pro, no card
```

---

## Brand Promise

> **"Lo que prometemos, lo entregamos. Y si no, te devolvemos la plata."**

30-day money-back guarantee on first paid month. This removes the biggest objection from switching agencies: risk. We can afford this guarantee because a converted agency rarely churns in month 1 — churn happens at month 3–6 when they evaluate ROI.
