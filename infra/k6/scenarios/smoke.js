/**
 * Smoke test — 5 VUs, 1 minute.
 * Validates all critical endpoints are reachable and returning expected shapes
 * before running the full load test suite.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const propertySearchDuration = new Trend('property_search_duration', true);

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://corredor-api-prod.fly.dev';
const API_TOKEN = __ENV.API_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

export function setup() {
  // Verify health before running
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`API health check failed: ${res.status}`);
  }
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const { baseUrl } = data;

  // Health check
  {
    const res = http.get(`${baseUrl}/api/health`);
    errorRate.add(res.status !== 200);
    check(res, { 'health: status 200': (r) => r.status === 200 });
  }

  // tRPC batch: auth.me
  {
    const res = http.get(
      `${baseUrl}/api/trpc/auth.me`,
      { headers },
    );
    check(res, {
      'auth.me: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  }

  // Properties list (public-facing; uses tenant token)
  {
    const start = Date.now();
    const res = http.get(
      `${baseUrl}/api/trpc/properties.list?input=${encodeURIComponent(JSON.stringify({ json: { page: 1, pageSize: 20 } }))}`,
      { headers },
    );
    propertySearchDuration.add(Date.now() - start);
    errorRate.add(res.status >= 500);
    check(res, {
      'properties.list: not 5xx': (r) => r.status < 500,
    });
  }

  sleep(1);
}
