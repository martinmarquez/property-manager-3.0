import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { chromium } from 'playwright-core';
import {
  createNodeDb,
  appraisal,
  appraisalComp,
  appraisalReport,
} from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

const PRESIGNED_URL_TTL_S = 7 * 24 * 60 * 60; // 7 days
const PDF_TIMEOUT_MS = 28_000;

// ---------------------------------------------------------------------------
// Job data
// ---------------------------------------------------------------------------

export interface AppraisalPdfJobData {
  appraisalId: string;
  reportId: string;
  tenantId: string;
}

export interface AppraisalPdfJobResult {
  presignedUrl: string;
  objectKey: string;
}

// ---------------------------------------------------------------------------
// R2 config
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTML template builder
// ---------------------------------------------------------------------------

interface AppraisalPdfData {
  appraisalRow: typeof appraisal.$inferSelect;
  reportRow: typeof appraisalReport.$inferSelect;
  comps: Array<typeof appraisalComp.$inferSelect>;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(amount: string | null, currency: string): string {
  if (!amount) return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function buildHtml(data: AppraisalPdfData): string {
  const { appraisalRow: a, reportRow: r, comps } = data;

  const address = `${a.addressStreet} ${a.addressNumber ?? ''}`.trim();
  const location = [a.locality, a.province].filter(Boolean).join(', ');

  const compsRows = comps
    .filter((c) => c.isIncluded)
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.address)}</td>
        <td>${c.distanceM != null ? `${Math.round(c.distanceM)} m` : '—'}</td>
        <td>${formatCurrency(c.priceAmount, c.priceCurrency)}</td>
        <td>${formatCurrency(c.pricePerM2, c.priceCurrency)}</td>
        <td>${c.coveredAreaM2 != null ? `${c.coveredAreaM2} m²` : '—'}</td>
        <td>${escapeHtml(c.listingStatus)}</td>
      </tr>`,
    )
    .join('');

  const signatureBlock = a.appraiserSignatureUrl
    ? `<img src="${escapeHtml(a.appraiserSignatureUrl)}" alt="Firma" style="max-height:80px;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }

  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; text-align: center; }
  .cover h1 { font-size: 28pt; color: #1e3a5f; margin-bottom: 8px; }
  .cover .subtitle { font-size: 14pt; color: #555; margin-bottom: 24px; }
  .cover .meta { font-size: 11pt; color: #777; }

  h2 { font-size: 16pt; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; margin: 24px 0 12px; }
  h3 { font-size: 13pt; color: #333; margin: 16px 0 8px; }

  .section { margin-bottom: 20px; }
  .property-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; }
  .property-grid dt { font-weight: 600; color: #555; }
  .property-grid dd { margin: 0 0 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; }
  th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) td { background: #f7f9fb; }

  .value-box { background: #f0f7ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 16px 24px; text-align: center; margin: 16px 0; }
  .value-box .range { font-size: 22pt; font-weight: 700; color: #1e3a5f; }
  .value-box .currency { font-size: 12pt; color: #555; }

  .narrative { white-space: pre-wrap; line-height: 1.6; }

  .signature-block { margin-top: 48px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .signature-block .name { font-weight: 600; font-size: 12pt; }
  .signature-block .matricula { font-size: 10pt; color: #555; }

  .footer { font-size: 8pt; color: #999; text-align: center; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>

<!-- Cover page -->
<div class="cover">
  <h1>Informe de Tasación</h1>
  <div class="subtitle">${escapeHtml(address)}</div>
  <div class="subtitle">${escapeHtml(location)}</div>
  <div class="meta">
    Cliente: ${escapeHtml(a.clientName)}<br/>
    Fecha: ${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
    ${a.referenceCode ? `Ref: ${escapeHtml(a.referenceCode)}` : ''}
  </div>
</div>

<!-- Property details -->
<div class="section">
  <h2>Datos del Inmueble</h2>
  <dl class="property-grid">
    <dt>Dirección</dt><dd>${escapeHtml(address)}, ${escapeHtml(location)}</dd>
    <dt>Tipo</dt><dd>${escapeHtml(a.propertyType)}</dd>
    <dt>Operación</dt><dd>${escapeHtml(a.operationKind)}</dd>
    <dt>Sup. cubierta</dt><dd>${a.coveredAreaM2 != null ? `${a.coveredAreaM2} m²` : '—'}</dd>
    <dt>Sup. total</dt><dd>${a.totalAreaM2 != null ? `${a.totalAreaM2} m²` : '—'}</dd>
    <dt>Ambientes</dt><dd>${a.rooms ?? '—'}</dd>
    <dt>Dormitorios</dt><dd>${a.bedrooms ?? '—'}</dd>
    <dt>Baños</dt><dd>${a.bathrooms ?? '—'}</dd>
    <dt>Cocheras</dt><dd>${a.garages ?? '—'}</dd>
    <dt>Antigüedad</dt><dd>${a.ageYears != null ? `${a.ageYears} años` : '—'}</dd>
    <dt>Finalidad</dt><dd>${escapeHtml(a.purpose)}</dd>
  </dl>
</div>

<!-- Value range -->
<div class="section">
  <h2>Valuación Estimada</h2>
  <div class="value-box">
    <div class="currency">${escapeHtml(r.valueCurrency)}</div>
    <div class="range">${formatCurrency(r.estimatedValueMin, '')} — ${formatCurrency(r.estimatedValueMax, '')}</div>
  </div>
</div>

<!-- Comps table -->
<div class="section">
  <h2>Comparables Analizados</h2>
  <table>
    <thead>
      <tr>
        <th>Dirección</th>
        <th>Distancia</th>
        <th>Precio</th>
        <th>$/m²</th>
        <th>Superficie</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${compsRows}</tbody>
  </table>
  ${r.compsSummary ? `<h3>Resumen de Comparables</h3><div class="narrative">${escapeHtml(r.compsSummary)}</div>` : ''}
</div>

<!-- AI Narrative -->
<div class="section">
  <h2>Análisis y Fundamentación</h2>
  <div class="narrative">${escapeHtml(r.narrativeMd)}</div>
</div>

<!-- Methodology -->
${r.methodologyNote ? `
<div class="section">
  <h2>Nota Metodológica</h2>
  <div class="narrative">${escapeHtml(r.methodologyNote)}</div>
</div>
` : ''}

<!-- Signature -->
<div class="signature-block">
  ${signatureBlock}
  <div class="name">${escapeHtml(a.appraiserName)}</div>
  ${a.appraiserMatricula ? `<div class="matricula">Mat. ${escapeHtml(a.appraiserMatricula)}</div>` : ''}
</div>

<div class="footer">
  Generado por Corredor CRM — ${new Date().toISOString().slice(0, 10)}
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class AppraisalPdfWorker extends BaseWorker<AppraisalPdfJobData, AppraisalPdfJobResult> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly r2: S3Client;
  private readonly bucketName: string;

  constructor(redis: Redis, databaseUrl: string, r2Config: R2Config) {
    super(QUEUE_NAMES.APPRAISAL_PDF_GENERATE, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
    this.r2 = buildS3Client(r2Config);
    this.bucketName = r2Config.bucketName;
  }

  protected async process(job: Job<AppraisalPdfJobData, AppraisalPdfJobResult>): Promise<AppraisalPdfJobResult> {
    const { tenantId, appraisalId, reportId } = job.data;
    const objectKey = `tenants/${tenantId}/appraisals/${appraisalId}/${reportId}.pdf`;

    const [appraisalRow] = await this.db
      .select()
      .from(appraisal)
      .where(eq(appraisal.id, appraisalId))
      .limit(1);

    if (!appraisalRow) throw new Error(`Appraisal ${appraisalId} not found`);

    const [reportRow] = await this.db
      .select()
      .from(appraisalReport)
      .where(eq(appraisalReport.id, reportId))
      .limit(1);

    if (!reportRow) throw new Error(`Report ${reportId} not found`);

    const comps = await this.db
      .select()
      .from(appraisalComp)
      .where(
        and(
          eq(appraisalComp.appraisalId, appraisalId),
          eq(appraisalComp.isIncluded, true),
        ),
      )
      .orderBy(appraisalComp.distanceM);

    const htmlContent = buildHtml({ appraisalRow, reportRow, comps });
    const pdfBuffer = await this.renderPdf(htmlContent);

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: { tenantId, appraisalId, reportId },
      }),
    );

    const presignedUrl = await getSignedUrl(
      this.r2,
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      { expiresIn: PRESIGNED_URL_TTL_S },
    );

    const pdfExpiresAt = new Date(Date.now() + PRESIGNED_URL_TTL_S * 1000);

    await this.db
      .update(appraisalReport)
      .set({
        pdfStorageKey: objectKey,
        pdfUrl: presignedUrl,
        pdfExpiresAt,
        pdfGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appraisalReport.id, reportId));

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

export function createAppraisalPdfWorker(redis: Redis): AppraisalPdfWorker | null {
  const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  const bucketName = process.env['R2_BUCKET_NAME'] ?? 'corredor-appraisals';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new AppraisalPdfWorker(redis, databaseUrl, {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  });
}
