import { Hono } from 'hono';
import { timingSafeEqual, createHmac } from 'node:crypto';
import type { Redis } from 'ioredis';
import { createQueue, QUEUE_NAMES } from '@corredor/core';

export interface MercadoPagoWebhookJobData {
  action: string;
  dataId: string;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

function verifyMPSignature(
  payload: string,
  xSignature: string,
  xRequestId: string,
  secret: string,
): boolean {
  const parts = xSignature.split(',');
  const ts = parts.find((p) => p.trim().startsWith('ts='))?.split('=')[1]?.trim();
  const v1 = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1]?.trim();

  if (!ts || !v1) return false;

  const manifest = `${ts}.${xRequestId}.${payload}`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  if (expected.length !== v1.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
}

interface MercadoPagoWebhookConfig {
  MP_WEBHOOK_SECRET?: string | undefined;
}

export function createMercadoPagoWebhookRoutes(redis: Redis, config: MercadoPagoWebhookConfig) {
  const app = new Hono();

  app.post('/', async (c) => {
    const secret = config.MP_WEBHOOK_SECRET;
    if (!secret) return c.json({ error: 'Mercado Pago webhook not configured' }, 503);

    const body = await c.req.text();
    const xSignature = c.req.header('x-signature') ?? '';
    const xRequestId = c.req.header('x-request-id') ?? '';

    if (!verifyMPSignature(body, xSignature, xRequestId, secret)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body) as {
      id: number | string;
      action: string;
      data: { id: string };
      type: string;
    };

    const allowedTypes = ['payment', 'preapproval'];
    if (!allowedTypes.includes(event.type)) {
      return c.json({ ok: true, skipped: true });
    }

    const jobId = String(event.id);
    const queue = createQueue<MercadoPagoWebhookJobData>(QUEUE_NAMES.BILLING_MP_WEBHOOK, redis);
    await queue.add(jobId, {
      action: event.action,
      dataId: event.data.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
      receivedAt: new Date().toISOString(),
    }, { jobId });
    await queue.close();

    return c.json({ ok: true });
  });

  return app;
}
