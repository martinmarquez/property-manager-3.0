# Corredor Production Monitoring Stack

Prometheus + Grafana stack covering:
- **SLA uptime alerts** (99.9% standard, 99.95% enterprise) — Criterion 13
- **Portal sync error rate** (< 1% target) — Criterion 3

## Architecture

```
Fly.io API machine  →  /metrics (port 9464)  ─┐
Fly.io Worker machine → /metrics (port 9464) ─┼→ Prometheus → Grafana → Alerts (email + Slack)
Blackbox prober → https://api.corredor.ar    ─┘
```

## Quick start

```bash
cp .env.example .env
# Fill in all required env vars
docker compose up -d
```

Open Grafana at http://localhost:3000 (admin / $GRAFANA_ADMIN_PASSWORD).

Dashboards are auto-provisioned:
- **Corredor — SLA Uptime** (`uid: corredor-sla`)
- **Corredor — Portal Sync Monitoring** (`uid: corredor-portal-sync`)

## Required environment variables

| Variable             | Description                                          |
|----------------------|------------------------------------------------------|
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                           |
| `FLY_TOKEN`          | Fly.io read-only Prometheus token                    |
| `FLY_APP_NAME_API`   | Fly app name for API (default: `corredor-api-prod`)  |
| `FLY_APP_NAME_WORKER`| Fly app name for worker (default: `corredor-worker-prod`) |
| `SMTP_HOST`          | SMTP host for alert emails (e.g. `smtp.sendgrid.net:587`) |
| `SMTP_USER`          | SMTP username                                        |
| `SMTP_PASSWORD`      | SMTP password/API key                                |
| `ALERT_EMAIL_TO`     | Alert recipient email                                |
| `SLACK_WEBHOOK_URL`  | Slack incoming webhook URL for #alerts-platform      |

## Alert routing

| Severity  | Channels          | Repeat interval |
|-----------|-------------------|-----------------|
| warning   | Slack             | 1h              |
| critical  | Slack + email     | 2h              |

## Required GitHub repo secrets

To wire up the full ops pipeline, add these secrets in GitHub → Settings → Secrets:

| Secret                   | Used by                    |
|--------------------------|----------------------------|
| `NPM_TOKEN`              | `sdk-publish.yml`          |
| `MINTLIFY_API_KEY`       | `docs-deploy.yml`          |
| `MINTLIFY_DEPLOYMENT_ID` | `docs-deploy.yml`          |

## Portal sync metrics instrumentation

The worker emits these Prometheus counters/histograms from `apps/worker/src/metrics.ts`:

| Metric                                        | Type      | Labels                                   |
|-----------------------------------------------|-----------|------------------------------------------|
| `corredor_portal_sync_total`                  | Counter   | `status`, `portal_name`, `queue_name`    |
| `corredor_portal_sync_duration_seconds`       | Histogram | `portal_name`, `queue_name`, `status`    |
| `corredor_dead_letter_total`                  | Counter   | `original_queue`                         |

Metrics are exposed at `:9464/metrics` on the worker machine.
