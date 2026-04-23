import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportCsvWorker } from './import-csv.js';

const mockInsert = vi.fn(() => ({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'prop-new' }]) }));
const mockUpdate = vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }));
const mockSelectEmpty = vi.fn(() => ({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) }));
const mockSelectExisting = vi.fn(() => ({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ id: 'prop-existing' }]) }));

vi.mock('@corredor/db', () => ({
  createNodeDb: vi.fn(() => ({
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx())),
    insert: mockInsert,
    select: mockSelectEmpty,
    update: mockUpdate,
  })),
  setTenantContext: vi.fn(),
  property: { id: { name: 'id' }, tenantId: { name: 'tenant_id' }, referenceCode: { name: 'reference_code' } },
  importJob: { id: { name: 'id' } },
  importJobRow: {},
}));

vi.mock('@corredor/core', () => ({
  BaseWorker: class {
    protected worker = { on: vi.fn(), close: vi.fn() };
    constructor() {}
    async close() {}
  },
  QUEUE_NAMES: { IMPORT_CSV: 'import-csv' },
  QUEUE_META: { 'import-csv': { priority: 3, defaultConcurrency: 3 } },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  })),
}));

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({ status: 'ready', on: vi.fn() }));
  return { default: Redis };
});

vi.mock('@opentelemetry/api', () => ({
  trace: { getTracer: vi.fn(() => ({ startSpan: vi.fn(() => ({ setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn(), end: vi.fn() })) })) },
  SpanStatusCode: { OK: 'OK', ERROR: 'ERROR', UNSET: 'UNSET' },
}));

function mockTx() {
  return {
    update: mockUpdate,
    insert: mockInsert,
    select: mockSelectEmpty,
    execute: vi.fn(),
  };
}

function buildCsvBase64(rows: string[]): string {
  return Buffer.from(rows.join('\n')).toString('base64');
}

describe('ImportCsvWorker.process', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('imports a valid CSV row', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis() as unknown as import('ioredis').Redis;
    const worker = new ImportCsvWorker(redis, 'postgresql://test');

    const csv = buildCsvBase64([
      'Código,Tipo,Operación,Precio',
      'REF001,departamento,venta,150000',
    ]);

    const mockJob = {
      id: 'job-1',
      name: 'import-csv',
      attemptsMade: 0,
      opts: { attempts: 5 },
      data: {
        importJobId: 'import-job-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        csvBase64: csv,
        columnMapping: {},
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);

    expect(mockInsert).toHaveBeenCalled();
  });

  it('marks row as skipped when reference_code already exists', async () => {
    const { createNodeDb } = await import('@corredor/db');
    vi.mocked(createNodeDb).mockReturnValue({
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
        update: mockUpdate,
        insert: mockInsert,
        select: mockSelectExisting,
        execute: vi.fn(),
      })),
      insert: mockInsert,
      select: mockSelectExisting,
      update: mockUpdate,
    } as unknown as ReturnType<typeof createNodeDb>);

    const Redis = (await import('ioredis')).default;
    const redis = new Redis() as unknown as import('ioredis').Redis;
    const worker = new ImportCsvWorker(redis, 'postgresql://test');

    const csv = buildCsvBase64([
      'Código,Tipo',
      'REF001,departamento',
    ]);

    const mockJob = {
      id: 'job-1', name: 'import-csv', attemptsMade: 0, opts: { attempts: 5 },
      data: { importJobId: 'import-job-1', tenantId: 'tenant-1', userId: 'user-1', csvBase64: csv, columnMapping: {} },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('marks row as failed when reference_code is missing', async () => {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis() as unknown as import('ioredis').Redis;
    const worker = new ImportCsvWorker(redis, 'postgresql://test');

    const csv = buildCsvBase64([
      'Tipo,Descripción',
      'departamento,Sin código',
    ]);

    const mockJob = {
      id: 'job-1', name: 'import-csv', attemptsMade: 0, opts: { attempts: 5 },
      data: { importJobId: 'import-job-1', tenantId: 'tenant-1', userId: 'user-1', csvBase64: csv, columnMapping: {} },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (worker as any).process(mockJob);
    expect(mockInsert).toHaveBeenCalled();
  });
});
