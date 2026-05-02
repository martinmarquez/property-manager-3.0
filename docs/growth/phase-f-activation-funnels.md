# Phase F Activation — AI Copilot Onboarding, Search Adoption, Description Generation Funnels

**Version:** 1.0  
**Date:** 2026-05-01  
**Owner:** Growth Strategist  
**Issue:** RENA-93  
**References:** RENA-64 · RENA-52 · RENA-68 · RENA-90 · RENA-89

---

## 1. Copilot Onboarding Funnel

**Milestone (AHA):** First copilot action confirmed — user executes a copilot suggestion (navigates to a search result, triggers AI description draft, or links an entity) within the same session as first use.

**Why this AHA:** A query alone proves the user typed something. A confirmed action proves the copilot delivered value. This is the PLG signal that predicts 30-day retention in similar AI-first products.

**Funnel stages:**

| Stage | Event | Description |
|-------|-------|-------------|
| 0 | `copilot_feature_enabled` | Feature flag `ai_copilot_beta` enabled for tenant |
| 1 | `copilot_tooltip_shown` | Floating button tooltip displayed on first visit |
| 2 | `copilot_opened` | Chat panel opened (floating button or keyboard shortcut) |
| 3 | `copilot_query_sent` | First query submitted |
| 4 ★ | `copilot_action_confirmed` | User confirms a copilot-suggested action — **AHA** |

**Target:** Stage 0 → AHA in ≤ 72 h for ≥50% of enabled tenants by D30.

**Discovery mechanics:**

- **Floating button tooltip:** On first visit after feature flag enabled, animate tooltip: *"Nuevo: Asistente IA — Preguntá sobre cualquier propiedad o contacto"*. Dismiss on click or after 8 s. Fire `copilot_tooltip_shown`.
- **Keyboard shortcut:** `Cmd+K` → opens copilot if no active search. Show hint in button: `⌘K`. Fire `copilot_shortcut_hint_shown` on first hover.
- **Suggested prompts (empty state):** When chat is open with no history, show 4 contextual suggested prompts based on current page:
  - On Properties list: *"Mostrá propiedades de 3 ambientes en Palermo"*, *"¿Cuáles propiedades llevan más de 60 días sin visitas?"*
  - On Contacts list: *"Contactos sin actividad en los últimos 30 días"*, *"Leads calientes de esta semana"*
  - On Lead detail: *"Generá descripción para esta propiedad"*, *"Resumí el historial de este lead"*
  - Generic fallback: *"¿En qué puedo ayudarte?"*

**Nudge sequence (5 triggers):**

| T+ | Condition | Channel | Message |
|----|-----------|---------|---------|
| T+0 | Feature enabled | In-app tooltip | Floating button animated tooltip (see above) |
| T+24 h | Stage 0, no Stage 1 | In-app banner | *"¿Viste el asistente IA? Preguntale sobre tus propiedades"* + CTA → open copilot |
| T+48 h | Stage 1, no Stage 3 | In-app toast | *"Probá: 'Propiedades más vistas esta semana'"* (pre-filled prompt) |
| T+72 h | Stage 2, no AHA | Email | *"[Nombre], probaste el asistente pero no lo viste en acción todavía — mirá estos 3 casos de uso"* |
| T+7 d | No AHA yet | In-app banner + email | Usage story: *"Agencias como la tuya ahorran 2h/semana con el asistente IA"* |

**PostHog events:**

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `copilot_tooltip_shown` | Floating button tooltip displayed | `entry_day`, `page_context` |
| `copilot_tooltip_dismissed` | Tooltip closed | `method` (`click`\|`timeout`\|`scroll`) |
| `copilot_opened` | Chat panel opened | `entry_point` (`floating_button`\|`cmd_k`\|`inline_hint`) |
| `copilot_query_sent` | Query submitted | `intent` (`search`\|`describe`\|`analyze`\|`navigate`\|`unknown`), `query_length`, `is_suggested_prompt` (bool) |
| `copilot_suggested_prompt_clicked` | Suggested prompt used | `prompt_index`, `page_context` |
| `copilot_action_confirmed` | User confirms copilot action — AHA | `action_type` (`search_navigate`\|`description_draft`\|`entity_link`\|`filter_apply`), `latency_ms` |
| `copilot_session_abandoned` | Panel closed with no action confirmed | `queries_sent`, `session_duration_s` |

**Key metrics:**

| Metric | Target |
|--------|--------|
| Tooltip-to-open rate | ≥40% |
| Open-to-first-query rate | ≥70% |
| First query → AHA rate | ≥50% |
| AHA within 72 h (of feature enable) | ≥50% by D30 |
| Copilot DAU / enabled tenants | ≥35% by D60 |
| Avg queries per active session | ≥2.5 |

---

## 2. Smart Search Adoption Funnel

**Milestone (AHA):** First `Cmd+K` search that results in navigation to a result entity (property, contact, or lead detail page) within the same session.

**Why this AHA:** Cmd+K keyboard use signals habit formation. Navigation to a result proves intent match, not just accidental activation.

**Funnel stages:**

| Stage | Event | Description |
|-------|-------|-------------|
| 0 | `search_feature_enabled` | Feature flag `smart_search_beta` enabled for tenant |
| 1 | `search_shortcut_tooltip_shown` | Cmd+K tooltip shown on search icon hover |
| 2 | `search_opened` | Command palette opened |
| 3 | `search_query_submitted` | Query entered (≥2 chars) |
| 4 ★ | `search_result_navigated` | User clicks a result → navigates to entity — **AHA** |

**Target:** Stage 0 → AHA in ≤ 48 h for ≥55% of enabled tenants by D30.

**Discovery mechanics:**

- **Search icon tooltip:** On first hover of search icon (or after 3 navigation actions), show tooltip: *"Atajo rápido: ⌘K para buscar propiedades, contactos y leads"*. Dismiss on click or 6 s.
- **Keyboard shortcut education:** In-app banner on D1 for enabled users: *"Nuevo: Buscá todo con ⌘K"* with animated GIF of palette opening.
- **Search quality feedback:** After each search session (palette closed with ≥1 result viewed), show thumbs up/down prompt. Fire `search_quality_feedback` with `rating` (`up`\|`down`) and `query_length`. Feed negatives to search quality queue.

**Nudge sequence (4 triggers):**

| T+ | Condition | Channel | Message |
|----|-----------|---------|---------|
| T+0 | Feature enabled | In-app banner | *"Nuevo: Búsqueda inteligente con ⌘K — encontrá cualquier propiedad al instante"* |
| T+24 h | Stage 1, no Stage 3 | In-app tooltip (contextual) | On any list page: *"Probá ⌘K para filtrar esta lista al instante"* |
| T+48 h | Stage 2, no AHA | In-app hint | After palette closed without navigation: *"Tip: seleccioná un resultado con Enter para ir directo"* |
| T+7 d | No AHA yet | Email | *"¿Sabías que ⌘K también busca entre contactos y oportunidades? Probalo ahora"* |

**PostHog events:**

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `search_shortcut_tooltip_shown` | Tooltip displayed | `page_context`, `trigger` (`hover`\|`auto`) |
| `search_opened` | Command palette opened | `trigger` (`cmd_k`\|`search_icon`\|`nav_click`) |
| `search_query_submitted` | Query submitted | `query_length`, `result_count`, `entity_types_returned` (array) |
| `search_result_navigated` | Result clicked → navigation — AHA | `entity_type` (`property`\|`contact`\|`lead`), `result_position`, `match_type` (`keyword`\|`semantic`\|`hybrid`) |
| `search_closed_no_result` | Palette closed, zero results | `query_length` |
| `search_quality_feedback` | Thumbs submitted | `rating` (`up`\|`down`), `query_length`, `result_count` |

**Key metrics:**

| Metric | Target |
|--------|--------|
| Tooltip-to-open rate (Cmd+K) | ≥35% |
| Open-to-query rate | ≥80% |
| Query-to-navigation rate | ≥55% |
| Zero-result rate | ≤15% |
| Search quality thumbs-up rate | ≥75% |
| Cmd+K AHA within 48 h | ≥55% by D30 |
| Search MAU / enabled tenants | ≥60% by D60 |
| Avg searches per DAU | ≥4 |

---

## 3. AI Descriptions Activation Funnel

**Milestone (AHA):** First AI-generated description saved to a property — `ai_description_saved` event fires.

**Why this AHA:** Generation alone can be curiosity-driven. Saving proves the user found the output production-ready, which is the time-saved value proposition materialized.

**Funnel stages:**

| Stage | Event | Description |
|-------|-------|-------------|
| 0 | `ai_descriptions_feature_enabled` | Feature flag enabled for tenant |
| 1 | `ai_description_prompt_shown` | "Generá con IA" banner shown on property detail |
| 2 | `ai_description_modal_opened` | Generate modal opened |
| 3 | `ai_description_generated` | Streaming complete, preview shown |
| 4 ★ | `ai_description_saved` | Description saved to property — **AHA** |

**Target:** Stage 0 → AHA in ≤ 24 h for ≥60% of enabled tenants by D14.

**Discovery mechanics:**

- **First-time generate prompt:** On first visit to any property detail page after feature enable, show sticky banner below description field: *"Generá una descripción con IA en segundos. Elegí el tono y el portal."* + CTA *"Generá ahora"* (dismiss persists via localStorage key `ai_desc_prompt_dismissed`).
- **Empty description state:** When `description` field is empty, replace placeholder with: *"Sin descripción aún — ¿querés que la IA la genere por vos?"* inline link.
- **Success metric badge:** After save, show toast: *"✓ Descripción guardada — estimado: 8 min ahorrados"* (calibrate at D30 with actual data).
- **Portal-specific copy hint:** In modal, show which portal the tone is optimized for.

**PostHog events:**

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `ai_description_prompt_shown` | First-time banner displayed | `property_type`, `has_existing_description` (bool) |
| `ai_description_prompt_dismissed` | Banner dismissed | `time_shown_s` |
| `ai_description_modal_opened` | Modal opened | `entry_point` (`banner`\|`empty_state`\|`button`\|`context_menu`) |
| `ai_description_tone_selected` | Tone changed | `tone` (`formal`\|`friendly`\|`premium`), `portal` |
| `ai_description_generated` | Streaming complete | `property_type`, `tone`, `portal`, `generation_time_ms`, `token_count` |
| `ai_description_regenerated` | User regenerates | `regeneration_count` |
| `ai_description_edited` | User edits output | `edit_ratio` (chars changed / total chars) |
| `ai_description_saved` | Saved — AHA | `edited_before_save` (bool), `edit_ratio`, `generation_time_ms`, `time_to_save_s` |
| `ai_description_discarded` | Modal closed without save | `had_generated` (bool), `time_in_modal_s` |

**Key metrics:**

| Metric | Target |
|--------|--------|
| Prompt-to-modal rate | ≥50% |
| Modal-to-generation rate | ≥85% |
| Generation-to-save rate | ≥65% |
| AHA within 24 h (of feature enable) | ≥60% by D14 |
| Edit-before-save rate | ≤40% (lower = higher AI quality) |
| Avg generation time p50 | ≤4 s |
| Descriptions saved / tenant / week (D30+) | ≥5 |
| Estimated time saved / description | calibrate at D30 (target ≥6 min) |

---

## 4. Tier Upgrade Triggers

### 4A. Quota Limit Reached → Upgrade Prompt

**Trigger:** `aiTokenBudgetMiddleware` fires quota exhaustion for `solo` or `pro` tenants.

**Intercept behavior:**
- Show modal: *"Llegaste al límite de IA de este mes. Actualizá tu plan para seguir usando el asistente, búsqueda inteligente y descripciones."*
- Show usage context: *"Usaste 100% de tu cuota de IA (X tokens de Y)"*
- Show next reset date
- CTA: *"Ver planes"* → `/settings/billing?utm_source=quota_limit&utm_feature={feature_name}`
- Secondary: *"Recordarme cuando se resetee"* → notification opt-in

**Soft gate (preview wall) for Free/Solo:**
- AI Descriptions: gate on click with tier wall modal
- Copilot: open gate modal if on solo plan below threshold
- Smart Search: keyword search always available; semantic matching gated to `pro+`

### 4B. Feature Gate Visibility

- **Usage gauge:** In copilot sidebar footer — *"Cuota IA: 67% usada este mes"*
- **Pre-exhaustion warning:** At 80% quota, show in-app banner with link to billing
- **Tier upsell in onboarding:** In copilot empty state for solo: *"Con plan Pro obtenés 10x más consultas al mes"*

**PostHog events:**

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `quota_limit_reached` | Budget exhausted | `feature`, `plan_tier`, `reset_date` |
| `quota_warning_shown` | 80% quota used | `feature`, `plan_tier`, `usage_pct` |
| `upgrade_prompt_shown` | Upgrade modal/gate displayed | `trigger` (`quota_limit`\|`quota_warning`\|`feature_gate`\|`soft_wall`), `feature`, `plan_tier` |
| `upgrade_cta_clicked` | *"Ver planes"* clicked | `trigger`, `feature`, `plan_tier`, `cta_position` |
| `quota_reset_notification_opted_in` | User opts into reset notification | `feature` |

**Key metrics:**

| Metric | Target |
|--------|--------|
| Quota-limit → upgrade CTA click rate | ≥25% |
| Quota-limit → plan upgrade conversion (D7) | ≥8% |
| Soft gate → upgrade CTA click rate | ≥15% |
| Pre-exhaustion warning click rate | ≥20% |

---

## 5. Feature Flag Rollout Plan

### 5A. Rollout Cohorts

**New flags to register in PostHog:**
- `smart_search_beta` — gates Cmd+K semantic search
- `ai_descriptions_beta` — gates AI description generation

**Progressive rollout schedule (per flag):**

| Phase | % Tenants | Criteria | Duration | Action |
|-------|-----------|----------|----------|--------|
| Alpha | 5% | Internal tenants + beta-opt-in | 1 week | Watch error rate, latency p99 |
| Beta | 20% | `agencia` + `enterprise` plan tenants | 2 weeks | Monitor AHA rates, cost per tenant |
| Growth | 50% | All `pro+` tenants | 2 weeks | Check quota exhaustion rate, upgrade conversions |
| GA | 100% | All tenants (with tier gates for solo) | — | Full launch |

**Rollout pause triggers:**
- API error rate > 2% on AI endpoints → pause + alert `#eng-on-call`
- Avg token cost per tenant > 2× budget projection → pause + alert CTO
- Zero-result rate in smart search > 25% → pause + review embedding quality
- Description generation latency p95 > 10 s → pause + check OpenAI rate limits

**PostHog flag configuration:**
```
ai_copilot_beta:
  rollout_percentage: 20
  filters:
    - property: plan_tier
      operator: is
      value: [pro, agencia, enterprise]

smart_search_beta:
  rollout_percentage: 5
  filters:
    - property: plan_tier
      operator: is
      value: [agencia, enterprise]

ai_descriptions_beta:
  rollout_percentage: 20
  # no tier filter — gated by quota at runtime
```

### 5B. Beta Feedback Collection

1. **Copilot thumbs:** After each AHA, inline *"¿Fue útil esta respuesta?"* thumbs. Negative → optional free-text (max 200 chars). Fire `copilot_feedback_given`.
2. **Search quality loop:** After palette close with ≥1 result viewed, show thumbs. Negatives queued for weekly search quality review.
3. **Description quality:** In modal after generation, *"¿La descripción es buena?"* thumbs. Feed into prompt tuning.
4. **Beta NPS (D14 post-AHA):** Trigger for users with AHA on ≥2 features. Fire `nps_submitted` with `score`, `feature_context`.
5. **Slack feedback channel:** Create `#beta-ai-feedback` — in-app text comments auto-posted via webhook (tenant ID + comment only, no PII).

### 5C. Rollout Communication

| Cohort | Channel | Message |
|--------|---------|---------|
| Alpha (internal) | In-app banner + Slack DM | *"Sos parte del alpha de IA — tu feedback moldea el producto"* |
| Beta | In-app banner | *"Nuevo: Acceso anticipado a funciones de IA — parte del grupo beta de Corredor"* |
| GA | Email + in-app | *"Las funciones de IA de Corredor ya están disponibles para todos"* |

---

## 6. Updated Health Score Model (AI Signals)

Add 2 AI-usage signals to the Phase D health score (ref RENA-68):

| Signal | Weight | Threshold for full credit |
|--------|--------|--------------------------|
| AI copilot AHA achieved | 10% | ≥1 confirmed action in last 30 d |
| AI description generated | 5% | ≥1 description saved in last 30 d |

*Adjust: Lead response velocity 25%→20%, Inbox WAU 20%→15%.*

**Churn risk signals (AI-specific):**
- Copilot opened ≥3× with 0 AHA → CS review
- Description generated but never saved ≥5× → CS outreach (prompt quality issue)
- Quota limit hit with no upgrade in 7 d → high-intent churn risk

---

## 7. A/B Tests

| Test | Variable | Control | Treatment | Primary Metric | Min n |
|------|----------|---------|-----------|----------------|-------|
| **A** | Copilot entry point | Floating button | Inline contextual hint in properties header | Copilot AHA rate D7 | ≥100 tenants/arm |
| **B** | Suggested prompts | Generic (4 prompts) | Page-context aware prompts | First query within session | ≥100 tenants/arm |
| **C** | Description success message | No badge | *"X min ahorrados"* badge after save | Description save rate D30 | ≥100 tenants/arm |
| **D** | Quota warning threshold | 80% threshold | 90% threshold | Upgrade conversion D7 post-warning | ≥100 tenants/arm |

All tests: PostHog experiments, p < 0.05, minimum 2 weeks or 100 tenants per arm.

---

## 8. Implementation Requirements

### Engineering tasks

| # | Task | Owner issue | Notes |
|---|------|-------------|-------|
| 1 | Copilot floating button tooltip + dismiss logic | RENA-83 | — |
| 2 | Copilot suggested prompts engine (page-context aware) | RENA-83 | — |
| 3 | Cmd+K search icon tooltip + keyboard shortcut discovery | RENA-87 | — |
| 4 | Search quality feedback thumbs UI | RENA-87 | — |
| 5 | AI description first-time prompt banner + empty-state link | RENA-85 | — |
| 6 | Time-saved badge post-description save | RENA-85 | — |
| 7 | Quota gate modal (intercept 402 from `aiTokenBudgetMiddleware`) | RENA-82 + RENA-83 | — |
| 8 | Quota usage gauge in copilot sidebar | RENA-83 | — |
| 9 | PostHog events: all 22 new events across 4 funnels | RENA-90 | See event tables above |
| 10 | Register `smart_search_beta` + `ai_descriptions_beta` flags | Growth/Data | — |
| 11 | Nudge email templates (4 templates in ES) | RENA-89 | — |
| 12 | Beta feedback widget + Slack webhook to `#beta-ai-feedback` | Growth/Dev | — |
| 13 | Health score: add 2 AI signals to `analytics-refresh` worker | RENA-90 | Adjust existing weights |
| 14 | A/B test configuration in PostHog experiments | Growth | After PostHog setup |

### No new backend infra required
All events use existing `track()` wrapper from `@corredor/telemetry`. Quota intercept reuses `aiTokenBudgetMiddleware`. PostHog feature flags already wired via SDK.

---

## Exit Criteria

- [x] Onboarding flows designed (Sections 1–3)
- [x] Adoption metrics defined in PostHog — 22 new events across 4 funnels (Sections 1–4 event tables)
- [x] Feature flag rollout plan documented (Section 5)
- [ ] PostHog events instrumented in code → RENA-90
- [ ] Feature flags registered in PostHog → RENA-90
- [ ] Nudge email templates written → RENA-89
- [ ] UI discovery components built → RENA-83, RENA-85, RENA-87
