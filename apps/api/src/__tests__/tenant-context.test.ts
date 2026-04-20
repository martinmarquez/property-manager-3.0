import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@corredor/telemetry', () => ({
  initSentryNode: vi.fn(),
  initOtel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('ioredis', () => {
  const Redis = vi.fn();
  return { default: Redis };
});

// ---------------------------------------------------------------------------
// Test the session middleware in isolation
// ---------------------------------------------------------------------------

import {
  generateSessionId,
  createSession,
  getSession,
  refreshSession,
  destroySession,
} from '../middleware/session.js';
import type { SessionData } from '../middleware/session.js';

function makeMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const SESSION_DATA: Omit<SessionData, 'createdAt' | 'lastSeenAt'> = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  roles: ['agent'],
};

describe('session middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generateSessionId returns a 64-char hex string', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('creates a session and retrieves it', async () => {
    const redis = makeMockRedis();
    const sessionId = await createSession(redis, SESSION_DATA);

    expect(typeof sessionId).toBe('string');
    expect(sessionId).toHaveLength(64);

    const session = await getSession(redis, sessionId);
    expect(session).not.toBeNull();
    expect(session?.tenantId).toBe(SESSION_DATA.tenantId);
    expect(session?.userId).toBe(SESSION_DATA.userId);
    expect(session?.roles).toEqual(['agent']);
    expect(session?.createdAt).toBeTruthy();
    expect(session?.lastSeenAt).toBeTruthy();
  });

  it('returns null for missing session', async () => {
    const redis = makeMockRedis();
    const result = await getSession(redis, 'nonexistent-session-id');
    expect(result).toBeNull();
  });

  it('refreshes the session and updates lastSeenAt', async () => {
    const redis = makeMockRedis();
    const sessionId = await createSession(redis, SESSION_DATA);
    const original = await getSession(redis, sessionId);

    // Simulate a small delay
    await new Promise((r) => setTimeout(r, 5));
    await refreshSession(redis, sessionId, original!);

    const refreshed = await getSession(redis, sessionId);
    expect(refreshed?.lastSeenAt).not.toBe(original?.lastSeenAt);
  });

  it('destroys the session', async () => {
    const redis = makeMockRedis();
    const sessionId = await createSession(redis, SESSION_DATA);

    await destroySession(redis, sessionId);

    const result = await getSession(redis, sessionId);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test tenant context extraction from tRPC context
// ---------------------------------------------------------------------------

import { getCurrentTenant, TenantAccessError } from '@corredor/core';

describe('getCurrentTenant', () => {
  it('extracts tenant identity from ctx.tenantId + ctx.userId', () => {
    const ctx = {
      tenantId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
    };
    const identity = getCurrentTenant(ctx);
    expect(identity.tenantId).toBe(ctx.tenantId);
    expect(identity.userId).toBe(ctx.userId);
  });

  it('extracts from session sub-object when top-level fields are absent', () => {
    const ctx = {
      session: {
        tenantId: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000002',
      },
    };
    const identity = getCurrentTenant(ctx);
    expect(identity.tenantId).toBe(ctx.session.tenantId);
    expect(identity.userId).toBe(ctx.session.userId);
  });

  it('throws TenantAccessError when tenantId is missing', () => {
    const ctx = { userId: '00000000-0000-0000-0000-000000000002' };
    expect(() => getCurrentTenant(ctx)).toThrow(TenantAccessError);
  });

  it('throws TenantAccessError when userId is missing', () => {
    const ctx = { tenantId: '00000000-0000-0000-0000-000000000001' };
    expect(() => getCurrentTenant(ctx)).toThrow(TenantAccessError);
  });

  it('throws TenantAccessError when tenantId is not a valid UUID', () => {
    const ctx = { tenantId: 'not-a-uuid', userId: '00000000-0000-0000-0000-000000000002' };
    expect(() => getCurrentTenant(ctx)).toThrow(TenantAccessError);
  });
});
