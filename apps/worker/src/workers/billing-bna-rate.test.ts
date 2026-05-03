import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn().mockImplementation(() => {
  return Promise.resolve({ rows: [] });
});

vi.mock('@corredor/db', () => ({
  createNodeDb: vi.fn(() => ({
    execute: mockExecute,
  })),
}));

vi.mock('@corredor/core', async () => {
  const actual = await vi.importActual<typeof import('@corredor/core')>('@corredor/core');
  return {
    ...actual,
    BaseWorker: class {
      logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
      worker = { on: vi.fn(), close: vi.fn() };
      constructor() {}
      async close() {}
    },
    QUEUE_NAMES: { BILLING_BNA_RATE_FETCH: 'billing-bna-rate-fetch' },
  };
});

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

function makeJob(data: { date?: string } = {}) {
  const logs: string[] = [];
  return {
    id: 'job-1',
    name: 'bna-rate-fetch',
    attemptsMade: 0,
    opts: { attempts: 5 },
    data,
    log: (msg: string) => { logs.push(msg); },
    _logs: logs,
  };
}

describe('BillingBnaRateWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('upserts rate on successful API fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ compra: 1050.5, venta: 1080.75, casa: 'oficial', nombre: 'Oficial' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    mockExecute.mockResolvedValue({ rows: [{ fetched_at: new Date().toISOString() }] });

    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { BillingBnaRateWorker } = await import('./billing-bna-rate.js');
    const worker = new BillingBnaRateWorker(redis, 'postgresql://test');

    const job = makeJob({ date: '2026-05-03' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(job);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    // 1 upsert + 1 staleness check
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(job._logs.some((l: string) => l.includes('Upserted BNA rate'))).toBe(true);
  });

  it('falls back to previous rate when API returns non-ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    vi.stubGlobal('fetch', mockFetch);

    mockExecute
      .mockResolvedValueOnce({ rows: [{ date: '2026-05-02', sell_rate: '1075.0000' }] })
      .mockResolvedValueOnce({ rows: [{ fetched_at: new Date().toISOString() }] });

    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { BillingBnaRateWorker } = await import('./billing-bna-rate.js');
    const worker = new BillingBnaRateWorker(redis, 'postgresql://test');

    const job = makeJob({ date: '2026-05-03' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(job);

    expect(job._logs.some((l: string) => l.includes('Fallback'))).toBe(true);
  });

  it('throws when API fails and no previous rate exists', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mockFetch);

    mockExecute.mockResolvedValueOnce({ rows: [] });

    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { BillingBnaRateWorker } = await import('./billing-bna-rate.js');
    const worker = new BillingBnaRateWorker(redis, 'postgresql://test');

    const job = makeJob({ date: '2026-05-03' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((worker as any).process(job)).rejects.toThrow('no previous rate available');
  });

  it('rejects invalid rate values from API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ compra: -1, venta: 0, casa: 'oficial' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    mockExecute.mockResolvedValueOnce({ rows: [] });

    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { BillingBnaRateWorker } = await import('./billing-bna-rate.js');
    const worker = new BillingBnaRateWorker(redis, 'postgresql://test');

    const job = makeJob({ date: '2026-05-03' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((worker as any).process(job)).rejects.toThrow('no previous rate available');
  });

  it('logs staleness warning when rate is older than 48h', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ compra: 1050, venta: 1080, casa: 'oficial' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    mockExecute
      .mockResolvedValueOnce({ rows: [] }) // upsert
      .mockResolvedValueOnce({ rows: [{ fetched_at: staleDate }] }); // staleness check

    const Redis = (await import('ioredis')).default;
    const redis = new Redis();
    const { BillingBnaRateWorker } = await import('./billing-bna-rate.js');
    const worker = new BillingBnaRateWorker(redis, 'postgresql://test');

    const job = makeJob({ date: '2026-05-03' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(job);

    expect(job._logs.some((l: string) => l.includes('WARNING') && l.includes('stale'))).toBe(true);
  });
});

describe('calculateArsPrice', () => {
  it('applies BNA rate with 15% spread and rounds to nearest 500 ARS', async () => {
    const { calculateArsPrice } = await import('@corredor/core');
    expect(calculateArsPrice(29, 1100)).toBe(37000);
    expect(calculateArsPrice(49, 1100)).toBe(62000);
    expect(calculateArsPrice(99, 1100)).toBe(125500);
    expect(calculateArsPrice(0, 1100)).toBe(0);
  });
});

describe('interpretBnaRate', () => {
  it('returns fallback rate when no rows exist', async () => {
    const { interpretBnaRate } = await import('@corredor/core');
    const result = interpretBnaRate([]);

    expect(result.sellRate).toBe(1100);
    expect(result.date).toBe('fallback');
    expect(result.isStale).toBe(true);
  });

  it('returns DB rate and marks non-stale when fresh', async () => {
    const { interpretBnaRate } = await import('@corredor/core');
    const result = interpretBnaRate([
      { date: '2026-05-03', sell_rate: '1080.5000', fetched_at: new Date().toISOString() },
    ]);

    expect(result.sellRate).toBe(1080.5);
    expect(result.date).toBe('2026-05-03');
    expect(result.isStale).toBe(false);
  });

  it('marks rate as stale when older than 48h', async () => {
    const old = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const { interpretBnaRate } = await import('@corredor/core');
    const result = interpretBnaRate([
      { date: '2026-05-01', sell_rate: '1070.0000', fetched_at: old },
    ]);

    expect(result.sellRate).toBe(1070);
    expect(result.isStale).toBe(true);
  });
});
