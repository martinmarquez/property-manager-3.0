# Rate Limiting Architecture — Corredor CRM

> **Updated:** 2026-04-20  
> **Owner:** Security Engineer  
> **Implementation:** `packages/core/src/rate-limit.ts`

---

## Overview

Corredor uses a **Redis token bucket** algorithm for rate limiting. Each endpoint class has a distinct bucket configuration. Limits are enforced at the API server layer before any business logic executes.

Rate limiting serves two purposes:
1. **Security:** prevent credential stuffing, scraping, and API abuse
2. **Cost control:** prevent AI endpoint cost DoS and per-tenant quota enforcement

---

## Rate Limit Tiers

### Auth Endpoints (`/auth/*`)

| Endpoint | Limit | Window | Key | Notes |
|----------|-------|--------|-----|-------|
| `POST /auth/login` | 10 req | per minute | per IP | Brute force protection |
| `POST /auth/register` | 5 req | per minute | per IP | Spam registration |
| `POST /auth/forgot-password` | 3 req | per minute | per IP | Enumeration protection |
| `POST /auth/reset-password` | 3 req | per minute | per token | Prevent token brute-force |
| `POST /auth/totp/verify` | 10 req | per minute | per session | TOTP brute-force protection |
| `POST /auth/webauthn/*` | 20 req | per minute | per session | WebAuthn ceremonies |

Auth limits are the strictest in the system. Exceeding them returns `429 Too Many Requests` with `Retry-After` header.

### API Read Endpoints (`GET /api/*`)

| Actor | Limit | Window |
|-------|-------|--------|
| Authenticated user | 120 req | per minute |
| Unauthenticated (public API) | 60 req | per minute |
| Service account / API key | 1,000 req | per minute |

Key: `{tenantId}:{userId}` for authenticated; `{ip}` for unauthenticated.

### API Write Endpoints (`POST/PUT/PATCH/DELETE /api/*`)

| Actor | Limit | Window |
|-------|-------|--------|
| Authenticated user | 30 req | per minute |
| Unauthenticated | 10 req | per minute |
| Service account / API key | 300 req | per minute |

### AI / LLM Endpoints (`/api/ai/*`)

AI endpoints have two enforcement layers:

**Layer 1: Request rate limiting (per user)**

| Limit | Window |
|-------|--------|
| 20 req | per minute |
| 200 req | per hour |

**Layer 2: Token budget enforcement (per tenant, per month)**

| Plan | Monthly Token Budget | Overage |
|------|---------------------|---------|
| Starter | 100,000 tokens | Block (upgrade prompt) |
| Professional | 1,000,000 tokens | Block (upgrade prompt) |
| Enterprise | Configurable | Alert at 80%, block at 100% |

Token budget is tracked in Redis and persisted to Postgres at end-of-day. The API checks Redis budget before forwarding to Anthropic.

### Webhook Ingestion (`/webhooks/*`)

| Source | Limit | Window |
|--------|-------|--------|
| Portal webhook (per portal) | 100 req | per minute |
| Stripe webhook | 500 req | per minute |
| Mercado Pago webhook | 500 req | per minute |
| AFIP callbacks | 50 req | per minute |

Webhook deduplication: each webhook payload is hashed and stored in Redis with 24-hour TTL. Duplicate payloads return `200 OK` immediately (idempotent).

### Admin Endpoints (`/admin/*`)

| Limit | Window | Notes |
|-------|--------|-------|
| 60 req | per minute | Admin users only; IP allowlist enforced separately |

---

## Algorithm: Token Bucket

The token bucket algorithm is chosen over fixed-window rate limiting because it:
1. Allows short bursts (better UX for bursty-but-fair usage)
2. Smooths traffic over time (no cliff-edge resets)
3. Is efficient with Redis (single atomic operation per request)

### How It Works

Each rate limit "bucket" for a key has:
- `tokens` — current available tokens (float)
- `last_refill` — Unix timestamp of last token addition

On each request:
1. Calculate time elapsed since last refill
2. Add `elapsed × rate` tokens (capped at `capacity`)
3. If `tokens >= 1.0`: consume one token, allow request
4. If `tokens < 1.0`: reject request with `429`

This is implemented as an atomic Lua script in Redis to prevent race conditions.

### Redis Key Schema

```
ratelimit:{scope}:{identifier}
```

Examples:
- `ratelimit:auth_login:ip:203.0.113.42`
- `ratelimit:api_read:user:tenant-uuid:user-uuid`
- `ratelimit:ai:tenant:tenant-uuid`
- `ratelimit:webhook:zonaprop:portal-id`

Keys expire automatically at `TTL = ceil(capacity / rate) * 2` seconds.

---

## Response Headers

All rate-limited endpoints return standard headers:

```http
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1745193600
Retry-After: 23          (only on 429 responses)
```

The `Retry-After` value is seconds until the bucket refills enough to allow a request.

---

## Cloudflare WAF Integration

Cloudflare WAF provides the first line of defense for volumetric attacks:

1. **DDoS protection:** automatic; Cloudflare absorbs volumetric floods before they reach Fly.io
2. **Bot management:** Cloudflare Bot Fight Mode enabled
3. **IP reputation:** Cloudflare blocks known malicious IPs
4. **Geographic restrictions:** Argentina + LATAM primary; configurable by-tenant

The application-level rate limiter (Redis token bucket) is the second line of defense for authenticated abuse scenarios that bypass Cloudflare.

---

## Implementation Reference

See `packages/core/src/rate-limit.ts` for the Hono middleware implementation.

Usage in `apps/api/src/index.ts`:

```typescript
import { rateLimiter, RateLimitPresets } from "@corredor/core/rate-limit";

const app = new Hono();

// Auth endpoints — strictest limits
app.use("/auth/login", rateLimiter(RateLimitPresets.AUTH_LOGIN));
app.use("/auth/register", rateLimiter(RateLimitPresets.AUTH_REGISTER));

// API reads — per-user limits
app.use("/api/*", rateLimiter(RateLimitPresets.API_READ));

// AI endpoints — with tenant budget enforcement
app.use("/api/ai/*", rateLimiter(RateLimitPresets.AI_REQUESTS));
```

---

## Monitoring and Alerts

Rate limit metrics exported via OpenTelemetry:

| Metric | Alert Threshold |
|--------|----------------|
| `rate_limit.rejected` (auth) | > 100/min → PagerDuty alert (potential attack) |
| `rate_limit.rejected` (any) | > 1000/min → Slack alert |
| `ai.tokens.budget_pct` | > 80% → notify tenant; > 100% → block + notify |

Dashboard: Grafana Cloud → Corredor → Rate Limits panel.

---

## Tuning Notes

- Auth limits are intentionally low. Legitimate users hit them rarely. An app doing 10 login attempts per minute per IP is suspicious.
- If the API_READ limit causes issues for a specific integration (e.g., data migration), issue a temporary service account API key with elevated limits rather than raising the global limit.
- AI token budgets are soft until the billing module is live. Until then, track usage and alert — don't hard-block.
