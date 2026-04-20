import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Mock external dependencies so tests run without a real DB/Redis
// ---------------------------------------------------------------------------
vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  })),
  setTenantContext: vi.fn(),
}));

vi.mock('@corredor/telemetry', () => ({
  initSentryNode: vi.fn(),
  initOtel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    status: 'ready',
    on: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue([1, 12000, Date.now() / 1000 + 60]),
  }));
  return { default: Redis };
});

// ---------------------------------------------------------------------------
// Build a minimal app under test (mirrors apps/api/src/index.ts structure)
// ---------------------------------------------------------------------------

async function buildTestApp() {
  const { createDb } = await import('@corredor/db');
  const Redis = (await import('ioredis')).default;

  const db = createDb('postgresql://test');
  const redis = new Redis();

  const app = new Hono();
  app.use('*', requestId());

  app.get('/health', async (c) => {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'disconnected';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisStatus = (redis as any).status === 'ready' ? 'connected' : 'disconnected';
    const healthy = dbStatus === 'connected' && redisStatus === 'connected';

    return c.json(
      {
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        db: dbStatus,
        redis: redisStatus,
        uptime: process.uptime(),
      },
      healthy ? 200 : 503,
    );
  });

  return { app, db, redis };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status ok when DB and Redis are healthy', async () => {
    const { app } = await buildTestApp();
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['status']).toBe('ok');
    expect(body['db']).toBe('connected');
    expect(body['redis']).toBe('connected');
    expect(typeof body['timestamp']).toBe('string');
    expect(typeof body['uptime']).toBe('number');
  });

  it('returns 503 with status degraded when DB is unavailable', async () => {
    const { createDb } = await import('@corredor/db');
    vi.mocked(createDb).mockReturnValueOnce({
      execute: vi.fn().mockRejectedValue(new Error('connection refused')),
      transaction: vi.fn(),
    } as unknown as ReturnType<typeof createDb>);

    const { app } = await buildTestApp();
    const res = await app.request('/health');

    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body['status']).toBe('degraded');
    expect(body['db']).toBe('disconnected');
  });

  it('includes a request-id header', async () => {
    const { app } = await buildTestApp();
    const res = await app.request('/health');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
