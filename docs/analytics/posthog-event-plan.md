# Corredor — PostHog Event Tracking Plan

**Version:** 1.0  
**Date:** 2026-04-20  
**Owner:** Data Analyst  
**Status:** Draft  
**Tool:** PostHog (self-hosted or PostHog Cloud, EU region for GDPR/Ley 25.326 compliance)

---

## 1. Principles

1. **No PII in PostHog.** User identity is represented by a pseudonymous `distinct_id` (a UUID, not the email or national ID). Contact names, emails, phone numbers, and addresses are never sent as event properties.
2. **Tenant-level identification only.** The PostHog "group" for each session is `tenant_id` (opaque UUID). Plan tier and country code are attached at the group level, not the user level.
3. **Events are behavioral, not operational.** PostHog tracks product usage patterns. Revenue, lead, and CRM data live in Postgres/MVs — PostHog is the PLG (product-led growth) layer.
4. **Consistent naming.** All events follow `noun_verb` snake_case: `property_created`, `listing_published`, `ai_feature_used`.
5. **Feature flags via PostHog.** All Phase G feature flags (`analytics_dashboard_v1`, `ai_copilot_beta`, etc.) are served through PostHog's feature-flag SDK.

---

## 2. User and Group Identification

### On login
```ts
posthog.identify(user.pseudonymousId, {
  role: user.role,                  // 'agent' | 'manager' | 'admin' | 'owner'
  plan_tier: tenant.planCode,       // 'solo' | 'pro' | 'agencia' | 'enterprise'
  country_code: tenant.countryCode, // 'AR' | 'MX' | ...
  account_age_days: daysSinceSignup,
  // NO email, name, or national ID
});

posthog.group('tenant', tenant.id, {
  plan_tier: tenant.planCode,
  country_code: tenant.countryCode,
  branch_count: tenant.branchCount,
  user_count: tenant.activeUserCount,
  listing_count: tenant.activeListingCount,
});
```

### On logout
```ts
posthog.reset();
```

---

## 3. Event Catalog

### 3.1 Auth & Onboarding

| Event | Trigger | Properties |
|---|---|---|
| `user_signed_up` | Registration completed | `role`, `plan_tier`, `signup_method` (`email`\|`sso`) |
| `user_logged_in` | Successful login | `auth_method` (`password`\|`passkey`\|`sso`), `mfa_used` (bool) |
| `onboarding_step_completed` | Each wizard step | `step` (`org_setup`\|`pipeline_preset`\|`portal_connect`\|`import`\|`invite_team`) |
| `onboarding_completed` | Wizard finished | `steps_completed`, `time_to_complete_min` |
| `team_member_invited` | Invitation sent | `invited_role` |
| `password_reset_requested` | Reset flow started | — |

### 3.2 Properties (Propiedades)

| Event | Trigger | Properties |
|---|---|---|
| `property_created` | New property saved | `property_type`, `operation_kind`, `has_media` (bool), `has_geo` (bool) |
| `property_updated` | Edit saved | `fields_changed` (array of field names — no values), `property_type` |
| `property_deleted` | Soft-delete | `property_type` |
| `property_restored` | Recovery from trash | `property_type` |
| `property_media_uploaded` | Photos/video added | `media_kind` (`photo`\|`video`\|`floorplan`), `count` |
| `property_description_generated` | AI description used | `property_type`, `locale` |
| `property_exported` | CSV/XLSX export | `format`, `row_count` |
| `property_imported` | CSV import completed | `row_count`, `error_count`, `source` (`csv`\|`tokko`) |

### 3.3 Contacts (Contactos)

| Event | Trigger | Properties |
|---|---|---|
| `contact_created` | New contact saved | `kind` (`person`\|`company`), `source` |
| `contact_updated` | Edit saved | `fields_changed` (field names only, no values) |
| `contact_merged` | Duplicate merge | — |
| `contact_imported` | CSV import | `row_count`, `error_count` |
| `segment_created` | New segment | `filter_count` |
| `dsrexport_requested` | Ley 25.326 DSR export | — |

### 3.4 Leads & Pipelines (Oportunidades)

| Event | Trigger | Properties |
|---|---|---|
| `lead_created` | New lead | `source`, `pipeline_id` (opaque), `stage_kind` |
| `lead_stage_moved` | Kanban drag or button | `from_stage_kind`, `to_stage_kind`, `days_in_prior_stage` |
| `lead_won` | Marked as won | `days_in_pipeline`, `pipeline_kind` |
| `lead_lost` | Marked as lost | `loss_reason` (if provided), `days_in_pipeline` |
| `pipeline_created` | New pipeline | `kind` |
| `lead_insights_viewed` | AI pipeline insights opened | `pipeline_kind` |

### 3.5 Inquiries (Consultas)

| Event | Trigger | Properties |
|---|---|---|
| `inquiry_created` | New inquiry | `operation_kind`, `zone_count`, `has_price_range` |
| `inquiry_matches_viewed` | Matches panel opened | `match_count` |
| `inquiry_shortlist_sent` | Matched listings sent to contact | `listing_count`, `channel` |

### 3.6 Calendar (Calendario)

| Event | Trigger | Properties |
|---|---|---|
| `calendar_event_created` | Event saved | `event_kind` (`visit`\|`meeting`\|`call`\|`task`), `has_external_attendees` |
| `calendar_synced` | External calendar connected | `provider` (`google`\|`microsoft`) |
| `visit_completed` | Visit marked as done | — |

### 3.7 Inbox (Bandeja)

| Event | Trigger | Properties |
|---|---|---|
| `inbox_message_sent` | Outbound message sent | `channel`, `is_ai_draft_used` (bool), `has_attachment` (bool) |
| `inbox_thread_assigned` | Thread assigned to agent | `assignment_method` (`manual`\|`auto_rule`) |
| `inbox_template_used` | Message template inserted | — |
| `inbox_ai_draft_accepted` | AI draft kept | `channel` |
| `inbox_ai_draft_rejected` | AI draft discarded | `channel` |
| `inbox_channel_connected` | New channel account set up | `channel` |
| `sla_breached` | SLA timer expires | `channel`, `policy_name`, `breach_minutes` |

### 3.8 Publishing / Portals (Difusión)

| Event | Trigger | Properties |
|---|---|---|
| `listing_published` | Listing sent to portal | `portal_id`, `has_override` (bool) |
| `listing_unpublished` | Listing removed from portal | `portal_id`, `days_published` |
| `portal_connected` | Portal credentials saved | `portal_id` |
| `portal_sync_error_viewed` | Error triage page opened | `portal_id` |
| `listing_portal_optimizer_used` | AI optimizer run | `portal_id` |

### 3.9 Documents & E-Sign (Documentos / Reservas)

| Event | Trigger | Properties |
|---|---|---|
| `document_generated` | Doc created from template | `template_kind` (`reserva`\|`boleto`\|`escritura`\|`custom`) |
| `esign_sent` | Signature request sent | `provider` (`signaturit`\|`docusign`), `signer_count` |
| `esign_completed` | All signers signed | `provider`, `days_to_complete` |
| `reservation_created` | Reserva record created | — |
| `boleto_created` | Boleto generated | — |

### 3.10 Appraisals (Tasaciones)

| Event | Trigger | Properties |
|---|---|---|
| `appraisal_started` | Wizard opened | — |
| `appraisal_ai_used` | AI narrative generated | `comp_count` |
| `appraisal_report_downloaded` | PDF downloaded | — |

### 3.11 Website Builder (Sitio)

| Event | Trigger | Properties |
|---|---|---|
| `site_page_published` | Page goes live | `page_type` (`home`\|`listing-grid`\|`contact`\|`blog`\|`custom`) |
| `site_theme_changed` | Theme selected | `theme_name` |
| `site_custom_domain_connected` | Domain DNS verified | — |
| `site_form_submitted` | Public visitor submits form | — (no PII — just counts) |
| `site_block_added` | Block dropped in editor | `block_type` |

### 3.12 AI Features (IA)

| Event | Trigger | Properties |
|---|---|---|
| `ai_feature_used` | Any AI feature invoked | `feature_type`, `model_used`, `latency_ms`, `success` (bool) |
| `ai_feedback_given` | Thumbs up/down | `feature_type`, `sentiment` (`positive`\|`negative`) |
| `ai_copilot_opened` | `/ai` page opened | — |
| `ai_copilot_tool_called` | Tool invoked via copilot | `tool_name` (procedure name, no args) |

### 3.13 Reports & Analytics (Reportes)

| Event | Trigger | Properties |
|---|---|---|
| `report_viewed` | Dashboard page opened | `report_slug`, `date_range_days` |
| `report_filter_applied` | Filter changed | `report_slug`, `filter_type` |
| `report_exported` | CSV/XLSX exported | `report_slug`, `format` |
| `report_pinned` | Pinned to Panel | `report_slug` |
| `report_digest_scheduled` | Email digest set up | `report_slug`, `frequency` |

### 3.14 Settings & Billing

| Event | Trigger | Properties |
|---|---|---|
| `plan_upgraded` | Subscription plan increased | `from_plan`, `to_plan` |
| `plan_downgraded` | Subscription plan decreased | `from_plan`, `to_plan` |
| `plan_cancelled` | Cancellation confirmed | `tenure_days`, `plan` |
| `billing_method_added` | Payment method saved | `method` (`stripe`\|`mercadopago`) |
| `api_key_created` | New API key | `scope` |
| `webhook_created` | Webhook endpoint saved | `event_types` (array) |
| `custom_field_created` | New custom field | `entity_type`, `field_type` |

---

## 4. Funnel Definitions

These funnels drive PLG (product-led growth) analysis in PostHog.

### F-01: Activation Funnel (new tenant)

Goal: from signup to "active" (has published at least 1 listing to 1 portal).

```
user_signed_up
  → onboarding_step_completed (step=portal_connect)
  → property_created
  → listing_published
```

Target: ≥ 40% of signups reach `listing_published` within 72 hours.

### F-02: Core CRM Adoption

Goal: agent is using leads + inbox together.

```
lead_created
  → lead_stage_moved
  → inbox_message_sent (channel=whatsapp OR email)
```

Target: ≥ 60% of agents who create a lead also message via inbox within 7 days.

### F-03: AI Adoption

Goal: user moves from first AI use to habitual use (3+ sessions).

```
ai_feature_used (first occurrence)
  → ai_feature_used (second occurrence, within 14 days)
  → ai_feature_used (third occurrence, within 30 days)
```

Target: ≥ 50% of users who use AI once become habitual users within 30 days.

### F-04: Portal Publishing Loop

Goal: listing created → published → lead received → lead converted.

```
property_created
  → listing_published
  → lead_created (source=portal:*)
  → lead_stage_moved (to_stage_kind=won)
```

This funnel measures the end-to-end value loop. Conversion at each step tracked per portal.

### F-05: Plan Upgrade Path

Goal: measure what triggers plan upgrades.

```
[any feature event that is plan-gated]
  → plan_upgraded
```

Compare which events most often precede upgrades to identify upsell triggers.

### F-06: Churn Precursors

Goal: identify behavioral signals before plan cancellation.

Tracked in reverse (from `plan_cancelled` backwards):
- Was the last `report_viewed` > 30 days ago?
- Was `inbox_message_sent` count declining in last 2 weeks?
- Were there any `sla_breached` events in the 7 days prior?

This funnel runs as a PostHog cohort analysis, not a forward funnel.

---

## 5. Session Replay

Enabled selectively (not all sessions — cost + privacy control):

- Enabled for: users who click a PostHog feature flag variant for UX research.
- Disabled for: all sessions by default.
- Masking: all text inputs masked. No form values captured. No PII visible.
- Retention: 90 days (PostHog default).

---

## 6. Feature Flags

| Flag | Purpose | Rollout |
|---|---|---|
| `analytics_dashboard_v1` | Enable Phase G analytics dashboards | 100% internal → 10% beta → 100% |
| `ai_copilot_beta` | Enable AI Copilot feature | Agencia + Enterprise only, then 20% Pro |
| `posthog_session_replay` | Enable session replay for UX research | < 5% of sessions, opt-in |
| `portal_optimizer_v2` | New portal listing optimizer | A/B test on 50% of Agencia users |
| `cohort_dashboard` | Lead cohort analysis dashboard | CEO/Admin only → all |

Flags served client-side via PostHog JS SDK (`posthog.isFeatureEnabled('flag-name')`). Server-side evaluation for gated API routes via PostHog Node SDK.

---

## 7. Dashboards in PostHog

These PostHog dashboards are separate from the in-app Corredor analytics dashboards — they are internal product analytics for the Corredor team.

| Dashboard | Key metrics |
|---|---|
| Activation | Signup → first listing published funnel, time-to-activate histogram |
| AI Adoption | ai_feature_used counts, F-03 funnel, positive_feedback_pct |
| Portal Loop | F-04 funnel, listing_published count by portal_id |
| Churn Signals | plan_cancelled trends, F-06 cohort |
| Feature Usage | Event counts per feature per week, sorted by DAU |
| Onboarding Health | onboarding_step_completed completion rate per step |

---

## 8. Implementation Notes

1. **PostHog JS SDK** initialized in `packages/telemetry/src/posthog.ts` with `persistence: 'localStorage'` and `autocapture: false` (all events explicit).
2. **Server-side events** (e.g. background job outcomes, subscription changes) sent via PostHog Node SDK from `apps/worker` and `apps/api`.
3. **Event batching:** PostHog JS SDK batches by default; no extra configuration needed.
4. **Privacy mode:** `maskAllInputs: true`, `maskAllText: false` (text masking is selective via CSS class `ph-no-capture`).
5. **Bootstrap flags:** Feature flags bootstrapped server-side on first HTML render to avoid flash-of-missing-feature.
6. **EU data residency:** Use PostHog EU Cloud (`eu.posthog.com`) to keep data in the EU. Add `api_host: 'https://eu.i.posthog.com'` to SDK init.

---

*Document last updated: 2026-04-20*
