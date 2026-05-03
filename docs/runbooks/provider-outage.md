# Provider Outage Runbook

Covers failover procedures for all external service providers. Each section is independent — jump to the affected provider.

---

## Provider Health Status Pages

| Provider | Status URL |
|----------|-----------|
| Anthropic | `status.anthropic.com` |
| OpenAI | `status.openai.com` |
| Stripe | `status.stripe.com` |
| Mercado Pago | `status.mercadopago.com.ar` |
| AFIP | No status page — monitor manually |
| Signaturit | `status.signaturit.com` |
| DocuSign | `status.docusign.com` |
| Cloudflare | `www.cloudflarestatus.com` |
| Neon | `neon.tech/status` |
| AWS SES | `status.aws.amazon.com` |

---

## 1. AI Provider Failover (Anthropic ↔ OpenAI)

The AI package (`packages/ai`) routes requests to Anthropic (primary). OpenAI is used for text embeddings (`text-embedding-3-small`) in the RAG/copilot pipeline.

### Symptoms of Anthropic outage

- Sentry: `AnthropicError` / `APIConnectionError` spikes
- Copilot chat returns 503 or hangs
- AI description / appraisal narrative generation fails in worker queue

### Manual failover to OpenAI-only mode

```bash
# 1. Set feature flag to disable Anthropic routes
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\"
  SET enabled = false
  WHERE key = 'ai_anthropic_enabled';
"

# 2. Override provider via env var (requires app restart)
flyctl secrets set AI_PROVIDER_OVERRIDE=openai --app corredor-api-prod
flyctl secrets set AI_PROVIDER_OVERRIDE=openai --app corredor-worker-prod

# 3. Redeploy
flyctl deploy --config infra/fly/api.fly.toml --remote-only
flyctl deploy --config infra/fly/worker.fly.toml --remote-only
```

### Restore Anthropic as primary

```bash
flyctl secrets unset AI_PROVIDER_OVERRIDE --app corredor-api-prod
flyctl secrets unset AI_PROVIDER_OVERRIDE --app corredor-worker-prod

psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = true WHERE key = 'ai_anthropic_enabled';
"
```

### OpenAI-specific outage (embeddings / RAG)

```bash
# Disable RAG for copilot — copilot still works without retrieval context
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = false WHERE key = 'copilot_rag_enabled';
"

# Pause rag-ingest queue to stop accumulation
redis-cli -u $REDIS_URL LPUSH bull:rag-ingest:paused 1
```

---

## 2. Payment Provider Failover

### 2a. Stripe outage (global subscriptions)

**Symptoms:** Stripe webhook 502/503, checkout session creation failing, Sentry `StripeError` spikes.

```bash
# 1. Check status.stripe.com

# 2. Disable new subscription checkout (show maintenance message)
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = false WHERE key = 'billing_stripe_checkout_enabled';
"

# Existing subscriptions continue — Stripe retries webhooks for 72h automatically

# 3. Re-enable when Stripe recovers
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = true WHERE key = 'billing_stripe_checkout_enabled';
"
```

**Stripe webhook replay after recovery:**

```bash
# Stripe dashboard → Webhooks → select endpoint → Resend failed events
# OR via Stripe CLI:
stripe events resend <event_id>
```

### 2b. Mercado Pago outage (Argentine domestic)

**Symptoms:** MP checkout preference creation failing, `MP_ACCESS_TOKEN` rejected, webhook not received.

```bash
# 1. Check status.mercadopago.com.ar

# 2. Disable MP checkout
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = false WHERE key = 'billing_mp_checkout_enabled';
"

# 3. Redirect AR customers to Stripe payment link as fallback
# → Manually send payment link from Stripe dashboard to affected customers

# 4. Re-enable when MP recovers
psql $DATABASE_URL -c "
  UPDATE \"featureFlag\" SET enabled = true WHERE key = 'billing_mp_checkout_enabled';
"
```

**MP webhook replay (no native UI — manual sync):**

```bash
curl -X POST https://api.corredor.ar/admin/billing/sync-mp-status/<tenant-id> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 2c. AFIP outage (electronic invoicing)

AFIP WSAA is notoriously unstable. Invoice generation queues and retries automatically.

**Symptoms:** `billing-afip-invoice` worker jobs failing, invoices not generated.

```bash
# 1. Check AFIP availability manually:
curl -s https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl | head -5

# 2. AFIP jobs retry on failure — no immediate action needed for outages < 2h
flyctl logs --app corredor-worker-prod --tail | grep afip

# 3. For outage > 4h, notify affected tenants (see Section 6)
# Invoices will be generated retroactively when AFIP recovers
```

---

## 3. Email/SMTP Failover (AWS SES → Postmark)

**Symptoms:** Password reset emails not delivered, notification emails bouncing, `SMTP connection refused` in worker logs.

```bash
# Check worker logs for SMTP errors
flyctl logs --app corredor-worker-prod --tail | grep -i smtp

# Check BullMQ email queue depth
redis-cli -u $REDIS_URL LLEN bull:email-send:waiting
```

### Failover to Postmark

```bash
flyctl secrets set \
  SMTP_HOST=smtp.postmarkapp.com \
  SMTP_PORT=587 \
  SMTP_USER=<POSTMARK_SERVER_TOKEN> \
  SMTP_PASS=<POSTMARK_SERVER_TOKEN> \
  SMTP_SECURE=false \
  --app corredor-api-prod

flyctl secrets set \
  SMTP_HOST=smtp.postmarkapp.com \
  SMTP_PORT=587 \
  SMTP_USER=<POSTMARK_SERVER_TOKEN> \
  SMTP_PASS=<POSTMARK_SERVER_TOKEN> \
  SMTP_SECURE=false \
  --app corredor-worker-prod

# Redeploy to pick up new secrets
flyctl deploy --config infra/fly/api.fly.toml --remote-only
flyctl deploy --config infra/fly/worker.fly.toml --remote-only
```

### Restore SES

```bash
flyctl secrets set \
  SMTP_HOST=email-smtp.<region>.amazonaws.com \
  SMTP_PORT=587 \
  SMTP_USER=<SES_ACCESS_KEY> \
  SMTP_PASS=<SES_SECRET_KEY> \
  SMTP_SECURE=false \
  --app corredor-api-prod

flyctl secrets set \
  SMTP_HOST=email-smtp.<region>.amazonaws.com \
  SMTP_PORT=587 \
  SMTP_USER=<SES_ACCESS_KEY> \
  SMTP_PASS=<SES_SECRET_KEY> \
  SMTP_SECURE=false \
  --app corredor-worker-prod

flyctl deploy --config infra/fly/api.fly.toml --remote-only
flyctl deploy --config infra/fly/worker.fly.toml --remote-only
```

---

## 4. E-Signature Provider Failover (Signaturit ↔ DocuSign)

The e-sign system uses an adapter pattern in `packages/documents/src/esign/adapters/`. Both Signaturit and DocuSign adapters are implemented.

**Symptoms:** Document signing requests failing, webhook 422/503, Sentry `SignaturitError`.

### Switch to DocuSign adapter

```bash
# 1. Set provider override
flyctl secrets set ESIGN_PROVIDER=docusign --app corredor-api-prod
flyctl secrets set ESIGN_PROVIDER=docusign --app corredor-worker-prod

# 2. Ensure DocuSign secrets are set
flyctl secrets set \
  DOCUSIGN_INTEGRATION_KEY=<key> \
  DOCUSIGN_SECRET_KEY=<secret> \
  DOCUSIGN_ACCOUNT_ID=<account-id> \
  DOCUSIGN_WEBHOOK_SECRET=<webhook-secret> \
  --app corredor-api-prod

# 3. Redeploy
flyctl deploy --config infra/fly/api.fly.toml --remote-only
```

### Restore Signaturit as primary

```bash
flyctl secrets set ESIGN_PROVIDER=signaturit --app corredor-api-prod
flyctl secrets set ESIGN_PROVIDER=signaturit --app corredor-worker-prod
flyctl deploy --config infra/fly/api.fly.toml --remote-only
```

> Documents already sent via Signaturit must be completed there. Provider switch only affects new signing requests.

---

## 5. WhatsApp / Messaging Provider Swap

WhatsApp business messaging is not integrated in the current release (planned for Phase I). This section is a placeholder.

**Planned providers:** Meta Business Cloud API (primary), Twilio WhatsApp (fallback).

Update this section when integration is live with credential secrets and failover commands.

---

## 6. Provider Outage Customer Communication

### Short outage (< 2h, non-payment)

No customer communication required. Monitor and resolve internally.

### Extended outage (> 2h) or payment-impacting

```
Subject: Interrupción temporal en [servicio] — Corredor

Estimado/a [Nombre],

Actualmente uno de nuestros proveedores de servicio ([Proveedor])
está experimentando problemas que afectan [describe funcionalidad].

Estamos trabajando activamente en la resolución. Durante este período:
- [Funcionalidad X] no está disponible temporalmente
- [Funcionalidad Y] continúa funcionando con normalidad

No se perderá ningún dato. [Si aplica: Las facturas/firmas/pagos
se procesarán automáticamente cuando el servicio se restaure.]

Tiempo estimado de resolución: [estimado o "aún en investigación"]

Disculpe las molestias.
El equipo de Corredor
```

---

## Escalation

| Situation | Owner | Contact |
|-----------|-------|---------|
| AI outage > 1h | Engineering Lead | Slack DM |
| Payment outage affecting new signups | CTO + Billing Owner | Phone |
| AFIP outage > 8h | CTO | Phone — regulatory implication |
| Email delivery failure > 30 min | Engineering Lead | Slack DM |
| E-sign provider down, leases expiring | Legal / Sales Lead | Phone |
