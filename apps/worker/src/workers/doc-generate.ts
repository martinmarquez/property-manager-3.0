import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { chromium } from 'playwright-core';
import { createNodeDb, docDocument } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type { DocGenerateJobData, DocGenerateJobResult } from '@corredor/documents';
import type Redis from 'ioredis';

const PRESIGNED_URL_TTL_S = 86_400; // 24 h
const PDF_TIMEOUT_MS = 28_000; // 28s — stay under the 30s BullMQ job timeout

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

function buildS3Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function r2BucketName(): string {
  const env = process.env['FLY_APP_NAME']?.includes('staging') ? 'staging' : 'prod';
  return `corredor-documents-${env}`;
}

export class DocGenerateWorker extends BaseWorker<DocGenerateJobData, DocGenerateJobResult> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly r2: S3Client;
  private readonly bucketName: string;

  constructor(redis: Redis, databaseUrl: string, r2Config: R2Config) {
    super(QUEUE_NAMES.DOC_GENERATE, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
    this.r2 = buildS3Client(r2Config);
    this.bucketName = r2Config.bucketName;
  }

  protected async process(job: Job<DocGenerateJobData, DocGenerateJobResult>): Promise<DocGenerateJobResult> {
    const { tenantId, documentId, htmlContent } = job.data;
    const objectKey = `tenants/${tenantId}/documents/${documentId}.pdf`;

    const pdfBuffer = await this.renderPdf(htmlContent);

    await this.r2.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: { tenantId, documentId },
    }));

    const presignedUrl = await getSignedUrl(
      this.r2,
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      { expiresIn: PRESIGNED_URL_TTL_S },
    );

    await this.db
      .update(docDocument)
      .set({
        fileObjectKey: objectKey,
        fileUrl: presignedUrl,
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(docDocument.id, documentId));

    return { presignedUrl, objectKey };
  }

  private async renderPdf(htmlContent: string): Promise<Buffer> {
    const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] ?? '/usr/bin/chromium';
    const browser = await chromium.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle', timeout: PDF_TIMEOUT_MS });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export function createDocGenerateWorker(redis: Redis): DocGenerateWorker | null {
  const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  const databaseUrl = process.env['DATABASE_URL'] ?? '';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new DocGenerateWorker(redis, databaseUrl, {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName: r2BucketName(),
  });
}
