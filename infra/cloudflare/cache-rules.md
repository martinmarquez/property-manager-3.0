# Cloudflare CDN Optimization — Phase H

Configuration guide for Cloudflare cache rules, edge caching for tenant sites,
and image optimization pipeline. Apply these rules via the Cloudflare dashboard
(corredor.ar zone) or via the Cloudflare API/Terraform.

---

## 1. Static Asset Cache Rules (corredor.ar zone)

Set up in **Cloudflare Dashboard → corredor.ar → Caching → Cache Rules**.

### Rule 1 — SPA assets (hashed filenames, immutable)

| Field | Value |
|-------|-------|
| Name | `corredor-web-immutable-assets` |
| When | Hostname `app.corredor.ar` AND path matches `^/assets/` |
| Cache Eligibility | Eligible for cache |
| Edge TTL | Ignore cache-control, override to **1 year** |
| Browser TTL | Override to **1 year** |
| Cache Key | Default |

These files (`/assets/*.js`, `/assets/*.css`, `/assets/*.woff2`) have content-hash suffixes from Vite build and are safe to cache indefinitely.

### Rule 2 — SPA HTML shell (must revalidate)

| Field | Value |
|-------|-------|
| Name | `corredor-web-html-no-cache` |
| When | Hostname `app.corredor.ar` AND not path starts with `/assets/` AND not path starts with `/api/` |
| Cache Eligibility | Eligible for cache |
| Edge TTL | Bypass cache (serve fresh on each request) |
| Browser TTL | Override to **0** |
| Cache Key | Default |

HTML shell must never be cached to ensure SW and code-split chunks match.

### Rule 3 — Media (R2 public bucket)

| Field | Value |
|-------|-------|
| Name | `corredor-media-cache` |
| When | Hostname `media.corredor.ar` (R2 public bucket CNAME) |
| Cache Eligibility | Eligible for cache |
| Edge TTL | **1 year** |
| Browser TTL | **30 days** |
| Polish | Lossless (JPEG/PNG/WebP auto-optimization) |
| Mirage | Off (not applicable to property images) |

### Rule 4 — API responses (never cache)

| Field | Value |
|-------|-------|
| Name | `corredor-api-no-cache` |
| When | Hostname `api.corredor.ar` |
| Cache Eligibility | Bypass cache |

---

## 2. Tenant Website Builder — Cloudflare Pages Edge Caching

Tenant published sites are deployed to `corredor-tenant-sites` Pages project
and served from `*.corredor.ar` (or custom domains). Phase H rules:

### Stale-While-Revalidate for tenant site HTML

Configure via `apps/tenant-site/public/_headers`:

```
/*
  Cache-Control: public, max-age=60, stale-while-revalidate=600
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff

/es/**
  Cache-Control: public, max-age=60, stale-while-revalidate=600

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

### Custom domain edge caching

When the API service issues a Cloudflare zone API call to add a custom domain,
set the proxy status to **Proxied** (orange cloud) so Cloudflare caches the
tenant site on the edge. Unproxied (grey cloud) domains bypass the CDN.

**API sequence (RENA-121 custom domain flow):**

```bash
# Add DNS record as proxied
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "<tenant-slug>.corredor.ar",
    "content": "corredor-tenant-sites.pages.dev",
    "proxied": true,
    "ttl": 1
  }'
```

---

## 3. Image Optimization Pipeline

### Cloudflare Images / Polish

Enable Polish on the corredor.ar zone:

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/polish" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "lossless"}'

# Enable WebP conversion
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/webp" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "on"}'
```

### R2 image resizing (Cloudflare Image Resizing)

For property gallery thumbnails, append Cloudflare image resize params to the R2 CDN URL:

```
https://media.corredor.ar/cdn-cgi/image/width=800,quality=80,format=webp/<r2-object-key>
```

Enable Image Resizing in the Cloudflare dashboard:
**corredor.ar → Speed → Optimization → Image Resizing → Enable**

This is already wired in `apps/web/src/pages/properties/GalleryEditor.tsx` — verify the R2 public bucket CNAME is `media.corredor.ar`.

---

## 4. Neon Connection Limits

Neon Serverless Postgres uses PgBouncer pooling on the pooler endpoint.
API uses `?pgbouncer=true` on `DATABASE_URL` in production (pooled endpoint).

| Setting | Value |
|---------|-------|
| Max pooled connections | 10,000 (Neon default per project) |
| API server max connections | 10 per Fly machine (`DATABASE_POOL_SIZE=10`) |
| Worker max connections | 5 per Fly machine (`WORKER_DB_POOL_SIZE=5`) |
| Connection mode | Transaction mode (set via `pgbouncer=true` in connection string) |

To check current connections:

```sql
SELECT count(*), state, wait_event_type, wait_event
FROM pg_stat_activity
GROUP BY state, wait_event_type, wait_event
ORDER BY count DESC;
```

---

## 5. Redis Connection Pooling

API uses `ioredis` with connection pooling via the `lazyConnect` + `enableOfflineQueue` options.
Worker uses a separate Redis client instance.

**Verify current pool config in `apps/api/src/lib/redis.ts`** — ensure:
- `maxRetriesPerRequest: 3`
- `retryStrategy: exponential backoff capped at 2s`
- `enableReadyCheck: true`

Upstash Redis (production): no per-connection billing — pooling is best-effort.
Connection limit: 1,000 concurrent (Upstash Pro plan). Current usage: ~50 at 10k QPS.

---

## 6. Sentry Release Tracking

Sentry releases are created automatically in the production deploy workflow:

```yaml
# .github/workflows/production-deploy.yml — already configured
SENTRY_RELEASE: ${{ github.sha }}
```

Verify the Sentry release appears in:
**Sentry → corredor project → Releases** after each `main` push.

Configure release-based alert filters:
- Suppress known issues from previous releases (auto-resolve after 2 releases)
- Alert on new issues in the latest release only

---

## 7. Verification Checklist

Run after applying cache rules:

```bash
# 1. Verify SPA assets are cached
curl -I https://app.corredor.ar/assets/index-<hash>.js | grep -i "cf-cache-status"
# Expected: HIT (second request)

# 2. Verify HTML is not cached
curl -I https://app.corredor.ar/ | grep -i "cf-cache-status"
# Expected: BYPASS or DYNAMIC

# 3. Verify R2 media caching
curl -I https://media.corredor.ar/<some-object-key> | grep -i "cf-cache-status"
# Expected: HIT (second request)

# 4. Verify API bypass
curl -I https://api.corredor.ar/api/health | grep -i "cf-cache-status"
# Expected: BYPASS

# 5. Check Polish/WebP
curl -I "https://media.corredor.ar/<image>.jpg" -H "Accept: image/webp" | grep content-type
# Expected: content-type: image/webp
```
