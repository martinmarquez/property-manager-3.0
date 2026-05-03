import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import {
  createNodeDb,
  subscription,
  invoice,
  payment,
  afipInvoice,
  tenant,
} from '@corredor/db';
import {
  BaseWorker,
  QUEUE_NAMES,
  createQueue,
  determineInvoiceType,
  AFIP_PUNTO_VENTA,
} from '@corredor/core';
import type Redis from 'ioredis';

interface MercadoPagoWebhookJobData {
  action: string;
  dataId: string;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface MPPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  date_approved: string | null;
  payment_method_id: string;
}

interface MPPreapprovalResponse {
  id: string;
  status: string;
  external_reference: string;
  auto_recurring: { transaction_amount: number; currency_id: string };
  payer_id: number;
}

export class BillingMPWebhookWorker extends BaseWorker<MercadoPagoWebhookJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly mpAccessToken: string | undefined;

  constructor(redis: Redis, databaseUrl: string, mpAccessToken: string | undefined) {
    super(QUEUE_NAMES.BILLING_MP_WEBHOOK, { redis, concurrency: 5 });
    this.db = createNodeDb(databaseUrl);
    this.mpAccessToken = mpAccessToken;
  }

  protected async process(job: Job<MercadoPagoWebhookJobData, void>): Promise<void> {
    const { type, dataId } = job.data;

    if (!this.mpAccessToken) {
      this.logger.warn('MP_ACCESS_TOKEN not configured, skipping');
      return;
    }

    switch (type) {
      case 'payment':
        await this.handlePayment(dataId);
        break;
      case 'preapproval':
        await this.handlePreapproval(dataId);
        break;
    }
  }

  private async handlePayment(paymentId: string): Promise<void> {
    const [existingPayment] = await this.db
      .select({ id: payment.id })
      .from(payment)
      .where(eq(payment.providerPaymentId, String(paymentId)))
      .limit(1);

    if (existingPayment) {
      this.logger.info('payment already processed', { paymentId });
      return;
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.mpAccessToken}` },
    });

    if (!response.ok) {
      throw new Error(`MP payment fetch failed: ${response.status}`);
    }

    const mpPayment = (await response.json()) as MPPaymentResponse;
    const externalRef = mpPayment.external_reference;

    if (!externalRef) {
      this.logger.warn('Payment missing external_reference', { paymentId });
      return;
    }

    // external_reference format: tenantId:planCode:interval
    const [tenantId, planCode] = externalRef.split(':');
    if (!tenantId || !planCode) return;

    // Find or verify subscription exists
    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.tenantId, tenantId))
      .limit(1);

    if (mpPayment.status === 'approved') {
      // Create invoice record
      const [inv] = await this.db
        .insert(invoice)
        .values({
          tenantId,
          subscriptionId: sub?.id ?? tenantId, // fallback if sub not yet created
          provider: 'mercadopago',
          providerInvoiceId: String(mpPayment.id),
          status: 'paid',
          amountDue: String(mpPayment.transaction_amount),
          amountPaid: String(mpPayment.transaction_amount),
          currency: mpPayment.currency_id ?? 'ARS',
          paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date(),
        })
        .returning();

      if (!inv) return;

      // Create payment record
      await this.db.insert(payment).values({
        tenantId,
        invoiceId: inv.id,
        provider: 'mercadopago',
        providerPaymentId: String(mpPayment.id),
        status: 'approved',
        amount: String(mpPayment.transaction_amount),
        currency: mpPayment.currency_id ?? 'ARS',
        paymentMethod: mpPayment.payment_method_id,
        paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : new Date(),
      });

      // Update tenant plan
      await this.db
        .update(tenant)
        .set({ planCode })
        .where(eq(tenant.id, tenantId));

      // If subscription was past_due, recover it
      if (sub?.status === 'past_due') {
        await this.db
          .update(subscription)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(subscription.id, sub.id));
      }

      // Queue AFIP invoice
      await this.queueAfipInvoice(inv.id, tenantId, sub);
    } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      // Record failed payment via invoice + payment
      const [inv] = await this.db
        .insert(invoice)
        .values({
          tenantId,
          subscriptionId: sub?.id ?? tenantId,
          provider: 'mercadopago',
          providerInvoiceId: String(mpPayment.id),
          status: 'open',
          amountDue: String(mpPayment.transaction_amount),
          currency: mpPayment.currency_id ?? 'ARS',
        })
        .returning();

      if (inv) {
        await this.db.insert(payment).values({
          tenantId,
          invoiceId: inv.id,
          provider: 'mercadopago',
          providerPaymentId: String(mpPayment.id),
          status: 'rejected',
          amount: String(mpPayment.transaction_amount),
          currency: mpPayment.currency_id ?? 'ARS',
          paymentMethod: mpPayment.payment_method_id,
        });
      }

      // Start dunning if subscription exists and is active
      if (sub && sub.status === 'active') {
        await this.db
          .update(subscription)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(subscription.id, sub.id));

        const dunningQueue = createQueue(QUEUE_NAMES.BILLING_DUNNING, this.redis);
        await dunningQueue.add(
          'mp-dunning-start',
          { tenantId, subscriptionId: sub.id, attempt: 1 },
          { delay: 86_400_000 },
        );
        await dunningQueue.close();
      }
    }
  }

  private async handlePreapproval(preapprovalId: string): Promise<void> {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${this.mpAccessToken}` },
    });

    if (!response.ok) {
      throw new Error(`MP preapproval fetch failed: ${response.status}`);
    }

    const preapproval = (await response.json()) as MPPreapprovalResponse;
    const externalRef = preapproval.external_reference;

    if (!externalRef) return;

    const [tenantId, planCode] = externalRef.split(':');
    if (!tenantId || !planCode) return;

    if (preapproval.status === 'authorized') {
      const [existing] = await this.db
        .select()
        .from(subscription)
        .where(eq(subscription.tenantId, tenantId))
        .limit(1);

      if (existing) {
        await this.db
          .update(subscription)
          .set({
            billingProvider: 'mercadopago',
            mpPreapprovalId: preapproval.id,
            mpCustomerId: String(preapproval.payer_id),
            planCode,
            status: 'active',
            priceAmount: String(preapproval.auto_recurring.transaction_amount),
            currency: preapproval.auto_recurring.currency_id ?? 'ARS',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            updatedAt: new Date(),
          })
          .where(eq(subscription.id, existing.id));
      } else {
        await this.db.insert(subscription).values({
          tenantId,
          planCode,
          billingProvider: 'mercadopago',
          mpPreapprovalId: preapproval.id,
          mpCustomerId: String(preapproval.payer_id),
          status: 'active',
          priceAmount: String(preapproval.auto_recurring.transaction_amount),
          currency: preapproval.auto_recurring.currency_id ?? 'ARS',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        });
      }

      await this.db
        .update(tenant)
        .set({ planCode })
        .where(eq(tenant.id, tenantId));
    } else if (preapproval.status === 'cancelled') {
      await this.db
        .update(subscription)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscription.mpPreapprovalId, preapproval.id));
    }
  }

  private async queueAfipInvoice(
    invoiceId: string,
    tenantId: string,
    sub: typeof subscription.$inferSelect | undefined,
  ): Promise<void> {
    const invoiceType = determineInvoiceType(sub?.fiscalCondition ?? 'CF');

    const [afipInv] = await this.db
      .insert(afipInvoice)
      .values({
        tenantId,
        invoiceId,
        invoiceType,
        invoiceNumber: 0,
        puntoVenta: AFIP_PUNTO_VENTA,
        status: 'pending',
      })
      .returning();

    if (afipInv) {
      const queue = createQueue(QUEUE_NAMES.BILLING_AFIP_INVOICE, this.redis);
      await queue.add('afip-from-mp', { afipInvoiceId: afipInv.id, tenantId });
      await queue.close();
    }
  }
}
