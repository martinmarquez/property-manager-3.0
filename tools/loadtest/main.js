/**
 * GA Load Test — entry point
 *
 * Delegates to the canonical 10k-VU scenario.
 *
 * Usage:
 *   BASE_URL=https://corredor-api-staging.fly.dev \
 *   API_TOKEN=<staging-load-test-token> \
 *   k6 run tools/loadtest/main.js
 *
 * Or via Docker Compose cluster (recommended for 10k VUs):
 *   BASE_URL=https://corredor-api-staging.fly.dev \
 *   API_TOKEN=<staging-load-test-token> \
 *   docker compose -f infra/k6/docker-compose.yml run --rm \
 *     -e BASE_URL="$BASE_URL" -e API_TOKEN="$API_TOKEN" \
 *     k6 run /scripts/load-10k.js
 *
 * GA acceptance criteria (RENA-199 / RENA-248):
 *   - 10,000 concurrent VUs
 *   - 1M listings in staging DB (seed: infra/k6/seed/seed.sql)
 *   - p95 latency < 500ms
 *   - error rate < 1%
 */

// Re-export everything from the canonical scenario so `k6 run tools/loadtest/main.js` works.
export { default, handleSummary, options } from '../../infra/k6/scenarios/load-10k.js';
