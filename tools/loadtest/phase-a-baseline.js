/**
 * Phase A Baseline Load Test
 *
 * Scenario : 50 concurrent virtual users, 5-minute ramp, hitting GET /health
 * Run      : k6 run tools/loadtest/phase-a-baseline.js
 *            BASE_URL=https://corredor-api.fly.dev k6 run tools/loadtest/phase-a-baseline.js
 *
 * Pass criteria:
 *   - p95 response time < 500 ms
 *   - Error rate < 1 %
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time_ms', true);

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp up to 10 VUs
    { duration: '1m', target: 25 },   // ramp up to 25 VUs
    { duration: '2m', target: 50 },   // ramp up to 50 VUs
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // p95 < 500 ms
    errors: ['rate<0.01'],             // error rate < 1%
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'body contains ok': (r) => r.body.includes('"ok"'),
  });

  errorRate.add(!ok);
  responseTime.add(res.timings.duration);

  sleep(0.5);
}
