import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must use vi.hoisted() for anything referenced in vi.mock()
// ---------------------------------------------------------------------------

const {
  mockPage,
  mockBrowser,
  mockS3Send,
  mockDbUpdate,
  FAKE_PRESIGNED_URL,
} = vi.hoisted(() => {
  const FAKE_PRESIGNED_URL =
    'https://accountId.r2.cloudflarestorage.com/corredor-documents-prod/tenants/t1/documents/d1.pdf?X-Amz-Signature=test';

  const mockPage = {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake-test')),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockS3Send = vi.fn().mockResolvedValue({});
  const mockDbUpdate = vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }));

  return { mockPage, mockBrowser, mockS3Send, mockDbUpdate, FAKE_PRESIGNED_URL };
});

vi.mock('playwright-core', () => ({
  chromium: { launch: vi.fn().mockResolvedValue(mockBrowser) },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ _tag: 'PutObject', input })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ _tag: 'GetObject', input })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue(FAKE_PRESIGNED_URL),
}));

vi.mock('@corredor/db', () => ({
  createNodeDb: vi.fn(() => ({ update: mockDbUpdate })),
  docDocument: { id: { name: 'id' } },
}));

vi.mock('@corredor/core', () => ({
  BaseWorker: class {
    protected worker = { on: vi.fn(), close: vi.fn() };
    constructor() {}
  },
  QUEUE_NAMES: { DOC_GENERATE: 'doc-generate' },
  QUEUE_META: { 'doc-generate': { priority: 3, defaultConcurrency: 3 } },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}));

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({ status: 'ready', on: vi.fn() })),
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      })),
    })),
  },
  SpanStatusCode: { OK: 'OK', ERROR: 'ERROR', UNSET: 'UNSET' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { DocGenerateWorker } from './doc-generate.js';

async function makeWorker() {
  const { default: Redis } = await import('ioredis');
  const redis = new Redis() as unknown as import('ioredis').Redis;
  return new DocGenerateWorker(redis, 'postgresql://test', {
    accountId: 'test-account',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    bucketName: 'corredor-documents-prod',
  });
}

type ProcessFn = (j: import('bullmq').Job) => Promise<{ presignedUrl: string; objectKey: string }>;

async function callProcess(worker: DocGenerateWorker, htmlContent = '<html><body><h1>Contrato</h1></body></html>') {
  const job = {
    id: 'job-1',
    name: 'doc-generate',
    attemptsMade: 0,
    data: { tenantId: 't1', documentId: 'd1', htmlContent },
    log: vi.fn(),
  } as unknown as import('bullmq').Job;

  return (worker as unknown as { process: ProcessFn }).process(job);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocGenerateWorker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders HTML to PDF via Playwright with correct options', async () => {
    const worker = await makeWorker();
    await callProcess(worker);

    const { chromium } = await import('playwright-core');
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.arrayContaining(['--no-sandbox']) }),
    );
    expect(mockPage.setContent).toHaveBeenCalledWith(
      '<html><body><h1>Contrato</h1></body></html>',
      expect.objectContaining({ waitUntil: 'networkidle' }),
    );
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    );
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('uploads PDF to R2 at tenants/{tenantId}/documents/{documentId}.pdf', async () => {
    const worker = await makeWorker();
    await callProcess(worker);

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'corredor-documents-prod',
        Key: 'tenants/t1/documents/d1.pdf',
        ContentType: 'application/pdf',
        Body: expect.any(Buffer),
      }),
    );
    expect(mockS3Send).toHaveBeenCalledWith(expect.objectContaining({ _tag: 'PutObject' }));
  });

  it('generates a 24-hour presigned GET URL', async () => {
    const worker = await makeWorker();
    await callProcess(worker);

    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'corredor-documents-prod', Key: 'tenants/t1/documents/d1.pdf' }),
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 86_400 },
    );
  });

  it('updates doc_document with fileObjectKey, fileUrl, and generatedAt', async () => {
    const worker = await makeWorker();
    await callProcess(worker);

    expect(mockDbUpdate).toHaveBeenCalled();
    const setMock = mockDbUpdate.mock.results[0]?.value?.set as ReturnType<typeof vi.fn>;
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileObjectKey: 'tenants/t1/documents/d1.pdf',
        fileUrl: FAKE_PRESIGNED_URL,
        generatedAt: expect.any(Date),
      }),
    );
  });

  it('returns presignedUrl and objectKey', async () => {
    const worker = await makeWorker();
    const result = await callProcess(worker);

    expect(result).toEqual({
      presignedUrl: FAKE_PRESIGNED_URL,
      objectKey: 'tenants/t1/documents/d1.pdf',
    });
  });

  it('closes the browser even when pdf() throws', async () => {
    mockPage.pdf.mockRejectedValueOnce(new Error('render timeout'));
    const worker = await makeWorker();

    await expect(callProcess(worker)).rejects.toThrow('render timeout');
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
