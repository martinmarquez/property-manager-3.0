import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import {
  createNodeDb,
  afipInvoice,
  invoice,
  subscription,
} from '@corredor/db';
import {
  BaseWorker,
  QUEUE_NAMES,
  createQueue,
  AfipWsfeClient,
  isAfipConfigured,
  IVA_RATE,
} from '@corredor/core';
import type { AfipConfig, AfipInvoiceRequest } from '@corredor/core';
import type { AfipPdfJobData } from './billing-afip-pdf.js';
import type Redis from 'ioredis';

interface AfipInvoiceJobData {
  afipInvoiceId: string;
  tenantId: string;
  isRetry?: boolean;
}

const MAX_RETRIES = 3;

export class BillingAfipInvoiceWorker extends BaseWorker<AfipInvoiceJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly afipConfig: Partial<AfipConfig>;
  private readonly pdfQueue: ReturnType<typeof createQueue<AfipPdfJobData>>;

  constructor(redis: Redis, databaseUrl: string, afipConfig: Partial<AfipConfig>) {
    super(QUEUE_NAMES.BILLING_AFIP_INVOICE, { redis, concurrency: 3 });
    this.db = createNodeDb(databaseUrl);
    this.afipConfig = afipConfig;
    this.pdfQueue = createQueue<AfipPdfJobData>(QUEUE_NAMES.BILLING_AFIP_PDF, redis);
  }

  protected async process(job: Job<AfipInvoiceJobData, void>): Promise<void> {
    const { afipInvoiceId } = job.data;

    // OQ-4: Skip if AFIP not configured (dev/staging)
    if (!isAfipConfigured(this.afipConfig)) {
      this.logger.info('AFIP not configured, skipping CAE request', { afipInvoiceId });
      return;
    }

    const [afipInv] = await this.db
      .select()
      .from(afipInvoice)
      .where(eq(afipInvoice.id, afipInvoiceId))
      .limit(1);

    if (!afipInv) {
      this.logger.warn('AFIP invoice not found', { afipInvoiceId });
      return;
    }

    if (afipInv.status === 'issued') {
      this.logger.info('AFIP invoice already issued', { afipInvoiceId });
      return;
    }

    // Get related invoice for amount info
    const [inv] = await this.db
      .select()
      .from(invoice)
      .where(eq(invoice.id, afipInv.invoiceId))
      .limit(1);

    if (!inv) {
      this.logger.warn('Related invoice not found', { invoiceId: afipInv.invoiceId });
      return;
    }

    // Get subscription for fiscal data
    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.id, inv.subscriptionId))
      .limit(1);

    const total = Number(inv.amountDue);
    const netoGravado = total / (1 + IVA_RATE);
    const ivaAmount = total - netoGravado;
    const today = this.formatAfipDate(new Date());

    const caeRequest: AfipInvoiceRequest = {
      puntoVenta: afipInv.puntoVenta,
      invoiceType: afipInv.invoiceType as 'A' | 'B' | 'C' | 'E',
      buyerCuit: sub?.cuit ?? undefined,
      buyerName: sub?.razonSocial ?? 'Consumidor Final',
      buyerAddress: undefined,
      buyerTaxCondition: sub?.fiscalCondition ?? 'CF',
      netoGravado,
      ivaAmount,
      total,
      concept: 2, // Services
      serviceFrom: today,
      serviceTo: today,
      paymentDueDate: today,
    };

    const client = new AfipWsfeClient(this.afipConfig as AfipConfig);

    try {
      // Store request in JSONB for audit trail
      await this.db
        .update(afipInvoice)
        .set({ wsfeRequest: caeRequest as unknown as Record<string, unknown>, updatedAt: new Date() })
        .where(eq(afipInvoice.id, afipInvoiceId));

      const result = await client.requestCae(caeRequest);

      // Store response
      await this.db
        .update(afipInvoice)
        .set({ wsfeResponse: result as unknown as Record<string, unknown>, updatedAt: new Date() })
        .where(eq(afipInvoice.id, afipInvoiceId));

      if (result.result === 'A') {
        await this.db
          .update(afipInvoice)
          .set({
            status: 'issued',
            cae: result.cae,
            caeExpiresAt: result.caeExpiresAt.slice(0, 10), // DATE format
            invoiceNumber: result.cbteNumero,
            updatedAt: new Date(),
          })
          .where(eq(afipInvoice.id, afipInvoiceId));

        this.logger.info('CAE issued', { afipInvoiceId, cae: result.cae, cbteNumero: result.cbteNumero });

        await this.pdfQueue.add(
          'afip-pdf',
          { afipInvoiceId, tenantId: job.data.tenantId },
          { jobId: `afip-pdf:${afipInvoiceId}`, removeOnComplete: { count: 50 } },
        );
      } else {
        const errorMsg = result.errors?.map((e) => `${e.code}: ${e.msg}`).join('; ') ?? 'Unknown AFIP error';
        await this.handleRetry(afipInvoiceId, afipInv.retryCount, errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleRetry(afipInvoiceId, afipInv.retryCount, errorMsg);
    }
  }

  private async handleRetry(afipInvoiceId: string, currentRetry: number, errorMsg: string): Promise<void> {
    const newRetryCount = currentRetry + 1;

    if (newRetryCount >= MAX_RETRIES) {
      await this.db
        .update(afipInvoice)
        .set({
          status: 'failed',
          retryCount: newRetryCount,
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(afipInvoice.id, afipInvoiceId));

      this.logger.error('AFIP invoice retry exhausted — PagerDuty alert needed', {
        afipInvoiceId,
        error: errorMsg,
      });
      return;
    }

    await this.db
      .update(afipInvoice)
      .set({
        status: 'pending',
        retryCount: newRetryCount,
        errorMessage: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(afipInvoice.id, afipInvoiceId));

    // Re-throw so BullMQ retries with exponential backoff
    throw new Error(`AFIP CAE request failed (attempt ${newRetryCount}/${MAX_RETRIES}): ${errorMsg}`);
  }

  private formatAfipDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }
}
