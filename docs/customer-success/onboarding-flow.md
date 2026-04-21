# Corredor CRM — Customer Onboarding Flow

**Status:** Approved v1 — 2026-04-20 (CEO review complete)
**Owner:** Customer Success
**Next:** UX/UI Designer — wireframe Day 1 checklist and empty state screens

---

## Onboarding Philosophy

Agencies won't switch from Tokko unless they see value faster than the switching pain. Our target:

- **Activation moment** (AHA moment): Agency publishes their first property to a portal via Corredor OR receives and triages their first lead in the unified inbox
- **Time-to-activation goal:** < 2 hours from signup to AHA moment
- **Health threshold:** Agency is "healthy" when all 5 Day-1 checklist items are complete within 7 days

---

## Day 1 Checklist (In-App)

Shown as a collapsible checklist card on the dashboard for the first 30 days. Each item unlocks the next.

```
□ 1. Set up your agency profile         [5 min]
□ 2. Invite your teammates              [3 min]
□ 3. Import your Tokko data             [10–30 min]
□ 4. Connect your portals               [5 min each]
□ 5. Connect your inbox channels        [5 min each]
```

### Item detail

**1. Set up your agency profile**
- Agency name, logo, fiscal name, address, phone
- Branch setup (if multi-branch)
- Timezone + currency default (ARS / USD)
- **Preferred language:** Spanish (default) or English — controls onboarding email language
- Triggered by: account creation

**2. Invite your teammates**
- Role assignment: Admin, Manager, Agent
- Bulk invite via CSV or individual email
- Reminder sent to invitees after 24h if not accepted
- Show invite status in dashboard

**3. Import your Tokko data**
- Guided import wizard:
  1. Enter Tokko API key + Agency ID (link to Tokko help: where to find API key)
  2. Preview: show entity counts (X properties, Y contacts, Z leads)
  3. Confirm → import with real-time progress bar
  4. Post-import report: imported OK / warnings / errors
  5. "Review your data" CTA → property list
- Alternative: CSV upload for contacts/properties
- Fallback: "I'll add data manually" skips import

**4. Connect your portals**
- Show portal grid: Zonaprop, Argenprop, MercadoLibre, Proppit, Inmoclick + others
- OAuth or credential-based per portal
- Test connection → green checkmark
- First-publish tutorial: select a property → publish to portal → see live result

**5. Connect your inbox channels**
- WhatsApp Business: QR code scan or phone number linking
- Email: SMTP config (Gmail/Outlook OAuth or manual SMTP)
- Portal leads: auto-connected via portal integration (step 4)
- Test: send a test WhatsApp/email to see it arrive in inbox

---

## Empty State Designs (Per Module)

Each module has a zero-data state that explains what it does, shows the value, and has a single CTA.

| Module | Empty State Message | CTA |
|--------|-------------------|-----|
| Properties | "Your property inventory lives here. Import from Tokko or add your first property." | "Import from Tokko" / "Add property" |
| Contacts | "All your owners, buyers, and tenants in one place." | "Import contacts" / "Add contact" |
| Leads / Opportunities | "Your sales pipeline. Leads arrive automatically when you connect your inbox." | "Connect inbox" |
| Inbox | "All your leads from WhatsApp, email, and portals in one timeline." | "Connect WhatsApp" |
| Portals | "Publish to all portals with one click. Connect your portal accounts to start." | "Connect portals" |
| Calendar | "Schedule visits, calls, and follow-ups. Your team's calendar syncs here." | "Add event" |
| Analytics | "Performance reports appear once you have active properties and leads." | "View properties" |
| Documents | "Reservations, boletos, and escrituras. Create your first once you have a lead." | "View leads" |

---

## Onboarding Email Sequence

### Day 0 — Welcome (sent immediately after signup)

**Subject:** Bienvenido a Corredor, {agency_name} 👋
**From:** Martin @ Corredor (personal tone, not no-reply)

Content:
- Welcome + what Corredor is for (1 sentence)
- The 5 things to do today (checklist teaser)
- Direct link: "Set up your agency →"
- P.S.: "Reply to this email if you have questions — I read every one."

### Day 1 — Import your Tokko data

**Subject:** Tu inventario de Tokko en Corredor en 10 minutos
**Trigger:** Checklist item 3 not started

Content:
- Why importing is the fastest path to value
- Step-by-step: where to find your Tokko API key (screenshot)
- "Import now →" button
- Fallback: "Need help? Book a 15-min call →"

### Day 3 — Connect portals (if not connected)

**Subject:** Publicá en Zonaprop y Argenprop desde un solo lugar
**Trigger:** Checklist item 4 not complete AND > 1 property imported

Content:
- Show which portals are available
- "Once connected, one click publishes to all portals"
- "Connect portals →"

### Day 7 — Health check (if checklist < 60% complete)

**Subject:** ¿Cómo viene la migración, {first_name}?
**Trigger:** Fewer than 3 of 5 checklist items done after 7 days

Content:
- "We noticed you haven't finished setting up Corredor"
- List remaining items with direct links
- "Book a free 30-min onboarding call" — highest CTR moment
- Churn risk signal: if no response → flag account in CHURN_TRACKING.md

### Day 14 — Feature spotlight (if fully onboarded)

**Subject:** Tip: triá leads automáticamente con IA
**Trigger:** All 5 checklist items done

Content:
- One feature spotlight per email (rotate: AI triage, unified inbox, portal stats)
- "How {similar_agency_type} uses this feature" → social proof

### Day 30 — 30-day check-in

**Subject:** 30 días en Corredor — ¿cómo va todo?
**From:** CEO (high-trust signal)

Content:
- "We'd love to know how it's going"
- 1-click NPS survey (1–10 scale)
- If score ≤ 6: auto-flag as churn risk → Customer Success follows up same day
- If score 7–8: ask "what would make this a 10?" → route feedback to product
- If score 9–10: ask for a testimonial + portal referral

---

## Health Score Definition

A healthy new customer shows all 5 signals within the first 30 days.

| Signal | Weight | How measured |
|--------|--------|--------------|
| Checklist complete (all 5 items) | 30% | `onboarding_checklist_completed_at IS NOT NULL` |
| > 10 properties in Corredor | 20% | `COUNT(properties) > 10` |
| At least 1 portal connected + published | 20% | `portal_connections.status = active AND property_portal_publications.count > 0` |
| At least 1 lead received + triaged | 15% | `opportunities.count > 0 AND leads_triaged_by_agent > 0` |
| Daily active use (3+ agency-active days in last 7 days) | 15% | `agency_active_days.last_7d >= 3` — counts any day where at least 1 user in the agency had a session |

**Score bands:**

| Score | Status | Action |
|-------|--------|--------|
| 80–100% | Healthy | Monthly check-in only |
| 50–79% | Needs attention | Proactive outreach: schedule 30-min call |
| 0–49% | At-risk | Flag in CHURN_TRACKING.md; escalate to CEO if no response in 48h |

Score is calculated daily. Dashboard shows score as a colored indicator on agency records in the CS admin view.

---

## Onboarding Handoff

When an agency completes onboarding (score ≥ 80% within 30 days):

1. Send Day 14 feature spotlight series
2. Assign to "Ongoing success" cadence (monthly check-in)
3. Mark in CRM: `onboarding_status = graduated`

When an agency reaches Day 30 with score < 50%:

1. Escalate to CEO immediately with agency name, score breakdown, and last activity
2. Book a recovery call — Customer Success leads
3. Document outcome in CHURN_TRACKING.md

---

## CEO-Approved Decisions (2026-04-20)

1. **Checklist order** — Keep current order: import before portal connect. The "I'll add data manually" fallback covers agencies that want to test with one property before importing.
2. **Onboarding calls** — Free calls offered to all signups through **2026-10-20**. Threshold policy review scheduled for that date; if call-to-retention data supports a property-count gate, implement then.
3. **Health score sessions** — Agency-level (any user active in the agency on a given day counts as 1 active day). Multi-user teams are not penalized for members alternating days.
4. **Email language** — Spanish-first. "Preferred language" (ES/EN) added to agency profile setup (step 1). English email templates are not a launch blocker; deliver with Phase I/J.
