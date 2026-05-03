/**
 * Portals router tests — RENA-177
 *
 * Unit tests for all portals procedures using mocked DB, Redis, and
 * @corredor/portals adapters. Uses tRPC createCaller.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

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
// @corredor/portals mock
// ---------------------------------------------------------------------------

const mockValidateCredentials = vi.fn().mockResolvedValue({ valid: true });
const mockGetAdapter = vi.fn().mockReturnValue({
  validateCredentials: mockValidateCredentials,
});

vi.mock('@corredor/portals', () => ({
  encryptCredentials: vi.fn().mockReturnValue({ encrypted: 'mock-encrypted-creds' }),
  portalIdSchema: z.enum(['mercadolibre', 'proppit', 'zonaprop']),
  getAdapter: mockGetAdapter,
  registerAdapter: vi.fn(),
  mercadolibreAdapter: { id: 'mercadolibre' },
  proppitAdapter: { id: 'proppit' },
}));

// ---------------------------------------------------------------------------
// @corredor/db mock
// ---------------------------------------------------------------------------

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => mockDb),
  setTenantContext: vi.fn(),
  portalConnection: {
    id: 'id',
    tenantId: 'tenant_id',
    portal: 'portal',
    label: 'label',
    status: 'status',
    config: 'config',
    credentials: 'credentials',
    lastSyncAt: 'last_sync_at',
    errorMessage: 'error_message',
    deletedAt: 'deleted_at',
    createdAt: 'created_at',
    createdBy: 'created_by',
    updatedAt: 'updated_at',
    updatedBy: 'updated_by',
    version: 'version',
  },
  propertyPortalPublication: {
    id: 'id',
    tenantId: 'tenant_id',
    propertyId: 'property_id',
    portalConnectionId: 'portal_connection_id',
    status: 'status',
    deletedAt: 'deleted_at',
    updatedAt: 'updated_at',
    portalSpecificFields: 'portal_specific_fields',
    createdBy: 'created_by',
    updatedBy: 'updated_by',
  },
  portalSyncLog: {
    id: 'id',
    tenantId: 'tenant_id',
    portalConnectionId: 'portal_connection_id',
    action: 'action',
    status: 'status',
    createdAt: 'created_at',
    responsePayload: 'response_payload',
  },
  // Tables used by assert-feature
  plan: { id: 'id', code: 'code', isActive: 'is_active', sortOrder: 'sort_order', displayName: 'display_name' },
  planFeature: { planCode: 'plan_code', featureKey: 'feature_key' },
  subscription: { id: 'id', tenantId: 'tenant_id', planCode: 'plan_code' },
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
    PORTAL_PUBLISH: 'portal-publish',
    PORTAL_UNPUBLISH: 'portal-unpublish',
    BILLING_AFIP_INVOICE: 'billing-afip-invoice',
    IMPORT_CSV: 'import-csv',
  },
}));

// ---------------------------------------------------------------------------
// env mock (portals.ts doesn't import env directly but trpc.ts middleware may)
// ---------------------------------------------------------------------------

vi.mock('../env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    AUTH_ENCRYPTION_KEY: 'test-encryption-key-32chars-long!!',
    NODE_ENV: 'test',
  },
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
// Test constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const CONN_ID = '00000000-0000-0000-0000-000000000020';
const PROPERTY_ID = '00000000-0000-0000-0000-000000000001';
const PUBLICATION_ID = '00000000-0000-0000-0000-000000000030';

const mockConnection = {
  id: CONN_ID,
  tenantId: TENANT_ID,
  portal: 'mercadolibre',
  label: 'MercadoLibre Principal',
  status: 'active',
  config: {},
  credentials: { encrypted: 'mock-creds' },
  lastSyncAt: null,
  errorMessage: null,
  deletedAt: null,
  createdAt: new Date(),
  createdBy: USER_ID,
  updatedAt: new Date(),
  updatedBy: USER_ID,
  version: 1,
};

const mockPublication = {
  id: PUBLICATION_ID,
  tenantId: TENANT_ID,
  propertyId: PROPERTY_ID,
  portalConnectionId: CONN_ID,
  status: 'draft',
  deletedAt: null,
  updatedAt: new Date(),
  portalSpecificFields: {},
  createdBy: USER_ID,
  updatedBy: USER_ID,
};

const mockSyncLog = {
  id: 'log-1',
  tenantId: TENANT_ID,
  portalConnectionId: CONN_ID,
  action: 'publish',
  status: 'success',
  createdAt: new Date(),
  responsePayload: null,
};

// ---------------------------------------------------------------------------
// buildCaller helper
// ---------------------------------------------------------------------------

async function buildCaller() {
  const { portalsRouter } = await import('../routers/portals.js');
  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();

  const c = {
    req: { header: vi.fn().mockReturnValue(undefined), method: 'POST' },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  const { router: appRouter } = await import('../trpc.js');
  const testRouter = appRouter({ portals: portalsRouter });

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
// portals.connections.list
// ---------------------------------------------------------------------------

describe('portals.connections.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns portal connections for the tenant', async () => {
    currentTx.orderBy.mockResolvedValueOnce([mockConnection]);

    const caller = await buildCaller();
    const result = await caller.portals.connections.list();

    expect(result).toEqual([mockConnection]);
    expect(currentTx.select).toHaveBeenCalled();
    expect(currentTx.orderBy).toHaveBeenCalled();
  });

  it('returns empty array when no connections exist', async () => {
    currentTx.orderBy.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    const result = await caller.portals.connections.list();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// portals.connections.create
// ---------------------------------------------------------------------------

describe('portals.connections.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('creates a portal connection and returns it', async () => {
    currentTx.returning.mockResolvedValueOnce([mockConnection]);

    const caller = await buildCaller();
    const result = await caller.portals.connections.create({
      portal: 'mercadolibre',
      label: 'MercadoLibre Principal',
      credentials: { accessToken: 'test-token' },
      config: {},
    });

    expect(result).toEqual(mockConnection);
    expect(currentTx.insert).toHaveBeenCalled();
    expect(currentTx.returning).toHaveBeenCalled();
  });

  it('encrypts credentials before inserting', async () => {
    currentTx.returning.mockResolvedValueOnce([mockConnection]);

    const { encryptCredentials } = await import('@corredor/portals');
    const caller = await buildCaller();
    await caller.portals.connections.create({
      portal: 'mercadolibre',
      credentials: { accessToken: 'sensitive-token' },
      config: {},
    });

    expect(encryptCredentials).toHaveBeenCalledWith({ accessToken: 'sensitive-token' });
  });
});

// ---------------------------------------------------------------------------
// portals.connections.delete
// ---------------------------------------------------------------------------

describe('portals.connections.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('soft-deletes an existing connection', async () => {
    // First query: select({id}) to check existence — ends in .where()
    currentTx.where.mockResolvedValueOnce([{ id: CONN_ID }]);
    // Second: update — chain resolves void

    const caller = await buildCaller();
    const result = await caller.portals.connections.delete({ id: CONN_ID });

    expect(result).toEqual({ success: true });
    expect(currentTx.select).toHaveBeenCalled();
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when connection does not exist', async () => {
    currentTx.where.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.portals.connections.delete({ id: CONN_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// portals.connections.testConnection
// ---------------------------------------------------------------------------

describe('portals.connections.testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
    mockValidateCredentials.mockResolvedValue({ valid: true });
    mockGetAdapter.mockReturnValue({ validateCredentials: mockValidateCredentials });
  });

  it('returns valid result and updates connection status to active', async () => {
    // select().from().where() — ends in .where()
    currentTx.where.mockResolvedValueOnce([mockConnection]);

    const caller = await buildCaller();
    const result = await caller.portals.connections.testConnection({ id: CONN_ID });

    expect(result).toEqual({ valid: true });
    expect(mockValidateCredentials).toHaveBeenCalledWith(mockConnection.credentials);
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('returns error result and updates connection status to error', async () => {
    currentTx.where.mockResolvedValueOnce([mockConnection]);
    mockValidateCredentials.mockResolvedValue({ valid: false, error: 'Invalid token' });

    const caller = await buildCaller();
    const result = await caller.portals.connections.testConnection({ id: CONN_ID });

    expect(result).toEqual({ valid: false, error: 'Invalid token' });
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when connection does not exist', async () => {
    currentTx.where.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.portals.connections.testConnection({ id: CONN_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// portals.publications.publish
// ---------------------------------------------------------------------------

describe('portals.publications.publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('creates a publication and returns it', async () => {
    // Connection check — ends in .where()
    currentTx.where.mockResolvedValueOnce([{ id: CONN_ID, status: 'active' }]);
    // Insert publication — ends in .returning()
    currentTx.returning.mockResolvedValueOnce([mockPublication]);

    const caller = await buildCaller();
    const result = await caller.portals.publications.publish({
      propertyId: PROPERTY_ID,
      portalConnectionId: CONN_ID,
      portalSpecificFields: {},
    });

    expect(result).toEqual(mockPublication);
    expect(currentTx.insert).toHaveBeenCalled();
    expect(currentTx.returning).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when portal connection does not exist', async () => {
    currentTx.where.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.portals.publications.publish({
        propertyId: PROPERTY_ID,
        portalConnectionId: CONN_ID,
        portalSpecificFields: {},
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws PRECONDITION_FAILED when connection is not active', async () => {
    currentTx.where.mockResolvedValueOnce([{ id: CONN_ID, status: 'pending_auth' }]);

    const caller = await buildCaller();
    await expect(
      caller.portals.publications.publish({
        propertyId: PROPERTY_ID,
        portalConnectionId: CONN_ID,
        portalSpecificFields: {},
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });
});

// ---------------------------------------------------------------------------
// portals.publications.unpublish
// ---------------------------------------------------------------------------

describe('portals.publications.unpublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('sets publication to unpublishing status', async () => {
    // select publication check — ends in .where()
    currentTx.where.mockResolvedValueOnce([mockPublication]);

    const caller = await buildCaller();
    const result = await caller.portals.publications.unpublish({
      publicationId: PUBLICATION_ID,
    });

    expect(result).toEqual({ success: true });
    expect(currentTx.update).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when publication does not exist', async () => {
    currentTx.where.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.portals.publications.unpublish({ publicationId: PUBLICATION_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// portals.publications.bulkPublish
// ---------------------------------------------------------------------------

describe('portals.publications.bulkPublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('creates publications for multiple properties', async () => {
    const PROPERTY_ID_2 = '00000000-0000-0000-0000-000000000002';
    const mockPubs = [
      { ...mockPublication, id: 'pub-1', propertyId: PROPERTY_ID },
      { ...mockPublication, id: 'pub-2', propertyId: PROPERTY_ID_2 },
    ];

    // Connection check
    currentTx.where.mockResolvedValueOnce([{ id: CONN_ID, status: 'active' }]);
    // Insert bulk publications
    currentTx.returning.mockResolvedValueOnce(mockPubs);

    const caller = await buildCaller();
    const result = await caller.portals.publications.bulkPublish({
      propertyIds: [PROPERTY_ID, PROPERTY_ID_2],
      portalConnectionId: CONN_ID,
    });

    expect(result).toEqual({ created: 2, publications: mockPubs });
    expect(currentTx.insert).toHaveBeenCalled();
    expect(currentTx.returning).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when portal connection does not exist', async () => {
    currentTx.where.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    await expect(
      caller.portals.publications.bulkPublish({
        propertyIds: [PROPERTY_ID],
        portalConnectionId: CONN_ID,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws PRECONDITION_FAILED when connection is not active', async () => {
    currentTx.where.mockResolvedValueOnce([{ id: CONN_ID, status: 'error' }]);

    const caller = await buildCaller();
    await expect(
      caller.portals.publications.bulkPublish({
        propertyIds: [PROPERTY_ID],
        portalConnectionId: CONN_ID,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });
});

// ---------------------------------------------------------------------------
// portals.publications.syncStatus
// ---------------------------------------------------------------------------

describe('portals.publications.syncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns sync statuses for a property', async () => {
    const mockStatuses = [
      {
        publication: mockPublication,
        connectionPortal: 'mercadolibre',
        connectionLabel: 'MercadoLibre Principal',
        connectionStatus: 'active',
      },
    ];
    currentTx.limit.mockResolvedValueOnce(mockStatuses);

    const caller = await buildCaller();
    const result = await caller.portals.publications.syncStatus({
      propertyId: PROPERTY_ID,
      limit: 50,
    });

    expect(result).toEqual(mockStatuses);
    expect(currentTx.leftJoin).toHaveBeenCalled();
  });

  it('returns sync statuses for a portal connection', async () => {
    const mockStatuses = [
      {
        publication: mockPublication,
        connectionPortal: 'mercadolibre',
        connectionLabel: null,
        connectionStatus: 'active',
      },
    ];
    currentTx.limit.mockResolvedValueOnce(mockStatuses);

    const caller = await buildCaller();
    const result = await caller.portals.publications.syncStatus({
      portalConnectionId: CONN_ID,
      limit: 50,
    });

    expect(result).toEqual(mockStatuses);
  });
});

// ---------------------------------------------------------------------------
// portals.portalLeads.list
// ---------------------------------------------------------------------------

describe('portals.portalLeads.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns portal leads from sync logs', async () => {
    const mockLogs = [
      {
        log: {
          ...mockSyncLog,
          action: 'fetch_leads',
          responsePayload: { leads: [{ id: 'lead-1', name: 'Juan Perez' }] },
        },
        connectionPortal: 'mercadolibre',
        connectionLabel: 'MercadoLibre Principal',
      },
    ];
    currentTx.limit.mockResolvedValueOnce(mockLogs);

    const caller = await buildCaller();
    const result = await caller.portals.portalLeads.list({ limit: 50 });

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({
      portal: 'mercadolibre',
      connectionLabel: 'MercadoLibre Principal',
      leads: [{ id: 'lead-1', name: 'Juan Perez' }],
    });
  });

  it('returns empty leads array when responsePayload has no leads', async () => {
    const mockLogs = [
      {
        log: { ...mockSyncLog, action: 'fetch_leads', responsePayload: null },
        connectionPortal: 'proppit',
        connectionLabel: null,
      },
    ];
    currentTx.limit.mockResolvedValueOnce(mockLogs);

    const caller = await buildCaller();
    const result = await caller.portals.portalLeads.list({ limit: 50 });

    expect(result[0]).toMatchObject({ leads: [] });
  });
});

// ---------------------------------------------------------------------------
// portals.syncLogs.list
// ---------------------------------------------------------------------------

describe('portals.syncLogs.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = makeMockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns sync logs for a connection', async () => {
    const mockLogs = [mockSyncLog, { ...mockSyncLog, id: 'log-2', action: 'unpublish' }];
    currentTx.limit.mockResolvedValueOnce(mockLogs);

    const caller = await buildCaller();
    const result = await caller.portals.syncLogs.list({
      connectionId: CONN_ID,
      limit: 20,
    });

    expect(result).toEqual(mockLogs);
    expect(currentTx.select).toHaveBeenCalled();
    expect(currentTx.orderBy).toHaveBeenCalled();
  });

  it('returns empty array when no logs exist for connection', async () => {
    currentTx.limit.mockResolvedValueOnce([]);

    const caller = await buildCaller();
    const result = await caller.portals.syncLogs.list({
      connectionId: CONN_ID,
      limit: 20,
    });

    expect(result).toEqual([]);
  });
});
