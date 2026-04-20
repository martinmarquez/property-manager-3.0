import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { destroySession } from '../middleware/session.js';
import { clearSessionCookie } from '../middleware/session.js';

/**
 * Auth router — stub for Phase A.
 * Full implementation (Argon2id, TOTP, WebAuthn) lives in RENA-5.
 */
export const authRouter = router({
  /**
   * auth.me — return the currently authenticated user's identity.
   * Stub: returns session claims only; full user record query in RENA-5.
   */
  me: protectedProcedure
    .output(
      z.object({
        userId: z.string().uuid(),
        tenantId: z.string().uuid(),
        roles: z.array(z.string()),
      }),
    )
    .query(({ ctx }) => {
      return {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        roles: ctx.roles,
      };
    }),

  /**
   * auth.logout — destroy the server-side session and clear the cookie.
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const { sessionId, redis, c } = ctx;
    if (sessionId) {
      await destroySession(redis, sessionId);
      clearSessionCookie(c);
    }
    return { success: true };
  }),

  /**
   * auth.login — stub for Phase A.
   * Full Argon2id + session creation implemented in RENA-5.
   */
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(() => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Login implemented in RENA-5',
      });
    }),
});

export type AuthRouter = typeof authRouter;
