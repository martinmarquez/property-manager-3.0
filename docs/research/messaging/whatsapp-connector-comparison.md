# WhatsApp Connector Comparison: 360dialog vs Meta Cloud API

**Prepared:** 2026-04-20
**Author:** Researcher Agent (RENA-15)
**Purpose:** Recommend WhatsApp provider for Phase D inbox integration in Corredor CRM

---

## TL;DR Recommendation

**Lead with 360dialog. Retain Meta Cloud API as a DIY fallback.**

360dialog's BSP layer adds ~$20/month per WABA (WhatsApp Business Account) but provides the support SLA, multi-number tenant management, and stability guarantees needed for a production CRM serving real estate agencies. Meta Cloud API is viable for a single-tenant pilot but carries meaningful operational risk at scale.

---

## Comparison Matrix

| Dimension | 360dialog | Meta Cloud API |
|---|---|---|
| **Provider type** | BSP (Business Solution Provider) | Direct (Meta-managed) |
| **Fixed monthly cost** | ~$20/WABA + Meta message costs | $0 (message costs only) |
| **Message pricing** | Meta rate card + BSP markup | Meta rate card only |
| **Auth / token management** | Managed — no 60-day expiry | Self-managed — 60-day token rotation required |
| **Support** | Professional ticketing system, tracked SLAs | Community forums; very hard to reach Meta directly |
| **Webhook reliability** | High; BSP handles delivery + retries | Depends on your infra; Meta has no retry SLA |
| **Template approval speed** | ~24h typical (varies by content) | ~24h typical (same Meta backend) |
| **Multi-number per tenant** | Yes — multiple WABAs per client | Yes — possible, but requires manual setup per number |
| **Early feature access** | Yes — 360dialog is a Meta launch partner | No — same as general availability |
| **Sandbox / testing** | Yes — test numbers available | Yes — Meta test environment |
| **Argentina / LATAM restrictions** | None specific | None specific |

---

## 1. Pricing Model

### Meta pricing (applies to both, effective July 1, 2025)

Meta shifted to a hybrid model on 2025-07-01:
- **Service Conversations** (user-initiated or within 24h window): billed per conversation
- **Utility templates** sent within the 24h window: **free**
- **Marketing templates**: billed per message sent (not per conversation)

Per-message pricing varies by country and conversation category. Argentina rates are in the standard LATAM tier.

**Estimated costs (Argentina, indicative):**

| Volume | Approx. marketing cost per message | Approx. utility cost per message |
|---|---|---|
| 1,000 msgs/day | ~$0.025–0.035 USD | ~$0.012–0.018 USD |
| 10,000 msgs/day | Lower tier (~15–20% discount) | Lower tier |

*Note: Exact rates require checking Meta's current Rate Card for Argentina (AR) and your negotiated tier. Request current rate card from 360dialog or Meta directly.*

### 360dialog additional cost

- ~$20/month per WABA (WhatsApp Business Account)
- Per-message costs pass through at Meta rates; 360dialog may apply a small markup for Marketing Messages API routing (7% premium if using non-standard `/messages` endpoint — use the official Marketing Messages API to avoid this)

### Break-even analysis

At 1,000 messages/day, the 360dialog overhead (~$20/month) represents roughly 5–8% of message costs. At 10,000 messages/day, it drops to under 1%. **The support and reliability premium is worth it at either volume.**

---

## 2. Webhook Reliability

### 360dialog

- Webhooks are managed at the BSP level
- 360dialog handles Meta's delivery failures internally; partners see a more stable event stream
- Documented retry behavior with dead-letter queue options
- Recommended for production CRM scenarios with high availability requirements

### Meta Cloud API

- Webhooks delivered directly from Meta's infrastructure
- No guaranteed retry SLA beyond Meta's standard delivery attempt
- Your server must be reachable and respond with HTTP 200 within Meta's timeout window
- Token expiry (every 60 days) causes silent webhook failures if rotation is missed — a significant operational risk

**Risk rating:** 360dialog: Low | Meta Cloud API: Medium (manageable with ops discipline)

---

## 3. Template Approval Process

Both options use the same Meta template approval backend:

- Submit templates via API or Meta Business Manager
- Review time: typically 24 hours, can extend to 72 hours for edge cases
- Templates with promotional content, restricted categories (finance, health), or policy-adjacent language face higher rejection rates
- Argentina-specific note: templates should be in Spanish (Rioplatense); avoid generic Castilian where possible — Meta's reviewers flag language inconsistencies

**Multi-language:** Both support multi-language template variants.

**Best practice:** Maintain a template library with pre-approved transactional, utility, and marketing variants. Build an approval tracking workflow into the CRM admin.

---

## 4. Multi-Number Support Per Tenant

Real estate agencies (tenants) may need multiple WhatsApp numbers (e.g., one per branch or agent).

### 360dialog

- Explicitly supports multiple WABAs per client/tenant
- Partner dashboard allows managing numbers per tenant without manual per-number setup
- Billing is per WABA; cost scales linearly

### Meta Cloud API

- Technically supports multiple WABAs per business portfolio
- No BSP intermediary to manage tenant separation; your backend must handle routing between WABAs
- More engineering overhead to build a clean multi-tenant model

**Recommendation:** 360dialog's multi-WABA management is significantly cleaner for a CRM SaaS context.

---

## 5. Argentina-Specific Restrictions

No AFIP (Argentine tax authority) restrictions specific to WhatsApp API usage were found.

Standard compliance requirements:
- Personal Data Protection Law (Ley 25.326) — equivalent to GDPR; requires explicit user consent before messaging
- Users must opt-in before receiving WhatsApp messages from the business
- Unsubscribe mechanism required (Meta policy + local law)
- Data residency: Meta stores WhatsApp data in its global infrastructure; no Argentina-specific residency requirement found, but review Ley 25.326 with legal counsel for sensitive customer data

---

## 6. Recommended Architecture

```
Tenant CRM Agent
      |
      | (webhook events)
      v
[Corredor CRM Inbox Service]
      |
      | (send/receive)
      v
[360dialog WABA per tenant]
      |
      | (Meta protocol)
      v
[WhatsApp / Meta Cloud API]
```

### Primary: 360dialog

- Use 360dialog's Partner API to provision a WABA per tenant onboarding
- One API key per WABA; 360dialog handles token lifecycle
- Webhook URL: your inbox service endpoint per tenant
- Fallback if 360dialog has an outage: hold messages in queue; replay when service restores (360dialog has >99.9% SLA)

### Fallback: Meta Cloud API (self-managed)

- Viable for a single-tenant pilot or if a customer refuses 360dialog as a dependency
- Requires a cron job or infrastructure alarm for 60-day token rotation
- Meta System User tokens (non-expiring) are available for app-level access — use these instead of user tokens to avoid expiry issues

---

## 7. Open Questions / Blockers

- [ ] **Pricing confirmation:** Request Meta's current rate card for Argentina from 360dialog sales; get exact per-message costs at 1k and 10k/day tiers.
- [ ] **360dialog partner tier:** Confirm whether Corredor CRM qualifies for 360dialog's Partner program (reduced per-WABA pricing at volume).
- [ ] **Facebook Business Manager account:** Required for both options. Ensure the company has a verified FBM account before Phase D kickoff.
- [ ] **Phone number strategy:** Decide whether tenants bring their own numbers or Corredor provisions them. This affects onboarding flow and support ownership.
