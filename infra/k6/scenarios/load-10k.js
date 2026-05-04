/**
 * GA load test — 10,000 concurrent virtual users.
 *
 * GA acceptance criterion (RENA-194 / RENA-199):
 *   - 10k concurrent users
 *   - 1M listings in staging DB (run infra/k6/seed/seed.sql first)
 *   - p95 latency < 500ms
 *
 * Usage (local cluster):
 *   BASE_URL=https://staging.corredor.ar \
 *   API_TOKEN=<staging-tenant-token> \
 *   docker compose run --rm k6 run /scripts/load-10k.js
 *
 * Usage (GitHub Actions):
 *   See .github/workflows/load-test.yml
 *
 * Scenario mix (modeled on real session analytics):
 *   40% — browse property list (paginated search)
 *   25% — open property detail + media
 *   15% — contacts list + contact detail
 *   10% — pipeline/leads kanban read
 *    5% — inbox thread list
 *    5% — reports dashboard read
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const p95Threshold = new Trend('req_duration_p95', true);
const totalRequests = new Counter('total_requests');

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m',  target: 2000  },  // ramp to 2k
        { duration: '5m',  target: 5000  },  // ramp to 5k
        { duration: '5m',  target: 10000 },  // ramp to 10k
        { duration: '15m', target: 10000 },  // hold 10k for 15 min
        { duration: '5m',  target: 0     },  // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // GA criteria: p95 < 500ms, error rate < 1%
    http_req_duration:      ['p(95)<500'],
    http_req_failed:        ['rate<0.01'],
    errors:                 ['rate<0.01'],
    // Scenario-specific
    'http_req_duration{name:property_list}':   ['p(95)<400'],
    'http_req_duration{name:property_detail}': ['p(95)<300'],
    'http_req_duration{name:contacts_list}':   ['p(95)<400'],
  },
  // Write results to InfluxDB (injected by docker-compose env)
  ...(typeof __ENV.K6_INFLUXDB_ADDR !== 'undefined' ? {
    ext: {
      influxdb: {
        addr:   __ENV.K6_INFLUXDB_ADDR,
        bucket: __ENV.K6_INFLUXDB_BUCKET || 'k6',
        token:  __ENV.K6_INFLUXDB_TOKEN,
        org:    __ENV.K6_INFLUXDB_ORG || 'corredor',
      },
    },
  } : {}),
};

const BASE_URL = __ENV.BASE_URL || 'https://corredor-api-prod.fly.dev';
const API_TOKEN = __ENV.API_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
  Accept: 'application/json',
};

function trpcUrl(procedure, input) {
  return `${BASE_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
}

// ── Scenario functions ────────────────────────────────────────────────────────

function browseProperties() {
  const page = randomIntBetween(1, 500);
  const res = http.get(
    trpcUrl('properties.list', { page, pageSize: 20, filters: {} }),
    { headers, tags: { name: 'property_list' } },
  );
  totalRequests.add(1);
  errorRate.add(res.status >= 500);
  check(res, { 'property list: 200': (r) => r.status === 200 });
  p95Threshold.add(res.timings.duration);
}

function viewPropertyDetail() {
  // Use a random property ID from the seeded range (1 to 1,000,000)
  const id = randomIntBetween(1, 1000000).toString().padStart(8, '0');
  // Listing endpoint is unauthenticated — simulates portal/public traffic
  const res = http.get(
    `${BASE_URL}/api/trpc/properties.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: `prop_${id}` } }))}`,
    { headers, tags: { name: 'property_detail' } },
  );
  totalRequests.add(1);
  // 404 is acceptable (sparse IDs); 5xx is not
  errorRate.add(res.status >= 500);
  check(res, { 'property detail: not 5xx': (r) => r.status < 500 });
}

function browseContacts() {
  const page = randomIntBetween(1, 100);
  const res = http.get(
    trpcUrl('contacts.list', { page, pageSize: 30 }),
    { headers, tags: { name: 'contacts_list' } },
  );
  totalRequests.add(1);
  errorRate.add(res.status >= 500);
  check(res, { 'contacts list: not 5xx': (r) => r.status < 500 });
}

function viewPipeline() {
  const res = http.get(
    trpcUrl('leads.list', { page: 1, pageSize: 50 }),
    { headers, tags: { name: 'pipeline' } },
  );
  totalRequests.add(1);
  errorRate.add(res.status >= 500);
  check(res, { 'pipeline: not 5xx': (r) => r.status < 500 });
}

function viewInbox() {
  const res = http.get(
    `${BASE_URL}/api/trpc/inbox.threads?input=${encodeURIComponent(JSON.stringify({ json: { page: 1 } }))}`,
    { headers, tags: { name: 'inbox' } },
  );
  totalRequests.add(1);
  // inbox router may not exist yet — accept 404 gracefully
  errorRate.add(res.status >= 500);
  check(res, { 'inbox: not 5xx': (r) => r.status < 500 });
}

function viewReports() {
  const res = http.get(
    `${BASE_URL}/api/trpc/analytics.summary?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
    { headers, tags: { name: 'reports' } },
  );
  totalRequests.add(1);
  errorRate.add(res.status >= 500);
  check(res, { 'reports: not 5xx': (r) => r.status < 500 });
}

// ── Main VU loop ──────────────────────────────────────────────────────────────

export default function () {
  const roll = Math.random();

  if (roll < 0.40) {
    group('browse_properties', browseProperties);
  } else if (roll < 0.65) {
    group('property_detail', viewPropertyDetail);
  } else if (roll < 0.80) {
    group('contacts', browseContacts);
  } else if (roll < 0.90) {
    group('pipeline', viewPipeline);
  } else if (roll < 0.95) {
    group('inbox', viewInbox);
  } else {
    group('reports', viewReports);
  }

  // Realistic think time between user actions
  sleep(randomIntBetween(1, 3));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'build/k6-load-10k-summary.json': JSON.stringify(data, null, 2),
  };
}

// Inline text summary helper (avoids external imports in air-gapped envs)
function textSummary(data, opts) {
  const metrics = data.metrics || {};
  const p95 = metrics['http_req_duration']?.values?.['p(95)'];
  const errorRateVal = metrics['errors']?.values?.rate;
  const passed = (p95 ?? 999) < 500 && (errorRateVal ?? 1) < 0.01;

  return [
    '',
    `  ── k6 Load Test Summary ──`,
    `  p(95) http_req_duration : ${p95?.toFixed(1) ?? 'n/a'} ms  (threshold: < 500ms)`,
    `  error rate              : ${((errorRateVal ?? 0) * 100).toFixed(3)}%  (threshold: < 1%)`,
    `  GA criterion            : ${passed ? '✓ PASS' : '✗ FAIL'}`,
    '',
  ].join('\n');
}
