/**
 * Reports timing test -- 10 VUs, 2 minutes.
 *
 * GA acceptance criterion (RENA-199):
 *   - All 22 report views must render under 2 seconds (p95 < 2000ms)
 *   - Error rate < 1%
 *
 * Covers:
 *   11 Materialized View reports    (reports.data.get)
 *    5 Analytics endpoints          (dedicated tRPC procedures)
 *    6 KPI Timeseries views         (analytics.kpiTimeseries)
 *
 * Usage (local):
 *   BASE_URL=https://staging.corredor.ar \
 *   API_TOKEN=<staging-tenant-token> \
 *   k6 run infra/k6/scenarios/reports-timing.js
 *
 * Usage (docker):
 *   BASE_URL=https://staging.corredor.ar \
 *   API_TOKEN=<staging-tenant-token> \
 *   docker compose run --rm k6 run /scripts/reports-timing.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ───────────────────────────────────────────────────────────

const errorRate = new Rate('errors');
const totalRequests = new Counter('total_requests');

// Per-category duration trends
const mvReportDuration = new Trend('mv_report_duration', true);
const analyticsDuration = new Trend('analytics_duration', true);
const kpiTimeseriesDuration = new Trend('kpi_timeseries_duration', true);

// Per-view duration trends (all 22)
const viewDurations = {
  // MV Reports
  pipeline_conversion:   new Trend('view_pipeline_conversion', true),
  listing_performance:   new Trend('view_listing_performance', true),
  agent_productivity:    new Trend('view_agent_productivity', true),
  portal_roi:            new Trend('view_portal_roi', true),
  revenue_forecast:      new Trend('view_revenue_forecast', true),
  retention_cohort:      new Trend('view_retention_cohort', true),
  zone_heatmap:          new Trend('view_zone_heatmap', true),
  ai_usage_value:        new Trend('view_ai_usage_value', true),
  sla_adherence:         new Trend('view_sla_adherence', true),
  commission_owed:       new Trend('view_commission_owed', true),
  billing_metrics:       new Trend('view_billing_metrics', true),
  // Analytics
  billing_dashboard:     new Trend('view_billing_dashboard', true),
  plan_distribution:     new Trend('view_plan_distribution', true),
  appraisal_usage:       new Trend('view_appraisal_usage', true),
  report_adoption:       new Trend('view_report_adoption', true),
  site_metrics:          new Trend('view_site_metrics', true),
  // KPI Timeseries
  active_properties_count:       new Trend('view_active_properties_count', true),
  leads_created_count:           new Trend('view_leads_created_count', true),
  lead_conversion_rate:          new Trend('view_lead_conversion_rate', true),
  avg_days_to_close:             new Trend('view_avg_days_to_close', true),
  inbox_messages_received_count: new Trend('view_inbox_messages_received_count', true),
  billing_mrr_amount:            new Trend('view_billing_mrr_amount', true),
};

// ── View definitions ─────────────────────────────────────────────────────────

const MV_REPORT_SLUGS = [
  'pipeline_conversion',
  'listing_performance',
  'agent_productivity',
  'portal_roi',
  'revenue_forecast',
  'retention_cohort',
  'zone_heatmap',
  'ai_usage_value',
  'sla_adherence',
  'commission_owed',
  'billing_metrics',
];

const ANALYTICS_ENDPOINTS = [
  { procedure: 'analytics.billing.dashboard',     input: {},           key: 'billing_dashboard' },
  { procedure: 'analytics.billing.planDistribution', input: {},        key: 'plan_distribution' },
  { procedure: 'analytics.appraisal.usage',        input: { days: 30 }, key: 'appraisal_usage' },
  { procedure: 'analytics.report.adoption',        input: { days: 30 }, key: 'report_adoption' },
  { procedure: 'analytics.site.metrics',           input: { days: 30 }, key: 'site_metrics' },
];

const KPI_METRIC_KEYS = [
  'active_properties_count',
  'leads_created_count',
  'lead_conversion_rate',
  'avg_days_to_close',
  'inbox_messages_received_count',
  'billing_mrr_amount',
];

// ── Thresholds ───────────────────────────────────────────────────────────────

// Build per-view thresholds: every view must be p95 < 2000ms
const perViewThresholds = {};
for (const slug of MV_REPORT_SLUGS) {
  perViewThresholds[`http_req_duration{name:mv_${slug}}`] = ['p(95)<2000'];
}
for (const ep of ANALYTICS_ENDPOINTS) {
  perViewThresholds[`http_req_duration{name:analytics_${ep.key}}`] = ['p(95)<2000'];
}
for (const mk of KPI_METRIC_KEYS) {
  perViewThresholds[`http_req_duration{name:kpi_${mk}}`] = ['p(95)<2000'];
}

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    errors:            ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    mv_report_duration:      ['p(95)<2000'],
    analytics_duration:      ['p(95)<2000'],
    kpi_timeseries_duration: ['p(95)<2000'],
    ...perViewThresholds,
  },
};

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://corredor-api-prod.fly.dev';
const API_TOKEN = __ENV.API_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
  Accept: 'application/json',
};

function trpcUrl(procedure, input) {
  return `${BASE_URL}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`;
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API health check failed: ${res.status}`);
  }
  return { baseUrl: BASE_URL };
}

// ── Main VU loop ─────────────────────────────────────────────────────────────

export default function () {
  // Each VU iterates through all 22 views sequentially in one iteration.

  // ── MV Reports (11) ──────────────────────────────────────────────────────
  group('MV Reports', function () {
    for (const slug of MV_REPORT_SLUGS) {
      const tagName = `mv_${slug}`;
      const res = http.get(
        trpcUrl('reports.data.get', { slug }),
        { headers, tags: { name: tagName } },
      );
      totalRequests.add(1);
      errorRate.add(res.status !== 200);
      mvReportDuration.add(res.timings.duration);
      viewDurations[slug].add(res.timings.duration);
      check(res, {
        [`${tagName}: status 200`]: (r) => r.status === 200,
      });
    }
  });

  sleep(0.5);

  // ── Analytics endpoints (5) ──────────────────────────────────────────────
  group('Analytics', function () {
    for (const ep of ANALYTICS_ENDPOINTS) {
      const tagName = `analytics_${ep.key}`;
      const res = http.get(
        trpcUrl(ep.procedure, ep.input),
        { headers, tags: { name: tagName } },
      );
      totalRequests.add(1);
      errorRate.add(res.status !== 200);
      analyticsDuration.add(res.timings.duration);
      viewDurations[ep.key].add(res.timings.duration);
      check(res, {
        [`${tagName}: status 200`]: (r) => r.status === 200,
      });
    }
  });

  sleep(0.5);

  // ── KPI Timeseries (6) ───────────────────────────────────────────────────
  group('KPI Timeseries', function () {
    for (const metricKey of KPI_METRIC_KEYS) {
      const tagName = `kpi_${metricKey}`;
      const res = http.get(
        trpcUrl('analytics.kpiTimeseries', { metric: metricKey, days: 30 }),
        { headers, tags: { name: tagName } },
      );
      totalRequests.add(1);
      errorRate.add(res.status !== 200);
      kpiTimeseriesDuration.add(res.timings.duration);
      viewDurations[metricKey].add(res.timings.duration);
      check(res, {
        [`${tagName}: status 200`]: (r) => r.status === 200,
      });
    }
  });

  sleep(1);
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'build/k6-reports-timing-summary.json': JSON.stringify(data, null, 2),
  };
}

// Inline text summary helper (avoids external imports in air-gapped envs)
function textSummary(data, opts) {
  const metrics = data.metrics || {};
  const errorRateVal = metrics['errors']?.values?.rate;
  const overallP95 = metrics['http_req_duration']?.values?.['p(95)'];

  // Collect per-view p95 results
  const allViews = [
    ...MV_REPORT_SLUGS.map((s) => ({ label: `mv_${s}`, key: `view_${s}` })),
    ...ANALYTICS_ENDPOINTS.map((ep) => ({ label: `analytics_${ep.key}`, key: `view_${ep.key}` })),
    ...KPI_METRIC_KEYS.map((mk) => ({ label: `kpi_${mk}`, key: `view_${mk}` })),
  ];

  const lines = [
    '',
    '  ── k6 Reports Timing Summary ──',
    '',
    `  overall p(95)  : ${overallP95?.toFixed(1) ?? 'n/a'} ms  (threshold: < 2000ms)`,
    `  error rate     : ${((errorRateVal ?? 0) * 100).toFixed(3)}%  (threshold: < 1%)`,
    '',
    '  ── Per-View p(95) ──',
    '',
  ];

  let allPassed = true;
  let passCount = 0;
  let failCount = 0;

  for (const view of allViews) {
    const p95 = metrics[view.key]?.values?.['p(95)'];
    const passed = p95 !== undefined && p95 < 2000;
    if (passed) {
      passCount++;
    } else {
      failCount++;
      allPassed = false;
    }
    const status = p95 === undefined ? '? (no data)' : passed ? 'PASS' : 'FAIL';
    const value = p95 !== undefined ? `${p95.toFixed(1)} ms` : 'n/a';
    lines.push(`    ${view.label.padEnd(40)} ${value.padStart(10)}  ${status}`);
  }

  const overallStatus = allPassed && (errorRateVal ?? 1) < 0.01 ? 'PASS' : 'FAIL';

  lines.push('');
  lines.push(`  ── Result: ${passCount}/22 views under 2s p95 ──`);
  lines.push(`  GA criterion : ${overallStatus === 'PASS' ? 'PASS' : 'FAIL'}  (${passCount} passed, ${failCount} failed)`);
  lines.push('');

  return lines.join('\n');
}
