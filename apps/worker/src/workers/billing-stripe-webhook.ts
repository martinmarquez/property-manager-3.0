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

interface StripeWebhookJobData {
  eventType: string;
  payload: Record<string, unknown>;
  stripeEventId: string;
  receivedAt: string;
}

export class BillingStripeWebhookWorker extends BaseWorker<StripeWebhookJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.BILLING_STRIPE_WEBHOOK, { redis, concurrency: 5 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<StripeWebhookJobData, void>): Promise<void> {
    const { eventType, payload } = job.data;

    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(payload);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(payload);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(payload);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(payload);
        break;
    }
  }

  private async handleCheckoutCompleted(payload: Record<string, unknown>): Promise<void> {
    const tenantId = (payload['client_reference_id'] ?? (payload['metadata'] as Record<string, string>)?.['tenantId']) as string;
    const stripeSubId = payload['subscription'] as string;
    const customerId = payload['customer'] as string;
    const metadata = payload['metadata'] as Record<string, string> | undefined;
    const planCode = metadata?.['planCode'] ?? 'solo';

    if (!tenantId) {
      this.logger.warn('checkout.session.completed missing tenantId', { payload });
      return;
    }

    const [existing] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.tenantId, tenantId))
      .limit(1);

    if (existing) {
      await this.db
        .update(subscription)
        .set({
          planCode,
          billingProvider: 'stripe',
          stripeSubscriptionId: stripeSubId,
          stripeCustomerId: customerId,
          status: 'active',
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
        billingProvider: 'stripe',
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId: customerId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      });
    }

    await this.db
      .update(tenant)
      .set({ planCode })
      .where(eq(tenant.id, tenantId));

    this.logger.info('Subscription created from checkout', { tenantId, planCode });
  }

  private async handleInvoicePaid(payload: Record<string, unknown>): Promise<void> {
    const stripeSubId = payload['subscription'] as string;
    const amountPaid = (payload['amount_paid'] as number) / 100;
    const currency = (payload['currency'] as string)?.toUpperCase() ?? 'USD';
    const stripeInvoiceId = payload['id'] as string;

    const [existingInvoice] = await this.db
      .select({ id: invoice.id })
      .from(invoice)
      .where(eq(invoice.providerInvoiceId, stripeInvoiceId))
      .limit(1);

    if (existingInvoice) {
      this.logger.info('invoice.paid: already processed', { stripeInvoiceId });
      return;
    }

    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, stripeSubId))
      .limit(1);

    if (!sub) {
      this.logger.warn('invoice.paid: subscription not found', { stripeSubId });
      return;
    }

    const [inv] = await this.db
      .insert(invoice)
      .values({
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        provider: 'stripe',
        providerInvoiceId: stripeInvoiceId,
        status: 'paid',
        amountDue: String(amountPaid),
        amountPaid: String(amountPaid),
        currency,
        paidAt: new Date(),
      })
      .returning();

    if (!inv) return;

    // Create payment record linked to invoice
    await this.db.insert(payment).values({
      tenantId: sub.tenantId,
      invoiceId: inv.id,
      provider: 'stripe',
      providerPaymentId: stripeInvoiceId,
      status: 'approved',
      amount: String(amountPaid),
      currency,
      paidAt: new Date(),
    });

    // Ensure subscription is active
    if (sub.status === 'past_due') {
      await this.db
        .update(subscription)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(subscription.id, sub.id));
    }

    // Queue AFIP invoice
    await this.queueAfipInvoice(inv.id, sub);
  }

  private async handleSubscriptionUpdated(payload: Record<string, unknown>): Promise<void> {
    const stripeSubId = payload['id'] as string;
    const status = payload['status'] as string;
    const cancelAtPeriodEnd = payload['cancel_at_period_end'] as boolean;
    const currentPeriodEnd = payload['current_period_end'] as number;

    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, stripeSubId))
      .limit(1);

    if (!sub) return;

    const mappedStatus = this.mapStripeStatus(status, cancelAtPeriodEnd);

    await this.db
      .update(subscription)
      .set({
        status: mappedStatus,
        cancelAtPeriodEnd,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : sub.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, sub.id));
  }

  private async handleSubscriptionDeleted(payload: Record<string, unknown>): Promise<void> {
    const stripeSubId = payload['id'] as string;

    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, stripeSubId))
      .limit(1);

    if (!sub) return;

    await this.db
      .update(subscription)
      .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscription.id, sub.id));

    await this.db
      .update(tenant)
      .set({ planCode: 'trial' })
      .where(eq(tenant.id, sub.tenantId));
  }

  private mapStripeStatus(
    stripeStatus: string,
    cancelAtPeriodEnd: boolean,
  ): 'active' | 'past_due' | 'cancelled' | 'trialing' {
    if (cancelAtPeriodEnd) return 'cancelled';
    switch (stripeStatus) {
      case 'active': return 'active';
      case 'past_due': return 'past_due';
      case 'canceled': return 'cancelled';
      case 'trialing': return 'trialing';
      default: return 'active';
    }
  }

  private async queueAfipInvoice(
    invoiceId: string,
    sub: typeof subscription.$inferSelect,
  ): Promise<void> {
    const invoiceType = determineInvoiceType(sub.fiscalCondition ?? 'CF');

    const [afipInv] = await this.db
      .insert(afipInvoice)
      .values({
        tenantId: sub.tenantId,
        invoiceId,
        invoiceType,
        invoiceNumber: 0, // placeholder — AFIP worker fetches real number
        puntoVenta: AFIP_PUNTO_VENTA,
        status: 'pending',
      })
      .returning();

    if (afipInv) {
      const queue = createQueue(QUEUE_NAMES.BILLING_AFIP_INVOICE, this.redis);
      await queue.add('afip-from-stripe', { afipInvoiceId: afipInv.id, tenantId: sub.tenantId });
      await queue.close();
    }
  }
}
