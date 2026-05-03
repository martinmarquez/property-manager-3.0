# Portal Outage Runbook

Covers: Corredor web portal (`corredor-web`), admin panel (`corredor-admin`), and tenant sites (`corredor-tenant-sites`) experiencing sync failures, blank screens, or data staleness.

---

## 1. Detecting Portal Outage

### Automated signals

| Signal | Source | What it means |
|--------|--------|---------------|
| Sentry `ChunkLoadError` / `NetworkError` spike | Sentry → `corredor-web` project | CDN or API is unreachable from browsers |
| API health check failing | Fly.io health monitor | Backend is down |
| BullMQ jobs in `waiting` / `failed` | Worker logs | Async sync tasks not processing |
| Nightly regression failures | GitHub Actions → `nightly-regression.yml` | E2E broken on production |
| Customer support tickets spike | Support inbox | Users can't log in / see data |

### Manual checks

```bash
# 1. Check API health
curl -s https://api.corredor.ar/health | jq .

# 2. Check Fly machine status
flyctl status --app corredor-api-prod
flyctl status --app corredor-worker-prod

# 3. Tail live API logs
flyctl logs --app corredor-api-prod --tail

# 4. Check Neon database connectivity
psql $DATABASE_URL -c "SELECT NOW();"
```

---

## 2. Decision Tree

```
Web portal unreachable or blank?
  ├─ YES: Check Cloudflare Pages status (cloudflarestatus.com)
  │         └─ CF incident? → Follow CF status page, no action needed
  │         └─ CF healthy?  → Check API (Section 3)
  │
  └─ NO: Portal loads but data is stale / missing?
            └─ YES: Check BullMQ worker (Section 4)
            └─ NO:  Intermittent errors?
                      └─ Check API error rate in Sentry
                      └─ Check Fly machine count (scale up if overloaded)
```

---

## 3. API Down — Investigation and Recovery

```bash
# Check which machines are unhealthy
flyctl status --app corredor-api-prod

# Check recent logs for errors
flyctl logs --app corredor-api-prod --tail --lines 200

# Check if OOM or crash
flyctl events --app corredor-api-prod

# Restart all machines (soft restart, no downtime)
flyctl machines restart --app corredor-api-prod

# Scale up if traffic spike
flyctl scale count 4 --app corredor-api-prod
```

If restarting doesn't help → roll back to previous image: see [rollback.md](rollback.md).

---

## 4. Portal Data Sync Failures — Worker Investigation

The worker processes background jobs (BullMQ queues on Redis). Data sync failures typically mean jobs are failing silently or Redis is unreachable.

```bash
# Tail worker logs
flyctl logs --app corredor-worker-prod --tail --lines 200

# Check Redis connectivity
redis-cli -u $REDIS_URL ping

# Check queue depths via Bull Board (admin UI)
# → https://api.corredor.ar/admin/queues (requires admin auth)
```

### Manual job retry

If jobs are stuck in `failed` state:

```bash
# Via Bull Board admin UI → select queue → select failed jobs → Retry All

# OR via Redis CLI (inspect failed jobs)
redis-cli -u $REDIS_URL
> LLEN bull:<queue-name>:failed
> LRANGE bull:<queue-name>:failed 0 10
```

### Manual data re-sync trigger

```bash
# POST to the internal re-sync endpoint (requires admin token)
curl -X POST https://api.corredor.ar/admin/sync/tenant/<tenant-id> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "manual_retry_portal_outage"}'
```

---

## 5. Fallback to Cached Data

The API caches property listings and tenant config in Redis. If the database is briefly unreachable, the API serves stale cache.

| Endpoint | Cache TTL | Behavior if cache miss |
|----------|-----------|----------------------|
| `GET /properties` | 60s | 503 — upstream database error |
| `GET /tenants/:id/config` | 5 min | 503 |
| `POST /properties` | — | 503 immediately |
| `GET /health` | — | Returns `{ db: "error" }` |

**Extend Redis TTL during DB outage (buys time):**

```bash
redis-cli -u $REDIS_URL EXPIRE "cache:properties:<tenant-id>" 3600
```

For Neon outages > 5 min: check `neon.tech/status` and post update to users (Section 6).

---

## 6. User Communication Templates

### Status page update (status.corredor.ar)

```
Title: Portal degradation — [service affected]
Status: Investigating / Identified / Monitoring / Resolved

We are currently investigating reports of [blank portal / data not loading /
login issues]. Our team has been notified and is working on a fix.

Last updated: [HH:MM UTC]
```

### In-app maintenance banner (via feature flag)

```sql
UPDATE "featureFlag"
SET enabled = true,
    config = '{"message": "Estamos experimentando problemas técnicos. Los datos pueden tardar en actualizarse. Disculpe las molestias."}'
WHERE key = 'maintenance_banner';
```

### Email to affected tenants

```
Subject: Aviso de interrupción temporal del servicio — Corredor

Estimado/a [Nombre],

Les informamos que actualmente estamos experimentando problemas técnicos
que pueden afectar la visualización de datos en el portal.

Estado: En investigación / Resuelto
Inicio: [HH:MM UTC]
Impacto: [Describe el impacto]

Nuestro equipo está trabajando activamente para resolver el problema. Les
notificaremos cuando el servicio vuelva a la normalidad.

Si tiene consultas urgentes, contáctenos en soporte@corredor.ar.

Disculpe las molestias.
El equipo de Corredor
```

### Slack #incidents post

```
INCIDENTE ACTIVO — Portal [nombre]
Inicio: HH:MM UTC
Impacto: [breve descripción]
Estado: Investigando / Mitigado / Resuelto
Responsable: @nombre
Próxima actualización en: 30 min
```

---

## 7. Post-Outage Checklist

```
[ ] Verify all Fly machines are healthy: flyctl status --app corredor-api-prod
[ ] Verify API health endpoint returns 200: curl https://api.corredor.ar/health
[ ] Clear any stuck BullMQ jobs
[ ] Disable maintenance banner if enabled
[ ] Post resolution to status page
[ ] Send resolution email to affected tenants if outage > 30 min
[ ] Write post-mortem if outage > 1 hour or data loss occurred
```

---

## Escalation

| Condition | Escalate to | How |
|-----------|-------------|-----|
| Outage > 15 min | Engineering Lead | Slack DM |
| Outage > 30 min, customer-visible | CTO | Phone + Slack |
| Neon DB down | Neon support | `neon.tech/support` |
| Cloudflare Pages down | Cloudflare support | Cloudflare dashboard → Support |
| Redis unavailable | Infra team | Check Upstash dashboard |
