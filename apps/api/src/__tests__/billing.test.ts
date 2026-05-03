/**
 * Billing router tests — RENA-177
 *
 * Unit tests for all billing procedures using mocked DB, Redis, Stripe,
 * Mercado Pago (fetch), and AFIP queue. Uses tRPC createCaller.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// DB mock infrastructure
// ---------------------------------------------------------------------------

const makeMockTx = () => ({
  execute: vi.fn().mockResolvedValue({ rows: [] }),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  query: {},
});

let currentTx = makeMockTx();

const mockDb = {
  ...makeMockTx(),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx)),
};

// ---------------------------------------------------------------------------
// Stripe mocks (lazy import via getStripe())
// ---------------------------------------------------------------------------

const mockStripeCheckoutCreate = vi.fn().mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/pay/cs_test_123',
});
const mockStripeSubscriptionsUpdate = vi.fn().mockResolvedValue({});
const mockStripeSubscriptionsRetrieve = vi.fn().mockResolvedValue({
  items: { data: [{ id: 'si_123' }] },
});

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockStripeCheckoutCreate } },
    subscriptions: {
      update: mockStripeSubscriptionsUpdate,
      retrieve: mockStripeSubscriptionsRetrieve,
    },
  })),
}));

// ---------------------------------------------------------------------------
// env mock — MUST be declared before any API layer import
// ---------------------------------------------------------------------------

vi.mock('../env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    AUTH_ENCRYPTION_KEY: 'test-encryption-key-32chars-long!!',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PRICE_ID_STARTER: 'price_starter',
    STRIPE_PRICE_ID_PRO: 'price_pro',
    MP_ACCESS_TOKEN: 'MP_TEST_TOKEN',
    ANTHROPIC_API_KEY: undefined,
    NODE_ENV: 'test',
  },
}));

// ---------------------------------------------------------------------------
// @corredor/db mock
// ---------------------------------------------------------------------------

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => mockDb),
  setTenantContext: vi.fn(),
  plan: {
    id: 'id',
    code: 'code',
    isActive: 'is_active',
    sortOrder: 'sort_order',
    displayName: 'display_name',
    priceUsd: 'price_usd',
  },
  subscription: {
    id: 'id',
    tenantId: 'tenant_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    planCode: 'plan_code',
    cancelAtPeriodEnd: 'cancel_at_period_end',
    cancelledAt: 'cancelled_at',
    priceAmount: 'price_amount',
    updatedAt: 'updated_at',
  },
  invoice: {
    id: 'id',
    tenantId: 'tenant_id',
    createdAt: 'created_at',
  },
  payment: {
    id: 'id',
    tenantId: 'tenant_id',
    createdAt: 'created_at',
  },
  afipInvoice: {
    id: 'id',
    tenantId: 'tenant_id',
    status: 'status',
    errorMessage: 'error_message',
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  },
  // Tables used by assert-feature (txMiddleware dependency)
  planFeature: { planCode: 'plan_code', featureKey: 'feature_key' },
}));

// ---------------------------------------------------------------------------
// @corredor/telemetry mock
// ---------------------------------------------------------------------------

vi.mock('@corredor/telemetry', () => ({
  initSentryNode: vi.fn(),
  initOtel: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// ioredis mock
// ---------------------------------------------------------------------------

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
// session middleware mock
// ---------------------------------------------------------------------------

vi.mock('../middleware/session.js', () => ({
  getSession: vi.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['agent'],
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  }),
  refreshSession: vi.fn().mockResolvedValue(undefined),
  destroySession: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn().mockResolvedValue('new-session-id'),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  getSessionId: vi.fn().mockReturnValue('sess-1'),
  SESSION_TTL_SECONDS: 86400,
  IDLE_TIMEOUT_SECONDS: 1800,
  generateSessionId: vi.fn().mockReturnValue('sess-1'),
}));

// ---------------------------------------------------------------------------
// @corredor/core mock
// ---------------------------------------------------------------------------

vi.mock('@corredor/core', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    resetAt: Math.floor(Date.now() / 1000) + 60,
    retryAfterSeconds: 0,
  }),
  RateLimitPresets: {
    API_WRITE_AUTHENTICATED: { windowMs: 60000, maxRequests: 100, scope: 'api_write' },
    API_READ_AUTHENTICATED: { windowMs: 60000, maxRequests: 200, scope: 'api_read' },
  },
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  QUEUE_NAMES: {
    BILLING_AFIP_INVOICE: 'billing-afip-invoice',
    PORTAL_PUBLISH: 'portal-publish',
    PORTAL_UNPUBLISH: 'portal-unpublish',
    IMPORT_CSV: 'import-csv',
  },
  interpretBnaRate: vi.fn().mockReturnValue({ sellRate: 1100, date: '2026-05-03', isStale: false }),
  calculateArsPrice: vi.fn().mockReturnValue(150000),
}));

// ---------------------------------------------------------------------------
// bullmq mock
// ---------------------------------------------------------------------------

vi.mock('bullmq', () => ({
  Worker: vi.fn(),
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Mercado Pago — global fetch mock
// ---------------------------------------------------------------------------

global.fetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({
    id: 'pref_123',
    init_point: 'https://mp.com/checkout/pref_123',
  }),
}) as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-1';
const AFIP_INVOICE_ID = '00000000-0000-0000-0000-000000000010';

const mockPlan = {
  id: 'plan-1',
  code: 'solo',
  isActive: true,
  sortOrder: 1,
  displayName: 'Solo',
  priceUsd: '29.00',
};

const mockSub = {
  id: 'sub-1',
  tenantId: TENANT_ID,
  stripeSubscriptionId: 'sub_stripe_123',
  planCode: 'solo',
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  priceAmount: '29.00',
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// buildCaller helper
// ---------------------------------------------------------------------------

async function buildCaller() {
  const { billingRouter } = await import('../routers/billing.js');
  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();

  const c = {
    req: { header: vi.fn().mockReturnValue(undefined), method: 'POST' },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  const { router: appRouter } = await import('../trpc.js');
  const testRouter = appRouter({ billing: billingRouter });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return testRouter.createCaller({
    c,
    requestId: 'test-request-id',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: mockDb as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis: redis as any,
    sessionId: 'sess-1',
    queues: {},
  });
}

// ---------------------------------------------------------------------------
// billing.plans
// ---------------------------------------------------------------------------

describe('billing.plans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns list of active plans', async () => {
    currentTx.orderBy.mockResolvedValueOnce([mockPlan]);

    const caller = await buildCaller();
    const result = await caller.billing.plans();

    expect(result).toEqual([mockPlan]);
    expect(currentTx.select).toHaveBeenCalled();
    expect(currentTx.orderBy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// billing.currentSubscription
// ---------------------------------------------------------------------------

describe('billing.currentSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns subscription when one exists', async () => {
    currentTx.limit.mockResolvedValueOnce([mockSub]);

    const caller = await buildCaller();
    const result = await caller.billing.currentSubscription();

    expect(result).toEqual(mockSub);
  });

  it('returns null when no subscription found', async () => {
    currentTx.limit.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    const result = await caller.billing.currentSubscription();

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// billing.invoices
// ---------------------------------------------------------------------------

describe('billing.invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns invoice list', async () => {
    const mockInvoices = [
      { id: 'inv-1', tenantId: TENANT_ID, createdAt: new Date() },
      { id: 'inv-2', tenantId: TENANT_ID, createdAt: new Date() },
    ];
    currentTx.limit.mockResolvedValueOnce(mockInvoices);

    const caller = await buildCaller();
    const result = await caller.billing.invoices({ limit: 20 });

    expect(result).toEqual(mockInvoices);
    expect(currentTx.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// billing.payments
// ---------------------------------------------------------------------------

describe('billing.payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns payment list', async () => {
    const mockPayments = [{ id: 'pay-1', tenantId: TENANT_ID, createdAt: new Date() }];
    currentTx.limit.mockResolvedValueOnce(mockPayments);

    const caller = await buildCaller();
    const result = await caller.billing.payments({ limit: 20 });

    expect(result).toEqual(mockPayments);
    expect(currentTx.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// billing.createCheckoutSession
// ---------------------------------------------------------------------------

describe('billing.createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
    mockStripeCheckoutCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });
  });

  it('creates a Stripe checkout session for solo plan', async () => {
    const caller = await buildCaller();
    const result = await caller.billing.createCheckoutSession({
      planCode: 'solo',
      successUrl: 'https://app.corredor.ar/billing/success',
      cancelUrl: 'https://app.corredor.ar/billing/cancel',
    });

    expect(result).toEqual({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_starter', quantity: 1 }],
        client_reference_id: TENANT_ID,
      }),
    );
  });

  it('throws BAD_REQUEST for enterprise plan (no price configured)', async () => {
    const caller = await buildCaller();
    await expect(
      caller.billing.createCheckoutSession({
        planCode: 'enterprise',
        successUrl: 'https://app.corredor.ar/billing/success',
        cancelUrl: 'https://app.corredor.ar/billing/cancel',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('throws BAD_REQUEST for agencia plan (no price configured)', async () => {
    const caller = await buildCaller();
    await expect(
      caller.billing.createCheckoutSession({
        planCode: 'agencia',
        successUrl: 'https://app.corredor.ar/billing/success',
        cancelUrl: 'https://app.corredor.ar/billing/cancel',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ---------------------------------------------------------------------------
// billing.cancelSubscription
// ---------------------------------------------------------------------------

describe('billing.cancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
    mockStripeSubscriptionsUpdate.mockResolvedValue({});
  });

  it('cancels a subscription at period end', async () => {
    currentTx.limit.mockResolvedValueOnce([mockSub]);

    const caller = await buildCaller();
    const result = await caller.billing.cancelSubscription();

    expect(result).toEqual({ cancelAtPeriodEnd: true });
    expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
      mockSub.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when no subscription exists', async () => {
    currentTx.limit.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(caller.billing.cancelSubscription()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when subscription has no Stripe ID', async () => {
    currentTx.limit.mockResolvedValueOnce([{ ...mockSub, stripeSubscriptionId: null }]);

    const caller = await buildCaller();
    await expect(caller.billing.cancelSubscription()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// billing.reactivateSubscription
// ---------------------------------------------------------------------------

describe('billing.reactivateSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
    mockStripeSubscriptionsUpdate.mockResolvedValue({});
  });

  it('reactivates a subscription', async () => {
    currentTx.limit.mockResolvedValueOnce([{ ...mockSub, cancelAtPeriodEnd: true }]);

    const caller = await buildCaller();
    const result = await caller.billing.reactivateSubscription();

    expect(result).toEqual({ reactivated: true });
    expect(mockStripeSubscriptionsUpdate).toHaveBeenCalledWith(
      mockSub.stripeSubscriptionId,
      { cancel_at_period_end: false },
    );
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when no subscription exists', async () => {
    currentTx.limit.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(caller.billing.reactivateSubscription()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// billing.createMPCheckout
// ---------------------------------------------------------------------------

describe('billing.createMPCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://mp.com/checkout/pref_123',
      }),
    });
  });

  it('creates a Mercado Pago preapproval for monthly interval', async () => {
    // plan lookup: select().from().where() — ends in .where()
    currentTx.where.mockResolvedValueOnce([mockPlan]);

    const caller = await buildCaller();
    const result = await caller.billing.createMPCheckout({
      planCode: 'solo',
      interval: 'monthly',
      successUrl: 'https://app.corredor.ar/billing/success',
      failureUrl: 'https://app.corredor.ar/billing/failure',
      pendingUrl: 'https://app.corredor.ar/billing/pending',
    });

    expect(result).toEqual({
      preferenceId: 'pref_123',
      url: 'https://mp.com/checkout/pref_123',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates a Mercado Pago preference for annual interval', async () => {
    currentTx.where.mockResolvedValueOnce([mockPlan]);

    const caller = await buildCaller();
    const result = await caller.billing.createMPCheckout({
      planCode: 'solo',
      interval: 'annual',
      successUrl: 'https://app.corredor.ar/billing/success',
      failureUrl: 'https://app.corredor.ar/billing/failure',
      pendingUrl: 'https://app.corredor.ar/billing/pending',
    });

    expect(result).toEqual({
      preferenceId: 'pref_123',
      url: 'https://mp.com/checkout/pref_123',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/checkout/preferences',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws PRECONDITION_FAILED when MP_ACCESS_TOKEN is not configured', async () => {
    // Temporarily unset the token via the env module reference
    const envModule = await import('../env.js');
    const originalToken = (envModule.env as Record<string, unknown>).MP_ACCESS_TOKEN;
    (envModule.env as Record<string, unknown>).MP_ACCESS_TOKEN = undefined;

    try {
      const caller = await buildCaller();
      await expect(
        caller.billing.createMPCheckout({
          planCode: 'solo',
          interval: 'monthly',
          successUrl: 'https://app.corredor.ar/billing/success',
          failureUrl: 'https://app.corredor.ar/billing/failure',
          pendingUrl: 'https://app.corredor.ar/billing/pending',
        }),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    } finally {
      (envModule.env as Record<string, unknown>).MP_ACCESS_TOKEN = originalToken;
    }
  });
});

// ---------------------------------------------------------------------------
// billing.retryAfipInvoice
// ---------------------------------------------------------------------------

describe('billing.retryAfipInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('queues a retry for a failed AFIP invoice', async () => {
    currentTx.limit.mockResolvedValueOnce([
      { id: AFIP_INVOICE_ID, status: 'failed', tenantId: TENANT_ID },
    ]);

    const { createQueue } = await import('@corredor/core');

    const caller = await buildCaller();
    const result = await caller.billing.retryAfipInvoice({
      afipInvoiceId: AFIP_INVOICE_ID,
    });

    expect(result).toEqual({ queued: true });
    expect(currentTx.update).toHaveBeenCalled();
    expect(createQueue).toHaveBeenCalledWith(
      'billing-afip-invoice',
      expect.anything(),
    );
  });

  it('throws NOT_FOUND when AFIP invoice does not exist', async () => {
    currentTx.limit.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.billing.retryAfipInvoice({ afipInvoiceId: AFIP_INVOICE_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws BAD_REQUEST when invoice is already approved', async () => {
    currentTx.limit.mockResolvedValueOnce([
      { id: AFIP_INVOICE_ID, status: 'approved', tenantId: TENANT_ID },
    ]);

    const caller = await buildCaller();
    await expect(
      caller.billing.retryAfipInvoice({ afipInvoiceId: AFIP_INVOICE_ID }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Invoice already approved' });
  });
});

// ---------------------------------------------------------------------------
// billing.afipInvoices
// ---------------------------------------------------------------------------

describe('billing.afipInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns AFIP invoice list', async () => {
    const mockInvoices = [
      { id: AFIP_INVOICE_ID, tenantId: TENANT_ID, status: 'approved', createdAt: new Date() },
    ];
    currentTx.limit.mockResolvedValueOnce(mockInvoices);

    const caller = await buildCaller();
    const result = await caller.billing.afipInvoices({ limit: 20 });

    expect(result).toEqual(mockInvoices);
    expect(currentTx.select).toHaveBeenCalled();
  });
});
