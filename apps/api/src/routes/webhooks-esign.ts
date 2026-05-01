import { Hono } from 'hono';
import { timingSafeEqual, createHmac } from 'node:crypto';
import type { Redis } from 'ioredis';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import type { EsignWebhookJobData } from '@corredor/documents';

interface WebhookSecrets {
  SIGNATURIT_WEBHOOK_SECRET?: string | undefined;
  DOCUSIGN_WEBHOOK_SECRET?: string | undefined;
}

function verifyHmac(secret: string, payload: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export function createEsignWebhookRoutes(redis: Redis, secrets: WebhookSecrets) {
  const app = new Hono();

  app.post('/signaturit', async (c) => {
    const secret = secrets.SIGNATURIT_WEBHOOK_SECRET;
    if (!secret) return c.json({ error: 'Signaturit webhook not configured' }, 503);

    const body = await c.req.text();
    const signature = c.req.header('x-signaturit-signature') ?? '';

    if (!verifyHmac(secret, body, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const payload = JSON.parse(body) as Record<string, unknown>;
    const queue = createQueue<EsignWebhookJobData>(QUEUE_NAMES.DOC_SIGN_WEBHOOK, redis);
    await queue.add('signaturit-webhook', {
      provider: 'signaturit',
      payload,
      receivedAt: new Date().toISOString(),
    });
    await queue.close();

    return c.json({ ok: true });
  });

  app.post('/docusign', async (c) => {
    const secret = secrets.DOCUSIGN_WEBHOOK_SECRET;
    if (!secret) return c.json({ error: 'DocuSign webhook not configured' }, 503);

    const body = await c.req.text();
    const signature = c.req.header('x-docusign-signature-1') ?? '';

    if (!verifyHmac(secret, body, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const payload = JSON.parse(body) as Record<string, unknown>;
    const queue = createQueue<EsignWebhookJobData>(QUEUE_NAMES.DOC_SIGN_WEBHOOK, redis);
    await queue.add('docusign-webhook', {
      provider: 'docusign',
      payload,
      receivedAt: new Date().toISOString(),
    });
    await queue.close();

    return c.json({ ok: true });
  });

  return app;
}
