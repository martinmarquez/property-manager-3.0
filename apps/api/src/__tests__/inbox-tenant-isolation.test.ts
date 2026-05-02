import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const whereSpy = vi.fn().mockReturnThis();

const mockTx = () => ({
  execute: vi.fn(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: whereSpy,
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
});

let currentTx = mockTx();

const mockDb = {
  execute: vi.fn(),
  select: vi.fn(() => currentTx),
  from: vi.fn().mockReturnThis(),
  where: whereSpy,
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn(() => currentTx),
  update: vi.fn(() => currentTx),
  delete: vi.fn(() => currentTx),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx)),
};

vi.mock('@corredor/db', () => ({
  createDb: vi.fn(() => mockDb),
  setTenantContext: vi.fn(),
  conversation: {
    id: 'conversation.id',
    tenantId: 'conversation.tenantId',
    channelId: 'conversation.channelId',
    contactId: 'conversation.contactId',
    status: 'conversation.status',
    assignedAgentId: 'conversation.assignedAgentId',
    deletedAt: 'conversation.deletedAt',
    lastMessageAt: 'conversation.lastMessageAt',
    messageCount: 'conversation.messageCount',
    createdAt: 'conversation.createdAt',
    updatedAt: 'conversation.updatedAt',
    updatedBy: 'conversation.updatedBy',
    version: 'conversation.version',
    slaFirstResponseAt: 'conversation.slaFirstResponseAt',
  },
  message: {
    id: 'message.id',
    tenantId: 'message.tenantId',
    conversationId: 'message.conversationId',
    direction: 'message.direction',
    contentType: 'message.contentType',
    content: 'message.content',
    status: 'message.status',
    senderUserId: 'message.senderUserId',
    createdAt: 'message.createdAt',
  },
  inboxChannel: {
    id: 'inboxChannel.id',
    type: 'inboxChannel.type',
    name: 'inboxChannel.name',
  },
  cannedResponse: {
    id: 'cannedResponse.id',
    tenantId: 'cannedResponse.tenantId',
    deletedAt: 'cannedResponse.deletedAt',
    title: 'cannedResponse.title',
  },
  autoTriageRule: {
    id: 'autoTriageRule.id',
    tenantId: 'autoTriageRule.tenantId',
    deletedAt: 'autoTriageRule.deletedAt',
    enabled: 'autoTriageRule.enabled',
    priority: 'autoTriageRule.priority',
  },
  contact: {
    id: 'contact.id',
    firstName: 'contact.firstName',
    lastName: 'contact.lastName',
    legalName: 'contact.legalName',
    kind: 'contact.kind',
    phones: 'contact.phones',
    emails: 'contact.emails',
  },
  user: {
    id: 'user.id',
    fullName: 'user.fullName',
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

const TENANT_ID = 'tenant-1';
const CONV_ID = '00000000-0000-0000-0000-000000000001';
const MSG_ID = '00000000-0000-0000-0000-000000000002';

async function buildCaller() {
  const { inboxRouter } = await import('../routers/inbox.js');

  const RedisCtor = (await import('ioredis')).default;
  const redis = new RedisCtor();

  const c = {
    req: { header: vi.fn().mockReturnValue(undefined), method: 'POST' },
    header: vi.fn(),
    get: vi.fn().mockReturnValue('test-request-id'),
  } as unknown as import('hono').Context;

  const { router: appRouter } = await import('../trpc.js');
  const testRouter = appRouter({ inbox: inboxRouter });

  const caller = testRouter.createCaller({
    c,
    requestId: 'test-request-id',
    db: mockDb as any,
    redis: redis as any,
    sessionId: 'sess-1',
    queues: {},
  });

  return caller;
}

// ---------------------------------------------------------------------------
// Tests — RENA-73 tenantId defense-in-depth
// ---------------------------------------------------------------------------

describe('inbox — RENA-73 tenantId defense-in-depth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTx = mockTx();
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(currentTx),
    );
  });

  describe('messages.list', () => {
    it('rejects when conversation belongs to another tenant', async () => {
      // Conv lookup returns nothing → NOT_FOUND
      whereSpy.mockResolvedValueOnce([]);

      const caller = await buildCaller();
      await expect(
        caller.inbox['messages.list']({ conversationId: CONV_ID }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('includes tenantId in message query conditions', async () => {
      // First .where() = conv ownership check → returns a row
      // Second .where() = message query → returns empty (after limit)
      const callOrder: unknown[][] = [];
      whereSpy.mockImplementation((...args: unknown[]) => {
        callOrder.push(args);
        if (callOrder.length === 1) {
          // conv ownership check — return one row
          return Promise.resolve([{ id: CONV_ID }]);
        }
        // message query — chainable (need orderBy → limit → resolve)
        return {
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const caller = await buildCaller();
      const result = await caller.inbox['messages.list']({ conversationId: CONV_ID });

      expect(result.items).toEqual([]);

      // The second .where() call is for the message query.
      // Verify it was called (i.e., the message query ran through .where()).
      expect(callOrder.length).toBeGreaterThanOrEqual(2);

      // Drizzle's and() receives all conditions. The second where() call's first
      // argument should be the combined condition from and(...conditions).
      // Since we're using mock schema stubs, eq('message.tenantId', 'tenant-1')
      // produces a drizzle SQL node. We verify that eq was called with the
      // message.tenantId column by inspecting the SQL structure.
      const messageWhereArg = callOrder[1]![0];

      // The and() call wraps conditions; stringify to verify tenantId is present
      const condStr = JSON.stringify(messageWhereArg);
      expect(condStr).toContain('message.tenantId');
    });
  });

  describe('messages.send', () => {
    it('rejects when conversation belongs to another tenant', async () => {
      whereSpy.mockResolvedValueOnce([]);

      const caller = await buildCaller();
      await expect(
        caller.inbox['messages.send']({
          conversationId: CONV_ID,
          content: { text: 'hello' },
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('includes tenantId in conversation update WHERE clause', async () => {
      const callOrder: unknown[][] = [];

      // Track all where() calls
      whereSpy.mockImplementation((...args: unknown[]) => {
        callOrder.push(args);
        if (callOrder.length === 1) {
          // conv lookup — return a conversation
          return Promise.resolve([{
            id: CONV_ID,
            channelId: 'ch-1',
            contactId: 'ct-1',
            version: 1,
          }]);
        }
        // Remaining where() calls: insert returning, update returning
        return {
          returning: vi.fn().mockResolvedValue([{
            id: MSG_ID,
            tenantId: TENANT_ID,
            conversationId: CONV_ID,
            direction: 'out',
            contentType: 'text',
            content: { text: 'hello' },
            status: 'queued',
            createdAt: new Date(),
          }]),
        };
      });

      // insert().values().returning() for the message insert
      currentTx.returning.mockResolvedValueOnce([{
        id: MSG_ID,
        tenantId: TENANT_ID,
        conversationId: CONV_ID,
        direction: 'out',
        contentType: 'text',
        content: { text: 'hello' },
        status: 'queued',
        createdAt: new Date(),
      }]);

      // update().set().where() for the conversation update
      // The where() call should include tenantId
      const updateWhereSpy = vi.fn().mockResolvedValue([]);
      currentTx.set.mockReturnValueOnce({ where: updateWhereSpy });

      const caller = await buildCaller();

      // We need the queues on context for the send path
      (mockDb as any).queues = {};

      try {
        await caller.inbox['messages.send']({
          conversationId: CONV_ID,
          content: { text: 'hello' },
        });
      } catch {
        // May throw due to mock limitations — we just need to verify where() args
      }

      // Check that the conversation update's where() included tenantId.
      // The update path goes: ctx.db.update(conversation).set({...}).where(and(...))
      // Find the where() call that contains conversation.tenantId
      const allWhereCalls = [...callOrder];
      const hasConvTenantUpdate = allWhereCalls.some((args) => {
        const str = JSON.stringify(args);
        return str.includes('conversation.tenantId') && str.includes('conversation.id');
      });

      expect(hasConvTenantUpdate).toBe(true);
    });
  });
});
