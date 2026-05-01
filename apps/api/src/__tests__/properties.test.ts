/**
 * Properties router tests — RENA-30
 *
 * Unit tests for all 7 procedures using mocked DB, Redis, BullMQ, and session.
 * Uses tRPC createCaller to invoke procedures with a pre-built authenticated context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ---------------------------------------------------------------------------
// Mocks (declared before any import from the API layer)
// ---------------------------------------------------------------------------

// We need to capture the mock db / tx so individual tests can override findFirst etc.
const mockTx = () => ({
  execute: vi.fn(),
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
  returning: vi.fn().mockResolvedValue([{ id: 'import-job-id-1' }]),
  query: {
    property: { findFirst: vi.fn().mockResolvedValue(null) },
    importJob: { findFirst: vi.fn().mockResolvedValue(null) },
  },
});

let currentTx = mockTx();

const mockDb = {
  execute: vi.fn(),
  select: vi.fn(() => currentTx),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn(() => currentTx),
  update: vi.fn(() => currentTx),
  delete: vi.fn(() => currentTx),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'import-job-id-1' }]),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx)),
  query: {
    property: { findFirst: vi.fn().mockResolvedValue(null) },
    importJob: { findFirst: vi.fn().mockResolvedValue(null) },
  },
};

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => mockDb),
  setTenantContext: vi.fn(),
  // Schema tables — export stubs so the router can import them
  property: {
    id: 'id',
    tenantId: 'tenant_id',
    deletedAt: 'deleted_at',
    deletedBy: 'deleted_by',
    deletionReason: 'deletion_reason',
    deletionNote: 'deletion_note',
    autoPurgeAt: 'auto_purge_at',
    updatedAt: 'updated_at',
    updatedBy: 'updated_by',
    status: 'status',
    featured: 'featured',
    branchId: 'branch_id',
    version: 'version',
  },
  propertyHistory: {
    id: 'id',
    tenantId: 'tenant_id',
    propertyId: 'property_id',
    createdAt: 'created_at',
  },
  importJob: {
    id: 'id',
    tenantId: 'tenant_id',
    createdBy: 'created_by',
    status: 'status',
    originalFilename: 'original_filename',
    columnMapping: 'column_mapping',
    $inferInsert: {},
  },
  propertyTag: {
    id: 'id',
    tenantId: 'tenant_id',
    propertyId: 'property_id',
    tagId: 'tag_id',
  },
  propertyDeletionReasonEnum: {
    enumValues: ['sold_externally', 'owner_withdrew', 'duplicate', 'data_error', 'other'],
  },
  propertyStatusEnum: {
    enumValues: ['active', 'reserved', 'sold', 'paused', 'archived'],
  },
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

vi.mock('@corredor/core', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    resetAt: Math.floor(Date.now() / 1000) + 60,
    retryAfterSeconds: 0,
  }),
  RateLimitPresets: {
    API_WRITE_AUTHENTICATED: { windowMs: 60000, maxRequests: 100 },
    API_READ_AUTHENTICATED: { windowMs: 60000, maxRequests: 200 },
  },
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  QUEUE_NAMES: { IMPORT_CSV: 'import-csv' },
}));

// Override setup.ts bullmq stub to also include Queue
vi.mock('bullmq', () => ({
  Worker: vi.fn(),
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock session middleware so tenantMiddleware succeeds
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
// Test helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const PROPERTY_ID = '00000000-0000-0000-0000-000000000001';
const IMPORT_JOB_ID = '00000000-0000-0000-0000-000000000002';

async function buildCaller() {
  const { propertiesRouter } = await import('../routers/properties.js');

  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();

  // Minimal Hono-like context stub
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = {
    req: {
      header: vi.fn().mockReturnValue(undefined),
      method: 'POST',
    },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  // Import the real router (which uses protectedProcedure with all middleware)
  const { router: appRouter } = await import('../trpc.js');
  const testRouter = appRouter({ properties: propertiesRouter });

  const caller = testRouter.createCaller({
    c,
    requestId: 'test-request-id',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: mockDb as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis: redis as any,
    sessionId: 'sess-1',
  });

  return caller;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('properties.softDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('soft-deletes a property that exists and is not deleted', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
    });

    const caller = await buildCaller();
    const result = await caller.properties.softDelete({
      propertyId: PROPERTY_ID,
      reason: 'duplicate',
      note: 'Test note',
    });

    expect(result).toEqual({ success: true });
    expect(currentTx.update).toHaveBeenCalled();
    expect(currentTx.insert).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when property does not exist', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce(null);

    const caller = await buildCaller();
    await expect(
      caller.properties.softDelete({ propertyId: PROPERTY_ID, reason: 'other' }),
    ).rejects.toThrow(TRPCError);

    await expect(
      caller.properties.softDelete({ propertyId: PROPERTY_ID, reason: 'other' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('properties.restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('restores a soft-deleted property', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      deletedAt: new Date('2026-01-01'),
    });

    const caller = await buildCaller();
    const result = await caller.properties.restore({ propertyId: PROPERTY_ID });

    expect(result).toEqual({ success: true });
    expect(currentTx.update).toHaveBeenCalled();
    expect(currentTx.insert).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when property is not deleted', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce(null);

    const caller = await buildCaller();
    await expect(
      caller.properties.restore({ propertyId: PROPERTY_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('properties.listTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    // listTrash is a query — chain: select().from().where().orderBy().limit().offset()
    currentTx.select.mockReturnValue(currentTx);
    currentTx.from.mockReturnValue(currentTx);
    currentTx.where.mockReturnValue(currentTx);
    currentTx.orderBy.mockReturnValue(currentTx);
    currentTx.limit.mockReturnValue(currentTx);
    currentTx.offset.mockResolvedValue([
      { id: PROPERTY_ID, tenantId: TENANT_ID, deletedAt: new Date() },
    ]);
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns paginated deleted properties', async () => {
    const caller = await buildCaller();
    const result = await caller.properties.listTrash({ page: 1, pageSize: 10 });

    expect(result).toMatchObject({ page: 1, pageSize: 10 });
    expect(Array.isArray(result.items)).toBe(true);
    expect(currentTx.select).toHaveBeenCalled();
  });
});

describe('properties.bulkEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    // bulkEdit uses select() then update()
    currentTx.select.mockReturnValue(currentTx);
    currentTx.from.mockReturnValue(currentTx);
    currentTx.where.mockResolvedValue([
      { id: PROPERTY_ID, status: 'active', featured: false, branchId: null },
    ]);
    currentTx.update.mockReturnValue(currentTx);
    currentTx.set.mockReturnValue(currentTx);
    // where on update chain should resolve
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('updates status for multiple properties', async () => {
    const caller = await buildCaller();
    const result = await caller.properties.bulkEdit({
      propertyIds: [PROPERTY_ID],
      patch: { status: 'reserved' },
    });

    expect(result).toEqual({ updatedCount: 1 });
  });

  it('throws validation error on empty patch', async () => {
    const caller = await buildCaller();
    await expect(
      caller.properties.bulkEdit({
        propertyIds: [PROPERTY_ID],
        patch: {} as { status: 'active' }, // force empty patch
      }),
    ).rejects.toThrow();
  });
});

describe('properties.getHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    currentTx.select.mockReturnValue(currentTx);
    currentTx.from.mockReturnValue(currentTx);
    currentTx.where.mockReturnValue(currentTx);
    currentTx.orderBy.mockReturnValue(currentTx);
    currentTx.limit.mockReturnValue(currentTx);
    currentTx.offset.mockResolvedValue([
      { id: 'hist-1', propertyId: PROPERTY_ID, field: 'status', oldValue: 'active', newValue: 'sold' },
    ]);
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns history rows for a property', async () => {
    const caller = await buildCaller();
    const result = await caller.properties.getHistory({ propertyId: PROPERTY_ID });

    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe('properties.startImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    currentTx.insert.mockReturnValue(currentTx);
    currentTx.values.mockReturnValue(currentTx);
    currentTx.returning.mockResolvedValue([{ id: IMPORT_JOB_ID }]);
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('creates an import job and enqueues a BullMQ task', async () => {
    const { createQueue } = await import('@corredor/core');

    const caller = await buildCaller();
    const result = await caller.properties.startImport({
      originalFilename: 'properties.csv',
      columnMapping: { title: 'Title', address: 'Address' },
      csvBase64: 'base64encodedcsvdata',
    });

    expect(result).toHaveProperty('importJobId');
    expect(result.importJobId).toBe(IMPORT_JOB_ID);
    expect(currentTx.insert).toHaveBeenCalled();
    expect(createQueue).toHaveBeenCalledWith(
      expect.stringContaining('import-csv'),
      expect.anything(),
    );
  });

  it('throws validation error when neither csvBase64 nor csvStorageKey provided', async () => {
    const caller = await buildCaller();
    await expect(
      caller.properties.startImport({
        originalFilename: 'properties.csv',
        columnMapping: {},
        // neither csvBase64 nor csvStorageKey
      }),
    ).rejects.toThrow();
  });
});

describe('properties.getImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('returns import job when found', async () => {
    const jobRow = {
      id: IMPORT_JOB_ID,
      tenantId: TENANT_ID,
      status: 'pending',
      originalFilename: 'test.csv',
      columnMapping: {},
      createdAt: new Date(),
    };
    currentTx.query.importJob.findFirst.mockResolvedValueOnce(jobRow);

    const caller = await buildCaller();
    const result = await caller.properties.getImport({ importJobId: IMPORT_JOB_ID });

    expect(result).toEqual(jobRow);
  });

  it('throws NOT_FOUND for unknown import job', async () => {
    currentTx.query.importJob.findFirst.mockResolvedValueOnce(null);

    const caller = await buildCaller();
    await expect(
      caller.properties.getImport({ importJobId: IMPORT_JOB_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// Optimistic locking tests — RENA-70
// ---------------------------------------------------------------------------

describe('properties.softDelete — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('succeeds when supplied version matches DB version', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      version: 3,
    });

    const caller = await buildCaller();
    const result = await caller.properties.softDelete({
      propertyId: PROPERTY_ID,
      reason: 'duplicate',
      version: 3,
    });

    expect(result).toEqual({ success: true });
  });

  it('throws CONFLICT (409) when supplied version does not match', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      version: 5,
    });

    const caller = await buildCaller();
    await expect(
      caller.properties.softDelete({ propertyId: PROPERTY_ID, reason: 'duplicate', version: 3 }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when version is omitted (backwards-compatible)', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      version: 7,
    });

    const caller = await buildCaller();
    const result = await caller.properties.softDelete({
      propertyId: PROPERTY_ID,
      reason: 'other',
    });

    expect(result).toEqual({ success: true });
  });
});

describe('properties.restore — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('succeeds when supplied version matches DB version', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      deletedAt: new Date('2026-01-01'),
      version: 2,
    });

    const caller = await buildCaller();
    const result = await caller.properties.restore({ propertyId: PROPERTY_ID, version: 2 });

    expect(result).toEqual({ success: true });
  });

  it('throws CONFLICT (409) when supplied version does not match', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      deletedAt: new Date('2026-01-01'),
      version: 4,
    });

    const caller = await buildCaller();
    await expect(
      caller.properties.restore({ propertyId: PROPERTY_ID, version: 2 }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when version is omitted', async () => {
    currentTx.query.property.findFirst.mockResolvedValueOnce({
      id: PROPERTY_ID,
      deletedAt: new Date('2026-01-01'),
      version: 9,
    });

    const caller = await buildCaller();
    const result = await caller.properties.restore({ propertyId: PROPERTY_ID });

    expect(result).toEqual({ success: true });
  });
});

describe('properties.bulkEdit — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    currentTx.select.mockReturnValue(currentTx);
    currentTx.from.mockReturnValue(currentTx);
    currentTx.update.mockReturnValue(currentTx);
    currentTx.set.mockReturnValue(currentTx);
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('succeeds when all supplied versions match', async () => {
    currentTx.where.mockResolvedValueOnce([
      { id: PROPERTY_ID, status: 'active', featured: false, branchId: null, version: 3 },
    ]);

    const caller = await buildCaller();
    const result = await caller.properties.bulkEdit({
      propertyIds: [PROPERTY_ID],
      patch: { status: 'reserved' },
      versions: { [PROPERTY_ID]: 3 },
    });

    expect(result).toEqual({ updatedCount: 1 });
  });

  it('throws CONFLICT (409) when any version mismatches', async () => {
    const ID_2 = '00000000-0000-0000-0000-000000000099';
    currentTx.where.mockResolvedValueOnce([
      { id: PROPERTY_ID, status: 'active', featured: false, branchId: null, version: 3 },
      { id: ID_2, status: 'active', featured: true, branchId: null, version: 5 },
    ]);

    const caller = await buildCaller();
    await expect(
      caller.properties.bulkEdit({
        propertyIds: [PROPERTY_ID, ID_2],
        patch: { status: 'sold' },
        versions: { [PROPERTY_ID]: 3, [ID_2]: 2 },
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when versions map is omitted', async () => {
    currentTx.where.mockResolvedValueOnce([
      { id: PROPERTY_ID, status: 'active', featured: false, branchId: null, version: 10 },
    ]);

    const caller = await buildCaller();
    const result = await caller.properties.bulkEdit({
      propertyIds: [PROPERTY_ID],
      patch: { featured: true },
    });

    expect(result).toEqual({ updatedCount: 1 });
  });
});
