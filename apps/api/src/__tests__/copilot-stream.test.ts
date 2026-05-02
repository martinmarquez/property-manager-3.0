import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const SESSION_ID = 'test-session-id';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';
const COP_SESSION_ID = '00000000-0000-0000-0000-000000000003';
const TURN_ID = '00000000-0000-0000-0000-000000000004';

const sessionData = JSON.stringify({
  tenantId: TENANT_ID,
  userId: USER_ID,
  roles: ['admin'],
  createdAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
});

vi.mock('@corredor/db', () => ({
  copilotSession: { id: 'id', tenantId: 'tenant_id', userId: 'user_id', turnCount: 'turn_count' },
  copilotTurn: {
    id: 'id', sessionId: 'session_id', role: 'role', content: 'content', createdAt: 'created_at',
  },
  featureFlag: { tenantId: 'tenant_id', key: 'key', enabled: 'enabled', rolloutPct: 'rollout_pct' },
}));

vi.mock('@corredor/core', () => ({
  Embedder: vi.fn(),
  retrieve: vi.fn().mockResolvedValue([]),
}));

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn().mockResolvedValue([])),
}));

vi.mock('../lib/feature-flags.js', () => ({
  checkFeatureFlag: vi.fn().mockResolvedValue(undefined),
  FeatureDisabledError: class extends Error {
    readonly statusCode = 403 as const;
  },
}));

async function* fakeGeneratorStream() {
  yield { type: 'text_delta' as const, data: 'Hello' };
  yield { type: 'text_delta' as const, data: ' world' };
  yield {
    type: 'done' as const,
    data: JSON.stringify({ inputTokens: 10, outputTokens: 20, model: 'claude-sonnet-4-6' }),
  };
}

vi.mock('@corredor/ai', () => ({
  createAnthropicClient: vi.fn(() => ({})),
  classifyIntent: vi.fn().mockResolvedValue({ type: 'general', confidence: 0.9 }),
  generateResponseStream: vi.fn(() => fakeGeneratorStream()),
  checkQuota: vi.fn().mockResolvedValue({ allowed: true, used: 0, limit: 100 }),
  incrementQuota: vi.fn().mockResolvedValue(undefined),
}));

function createMockRedis() {
  return {
    status: 'ready',
    on: vi.fn(),
    get: vi.fn().mockImplementation((key: string) => {
      if (key === `sess:${SESSION_ID}`) return Promise.resolve(sessionData);
      return Promise.resolve(null);
    }),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue([1, 12000, Date.now() / 1000 + 60]),
  } as unknown as import('ioredis').Redis;
}

function createMockDb() {
  const copilotSessionRow = {
    id: COP_SESSION_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    isActive: true,
    title: null,
    turnCount: 0,
  };

  const assistantTurnRow = { id: TURN_ID };

  function thenableArray(rows: unknown[]) {
    const obj: Record<string, unknown> = {};
    obj.from = vi.fn().mockReturnValue(obj);
    obj.where = vi.fn().mockReturnValue(obj);
    obj.orderBy = vi.fn().mockReturnValue(obj);
    obj.limit = vi.fn().mockResolvedValue(rows);
    obj.then = (resolve: (v: unknown) => void) => resolve(rows);
    return obj;
  }

  function insertChain() {
    const obj: Record<string, unknown> = {};
    obj.values = vi.fn().mockReturnValue(obj);
    obj.returning = vi.fn().mockResolvedValue([assistantTurnRow]);
    obj.then = (resolve: (v: unknown) => void) => resolve(undefined);
    return obj;
  }

  function updateChain() {
    const obj: Record<string, unknown> = {};
    obj.set = vi.fn().mockReturnValue(obj);
    obj.where = vi.fn().mockReturnValue(obj);
    obj.then = (resolve: (v: unknown) => void) => resolve(undefined);
    return obj;
  }

  let selectCallCount = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return thenableArray([copilotSessionRow]);
      return thenableArray([]);
    }),
    insert: vi.fn().mockImplementation(() => insertChain()),
    update: vi.fn().mockReturnValue(updateChain()),
    execute: vi.fn().mockResolvedValue([]),
  };
}

function parseSSEResponse(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  let currentEvent = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      events.push({ event: currentEvent, data: line.slice(5).trim() });
    }
  }
  return events;
}

describe('POST /copilot/stream/turn — firstTokenMs instrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes non-null firstTokenMs in the done SSE event', async () => {
    const { createCopilotStreamRoutes } = await import('../routes/copilot-stream.js');

    const redis = createMockRedis();
    const db = createMockDb();

    const copilotApp = createCopilotStreamRoutes({
      db: db as never,
      redis,
      anthropicApiKey: 'test-key',
      openaiApiKey: undefined,
      databaseUrl: 'postgresql://test',
    });

    const app = new Hono();
    app.route('/copilot/stream', copilotApp);

    const res = await app.request('/copilot/stream/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${SESSION_ID}`,
      },
      body: JSON.stringify({
        sessionId: COP_SESSION_ID,
        message: 'Hello copilot',
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.text();
    const events = parseSSEResponse(body);
    const doneEvents = events.filter((e) => e.event === 'done');

    expect(doneEvents.length).toBe(1);
    const donePayload = JSON.parse(doneEvents[0]!.data) as Record<string, unknown>;

    expect(donePayload).toHaveProperty('firstTokenMs');
    expect(typeof donePayload['firstTokenMs']).toBe('number');
    expect(donePayload['firstTokenMs']).toBeGreaterThanOrEqual(0);
  });

  it('persists firstTokenMs in the copilot_turn DB insert', async () => {
    const { createCopilotStreamRoutes } = await import('../routes/copilot-stream.js');

    const redis = createMockRedis();
    const db = createMockDb();

    const copilotApp = createCopilotStreamRoutes({
      db: db as never,
      redis,
      anthropicApiKey: 'test-key',
      openaiApiKey: undefined,
      databaseUrl: 'postgresql://test',
    });

    const app = new Hono();
    app.route('/copilot/stream', copilotApp);

    const res = await app.request('/copilot/stream/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `session=${SESSION_ID}`,
      },
      body: JSON.stringify({
        sessionId: COP_SESSION_ID,
        message: 'Hello copilot',
      }),
    });

    await res.text();

    const insertCalls = db.insert.mock.calls;
    expect(insertCalls.length).toBeGreaterThanOrEqual(2);

    const assistantInsertChain = db.insert.mock.results[1]!.value;
    const valuesCalls = assistantInsertChain.values.mock.calls as Array<[Record<string, unknown>]>;

    const insertedRow = valuesCalls[0]![0]!;
    expect(insertedRow).toHaveProperty('firstTokenMs');
    expect(typeof insertedRow['firstTokenMs']).toBe('number');
    expect(insertedRow['firstTokenMs']).toBeGreaterThanOrEqual(0);
  });
});
