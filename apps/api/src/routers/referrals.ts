/**
 * Referrals router — Phase H (RENA-204)
 *
 * Procedures (all under referrals.*):
 *   getOrCreate     Get existing referral code for current user, or create one
 *   myStats         Click / signup / conversion counts for current user's code
 *   trackClick      Public — record a referral link click (increments counter)
 *   attributeSignup Internal — called after registration to attribute signup to referrer
 */

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { referralCode, referralAttribution, analyticsEvent } from '@corredor/db';
import { ANALYTICS_EVENTS } from '@corredor/core';
import { router, protectedProcedure, publicProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const referralsRouter = router({
  // -------------------------------------------------------------------------
  // referrals.getOrCreate — get or lazily create referral code for current user
  // -------------------------------------------------------------------------
  getOrCreate: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, tenantId, userId } = ctx;

    const existing = await db.query.referralCode.findFirst({
      where: (r, { and: aand, eq: eeq }) => aand(eeq(r.tenantId, tenantId), eeq(r.userId, userId)),
      columns: { id: true, code: true, clickCount: true, signupCount: true, convertedCount: true },
    });

    if (existing) return existing;

    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const conflict = await db.query.referralCode.findFirst({
        where: (r, { eq: eeq }) => eeq(r.code, code),
        columns: { id: true },
      });
      if (!conflict) break;
      code = generateCode();
      attempts++;
    }
    if (attempts === 5) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate unique referral code' });
    }

    const [created] = await db
      .insert(referralCode)
      .values({ tenantId, userId, code })
      .returning({ id: referralCode.id, code: referralCode.code, clickCount: referralCode.clickCount, signupCount: referralCode.signupCount, convertedCount: referralCode.convertedCount });

    if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

    await db.insert(analyticsEvent).values({
      tenantId,
      eventType: ANALYTICS_EVENTS.REFERRAL_LINK_GENERATED as never,
      entityType: 'referral',
      actorId: userId,
      properties: { code: created.code },
    });

    return created;
  }),

  // -------------------------------------------------------------------------
  // referrals.myStats — aggregated stats for current user
  // -------------------------------------------------------------------------
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const { db, tenantId, userId } = ctx;

    const code = await db.query.referralCode.findFirst({
      where: (r, { and: aand, eq: eeq }) => aand(eeq(r.tenantId, tenantId), eeq(r.userId, userId)),
      columns: { id: true, code: true, clickCount: true, signupCount: true, convertedCount: true, rewardGrantedAt: true },
    });

    if (!code) return null;

    return {
      code: code.code,
      clickCount: code.clickCount,
      signupCount: code.signupCount,
      convertedCount: code.convertedCount,
      rewardGrantedAt: code.rewardGrantedAt,
      kFactor: code.signupCount > 0 ? Number((code.convertedCount / code.signupCount).toFixed(2)) : 0,
    };
  }),

  // -------------------------------------------------------------------------
  // referrals.trackClick — public, called when someone clicks a referral link
  // -------------------------------------------------------------------------
  trackClick: publicProcedure
    .input(z.object({ code: z.string().length(8) }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const codeRow = await db.query.referralCode.findFirst({
        where: (r, { eq: eeq }) => eeq(r.code, input.code),
        columns: { id: true, tenantId: true },
      });

      if (!codeRow) return { ok: false };

      await db
        .update(referralCode)
        .set({ clickCount: sql`${referralCode.clickCount} + 1` })
        .where(eq(referralCode.id, codeRow.id));

      await db.insert(referralAttribution).values({
        referralCodeId: codeRow.id,
        referrerTenantId: codeRow.tenantId,
        status: 'clicked',
      });

      await db.insert(analyticsEvent).values({
        tenantId: codeRow.tenantId,
        eventType: ANALYTICS_EVENTS.REFERRAL_LINK_CLICKED as never,
        entityType: 'referral',
        properties: { code: input.code },
      });

      return { ok: true };
    }),

  // -------------------------------------------------------------------------
  // referrals.attributeSignup — called post-registration when ref param present
  // -------------------------------------------------------------------------
  attributeSignup: publicProcedure
    .input(z.object({
      code:           z.string().length(8),
      refereeTenantId: z.string().uuid(),
      refereeUserId:  z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const codeRow = await db.query.referralCode.findFirst({
        where: (r, { eq: eeq }) => eeq(r.code, input.code),
        columns: { id: true, tenantId: true },
      });

      if (!codeRow) return { ok: false };

      await db
        .update(referralCode)
        .set({ signupCount: sql`${referralCode.signupCount} + 1` })
        .where(eq(referralCode.id, codeRow.id));

      await db.insert(referralAttribution).values({
        referralCodeId:   codeRow.id,
        referrerTenantId: codeRow.tenantId,
        refereeTenantId:  input.refereeTenantId,
        refereeUserId:    input.refereeUserId,
        status:           'signed_up',
      });

      await db.insert(analyticsEvent).values({
        tenantId: codeRow.tenantId,
        eventType: ANALYTICS_EVENTS.REFERRAL_SIGNUP_ATTRIBUTED as never,
        entityType: 'referral',
        properties: { code: input.code, refereeTenantId: input.refereeTenantId },
      });

      return { ok: true };
    }),
});
