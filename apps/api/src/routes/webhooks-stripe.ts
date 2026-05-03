import { Hono } from 'hono';
import { timingSafeEqual, createHmac } from 'node:crypto';
import type { Redis } from 'ioredis';
import { createQueue, QUEUE_NAMES } from '@corredor/core';

export interface StripeWebhookJobData {
  eventType: string;
  payload: Record<string, unknown>;
  stripeEventId: string;
  receivedAt: string;
}

function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): boolean {
  const parts = sigHeader.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const v1Sig = parts.find((p) => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1Sig) return false;

  // Reject events older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  if (expected.length !== v1Sig.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1Sig, 'hex'));
}

interface StripeWebhookConfig {
  STRIPE_WEBHOOK_SECRET?: string | undefined;
}

export function createStripeWebhookRoutes(redis: Redis, config: StripeWebhookConfig) {
  const app = new Hono();

  app.post('/', async (c) => {
    const secret = config.STRIPE_WEBHOOK_SECRET;
    if (!secret) return c.json({ error: 'Stripe webhook not configured' }, 503);

    const body = await c.req.text();
    const signature = c.req.header('stripe-signature') ?? '';

    if (!verifyStripeSignature(body, signature, secret)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body) as { id: string; type: string; data: { object: Record<string, unknown> } };

    const allowedEvents = [
      'checkout.session.completed',
      'invoice.paid',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];

    if (!allowedEvents.includes(event.type)) {
      return c.json({ ok: true, skipped: true });
    }

    const queue = createQueue<StripeWebhookJobData>(QUEUE_NAMES.BILLING_STRIPE_WEBHOOK, redis);
    await queue.add(event.id, {
      eventType: event.type,
      payload: event.data.object,
      stripeEventId: event.id,
      receivedAt: new Date().toISOString(),
    }, { jobId: event.id });
    await queue.close();

    return c.json({ ok: true });
  });

  return app;
}
