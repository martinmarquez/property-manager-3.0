# Corredor — Dashboard Wire Specifications

**Version:** 1.0  
**Date:** 2026-04-20  
**Owner:** Data Analyst  
**Status:** Draft — for handoff to UX/UI designer (Phase G)  
**Companion:** `docs/analytics/materialized-views-spec.md`

All dashboards are accessible under `/reports/:slug`. Default date range is the last 30 days; all dashboards support date-range picker, pipeline selector (where applicable), and branch/agent filters depending on the viewer's RBAC role.

**Performance target:** All dashboards render < 2 s at 100 k listings/tenant. SQL is served from the relevant materialized view; no on-demand aggregation on the dashboard query path.

---

## DB-01: Funnel Conversion

**Slug:** `/reports/funnel-conversion`  
**Materialized view:** `mv_pipeline_conversion`

### Filters
- Pipeline selector (all pipelines or single)
- Date range (month picker, default: last 3 months)
- Agent filter (own vs team vs all — RBAC-gated)
- Branch filter (multi-select)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Funnel diagram | Funnel chart | leads_entered per stage → waterfall from first to last stage |
| Stage conversion table | Table | stage_name, leads_entered, leads_exited, exit_rate_pct, avg_hours_in_stage |
| Win/Loss ratio | Donut chart | leads_won vs leads_lost |
| Avg time-to-close | KPI card | SUM(avg_hours_in_stage) across all stages for won leads |
| Top-performing stage | KPI card | Stage with highest exit_rate_pct |
| Monthly trend | Line chart | exit_rate_pct over cohort_month per stage (sparkline per stage row) |

### Expected load time
< 300 ms (index scan on `(tenant_id, pipeline_id, cohort_month)`)

### Notes for UX
- Funnel bars should show absolute counts + % conversion below each bar.
- Color-code stages: open = blue, won = green, lost = red.
- Click on a stage row → drill-through to `/leads/list?stage=:id`.

---

## DB-02: Agent Productivity Leaderboard

**Slug:** `/reports/agent-productivity`  
**Materialized view:** `mv_agent_productivity`

### Filters
- Month/quarter picker (default: current month)
- Branch filter
- Agent multi-select (managers see all; agents see only themselves)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Leaderboard table | Table | agent_name, leads_handled, leads_won, win_rate_pct, listings_created, avg_first_reply_min, visits_completed |
| Win rate bar chart | Horizontal bar | Agents sorted by win_rate_pct |
| Response time heatmap | Heatmap | avg_first_reply_min per agent per day-of-week |
| Closes trend | Line chart | leads_won per agent over last 6 months |
| Team summary KPIs | KPI card row | Total closes, total leads handled, team win rate, avg response time |

### Expected load time
< 200 ms (UNIQUE index scan on `(tenant_id, report_month)`)

### Notes for UX
- Show rank change badge (↑↓) vs prior month in leaderboard.
- Agent rows clickable → `/contacts/:agentId/activity`.
- Highlight the logged-in agent's own row regardless of sort order.

---

## DB-03: Listing Performance

**Slug:** `/reports/listing-performance`  
**Materialized view:** `mv_listing_performance`

### Filters
- Operation kind (sale / rent / all)
- Status (active / all)
- Neighborhood / locality multi-select
- Property type multi-select
- Agent filter
- Date range (listed_at)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Performance table | Table | property address, operation_kind, price, days_on_market, total_portal_views, total_portal_leads, price_reduction_pct |
| Views vs Leads scatter | Scatter chart | X = total_portal_views, Y = total_portal_leads, size = days_on_market |
| DOM distribution | Histogram | Bucket listings by days_on_market (0–15, 16–30, 31–60, 61–90, 90+) |
| Price reductions | Bar chart | Count of listings with price_reduction_pct ∈ {0, 1–5, 5–10, 10–20, 20+} |
| Top 10 by views | KPI table | Top 10 listing cards with photo thumbnail, views, leads |
| Avg DOM by type | Bar chart | avg(days_on_market) grouped by property_type |

### Expected load time
< 500 ms (index scan on `(tenant_id, agent_id, listing_status)`)

### Notes for UX
- Table row click → `/properties/:id` (listing detail, Analytics tab).
- Flag listings with DOM > 90 days and 0 price reduction with a warning badge.
- Export to CSV/XLSX button on the table.

---

## DB-04: Portal ROI

**Slug:** `/reports/portal-roi`  
**Materialized view:** `mv_portal_roi`

### Filters
- Date range (month selector, last 12 months default)
- Portal multi-select

### Widgets

| Widget | Type | Data |
|---|---|---|
| ROI comparison table | Table | portal_id, total_leads, total_closes, cost_per_lead_usd, close_rate_pct, cost_per_close_usd |
| Cost per lead bar | Bar chart | portal_id → cost_per_lead_usd, sorted ascending |
| Close rate bar | Bar chart | portal_id → close_rate_pct, sorted descending |
| Leads trend | Line chart | total_leads per portal per month, last 12 months |
| Total spend KPI | KPI card | SUM(monthly_cost_usd) across all portals, current month |
| Best portal badge | KPI card | Portal with lowest cost_per_close_usd |

### Expected load time
< 150 ms (small table, ~10 portals max)

### Notes for UX
- Portal logo icons in the table.
- Toggle between USD and ARS at spot rate (use `subscription.currency` setting).
- "Cost not set" warning if `portal_connection.monthly_cost_usd` is null.

---

## DB-05: Pipeline Velocity

**Slug:** `/reports/pipeline-velocity`  
**Materialized view:** `mv_pipeline_conversion`

### Filters
- Pipeline selector
- Date range (cohort_month picker)
- Agent / branch filter

### Widgets

| Widget | Type | Data |
|---|---|---|
| Velocity KPI | KPI card | `(num_leads × avg_deal_value × win_rate) / avg_days` — computed client-side |
| Stage time bar | Horizontal bar | avg_hours_in_stage per stage — waterfall |
| Velocity trend | Line chart | Velocity index per month (rolling calculation) |
| Bottleneck alert | Alert card | Stage with highest avg_hours_in_stage vs SLA |
| Open leads funnel | KPI card row | Count of leads currently in each stage |
| Win value forecast | KPI card | weighted_pipeline_usd (from mv_revenue_forecast) |

### Expected load time
< 300 ms

### Notes for UX
- Bottleneck card shows stage name, avg days, and configured SLA; red if breached.
- Velocity formula tooltip on hover (with plain-language explanation).

---

## DB-06: Revenue Forecast

**Slug:** `/reports/revenue-forecast`  
**Materialized view:** `mv_revenue_forecast`

### Filters
- Date range (read-only for current snapshot; historical trend from subscription events)
- Plan filter (Solo / Pro / Agencia / Enterprise)

> Note: This dashboard is CEO/Admin role only.

### Widgets

| Widget | Type | Data |
|---|---|---|
| MRR KPI | KPI card | mrr_usd + MoM change |
| ARR KPI | KPI card | arr_usd |
| Churn rate KPI | KPI card | monthly_churn_rate % + trend arrow |
| LTV KPI | KPI card | ltv_usd |
| Weighted pipeline | KPI card | weighted_pipeline_usd |
| 90-day forecast | KPI card | mrr + 30% of pipeline (configurable weight) |
| MRR trend | Line chart | MRR over last 12 months (from subscription events, not MV — direct query) |
| Plan distribution | Donut chart | Active subscriptions by plan |
| New vs churned | Grouped bar | New MRR vs churned MRR per month |

### Expected load time
< 100 ms (single row per tenant in mv_revenue_forecast)

### Notes for UX
- Currency in USD; show ARS equivalent at current spot rate in parentheses.
- LTV/CAC ratio shown only if CAC data is available (manual input via settings).
- MoM deltas color-coded: green > 0, red < 0.

---

## DB-07: Churn / Retention

**Slug:** `/reports/retention`  
**Materialized view:** `mv_retention_cohort`

> Note: This dashboard is CEO/Admin role only.

### Filters
- Cohort month range (default: last 12 cohorts)
- Max months-since-signup displayed (default: 12)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Retention cohort grid | Heatmap table | Rows = cohort_month, Cols = M0..M12; cell = retention_pct; color from green (100%) to red (0%) |
| Average retention curve | Line chart | AVG(retention_pct) per months_since_signup across cohorts |
| Month-1 retention KPI | KPI card | Latest cohort's M1 retention_pct + benchmark (70%) |
| Churned tenants this month | KPI card | COUNT of tenants with cancelled subscription this month |
| Re-engaged contacts | KPI card | COUNT of contacts (leads) re-entered pipeline after ≥ 90 days dormancy |

### Expected load time
< 400 ms (GROUP BY on `(cohort_month, months_since_signup)`)

### Notes for UX
- Heatmap cells clickable → `/settings/organization` (for CEO to drill into specific tenant if multi-org).
- Benchmark line overlay on retention curve (industry avg ~65% M1 for SaaS).

---

## DB-08: Market Share / Zone Analysis

**Slug:** `/reports/zone-analysis`  
**Materialized view:** `mv_zone_heatmap`

### Filters
- Date range (week picker, default: last 8 weeks)
- Province / locality / neighborhood cascade filter
- Operation kind filter

### Widgets

| Widget | Type | Data |
|---|---|---|
| Demand heatmap map | Map (MapLibre heatmap layer) | inquiry_count per lat/lng centroid of neighborhood |
| Top zones table | Table | neighborhood, locality, inquiry_count, active_listing_count, demand_supply_ratio |
| Demand trend | Line chart | total inquiry_count per week for top 5 zones |
| Demand/supply ratio bar | Bar chart | demand_supply_ratio per neighborhood, sorted desc |
| Opportunity zones | KPI card | Neighborhoods with DSR > 3× and < 5 active listings |

### Expected load time
< 600 ms (heatmap layer uses pre-aggregated MV; map tile rendering is client-side)

### Notes for UX
- Map layer opacity tied to inquiry_count (higher = darker).
- Table and map cross-filter: click zone on map → highlights row in table.
- "Opportunity zones" widget helps agents identify underserved areas to prospect.

---

## DB-09: AI Usage & Value

**Slug:** `/reports/ai-usage`  
**Materialized view:** `mv_ai_usage_value`

### Filters
- Month picker (default: current month)
- Feature type filter
- Branch / agent filter (managers only)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Feature adoption table | Table | feature_type, total_sessions, unique_users, estimated_time_saved_min, positive_feedback_pct |
| Total time saved KPI | KPI card | SUM(estimated_time_saved_min) formatted as hours |
| AI adoption rate | KPI card | unique_users / total_active_users × 100 |
| Sessions trend | Line chart | total_sessions per feature_type per month, last 6 months |
| Satisfaction bar | Bar chart | positive_feedback_pct per feature_type |
| Top features donut | Donut chart | Share of total_sessions per feature_type |

### Expected load time
< 150 ms

### Notes for UX
- "Time saved" headline in hours (e.g. "47 hours saved this month").
- Features with positive_feedback_pct < 60% shown in amber.
- Link from each feature row to the AI eval dashboard (internal, not tenant-facing).

---

## DB-10: Cohort Analysis (Leads by Acquisition Month)

**Slug:** `/reports/lead-cohorts`  
**Materialized view:** `mv_pipeline_conversion` + `mv_retention_cohort`

### Filters
- Acquisition month range (default: last 12 months)
- Pipeline selector
- Lead source filter (portal, web, import, manual)

### Widgets

| Widget | Type | Data |
|---|---|---|
| Lead cohort grid | Heatmap table | Rows = acquisition month, Cols = M0..M6; cell = conversion_rate_pct at that time elapsed |
| Avg time-to-close by cohort | Line chart | avg_hours_to_close per cohort_month |
| Leads per source stacked bar | Stacked bar | COUNT(leads) per source per month |
| Win rate by acquisition source | Bar chart | win_rate_pct grouped by lead.source |
| Best-converting cohort KPI | KPI card | cohort_month with highest M3 conversion |
| Time-to-win KPI | KPI card | AVG days from lead created to won, current period |

### Expected load time
< 400 ms

### Notes for UX
- Grid cells tooltip: "X leads entered this cohort, Y converted by month N."
- Source legend consistent with colors used in portal ROI dashboard (portal-branded colors).

---

## Common Dashboard Shell

All 10 dashboards share:

- **Top bar:** Date range picker, quick-select chips (7D / 30D / 90D / YTD / Custom)
- **Filter bar:** Contextual filters (pipeline, agent, branch, zone, etc.)
- **Export button:** CSV and XLSX download of all visible table data
- **Share link button:** Generates a signed URL valid 7 days (for sharing with owner/manager who may not be logged in)
- **Pin to Panel button:** Adds the dashboard card to the `/dashboard` home for the logged-in user
- **Scheduled digest toggle:** Per-dashboard email delivery settings (daily / weekly / disabled)
- **Refresh badge:** Shows `refreshed_at` timestamp from the MV; manual refresh button for admins

---

*Document last updated: 2026-04-20. Ready for UX/UI designer handoff for Phase G design.*
