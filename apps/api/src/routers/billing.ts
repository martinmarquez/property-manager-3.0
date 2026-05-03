import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  plan,
  subscription,
  invoice,
  payment,
  afipInvoice,
} from '@corredor/db';
import { createQueue, QUEUE_NAMES, interpretBnaRate, calculateArsPrice } from '@corredor/core';
import type { BnaRateRow } from '@corredor/core';
import { router, protectedProcedure } from '../trpc.js';
import { env } from '../env.js';

// ---------------------------------------------------------------------------
// Stripe helpers (lazy-loaded to avoid import cost when not configured)
// ---------------------------------------------------------------------------

async function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe not configured' });
  }
  const { default: Stripe } = await import('stripe');
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
}

// ---------------------------------------------------------------------------
// Billing Router
// ---------------------------------------------------------------------------

export const billingRouter = router({
  // ─── Plans ───────────────────────────────────────────────────────────────
  plans: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(plan)
      .where(eq(plan.isActive, true))
      .orderBy(plan.sortOrder);
  }),

  // ─── Current subscription ────────────────────────────────────────────────
  currentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscription)
      .where(eq(subscription.tenantId, ctx.tenantId))
      .limit(1);
    return sub ?? null;
  }),

  // ─── Invoice history ─────────────────────────────────────────────────────
  invoices: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(invoice)
        .where(eq(invoice.tenantId, ctx.tenantId))
        .orderBy(desc(invoice.createdAt))
        .limit(input.limit);
    }),

  // ─── Payment history ─────────────────────────────────────────────────────
  payments: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(payment)
        .where(eq(payment.tenantId, ctx.tenantId))
        .orderBy(desc(payment.createdAt))
        .limit(input.limit);
    }),

  // ─── Stripe: Create checkout session ─────────────────────────────────────
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planCode: z.enum(['solo', 'agencia', 'pro', 'enterprise']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = await getStripe();

      const priceMap: Record<string, string | undefined> = {
        solo: env.STRIPE_PRICE_ID_STARTER,
        pro: env.STRIPE_PRICE_ID_PRO,
      };

      const priceId = priceMap[input.planCode];
      if (!priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No Stripe price configured for plan: ${input.planCode}`,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: ctx.tenantId,
        metadata: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          planCode: input.planCode,
        },
      });

      return { sessionId: session.id, url: session.url };
    }),

  // ─── Stripe: Cancel subscription ────────────────────────────────────────
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscription)
      .where(eq(subscription.tenantId, ctx.tenantId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No active Stripe subscription' });
    }

    const stripe = await getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await ctx.db
      .update(subscription)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscription.id, sub.id));

    return { cancelAtPeriodEnd: true };
  }),

  // ─── Stripe: Reactivate subscription ────────────────────────────────────
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscription)
      .where(eq(subscription.tenantId, ctx.tenantId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No Stripe subscription to reactivate' });
    }

    const stripe = await getStripe();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await ctx.db
      .update(subscription)
      .set({ cancelAtPeriodEnd: false, cancelledAt: null, updatedAt: new Date() })
      .where(eq(subscription.id, sub.id));

    return { reactivated: true };
  }),

  // ─── Stripe: Upgrade/downgrade plan ──────────────────────────────────────
  changePlan: protectedProcedure
    .input(
      z.object({
        newPlanCode: z.enum(['solo', 'agencia', 'pro', 'enterprise']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [sub] = await ctx.db
        .select()
        .from(subscription)
        .where(eq(subscription.tenantId, ctx.tenantId))
        .limit(1);

      if (!sub?.stripeSubscriptionId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active Stripe subscription' });
      }

      const stripe = await getStripe();
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const currentItemId = stripeSub.items.data[0]?.id;
      if (!currentItemId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No subscription item found' });
      }

      const priceMap: Record<string, string | undefined> = {
        solo: env.STRIPE_PRICE_ID_STARTER,
        pro: env.STRIPE_PRICE_ID_PRO,
      };
      const newPriceId = priceMap[input.newPlanCode];
      if (!newPriceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `No price for plan: ${input.newPlanCode}` });
      }

      // Determine upgrade vs downgrade by sort_order
      const plans = await ctx.db.select().from(plan).where(eq(plan.isActive, true));
      const currentPlan = plans.find((p) => p.code === sub.planCode);
      const newPlan = plans.find((p) => p.code === input.newPlanCode);
      const isUpgrade = (newPlan?.sortOrder ?? 0) > (currentPlan?.sortOrder ?? 0);

      // Proration on upgrade (immediate); downgrade at period end
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        items: [{ id: currentItemId, price: newPriceId }],
        proration_behavior: isUpgrade ? 'always_invoice' : 'none',
      });

      await ctx.db
        .update(subscription)
        .set({
          planCode: input.newPlanCode,
          priceAmount: newPlan?.priceUsd ?? null,
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, sub.id));

      return { newPlanCode: input.newPlanCode, isUpgrade };
    }),

  // ─── Mercado Pago: Create checkout ───────────────────────────────────────
  createMPCheckout: protectedProcedure
    .input(
      z.object({
        planCode: z.enum(['solo', 'agencia', 'pro', 'enterprise']),
        interval: z.enum(['monthly', 'annual']).default('monthly'),
        successUrl: z.string().url(),
        failureUrl: z.string().url(),
        pendingUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.MP_ACCESS_TOKEN) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Mercado Pago not configured' });
      }

      const [selectedPlan] = await ctx.db
        .select()
        .from(plan)
        .where(eq(plan.code, input.planCode));

      if (!selectedPlan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
      }

      const bnaResult = await ctx.db.execute(sql`
        SELECT date, sell_rate, fetched_at FROM bna_rate ORDER BY date DESC LIMIT 1
      `);
      const { sellRate: bnaRate, isStale } = interpretBnaRate(bnaResult.rows as unknown as BnaRateRow[]);
      if (isStale) {
        console.warn('BNA rate is stale (>48h) — billing may use outdated exchange rate');
      }
      const usdPrice = Number(selectedPlan.priceUsd ?? 0);
      const arsPrice = calculateArsPrice(usdPrice, bnaRate);

      // For recurring monthly: use Preapproval API
      if (input.interval === 'monthly') {
        const response = await fetch('https://api.mercadopago.com/preapproval', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: `Corredor ${selectedPlan.displayName} - Mensual`,
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: arsPrice,
              currency_id: 'ARS',
            },
            back_url: input.successUrl,
            external_reference: `${ctx.tenantId}:${input.planCode}:monthly`,
          }),
        });

        const data = await response.json() as { id: string; init_point: string };
        return { preferenceId: data.id, url: data.init_point };
      }

      // For annual: one-time Checkout Pro
      const annualArs = arsPrice * 10; // 10 months (2 free)
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: `Corredor ${selectedPlan.displayName} - Anual`,
              quantity: 1,
              unit_price: annualArs,
              currency_id: 'ARS',
            },
          ],
          back_urls: {
            success: input.successUrl,
            failure: input.failureUrl,
            pending: input.pendingUrl,
          },
          auto_return: 'approved',
          external_reference: `${ctx.tenantId}:${input.planCode}:annual`,
        }),
      });

      const data = await response.json() as { id: string; init_point: string };
      return { preferenceId: data.id, url: data.init_point };
    }),

  // ─── AFIP: Manual retry invoice ──────────────────────────────────────────
  retryAfipInvoice: protectedProcedure
    .input(z.object({ afipInvoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await ctx.db
        .select()
        .from(afipInvoice)
        .where(
          and(
            eq(afipInvoice.id, input.afipInvoiceId),
            eq(afipInvoice.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!inv) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'AFIP invoice not found' });
      }

      if (inv.status === 'approved') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice already approved' });
      }

      await ctx.db
        .update(afipInvoice)
        .set({ status: 'pending', errorMessage: null, updatedAt: new Date() })
        .where(eq(afipInvoice.id, inv.id));

      const queue = createQueue(QUEUE_NAMES.BILLING_AFIP_INVOICE, ctx.redis);
      await queue.add('afip-retry', {
        afipInvoiceId: inv.id,
        tenantId: ctx.tenantId,
        isRetry: true,
      });
      await queue.close();

      return { queued: true };
    }),

  // ─── AFIP invoices list ──────────────────────────────────────────────────
  afipInvoices: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(afipInvoice)
        .where(eq(afipInvoice.tenantId, ctx.tenantId))
        .orderBy(desc(afipInvoice.createdAt))
        .limit(input.limit);
    }),
});
