import { describe, it, expect, vi, beforeEach } from 'vitest';

const executeCalls: unknown[][] = [];

function makeMockSelectChain() {
  const chain: Record<string | symbol, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(Promise.resolve([]));
  chain.then = (resolve: (v: unknown) => unknown) => resolve([{ n: 0 }]);
  chain[Symbol.iterator] = function* () {
    yield { n: 0 };
  };
  return chain;
}

const mockExecute = vi.fn().mockImplementation((...args: unknown[]) => {
  executeCalls.push(args);
  return Promise.resolve({ rows: [] });
});

const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    select: vi.fn().mockReturnValue(makeMockSelectChain()),
    execute: mockExecute,
  }),
);

vi.mock('@corredor/db', () => ({
  createNodeDb: vi.fn(() => ({
    transaction: mockTransaction,
    select: vi.fn().mockReturnValue(makeMockSelectChain()),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  })),
  analyticsEvent: {
    tenantId:   { name: 'tenant_id' },
    eventType:  { name: 'event_type', _: { data: '' } },
    occurredAt: { name: 'occurred_at' },
    actorId:    { name: 'actor_id' },
    entityId:   { name: 'entity_id' },
    properties: { name: 'properties' },
  },
  lead:     { deletedAt: { name: 'deleted_at' }, wonAt: { name: 'won_at' }, lostAt: { name: 'lost_at' } },
  property: { deletedAt: { name: 'deleted_at' }, status: { name: 'status' } },
  tenant:   { id: { name: 'id' }, deletedAt: { name: 'deleted_at' } },
  copilotTurn: {
    tenantId:  { name: 'tenant_id' },
    createdAt: { name: 'created_at' },
    totalMs:   { name: 'total_ms' },
  },
  copilotSession: {
    tenantId:  { name: 'tenant_id' },
    createdAt: { name: 'created_at' },
    userId:    { name: 'user_id' },
  },
  aiEmbeddingLog: {
    tenantId:  { name: 'tenant_id' },
    createdAt: { name: 'created_at' },
  },
  searchQueryLog: {
    tenantId:  { name: 'tenant_id' },
    createdAt: { name: 'created_at' },
  },
  descriptionGenerationLog: {
    tenantId:  { name: 'tenant_id' },
    createdAt: { name: 'created_at' },
  },
}));

vi.mock('@corredor/core', () => ({
  BaseWorker: class {
    logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    worker = { on: vi.fn(), close: vi.fn() };
    constructor() {}
    async close() {}
  },
  QUEUE_NAMES: { ANALYTICS_REFRESH: 'analytics-refresh' },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(), close: vi.fn(), pause: vi.fn(), resume: vi.fn(),
  })),
}));

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({ status: 'ready', on: vi.fn() }));
  return { default: Redis };
});

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn(), end: vi.fn(),
      })),
    })),
  },
  SpanStatusCode: { OK: 'OK', ERROR: 'ERROR', UNSET: 'UNSET' },
}));

describe('AnalyticsRefreshWorker tenantId defense-in-depth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeCalls.length = 0;
  });

  it('sets RLS config and runs transaction for a single tenant', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { AnalyticsRefreshWorker } = await import('./analytics-refresh.js');
    const worker = new AnalyticsRefreshWorker(redis, 'postgresql://test');

    const TENANT_A = '00000000-0000-0000-0000-00000000000a';

    const mockJob = {
      id: 'job-1',
      name: 'analytics-refresh',
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: { tenantId: TENANT_A, snapshotDate: '2026-04-24' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);

    expect(mockTransaction).toHaveBeenCalledTimes(1);

    const allSqlStrings = executeCalls.map((args) => JSON.stringify(args[0]));
    const setConfigSql = allSqlStrings.find((s) => s.includes('set_config'));
    expect(setConfigSql).toBeDefined();
  });

  it('processes only the specified tenantId', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { AnalyticsRefreshWorker } = await import('./analytics-refresh.js');
    const worker = new AnalyticsRefreshWorker(redis, 'postgresql://test');

    const TENANT_A = '00000000-0000-0000-0000-00000000000a';

    const mockJob = {
      id: 'job-2',
      name: 'analytics-refresh',
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: { tenantId: TENANT_A, snapshotDate: '2026-04-24' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('AnalyticsRefreshWorker batched INSERT (RENA-76)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeCalls.length = 0;
  });

  it('emits at most 2 tx.execute() calls per tenant (set_config + one batched INSERT)', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { AnalyticsRefreshWorker } = await import('./analytics-refresh.js');
    const worker = new AnalyticsRefreshWorker(redis, 'postgresql://test');

    const mockJob = {
      id: 'job-batch-1',
      name: 'analytics-refresh',
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: { tenantId: '00000000-0000-0000-0000-00000000000a', snapshotDate: '2026-04-24' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);

    const txExecuteCount = executeCalls.length;
    // 1 = set_config, 1 = batched INSERT (the mock returns 0-value agency metrics only)
    // The batched INSERT combines all 7 agency-level rows into one statement.
    expect(txExecuteCount).toBeLessThanOrEqual(2);
  });

  it('includes INSERT INTO kpi_snapshot_daily in the batched statement', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { AnalyticsRefreshWorker } = await import('./analytics-refresh.js');
    const worker = new AnalyticsRefreshWorker(redis, 'postgresql://test');

    const mockJob = {
      id: 'job-batch-2',
      name: 'analytics-refresh',
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: { tenantId: '00000000-0000-0000-0000-00000000000a', snapshotDate: '2026-04-24' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);

    const allSqlStrings = executeCalls.map((args) => JSON.stringify(args[0]));
    const insertSql = allSqlStrings.find((s) => s.includes('kpi_snapshot_daily'));
    expect(insertSql).toBeDefined();

    const individualInsertCount = allSqlStrings.filter((s) => s.includes('kpi_snapshot_daily')).length;
    expect(individualInsertCount).toBe(1);
  });
});

describe('AnalyticsRefreshWorker static tenantId audit', () => {
  it('every analyticsEvent query in _computeMetrics includes eq(analyticsEvent.tenantId, tenantId)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(import.meta.dirname, 'analytics-refresh.ts'), 'utf-8');

    const fromAnalyticsEvent = src.split('.from(analyticsEvent)');
    const queryCount = fromAnalyticsEvent.length - 1;
    expect(queryCount).toBeGreaterThan(0);

    for (let i = 0; i < queryCount; i++) {
      const afterFrom = fromAnalyticsEvent[i + 1]!;
      const whereBlock = afterFrom.slice(0, afterFrom.indexOf(');'));
      expect(whereBlock).toContain('eq(analyticsEvent.tenantId, tenantId)');
    }
  });
});
