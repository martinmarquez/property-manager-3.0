# Corredor CRM — Support & Documentation Strategy

**Status:** Draft v1 — 2026-04-20
**Owner:** Customer Success

---

## Philosophy

Every support ticket is a documentation failure. Our goal is to solve questions before they become tickets. Our measure of success is not ticket volume — it is ticket deflection rate (% of users who find answers self-serve before contacting support).

**Target deflection rate:** > 70% by Month 6

---

## Help Center Structure (Mintlify)

### URL: `help.corredor.ar`

### Top-level navigation

```
Getting Started
  ├─ What is Corredor?
  ├─ Set up your agency (5-step guide)
  ├─ Import from Tokko (with screenshots)
  └─ Invite your team

Properties
  ├─ Add a property
  ├─ Edit and manage properties
  ├─ Publish to portals
  ├─ Manage photos and floor plans
  └─ Import properties (CSV / Tokko)

Contacts & Leads
  ├─ Add and manage contacts
  ├─ Lead pipeline stages (how they work)
  ├─ Triage and assign leads
  ├─ Auto follow-up rules
  └─ Import contacts (CSV / Tokko)

Inbox
  ├─ Connect WhatsApp Business
  ├─ Connect email (Gmail / Outlook / SMTP)
  ├─ Manage portal lead channels
  └─ Using the unified inbox

Portals
  ├─ Connect Zonaprop
  ├─ Connect Argenprop
  ├─ Connect MercadoLibre
  ├─ Connect Proppit
  ├─ Publish and unpublish properties
  └─ Portal sync FAQ

Calendar
  ├─ Schedule a visit
  ├─ Calendar integrations (Google, Outlook)
  └─ Team calendar

Documents
  ├─ Create a reservation (seña)
  ├─ Create a boleto de compraventa
  ├─ Create an escritura
  └─ E-signatures

Analytics
  ├─ Dashboard overview
  ├─ Portal performance
  └─ Lead funnel report

AI Features
  ├─ Lead triage assistant
  ├─ Property description generator
  └─ Smart search (semantic)

Admin & Settings
  ├─ Manage users and roles
  ├─ Branches and divisions
  ├─ Billing and plan
  ├─ Notification settings
  └─ API access

Migration
  ├─ Migrating from Tokko (complete guide)
  ├─ What data transfers from Tokko?
  ├─ Common migration issues
  └─ FAQ: Tokko vs. Corredor
```

### Article standards

- Every article: title, 30-second summary, step-by-step with numbered steps, screenshots on every step, common errors section, "Was this helpful?" feedback widget
- Language: ES-AR primary; EN-US secondary (toggle in header)
- Update policy: any product change → CS updates related article within 48h of deploy
- Screenshot tool: Scribe or Loom for annotated walkthroughs

---

## In-App Contextual Help

### Approach: Progressive disclosure

Don't overwhelm new users. Show help contextually — only when and where it's relevant.

### Tooltips

- Trigger: hover over `?` icon (present on every non-obvious form field)
- Max length: 2 sentences + optional "Learn more →" link to Mintlify article
- Examples:
  - Lead status field: "The stage in your sales pipeline. Stages are customizable in Settings → Pipeline."
  - Portal publication: "Publishing sends your property to this portal. Changes sync within 48 hours."
  - Commission field: "Your agency's commission on this operation. Shown in reports; not published to portals."

### Guided tours (new users only)

Use an in-app tour library (Shepherd.js or Chameleon) for first-time users:
- Tour 1: Properties tour — fires after first property is added (5 steps, skippable)
- Tour 2: Leads tour — fires after first lead is received
- Tours can be replayed from the Help menu

### Empty state help

Each module's empty state (see `onboarding-flow.md`) includes:
- A short explanation of what the module does
- A primary CTA to take the first action
- A secondary "Learn more" link to Mintlify

### Video embeds

For complex flows (Tokko import, portal connect, e-sign), embed a ≤3-min Loom video in:
- The relevant Mintlify article
- The in-app wizard modal header
Videos recorded by Customer Success. Retake policy: re-record within 5 business days of any UI change that affects the flow.

---

## Support Tier Definitions

### Tier 1: Self-Serve

**Who:** All plans
**Channels:** Help center (Mintlify), in-app tooltips, community forum (future)
**Response time:** Instant (self-serve)
**Covers:** How-to questions answerable by documentation, common errors with documented fixes

**Deflection tools:**
- Mintlify search with AI answer synthesis (Mintlify AI Responses feature)
- In-app contextual help
- FAQ section in each article

### Tier 2: Email / Chat Support

**Who:** Starter and Growth plans
**Channels:** Email (`soporte@corredor.ar`), in-app chat (Intercom or Crisp)
**Response SLA:** < 4 business hours
**Covers:** Anything not answered by docs, data issues, integration problems, billing

**Process:**
1. User opens chat or emails support
2. Bot attempts to match query to Mintlify article (deflection attempt)
3. If no match or user confirms "not helpful" → route to CS agent
4. CS agent responds + links to or creates Mintlify article if missing
5. After resolution: tag ticket with entity type (property/contact/lead/portal/billing/import) and resolution type (doc_gap/bug/user_error/feature_request)

**Weekly review:** CS reviews ticket tags to identify top doc gaps → create/update articles → feed feature_request tickets to product backlog

### Tier 3: Priority Support (Enterprise)

**Who:** Enterprise plan only
**Channels:** Dedicated Slack channel, direct email to named CS manager, optional weekly call
**Response SLA:** < 1 business hour (business hours: 9am–7pm ART)
**Covers:** Everything in Tier 2, plus:
- Dedicated onboarding session (video call)
- Custom migration assistance (CS assists with Tokko import)
- Escalation to engineering for production-impacting bugs
- Monthly business review (usage report + roadmap preview)

---

## Support Stack

| Tool | Purpose |
|------|---------|
| Mintlify | Help center authoring + hosting (`help.corredor.ar`) |
| Intercom or Crisp | In-app chat + email support ticketing |
| Loom | Screen recording for help videos |
| Scribe | Annotated screenshot walkthroughs |
| Shepherd.js / Chameleon | In-app guided tours |
| Linear (via Paperclip) | Bug reports and feature requests routed from support |

---

## Support → Product Feedback Loop

Every week, Customer Success runs a 30-minute review:

1. Pull all tickets from the past 7 days tagged `feature_request` or `bug`
2. Group by module + frequency
3. Create or update Linear issues for bugs (with steps to reproduce)
4. Create or update Paperclip issues for feature requests, labeled with how many users reported it
5. Present top 3 pain points in weekly team standup

**Monthly:** Send CEO a "Voice of Customer" summary:
- Top 5 support categories by volume
- Top 3 feature requests with user count
- Churn risks in the last 30 days + outcome
- NPS trend

---

## Initial Documentation Sprint (Pre-Launch)

Before public launch, the following must be complete:

### P0 (must have at launch)
- [ ] Getting started guide (setup + invite team)
- [ ] Import from Tokko (complete guide with screenshots)
- [ ] Add and manage properties
- [ ] Publish to portals (per-portal guides for top 4: Zonaprop, Argenprop, MercadoLibre, Proppit)
- [ ] Lead pipeline explainer
- [ ] Connect WhatsApp Business
- [ ] Billing FAQ

### P1 (first 2 weeks post-launch)
- [ ] Contacts import guide
- [ ] Auto follow-up rules
- [ ] Analytics dashboard walkthrough
- [ ] Notification settings guide

### P2 (first month post-launch)
- [ ] AI features guide
- [ ] Documents (reserva / boleto / escritura)
- [ ] API access guide
- [ ] Multi-branch setup

---

## Success Metrics

| Metric | Target (Month 6) |
|--------|-----------------|
| Help center deflection rate | > 70% |
| Median first-response time (Tier 2) | < 2 hours |
| CSAT on closed support tickets | > 4.2 / 5.0 |
| Articles published | > 40 |
| Average article helpfulness rating | > 80% "yes" |
| Feature requests routed to product | Weekly batch |
