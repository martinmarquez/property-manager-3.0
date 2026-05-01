/**
 * Contacts router — optimistic locking tests (RENA-70)
 *
 * Tests: 409 on stale version, 200 on correct version, no-op on omitted version.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'contact-1' }]),
  query: {
    contact: { findFirst: vi.fn().mockResolvedValue(null) },
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
  returning: vi.fn().mockResolvedValue([{ id: 'contact-1' }]),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx)),
  query: {
    contact: { findFirst: vi.fn().mockResolvedValue(null) },
  },
};

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => mockDb),
  setTenantContext: vi.fn(),
  contact: {
    id: 'id',
    tenantId: 'tenant_id',
    deletedAt: 'deleted_at',
    deletedBy: 'deleted_by',
    deletionReason: 'deletion_reason',
    updatedAt: 'updated_at',
    updatedBy: 'updated_by',
    version: 'version',
    mergeWinnerId: 'merge_winner_id',
    firstName: 'first_name',
    lastName: 'last_name',
    type: 'type',
  },
  contactTag: {
    id: 'id',
    tenantId: 'tenant_id',
    contactId: 'contact_id',
    tag: 'tag',
    createdBy: 'created_by',
  },
  contactRelationship: {
    id: 'id',
    tenantId: 'tenant_id',
    fromContactId: 'from_contact_id',
    toContactId: 'to_contact_id',
    kindId: 'kind_id',
    deletedAt: 'deleted_at',
  },
  contactRelationshipKind: {
    id: 'id',
    tenantId: 'tenant_id',
  },
  contactSegment: {
    id: 'id',
    tenantId: 'tenant_id',
  },
  contactSegmentMember: {
    id: 'id',
    tenantId: 'tenant_id',
    contactId: 'contact_id',
  },
  contactImportJob: {
    id: 'id',
    tenantId: 'tenant_id',
  },
  contactImportRow: {
    id: 'id',
  },
  dsrRequest: {
    id: 'id',
    tenantId: 'tenant_id',
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
  scoreDuplicateFields: vi.fn().mockReturnValue([]),
  createQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  buildAccessBundle: vi.fn().mockResolvedValue({}),
  buildPortabilityBundle: vi.fn().mockResolvedValue({}),
  buildDeletePatch: vi.fn().mockReturnValue({}),
  QUEUE_NAMES: { IMPORT_CSV: 'import-csv', CONTACT_IMPORT: 'contact-import' },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn(),
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

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
// Helpers
// ---------------------------------------------------------------------------

const CONTACT_ID = '00000000-0000-0000-0000-000000000010';
const CONTACT_ID_2 = '00000000-0000-0000-0000-000000000020';

async function buildCaller() {
  const { contactsRouter } = await import('../routers/contacts.js');

  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();

  const c = {
    req: {
      header: vi.fn().mockReturnValue(undefined),
      method: 'POST',
    },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  const { router: appRouter } = await import('../trpc.js');
  const testRouter = appRouter({ contacts: contactsRouter });

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

describe('contacts.update — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('succeeds when supplied version matches DB version', async () => {
    currentTx.query.contact.findFirst.mockResolvedValueOnce({ version: 4 });

    const caller = await buildCaller();
    const result = await caller.contacts.update({
      id: CONTACT_ID,
      version: 4,
      data: { firstName: 'Updated' },
    });

    expect(result).toEqual({ ok: true });
  });

  it('throws CONFLICT (409) when supplied version does not match', async () => {
    currentTx.query.contact.findFirst.mockResolvedValueOnce({ version: 6 });

    const caller = await buildCaller();
    await expect(
      caller.contacts.update({ id: CONTACT_ID, version: 3, data: { firstName: 'Stale' } }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when version is omitted (backwards-compatible)', async () => {
    const caller = await buildCaller();
    const result = await caller.contacts.update({
      id: CONTACT_ID,
      data: { firstName: 'NoVersion' },
    });

    expect(result).toEqual({ ok: true });
    expect(currentTx.query.contact.findFirst).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when contact does not exist and version is supplied', async () => {
    currentTx.query.contact.findFirst.mockResolvedValueOnce(null);

    const caller = await buildCaller();
    await expect(
      caller.contacts.update({ id: CONTACT_ID, version: 1, data: { firstName: 'Ghost' } }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('contacts.restore — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  it('succeeds when supplied version matches', async () => {
    currentTx.query.contact.findFirst.mockResolvedValueOnce({ version: 2 });

    const caller = await buildCaller();
    const result = await caller.contacts.restore({ id: CONTACT_ID, version: 2 });

    expect(result).toEqual({ ok: true });
  });

  it('throws CONFLICT when version mismatches', async () => {
    currentTx.query.contact.findFirst.mockResolvedValueOnce({ version: 5 });

    const caller = await buildCaller();
    await expect(
      caller.contacts.restore({ id: CONTACT_ID, version: 2 }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when version is omitted', async () => {
    const caller = await buildCaller();
    const result = await caller.contacts.restore({ id: CONTACT_ID });

    expect(result).toEqual({ ok: true });
    expect(currentTx.query.contact.findFirst).not.toHaveBeenCalled();
  });
});

describe('contacts.merge — optimistic locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    currentTx.select.mockReturnValue(currentTx);
    currentTx.from.mockReturnValue(currentTx);
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  const winnerContact = {
    id: CONTACT_ID,
    tenantId: 'tenant-1',
    type: 'person',
    firstName: 'Alice',
    lastName: 'Smith',
    version: 3,
    phones: [],
    emails: [],
    addresses: [],
  };

  const loserContact = {
    id: CONTACT_ID_2,
    tenantId: 'tenant-1',
    type: 'person',
    firstName: 'Bob',
    lastName: 'Jones',
    version: 2,
    phones: [],
    emails: [],
    addresses: [],
  };

  it('succeeds when both versions match', async () => {
    currentTx.query.contact.findFirst
      .mockResolvedValueOnce(winnerContact)
      .mockResolvedValueOnce(loserContact);
    currentTx.where.mockResolvedValue([]);

    const caller = await buildCaller();
    const result = await caller.contacts.merge({
      winnerId: CONTACT_ID,
      loserId: CONTACT_ID_2,
      winnerVersion: 3,
      loserVersion: 2,
    });

    expect(result).toMatchObject({ ok: true, winnerId: CONTACT_ID });
  });

  it('throws CONFLICT when winner version is stale', async () => {
    currentTx.query.contact.findFirst
      .mockResolvedValueOnce({ ...winnerContact, version: 5 })
      .mockResolvedValueOnce(loserContact);

    const caller = await buildCaller();
    await expect(
      caller.contacts.merge({
        winnerId: CONTACT_ID,
        loserId: CONTACT_ID_2,
        winnerVersion: 3,
        loserVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('throws CONFLICT when loser version is stale', async () => {
    currentTx.query.contact.findFirst
      .mockResolvedValueOnce(winnerContact)
      .mockResolvedValueOnce({ ...loserContact, version: 7 });

    const caller = await buildCaller();
    await expect(
      caller.contacts.merge({
        winnerId: CONTACT_ID,
        loserId: CONTACT_ID_2,
        winnerVersion: 3,
        loserVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: 'stale_version' });
  });

  it('skips version check when versions are omitted', async () => {
    currentTx.query.contact.findFirst
      .mockResolvedValueOnce(winnerContact)
      .mockResolvedValueOnce(loserContact);
    currentTx.where.mockResolvedValue([]);

    const caller = await buildCaller();
    const result = await caller.contacts.merge({
      winnerId: CONTACT_ID,
      loserId: CONTACT_ID_2,
    });

    expect(result).toMatchObject({ ok: true });
  });
});
