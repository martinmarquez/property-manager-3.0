// ─── Telemetry must be initialized before all other imports ──────────────────
// Sentry and OTel patch Node.js internals; they must run before any other code
// imports HTTP, pg, ioredis, or any other instrumented module.
import { initSentryNode, initOtel, logger } from '@corredor/telemetry';

initSentryNode({
  dsn: process.env['SENTRY_DSN'] ?? '',
  environment: process.env['NODE_ENV'] ?? 'development',
  ...(process.env['SENTRY_RELEASE'] ? { release: process.env['SENTRY_RELEASE'] } : {}),
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
});

initOtel({
  serviceName: 'corredor-api',
  serviceVersion: process.env['SENTRY_RELEASE'] ?? process.env['APP_VERSION'] ?? '0.1.0',
  environment: process.env['NODE_ENV'] ?? 'development',
  ...(process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
    ? { otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] }
    : {}),
});

// ─── Application imports ──────────────────────────────────────────────────────
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { logger as honoLogger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { createDb } from '@corredor/db';
import { apiSecurityHeaders } from '@corredor/core';
import { env } from './env.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { createContext } from './trpc.js';
import { appRouter } from './router.js';
import { createEsignWebhookRoutes } from './routes/webhooks-esign.js';
import { createCopilotStreamRoutes } from './routes/copilot-stream.js';

// ─── Singleton clients ────────────────────────────────────────────────────────
const db = createDb(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL, {
  // Retry strategy: exponential backoff up to 30s
  retryStrategy: (times) => Math.min(times * 500, 30_000),
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err: Error) => {
  logger.error('redis error', { error: err.message });
});

// ─── Hono app ─────────────────────────────────────────────────────────────────
const app = new Hono();

// ── Global middleware (applied to all routes) ──────────────────────────────
app.use('*', requestId());
app.use('*', honoLogger());
app.use('*', bodyLimit({ maxSize: 5 * 1024 * 1024 })); // 5 MB — defense-in-depth for csvBase64 uploads
app.use('*', apiSecurityHeaders);
app.use(
  '/trpc/*',
  cors({
    origin: (origin) => {
      // Allow same-origin, Cloudflare Pages, and local dev
      const allowed = [
        'https://app.corredor.ar',
        'https://admin.corredor.ar',
        'http://localhost:5173', // apps/web dev
        'http://localhost:3001', // apps/admin dev
      ];
      return allowed.includes(origin ?? '') ? origin : null;
    },
    allowHeaders: ['Content-Type', 'x-csrf-token', 'x-request-id', 'trpc-batch-size'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
);

// CSRF protection on all state-changing endpoints
const isSecure = env.NODE_ENV === 'production';
app.use('*', csrfMiddleware(isSecure));

// ── Health endpoint ────────────────────────────────────────────────────────
// Exposed directly on Hono so load balancers and Fly.io health checks don't
// need to go through the full tRPC stack.
app.get('/health', async (c) => {
  let dbStatus: 'connected' | 'disconnected' = 'connected';
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = 'disconnected';
  }

  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';

  const healthy = dbStatus === 'connected' && redisStatus === 'connected';
  return c.json(
    {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: env.APP_VERSION,
      db: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
    },
    healthy ? 200 : 503,
  );
});

// ── E-sign provider webhooks (no auth — HMAC-verified) ───────────────────
app.route('/webhooks/esign', createEsignWebhookRoutes(redis, {
  SIGNATURIT_WEBHOOK_SECRET: env.SIGNATURIT_WEBHOOK_SECRET,
  DOCUSIGN_WEBHOOK_SECRET: env.DOCUSIGN_WEBHOOK_SECRET,
}));

// ── Copilot SSE streaming (outside tRPC — needs raw SSE response) ────────
app.use(
  '/api/copilot/*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://app.corredor.ar',
        'http://localhost:5173',
      ];
      return allowed.includes(origin ?? '') ? origin : null;
    },
    allowHeaders: ['Content-Type', 'x-csrf-token', 'x-request-id'],
    allowMethods: ['POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
);
app.route('/api/copilot', createCopilotStreamRoutes({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: db as any,
  redis,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  openaiApiKey: env.OPENAI_API_KEY,
  databaseUrl: env.DATABASE_URL,
}));

// ── tRPC router ────────────────────────────────────────────────────────────
// @hono/trpc-server passes (trpcOpts, honoContext) to createContext
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext({ c, db, redis }) as unknown as Record<string, unknown>,
    onError({ error, path }) {
      logger.error('tRPC error', {
        path,
        code: error.code,
        message: error.message,
      });
    },
  }),
);

// ─── Start server ─────────────────────────────────────────────────────────────
const port = env.PORT;

serve({ fetch: app.fetch, port }, () => {
  logger.info('corredor-api started', {
    port,
    env: env.NODE_ENV,
    version: env.APP_VERSION,
  });
});

export default app;
export type { AppRouter } from './router.js';
