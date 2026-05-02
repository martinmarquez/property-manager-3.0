import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const PROPERTY_ID = '00000000-0000-0000-0000-000000000001';

const mockCheckFeatureFlag = vi.fn().mockResolvedValue(undefined);

vi.mock('../lib/feature-flags.js', () => ({
  checkFeatureFlag: (...args: unknown[]) => mockCheckFeatureFlag(...args),
  FeatureDisabledError: class extends Error {
    readonly statusCode = 403 as const;
    readonly upgradePrompt =
      'This feature is not included in your current plan. Contact your account manager or upgrade to enable it.';
    constructor(flagKey: string) {
      super(`Feature '${flagKey}' is not enabled for this tenant`);
      this.name = 'FeatureDisabledError';
    }
  },
}));

vi.mock('@corredor/telemetry', () => ({
  initSentryNode: vi.fn(),
  initOtel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@corredor/db', () => ({
  property: { id: 'id', tenantId: 'tenant_id', referenceCode: 'reference_code', title: 'title' },
  propertyListing: { id: 'id', propertyId: 'property_id', tenantId: 'tenant_id' },
  propertyAiDescription: {
    id: 'id', propertyId: 'property_id', tenantId: 'tenant_id', isActive: 'is_active',
    createdAt: 'created_at',
  },
  descriptionGenerationLog: { id: 'id', tenantId: 'tenant_id' },
  featureFlag: { tenantId: 'tenant_id', key: 'key', enabled: 'enabled', rolloutPct: 'rollout_pct' },
  setTenantContext: vi.fn(),
}));

vi.mock('@corredor/core', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 20,
    remaining: 19,
    resetAt: Math.floor(Date.now() / 1000) + 60,
    retryAfterSeconds: 0,
  }),
  RateLimitPresets: {
    AI_REQUESTS: { windowMs: 60000, maxRequests: 20, scope: 'ai' },
    API_WRITE_AUTHENTICATED: { windowMs: 60000, maxRequests: 100, scope: 'api_write' },
    API_READ_AUTHENTICATED: { windowMs: 60000, maxRequests: 200, scope: 'api_read' },
  },
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  QUEUE_NAMES: {},
}));

vi.mock('@corredor/ai', async () => {
  const { z } = await import('zod');
  return {
    generateDescription: vi.fn().mockResolvedValue({
      body: 'A beautiful property in Palermo',
      model: 'claude-sonnet-4-6',
      promptTokens: 100,
      completionTokens: 50,
      retried: false,
    }),
    generateInputSchema: z.object({
      propertyId: z.string().uuid(),
      tone: z.string().optional(),
      portal: z.string().optional(),
      extraInstructions: z.string().max(500).optional(),
    }),
  };
});

vi.mock('../env.js', () => ({
  env: { ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('../middleware/session.js', () => ({
  getSession: vi.fn().mockResolvedValue({
    tenantId: TENANT_ID,
    userId: USER_ID,
    roles: ['admin'],
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  }),
  refreshSession: vi.fn().mockResolvedValue(undefined),
  destroySession: vi.fn().mockResolvedValue(undefined),
  getSessionId: vi.fn().mockReturnValue('sess-1'),
  SESSION_TTL_SECONDS: 86400,
  IDLE_TIMEOUT_SECONDS: 1800,
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

function createMockDb() {
  const propertyRow = {
    id: PROPERTY_ID,
    referenceCode: 'P-001',
    title: 'Test Property',
    propertyType: 'apartment',
    subtype: null,
    coveredAreaM2: 80,
    totalAreaM2: 100,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    toilets: 0,
    garages: 1,
    ageYears: 5,
    province: 'Buenos Aires',
    locality: 'Palermo',
    neighborhood: null,
    addressStreet: null,
  };

  function selectChain(rows: unknown[] = [propertyRow]) {
    const obj: Record<string, unknown> = {};
    obj.from = vi.fn().mockReturnValue(obj);
    obj.where = vi.fn().mockReturnValue(obj);
    obj.orderBy = vi.fn().mockReturnValue(obj);
    obj.leftJoin = vi.fn().mockReturnValue(obj);
    obj.limit = vi.fn().mockResolvedValue(rows);
    obj.then = (resolve: (v: unknown) => void) => resolve(rows);
    return obj;
  }

  function insertChain() {
    const valuesResult = Promise.resolve([{ id: 'log-1' }]);
    const obj: Record<string, unknown> = {};
    obj.values = vi.fn().mockReturnValue(valuesResult);
    obj.returning = vi.fn().mockResolvedValue([{ id: 'desc-1' }]);
    return obj;
  }

  return {
    select: vi.fn().mockImplementation(() => selectChain()),
    insert: vi.fn().mockImplementation(() => insertChain()),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: vi.fn().mockImplementation(() => selectChain()),
        insert: vi.fn().mockImplementation(() => insertChain()),
        execute: vi.fn().mockResolvedValue([]),
      };
      return fn(tx);
    }),
  };
}

async function buildCaller() {
  const { propertyDescriptionRouter } = await import('../routers/propertyDescription.js');
  const { router: appRouter } = await import('../trpc.js');

  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();
  const db = createMockDb();

  const c = {
    req: { header: vi.fn().mockReturnValue(undefined), method: 'POST' },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  const testRouter = appRouter({ propertyDescription: propertyDescriptionRouter });
  const caller = testRouter.createCaller({
    c,
    tenantId: TENANT_ID,
    userId: USER_ID,
    db: db as never,
    redis,
    sessionId: 'sess-1',
  } as never);

  return { caller, db };
}

describe('propertyDescription.generate — feature flag gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckFeatureFlag.mockResolvedValue(undefined);
  });

  it('returns FORBIDDEN with upgrade prompt when ai_descriptions flag is disabled', async () => {
    const { FeatureDisabledError } = await import('../lib/feature-flags.js');
    mockCheckFeatureFlag.mockRejectedValue(
      new FeatureDisabledError('ai_descriptions'),
    );

    const { caller } = await buildCaller();

    try {
      await caller.propertyDescription.generate({ propertyId: PROPERTY_ID });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      const err = e as TRPCError;
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toContain('ai_descriptions');
      expect(err.message).toContain('upgrade');
    }
  });

  it('proceeds when ai_descriptions flag is enabled', async () => {
    mockCheckFeatureFlag.mockResolvedValue(undefined);

    const { caller } = await buildCaller();

    const result = await caller.propertyDescription.generate({
      propertyId: PROPERTY_ID,
    });

    expect(result).toHaveProperty('body');
    expect(result.body).toBe('A beautiful property in Palermo');
    expect(mockCheckFeatureFlag).toHaveBeenCalledWith(
      expect.anything(),
      TENANT_ID,
      'ai_descriptions',
    );
  });
});
