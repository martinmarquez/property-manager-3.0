# Corredor KPI Framework

**Version:** 1.0  
**Date:** 2026-04-20  
**Owner:** Data Analyst  
**Status:** Draft — pending CEO approval  
**Scope:** Phase G deliverable — 20+ business metrics powering the 10 strategic dashboards

---

## 1. Metric Taxonomy

Metrics are classified by **refresh cadence**, **audience**, and **alert threshold**. All metrics are scoped to `tenant_id` (RLS-enforced). Audience roles follow the RBAC hierarchy defined in the product spec.

| Refresh | Meaning |
|---|---|
| **Real-time** | Updated on every relevant domain event via WebSocket fan-out |
| **Hourly** | BullMQ cron job refreshes materialized view every 60 min |
| **Nightly** | BullMQ cron job at 02:00 ARS time |

---

## 2. Metric Definitions

### 2.1 Pipeline & Conversion

#### M-01 — Stage Conversion Rate (per stage)

| Field | Value |
|---|---|
| **Formula** | `leads_exiting_stage_as_won_or_advanced / leads_entering_stage × 100` |
| **Data sources** | `lead`, `lead_stage_history`, `pipeline_stage` |
| **Refresh** | Hourly |
| **Audience** | Agent (own pipeline), Manager (team), Owner/Admin (all) |
| **Alert** | Conversion on any stage drops > 15 pp vs prior 30-day rolling avg |

#### M-02 — Pipeline Velocity

| Field | Value |
|---|---|
| **Formula** | `(num_leads × avg_deal_value × avg_win_rate) / avg_days_in_pipeline` |
| **Data sources** | `lead`, `lead_stage_history`, `pipeline_stage` |
| **Refresh** | Nightly |
| **Audience** | Manager, Owner/Admin |
| **Alert** | Velocity drops > 20% vs prior 30-day window |

#### M-03 — Avg Days per Stage

| Field | Value |
|---|---|
| **Formula** | `AVG(exited_at - entered_at)` per `pipeline_stage_id` |
| **Data sources** | `lead_stage_history` |
| **Refresh** | Hourly |
| **Audience** | Manager, Owner/Admin |
| **Alert** | Avg days on any stage exceeds 2× the SLA configured in `pipeline_stage.sla_hours` |

#### M-04 — Win Rate

| Field | Value |
|---|---|
| **Formula** | `leads_closed_won / (leads_closed_won + leads_closed_lost) × 100` |
| **Data sources** | `lead` (status ∈ {won, lost}) |
| **Refresh** | Daily |
| **Audience** | Agent (own), Manager (team), Owner/Admin |
| **Alert** | Win rate drops below 20% over rolling 30 days |

#### M-05 — Open Pipeline Value

| Field | Value |
|---|---|
| **Formula** | `SUM(expected_value_amount × win_probability_by_stage)` |
| **Data sources** | `lead`, `pipeline_stage` (win_probability % per stage, configurable) |
| **Refresh** | Real-time (on lead create/update/stage-move) |
| **Audience** | Manager, Owner/Admin, CEO |
| **Alert** | Pipeline < 3× monthly revenue target |

---

### 2.2 Listing Performance

#### M-06 — Views per Listing

| Field | Value |
|---|---|
| **Formula** | `COUNT(portal_sync_job.views_count)` aggregated per `listing_id` per portal |
| **Data sources** | `portal_publication`, `portal_sync_job` |
| **Refresh** | Hourly (sync job pulls stats from portal APIs) |
| **Audience** | Agent (own listings), Manager, Owner/Admin |
| **Alert** | Listed > 14 days with views < 10 total across all portals |

#### M-07 — Inquiries per Listing

| Field | Value |
|---|---|
| **Formula** | `COUNT(portal_lead.id)` per `listing_id` |
| **Data sources** | `portal_lead`, `inquiry_match` |
| **Refresh** | Real-time (on portal_lead.created event) |
| **Audience** | Agent, Manager, Owner/Admin |
| **Alert** | 0 inquiries in first 7 days on market |

#### M-08 — Days on Market (DOM)

| Field | Value |
|---|---|
| **Formula** | `CURRENT_DATE - listing.listed_at` (active listings); `unlisted_at - listed_at` (closed) |
| **Data sources** | `listing` |
| **Refresh** | Nightly |
| **Audience** | Agent, Manager, Owner/Admin |
| **Alert** | DOM > 90 days for sale; DOM > 30 days for rental |

#### M-09 — Price Reduction Rate

| Field | Value |
|---|---|
| **Formula** | `(original_price - current_price) / original_price × 100` |
| **Data sources** | `property_price_history` |
| **Refresh** | Real-time (on price_changed event) |
| **Audience** | Agent, Manager, Owner/Admin |
| **Alert** | Price reduced > 10% within 30 days |

---

### 2.3 Agent Productivity

#### M-10 — Leads Handled per Agent

| Field | Value |
|---|---|
| **Formula** | `COUNT(lead.id) WHERE lead.owner_user_id = :agent AND lead.created_at >= period_start` |
| **Data sources** | `lead`, `user` |
| **Refresh** | Hourly |
| **Audience** | Agent (own), Manager (team), Owner/Admin |
| **Alert** | Agent handles 0 new leads in 7 consecutive days |

#### M-11 — Properties Listed per Agent

| Field | Value |
|---|---|
| **Formula** | `COUNT(listing.id) WHERE listing.created_by = :agent AND period` |
| **Data sources** | `listing`, `user` |
| **Refresh** | Daily |
| **Audience** | Agent (own), Manager, Owner/Admin |
| **Alert** | Agent has listed 0 new properties in 30 days |

#### M-12 — Closes per Agent

| Field | Value |
|---|---|
| **Formula** | `COUNT(lead.id WHERE status='won' AND owner_user_id=:agent AND period)` |
| **Data sources** | `lead` |
| **Refresh** | Real-time (on lead.marked_won event) |
| **Audience** | Agent (own), Manager, Owner/Admin, CEO |
| **Alert** | None (positive metric) |

#### M-13 — Response Time (first reply)

| Field | Value |
|---|---|
| **Formula** | `AVG(first_outbound_message.sent_at - thread.created_at)` per agent |
| **Data sources** | `inbox_thread`, `inbox_message` |
| **Refresh** | Hourly |
| **Audience** | Manager, Owner/Admin |
| **Alert** | Agent avg first-reply time > 2h during business hours |

---

### 2.4 Portal ROI

#### M-14 — Cost per Lead per Portal

| Field | Value |
|---|---|
| **Formula** | `portal_connection.monthly_cost_usd / COUNT(portal_lead.id WHERE portal_connection.portal_id = :portal AND period)` |
| **Data sources** | `portal_connection`, `portal_lead` |
| **Refresh** | Nightly |
| **Audience** | Manager, Owner/Admin, CEO |
| **Alert** | Cost per lead exceeds 3× the median across portals |

#### M-15 — Close Rate per Portal Source

| Field | Value |
|---|---|
| **Formula** | `COUNT(lead.id WHERE status='won' AND source LIKE 'portal:%portal') / COUNT(portal_lead.id WHERE portal=%portal) × 100` |
| **Data sources** | `portal_lead`, `lead`, `contact` |
| **Refresh** | Nightly |
| **Audience** | Manager, Owner/Admin, CEO |
| **Alert** | Portal close rate < 1% over 60-day rolling window |

---

### 2.5 Revenue & SaaS Metrics

#### M-16 — Monthly Recurring Revenue (MRR)

| Field | Value |
|---|---|
| **Formula** | `SUM(subscription.monthly_amount_usd WHERE status='active')` |
| **Data sources** | `subscription`, `plan` |
| **Refresh** | Real-time (on subscription create/update/cancel events) |
| **Audience** | CEO/Admin |
| **Alert** | MRR drops > 5% month-over-month |

#### M-17 — Customer Churn Rate

| Field | Value |
|---|---|
| **Formula** | `cancelled_subscriptions_in_period / subscriptions_at_period_start × 100` |
| **Data sources** | `subscription` |
| **Refresh** | Nightly |
| **Audience** | CEO/Admin |
| **Alert** | Monthly churn > 3% |

#### M-18 — Customer Lifetime Value (LTV)

| Field | Value |
|---|---|
| **Formula** | `ARPU / churn_rate` (ARPU = `total_MRR / active_tenant_count`) |
| **Data sources** | `subscription`, derived from M-16 and M-17 |
| **Refresh** | Nightly |
| **Audience** | CEO/Admin |
| **Alert** | LTV/CAC ratio drops below 3× |

---

### 2.6 Retention Cohorts

#### M-19 — Tenant Retention by Signup Cohort

| Field | Value |
|---|---|
| **Formula** | `COUNT(tenants_active_in_month_N) / COUNT(tenants_signed_up_in_cohort_month) × 100` |
| **Data sources** | `tenant`, `subscription` |
| **Refresh** | Nightly |
| **Audience** | CEO/Admin |
| **Alert** | Month-1 retention for any cohort < 70% |

---

### 2.7 Geo / Zone Demand

#### M-20 — Zone Demand Heatmap (inquiries by neighborhood)

| Field | Value |
|---|---|
| **Formula** | `COUNT(inquiry.id) GROUP BY neighborhood, locality` (filtered by active inquiries or portal_lead.source zone) |
| **Data sources** | `inquiry`, `portal_lead`, `property` (geom column) |
| **Refresh** | Hourly |
| **Audience** | Agent, Manager, Owner/Admin |
| **Alert** | Zone with 0 new inquiries in 30 days despite active listings |

---

### 2.8 AI Usage & Value

#### M-21 — AI Features Used (unique sessions)

| Field | Value |
|---|---|
| **Formula** | `COUNT(DISTINCT ai_conversation.id) per feature_type per period` |
| **Data sources** | `ai_conversation`, `ai_message`, `ai_tool_call` |
| **Refresh** | Daily |
| **Audience** | Owner/Admin, CEO |
| **Alert** | AI adoption < 30% of DAU after 30 days post-launch |

#### M-22 — Time Saved by AI (estimated)

| Field | Value |
|---|---|
| **Formula** | `COUNT(ai_tool_call where feature='description_generator') × 12_min + COUNT(summarizer_calls) × 20_min` (calibrated per feature) |
| **Data sources** | `ai_conversation`, `ai_tool_call` |
| **Refresh** | Nightly |
| **Audience** | Owner/Admin, CEO |
| **Alert** | None (positive metric; report only) |

---

### 2.9 SLA Adherence

#### M-23 — SLA Breach Rate

| Field | Value |
|---|---|
| **Formula** | `COUNT(sla_timer WHERE breached=true) / COUNT(sla_timer WHERE period) × 100` |
| **Data sources** | `sla_timer`, `sla_policy` |
| **Refresh** | Real-time (on sla_timer.breached event) |
| **Audience** | Manager, Owner/Admin |
| **Alert** | SLA breach rate > 10% over 24h window |

#### M-24 — Avg Inbox First Reply Time

| Field | Value |
|---|---|
| **Formula** | `AVG(first_outbound_message.sent_at - inbox_thread.created_at)` |
| **Data sources** | `inbox_thread`, `inbox_message` |
| **Refresh** | Hourly |
| **Audience** | Manager, Owner/Admin |
| **Alert** | Avg first-reply > 4h |

---

### 2.10 Commission

#### M-25 — Commission Owed (pending)

| Field | Value |
|---|---|
| **Formula** | `SUM(commission_split.amount WHERE status='pending')` |
| **Data sources** | `commission_split`, `lead` (won), `listing` |
| **Refresh** | Real-time (on lead.marked_won event) |
| **Audience** | Agent (own), Manager, Owner/Admin |
| **Alert** | Pending commission > 90 days without payment record |

#### M-26 — Commission Paid YTD

| Field | Value |
|---|---|
| **Formula** | `SUM(commission_split.amount WHERE status='paid' AND date >= start_of_year)` |
| **Data sources** | `commission_split` |
| **Refresh** | Nightly |
| **Audience** | Agent (own), Manager, Owner/Admin |
| **Alert** | None |

---

## 3. Alert Delivery

All alerts are delivered via:
1. **In-app notification** (WebSocket push to connected session)
2. **Email digest** (batched within the user's notification preference window)
3. **WhatsApp** (if configured by the tenant for critical alerts)

Alert thresholds in this document are defaults; tenants with `admin`+ role can override per-metric in `/settings/notifications`.

---

## 4. Metric to Dashboard Mapping

| Metric | Materialized View | Dashboard |
|---|---|---|
| M-01–M-04 | mv_pipeline_conversion | Funnel Conversion, Pipeline Velocity |
| M-05 | mv_revenue_forecast | Revenue Forecast |
| M-06–M-09 | mv_listing_performance | Listing Performance |
| M-10–M-13 | mv_agent_productivity | Agent Productivity Leaderboard |
| M-14–M-15 | mv_portal_roi | Portal ROI |
| M-16–M-18 | mv_revenue_forecast | Revenue Forecast |
| M-19 | mv_retention_cohort | Cohort Analysis, Churn/Retention |
| M-20 | mv_zone_heatmap | Market Share / Zone Analysis |
| M-21–M-22 | mv_ai_usage_value | AI Usage & Value |
| M-23–M-24 | mv_sla_adherence | (Panel widget + SLA report) |
| M-25–M-26 | mv_commission_owed | (Operational report) |

---

*Document last updated: 2026-04-20. Pending CEO sign-off before materialized view SQL implementation begins.*
