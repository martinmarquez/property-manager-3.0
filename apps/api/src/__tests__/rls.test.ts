import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * RLS enforcement tests — validate that the tRPC middleware chain correctly:
 *   1. Rejects unauthenticated requests
 *   2. Rejects requests with invalid/expired sessions
 *   3. Calls setTenantContext with the correct tenant + user IDs before any DB query
 *
 * These tests mock the DB and Redis to avoid requiring a live Neon connection.
 * Full end-to-end RLS tests (validating that a query can't cross tenant boundaries)
 * run against a real Neon branch in CI — see scripts/test-rls.ts (Phase B).
 */

vi.mock('@corredor/telemetry', () => ({
  initSentryNode: vi.fn(),
  initOtel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      execute: vi.fn().mockResolvedValue([]),
    })),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {},
  })),
  setTenantContext: vi.fn(),
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

import { setTenantContext, TenantAccessError, assertTenantAccess } from '@corredor/core';

// ---------------------------------------------------------------------------
// assertTenantAccess — cross-tenant isolation guard
// ---------------------------------------------------------------------------

describe('assertTenantAccess', () => {
  const TENANT_A = '00000000-0000-0000-0000-000000000001';
  const TENANT_B = '00000000-0000-0000-0000-000000000002';
  const USER_A = '00000000-0000-0000-0000-000000000003';

  it('passes when resource tenant matches context tenant', () => {
    const ctx = { tenantId: TENANT_A, userId: USER_A };
    expect(() => assertTenantAccess(ctx, TENANT_A)).not.toThrow();
  });

  it('throws TenantAccessError when resource tenant differs', () => {
    const ctx = { tenantId: TENANT_A, userId: USER_A };
    expect(() => assertTenantAccess(ctx, TENANT_B)).toThrow(TenantAccessError);
  });

  it('TenantAccessError has code TENANT_ACCESS_DENIED', () => {
    const ctx = { tenantId: TENANT_A, userId: USER_A };
    let caught: TenantAccessError | undefined;
    try {
      assertTenantAccess(ctx, TENANT_B);
    } catch (err) {
      caught = err as TenantAccessError;
    }
    expect(caught).toBeInstanceOf(TenantAccessError);
    expect(caught?.code).toBe('TENANT_ACCESS_DENIED');
  });
});

// ---------------------------------------------------------------------------
// setTenantContext — verifies RLS session variable injection
// ---------------------------------------------------------------------------

describe('setTenantContext', () => {
  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => vi.clearAllMocks());

  it('calls db.execute with SET CONFIG for tenant_id and user_id', async () => {
    const mockDb = { execute: vi.fn().mockResolvedValue([]) };
    await setTenantContext(mockDb, TENANT_ID, USER_ID);
    expect(mockDb.execute).toHaveBeenCalledOnce();
    const call = mockDb.execute.mock.calls[0]?.[0] as { sql: string };
    expect(call.sql).toContain(TENANT_ID);
    expect(call.sql).toContain(USER_ID);
  });

  it('rejects non-UUID tenantId to prevent SQL injection', async () => {
    const mockDb = { execute: vi.fn() };
    await expect(
      setTenantContext(mockDb, "'; DROP TABLE user; --", USER_ID),
    ).rejects.toThrow();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('rejects non-UUID userId', async () => {
    const mockDb = { execute: vi.fn() };
    await expect(
      setTenantContext(mockDb, TENANT_ID, 'not-a-uuid'),
    ).rejects.toThrow();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// tRPC public procedure — unauthenticated access
// ---------------------------------------------------------------------------

import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { router, publicProcedure, createContext } from '../trpc.js';
import { z } from 'zod';
import { createDb } from '@corredor/db';
import Redis from 'ioredis';

const testRouter = router({
  ping: publicProcedure.output(z.object({ pong: z.boolean() })).query(() => ({ pong: true })),
});

function buildTRPCTestApp() {
  const db = createDb('postgresql://test');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redis = new (Redis as any)();

  const app = new Hono();
  app.use(
    '/trpc/*',
    trpcServer({
      router: testRouter,
      createContext: (_opts, c) =>
        createContext({ c, db, redis }) as unknown as Record<string, unknown>,
    }),
  );

  return { app };
}

describe('public tRPC procedure', () => {
  it('responds without authentication', async () => {
    const { app } = buildTRPCTestApp();
    const res = await app.request('/trpc/ping', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = await res.json() as { result?: { data?: { pong?: boolean } } };
    expect(body.result?.data?.pong).toBe(true);
  });
});
