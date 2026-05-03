import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { chromium } from 'playwright-core';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import {
  createNodeDb,
  afipInvoice,
  invoice,
  subscription,
  tenant,
} from '@corredor/db';
import { BaseWorker, QUEUE_NAMES, IVA_RATE } from '@corredor/core';
import type { Mailer } from '@corredor/core';
import type Redis from 'ioredis';

const PRESIGNED_URL_TTL_S = 7 * 24 * 60 * 60; // 7 days
const PDF_TIMEOUT_MS = 28_000;

// AFIP invoice type numeric codes
const INVOICE_TYPE_CODES: Record<string, number> = {
  A: 1,
  B: 6,
  C: 11,
  E: 19,
};

// AFIP invoice type display labels
const INVOICE_TYPE_LABELS: Record<string, string> = {
  A: 'FACTURA A',
  B: 'FACTURA B',
  C: 'FACTURA C',
  E: 'FACTURA E',
};

// Buyer document type: 80=CUIT, 99=Consumidor Final
function getBuyerDocType(taxCondition: string | null): number {
  switch (taxCondition) {
    case 'RI': return 80;
    case 'MO': return 80;
    case 'EX': return 80;
    default: return 99;
  }
}

// ---------------------------------------------------------------------------
// Job data
// ---------------------------------------------------------------------------

export interface AfipPdfJobData {
  afipInvoiceId: string;
  tenantId: string;
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
// Barcode + QR generation
// ---------------------------------------------------------------------------

async function generateCode128DataUri(text: string): Promise<string> {
  const pngBuffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 12,
    includetext: false,
  });
  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

async function generateAfipQrDataUri(params: {
  fecha: string;
  cuit: string;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  tipoDocRec: number;
  nroDocRec: string;
  codAut: string;
}): Promise<string> {
  const qrPayload = {
    ver: 1,
    fecha: params.fecha,
    cuit: Number(params.cuit),
    ptoVta: params.ptoVta,
    tipoCmp: params.tipoCmp,
    nroCmp: params.nroCmp,
    importe: params.importe,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: params.tipoDocRec,
    nroDocRec: Number(params.nroDocRec) || 0,
    tipoCodAut: 'E',
    codAut: Number(params.codAut),
  };
  const b64 = Buffer.from(JSON.stringify(qrPayload)).toString('base64');
  const url = `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
  return QRCode.toDataURL(url, { width: 180, margin: 1 });
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatArs(amount: number): string {
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface InvoiceHtmlData {
  tenantName: string;
  sellerCuit: string;
  invoiceType: string;
  invoiceNumber: number;
  puntoVenta: number;
  cae: string;
  caeExpiresAt: string;
  invoiceDate: string;
  buyerName: string;
  buyerCuit: string | null;
  buyerFiscalCondition: string | null;
  buyerAddress: Record<string, unknown> | null;
  total: number;
  netoGravado: number;
  ivaAmount: number;
  barcodeDataUri: string;
  qrDataUri: string;
}

function buildInvoiceHtml(data: InvoiceHtmlData): string {
  const typeLabel = INVOICE_TYPE_LABELS[data.invoiceType] ?? `FACTURA ${data.invoiceType}`;
  const typeLetter = data.invoiceType;
  const pvFormatted = String(data.puntoVenta).padStart(4, '0');
  const numFormatted = String(data.invoiceNumber).padStart(8, '0');
  const fullNumber = `${pvFormatted}-${numFormatted}`;

  const fiscalLabels: Record<string, string> = {
    RI: 'Responsable Inscripto',
    CF: 'Consumidor Final',
    MO: 'Monotributista',
    EX: 'Exportación',
    EX_IVA: 'Exento de IVA',
  };
  const buyerConditionLabel = fiscalLabels[data.buyerFiscalCondition ?? ''] ?? data.buyerFiscalCondition ?? '—';

  const addr = data.buyerAddress as Record<string, string> | null;
  const addressLine = addr
    ? [addr['street'], addr['city'], addr['province']].filter(Boolean).join(', ')
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.4; }

  .header { display: flex; justify-content: space-between; border: 2px solid #333; margin-bottom: 12px; }
  .header-left, .header-right { padding: 12px 16px; width: 45%; }
  .header-center { width: 10%; display: flex; align-items: flex-start; justify-content: center; position: relative; }

  .type-badge {
    width: 48px; height: 48px; border: 2px solid #333;
    display: flex; align-items: center; justify-content: center;
    font-size: 28pt; font-weight: 700; background: #fff;
    position: absolute; top: -2px;
  }
  .type-label { text-align: center; font-size: 8pt; margin-top: 52px; font-weight: 600; }

  .company-name { font-size: 14pt; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
  .company-cuit { font-size: 9pt; color: #555; }
  .invoice-title { font-size: 11pt; font-weight: 700; text-align: right; }
  .invoice-number { font-size: 14pt; font-weight: 700; color: #1e3a5f; text-align: right; }
  .invoice-date { font-size: 9pt; color: #555; text-align: right; margin-top: 4px; }

  .buyer-section { border: 1px solid #ccc; padding: 10px 14px; margin-bottom: 12px; }
  .buyer-section h3 { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #777; margin-bottom: 6px; }
  .buyer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; }
  .buyer-grid dt { font-weight: 600; font-size: 9pt; color: #555; }
  .buyer-grid dd { font-size: 10pt; margin: 0 0 2px; }

  .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .detail-table th { background: #1e3a5f; color: #fff; padding: 6px 10px; text-align: left; font-size: 9pt; font-weight: 600; }
  .detail-table td { padding: 6px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
  .detail-table .amount { text-align: right; }

  .totals { margin-left: auto; width: 300px; border: 1px solid #ccc; margin-bottom: 16px; }
  .totals tr td { padding: 5px 12px; font-size: 10pt; }
  .totals tr td:last-child { text-align: right; font-weight: 600; }
  .totals .total-row { background: #1e3a5f; color: #fff; font-size: 12pt; font-weight: 700; }

  .cae-section { border-top: 1px solid #ddd; padding-top: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
  .cae-info { font-size: 9pt; color: #555; }
  .cae-info strong { color: #1a1a1a; font-size: 10pt; }

  .barcode-section { text-align: center; margin: 8px 0; }
  .barcode-section img { max-width: 340px; }

  .qr-section { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
  .qr-section img { width: 120px; height: 120px; }
  .qr-label { font-size: 8pt; color: #777; }

  .footer { font-size: 7.5pt; color: #999; text-align: center; margin-top: 16px; border-top: 1px solid #eee; padding-top: 6px; }
</style>
</head>
<body>

<!-- Header with invoice type badge -->
<div class="header">
  <div class="header-left">
    <div class="company-name">${escapeHtml(data.tenantName)}</div>
    <div class="company-cuit">CUIT: ${escapeHtml(data.sellerCuit)}</div>
    <div class="company-cuit">IVA Responsable Inscripto</div>
  </div>
  <div class="header-center">
    <div class="type-badge">${escapeHtml(typeLetter)}</div>
    <div class="type-label">${escapeHtml(typeLabel)}</div>
  </div>
  <div class="header-right">
    <div class="invoice-title">${escapeHtml(typeLabel)}</div>
    <div class="invoice-number">Nro: ${fullNumber}</div>
    <div class="invoice-date">Fecha: ${escapeHtml(data.invoiceDate)}</div>
    <div class="invoice-date">Punto de Venta: ${pvFormatted}</div>
  </div>
</div>

<!-- Buyer details -->
<div class="buyer-section">
  <h3>Datos del Receptor</h3>
  <dl class="buyer-grid">
    <dt>Razón Social</dt><dd>${escapeHtml(data.buyerName)}</dd>
    <dt>Condición IVA</dt><dd>${escapeHtml(buyerConditionLabel)}</dd>
    <dt>CUIT</dt><dd>${escapeHtml(data.buyerCuit ?? 'N/A')}</dd>
    <dt>Domicilio</dt><dd>${escapeHtml(addressLine || '—')}</dd>
  </dl>
</div>

<!-- Line items -->
<table class="detail-table">
  <thead>
    <tr>
      <th>Concepto</th>
      <th>Descripción</th>
      <th class="amount">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Servicios</td>
      <td>Suscripción Corredor CRM</td>
      <td class="amount">$ ${formatArs(data.netoGravado)}</td>
    </tr>
  </tbody>
</table>

<!-- Totals -->
<table class="totals">
  <tr><td>Subtotal (Neto Gravado)</td><td>$ ${formatArs(data.netoGravado)}</td></tr>
  <tr><td>IVA (${(IVA_RATE * 100).toFixed(0)}%)</td><td>$ ${formatArs(data.ivaAmount)}</td></tr>
  <tr class="total-row"><td>TOTAL</td><td>$ ${formatArs(data.total)}</td></tr>
</table>

<!-- CAE + Barcode + QR -->
<div class="cae-section">
  <div class="cae-info">
    <strong>CAE: ${escapeHtml(data.cae)}</strong><br />
    Fecha de Vto. de CAE: ${escapeHtml(data.caeExpiresAt)}
  </div>
  <div class="qr-section">
    <img src="${data.qrDataUri}" alt="QR AFIP" />
    <div class="qr-label">Comprobante<br />autorizado por AFIP</div>
  </div>
</div>

<div class="barcode-section">
  <img src="${data.barcodeDataUri}" alt="Código de barras" />
</div>

<div class="footer">
  Comprobante electrónico autorizado por AFIP — Generado por Corredor CRM
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email HTML
// ---------------------------------------------------------------------------

function buildEmailHtml(tenantName: string, invoiceNumber: string, pdfUrl: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e3a5f;">Factura electrónica — ${escapeHtml(tenantName)}</h2>
  <p>Adjunto encontrará su comprobante electrónico Nro. <strong>${escapeHtml(invoiceNumber)}</strong>.</p>
  <p><a href="${escapeHtml(pdfUrl)}" style="display: inline-block; padding: 10px 24px; background: #1e3a5f; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 600;">Descargar factura (PDF)</a></p>
  <p style="font-size: 12px; color: #999; margin-top: 20px;">Este enlace es válido por 7 días. Si necesita una nueva copia, contáctenos.</p>
</div>`;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class BillingAfipPdfWorker extends BaseWorker<AfipPdfJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly r2: S3Client;
  private readonly bucketName: string;
  private readonly mailer: Mailer | null;
  private readonly sellerCuit: string;

  constructor(
    redis: Redis,
    databaseUrl: string,
    r2Config: R2Config,
    mailer: Mailer | null,
    sellerCuit: string,
  ) {
    super(QUEUE_NAMES.BILLING_AFIP_PDF, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
    this.r2 = buildS3Client(r2Config);
    this.bucketName = r2Config.bucketName;
    this.mailer = mailer;
    this.sellerCuit = sellerCuit;
  }

  protected async process(job: Job<AfipPdfJobData, void>): Promise<void> {
    const { afipInvoiceId, tenantId } = job.data;

    const [afipInv] = await this.db
      .select()
      .from(afipInvoice)
      .where(eq(afipInvoice.id, afipInvoiceId))
      .limit(1);

    if (!afipInv) {
      this.logger.warn('AFIP invoice not found for PDF', { afipInvoiceId });
      return;
    }

    if (afipInv.pdfR2Key) {
      this.logger.info('PDF already generated', { afipInvoiceId });
      return;
    }

    if (!afipInv.cae || !afipInv.invoiceNumber) {
      this.logger.warn('AFIP invoice missing CAE/number — cannot generate PDF', { afipInvoiceId });
      return;
    }

    const [inv] = await this.db
      .select()
      .from(invoice)
      .where(eq(invoice.id, afipInv.invoiceId))
      .limit(1);

    if (!inv) {
      this.logger.warn('Related invoice not found', { invoiceId: afipInv.invoiceId });
      return;
    }

    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.id, inv.subscriptionId))
      .limit(1);

    const [ten] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, tenantId))
      .limit(1);

    const tenantName = ten?.name ?? 'Corredor CRM';
    const total = Number(inv.amountDue);
    const netoGravado = total / (1 + IVA_RATE);
    const ivaAmount = total - netoGravado;
    const invoiceDate = afipInv.createdAt.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const tipoCmp = INVOICE_TYPE_CODES[afipInv.invoiceType] ?? 11;
    const buyerDocType = getBuyerDocType(sub?.fiscalCondition ?? null);
    const buyerCuit = sub?.cuit ?? '0';

    // Generate Code128 barcode: CUIT + TipoCmp + PtoVta + CAE + CaeVto
    const barcodeText = [
      this.sellerCuit.replace(/-/g, ''),
      String(tipoCmp).padStart(3, '0'),
      String(afipInv.puntoVenta).padStart(5, '0'),
      afipInv.cae,
      (afipInv.caeExpiresAt ?? '').replace(/-/g, ''),
    ].join('');

    const [barcodeDataUri, qrDataUri] = await Promise.all([
      generateCode128DataUri(barcodeText),
      generateAfipQrDataUri({
        fecha: afipInv.caeExpiresAt ?? new Date().toISOString().slice(0, 10),
        cuit: this.sellerCuit.replace(/-/g, ''),
        ptoVta: afipInv.puntoVenta,
        tipoCmp,
        nroCmp: afipInv.invoiceNumber,
        importe: total,
        tipoDocRec: buyerDocType,
        nroDocRec: buyerCuit,
        codAut: afipInv.cae,
      }),
    ]);

    const htmlContent = buildInvoiceHtml({
      tenantName,
      sellerCuit: this.sellerCuit,
      invoiceType: afipInv.invoiceType,
      invoiceNumber: afipInv.invoiceNumber,
      puntoVenta: afipInv.puntoVenta,
      cae: afipInv.cae,
      caeExpiresAt: afipInv.caeExpiresAt ?? '—',
      invoiceDate,
      buyerName: sub?.razonSocial ?? 'Consumidor Final',
      buyerCuit: sub?.cuit ?? null,
      buyerFiscalCondition: sub?.fiscalCondition ?? null,
      buyerAddress: (sub?.billingAddress as Record<string, unknown> | null) ?? null,
      total,
      netoGravado,
      ivaAmount,
      barcodeDataUri,
      qrDataUri,
    });

    const pdfBuffer = await this.renderPdf(htmlContent);
    const objectKey = `tenants/${tenantId}/invoices/${afipInvoiceId}.pdf`;

    await this.r2.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: { tenantId, afipInvoiceId },
      }),
    );

    const presignedUrl = await getSignedUrl(
      this.r2,
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      { expiresIn: PRESIGNED_URL_TTL_S },
    );

    await this.db
      .update(afipInvoice)
      .set({ pdfR2Key: objectKey, updatedAt: new Date() })
      .where(eq(afipInvoice.id, afipInvoiceId));

    await this.db
      .update(invoice)
      .set({ pdfUrl: presignedUrl, sentAt: new Date(), updatedAt: new Date() })
      .where(eq(invoice.id, afipInv.invoiceId));

    this.logger.info('AFIP invoice PDF generated and uploaded', { afipInvoiceId, objectKey });

    // Email the PDF link
    const billingEmail = sub?.billingEmail;
    if (billingEmail && this.mailer) {
      const pvFormatted = String(afipInv.puntoVenta).padStart(4, '0');
      const numFormatted = String(afipInv.invoiceNumber).padStart(8, '0');
      const fullNumber = `${pvFormatted}-${numFormatted}`;

      await this.mailer.sendMail({
        to: billingEmail,
        subject: `Factura electrónica ${fullNumber} — ${tenantName}`,
        html: buildEmailHtml(tenantName, fullNumber, presignedUrl),
      });

      this.logger.info('Invoice email sent', { afipInvoiceId, to: billingEmail });
    } else if (!billingEmail) {
      this.logger.warn('No billing email configured — skipping email', { afipInvoiceId });
    } else {
      this.logger.warn('Mailer not configured — skipping email', { afipInvoiceId });
    }
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
        margin: { top: '15mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export function createBillingAfipPdfWorker(
  redis: Redis,
  mailer: Mailer | null,
  sellerCuit: string,
): BillingAfipPdfWorker | null {
  const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  const bucketName = process.env['R2_INVOICES_BUCKET_NAME'] ?? 'corredor-invoices';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new BillingAfipPdfWorker(redis, databaseUrl, {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  }, mailer, sellerCuit);
}
