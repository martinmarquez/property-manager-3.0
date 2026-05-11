# Webhook Events

## Overview

Corredor sends outbound HTTP POST requests to registered webhook URLs when events occur in your tenant. Webhooks are created and managed via the `/v1/webhooks` API endpoints.

## Event Types

| Event | Trigger | Payload entity |
|-------|---------|---------------|
| `property.created` | New property created | Property |
| `property.updated` | Property fields updated | Property |
| `property.deleted` | Property soft-deleted | Property (id only) |
| `contact.created` | New contact created | Contact |
| `contact.updated` | Contact fields updated | Contact |
| `lead.created` | New lead created | Lead |
| `lead.stage_changed` | Lead moved to a different pipeline stage | Lead + previous stage |
| `lead.won` | Lead marked as won | Lead |
| `lead.lost` | Lead marked as lost | Lead + lost reason |
| `inbox.message.received` | New inbound message in any channel | Message |
| `reservation.created` | New reservation created | Reservation |
| `boleto.signed` | Document signed via e-sign | Document + signature metadata |

## Payload Format

All webhook payloads follow this envelope:

```json
{
  "id": "evt_01HZ...",
  "type": "property.created",
  "tenantId": "uuid",
  "createdAt": "2026-05-03T12:00:00.000Z",
  "data": {
    // entity-specific payload
  }
}
```

## Signature Verification

Every webhook request includes an `X-Corredor-Signature` header containing an HMAC-SHA256 signature of the raw request body using your webhook secret.

**Header format:**
```
X-Corredor-Signature: sha256=<hex-encoded HMAC>
```

**Verification example (Node.js):**
```javascript
import { createHmac, timingSafeEqual } from 'node:crypto';

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}
```

**Important:** Always use `timingSafeEqual` to prevent timing attacks. Verify the signature before processing the payload.

## Delivery Guarantees

- **At-least-once delivery**: Webhooks may be delivered more than once. Use the `id` field to deduplicate.
- **Ordering**: Events are delivered in approximate chronological order, but strict ordering is not guaranteed.
- **Timeout**: Corredor waits up to **10 seconds** for a 2xx response before considering delivery failed.

## Retry Policy

Failed deliveries (non-2xx response or timeout) are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 2 hours |
| 5th retry | 12 hours |

After **5 failed retries**, the event is dropped and the webhook's `failureCount` is incremented.

If `failureCount` reaches **50**, the webhook is automatically deactivated (`active: false`). Re-activate it via the API after fixing the endpoint.

## Best Practices

1. **Return 200 quickly** — acknowledge receipt immediately, process asynchronously
2. **Verify signatures** — always validate `X-Corredor-Signature` before trusting the payload
3. **Idempotent processing** — use the event `id` to detect and skip duplicates
4. **Monitor failures** — check `failureCount` via `GET /v1/webhooks` periodically
5. **Use HTTPS** — webhook URLs must use HTTPS in production (HTTP allowed in development only)
