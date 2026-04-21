/**
 * Auth router — full Phase A implementation (RENA-5)
 *
 * Procedures (all under auth.*):
 *
 *  Public (no session required):
 *    register                    Email + password registration
 *    verifyEmail                 Verify email address with token
 *    login                       Email + password (returns session cookie)
 *    logout                      Destroy session
 *    passwordReset.request       Trigger password reset email
 *    passwordReset.confirm       Apply new password from reset token
 *    webauthn.authOptions        Get passkey authentication challenge
 *    webauthn.authVerify         Complete passkey authentication
 *
 *  Protected (session required):
 *    me                          Current user identity
 *    totp.enable                 Generate TOTP secret + QR code URI
 *    totp.confirm                Verify first code and activate TOTP
 *    totp.disable                Remove TOTP credential
 *    webauthn.registerOptions    Get passkey registration challenge
 *    webauthn.registerVerify     Save new passkey credential
 *    webauthn.removeCredential   Remove a stored passkey
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import {
  user,
  passwordResetToken,
  totpCredential,
  webauthnCredential,
  session as sessionTable,
  userRole,
  role,
} from '@corredor/db';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import {
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
} from '../middleware/session.js';
import { hashPassword, verifyPassword } from '../lib/auth/password.js';
import {
  generateTotpSecret,
  validateTotpCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  consumeBackupCode,
} from '../lib/auth/totp.js';
import {
  generateWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
  generateWebAuthnAuthenticationOptions,
  verifyWebAuthnAuthentication,
} from '../lib/auth/webauthn.js';
import {
  checkBruteForce,
  recordFailedAttempt,
  clearAccountCounter,
} from '../lib/auth/brute-force.js';
import { writeAuthAudit } from '../lib/auth/audit.js';
import { env } from '../env.js';
import { logger } from '@corredor/telemetry';
import type { Context } from 'hono';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIp(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function getUserAgent(c: Context): string {
  return c.req.header('User-Agent') ?? 'unknown';
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function getWebAuthnOrigin(): string {
  return env.WEBAUTHN_ORIGIN ?? `https://${env.WEBAUTHN_RP_ID}`;
}

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().min(1).max(255).optional(),
  tenantSlug: z.string().min(1).max(63),
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
  totpCode: z.string().length(6).optional(),
  backupCode: z.string().optional(),
});

const VerifyEmailInput = z.object({
  token: z.string().min(1),
});

const PasswordResetRequestInput = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
});

const PasswordResetConfirmInput = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const TotpConfirmInput = z.object({ code: z.string().length(6) });
const TotpDisableInput = z.object({ code: z.string().length(6) });

const WebAuthnRegisterVerifyInput = z.object({
  name: z.string().max(64).optional(),
  response: z.any(),
});

const WebAuthnAuthOptionsInput = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
});

const WebAuthnAuthVerifyInput = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
  response: z.any(),
});

const RemoveCredentialInput = z.object({ credentialId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Shared: create session + audit
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildSessionAndCookie(
  ctx: any,
  opts: { tenantId: string; userId: string; roles: string[]; ip: string; ua: string },
): Promise<string> {
  const { redis, db, c } = ctx;
  const isSecure = env.NODE_ENV === 'production';

  const sessionId = await createSession(redis, {
    tenantId: opts.tenantId,
    userId: opts.userId,
    roles: opts.roles,
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessionTable).values({
    id: sessionId,
    tenantId: opts.tenantId,
    userId: opts.userId,
    roles: opts.roles,
    ip: opts.ip,
    userAgent: opts.ua,
    expiresAt,
  });

  setSessionCookie(c, sessionId, isSecure);
  return sessionId;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const authRouter = router({
  // -------------------------------------------------------------------------
  // auth.me
  // -------------------------------------------------------------------------
  me: protectedProcedure.query(async ({ ctx }) => {
    const userRow = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.userId),
      columns: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    const totp = await ctx.db.query.totpCredential.findFirst({
      where: eq(totpCredential.userId, ctx.userId),
      columns: { confirmedAt: true },
    });

    return {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      roles: ctx.roles,
      email: userRow?.email,
      fullName: userRow?.fullName ?? null,
      emailVerifiedAt: userRow?.emailVerifiedAt?.toISOString() ?? null,
      totpEnabled: !!totp?.confirmedAt,
    };
  }),

  // -------------------------------------------------------------------------
  // auth.register
  // -------------------------------------------------------------------------
  register: publicProcedure.input(RegisterInput).mutation(async ({ ctx, input }) => {
    const { db, c } = ctx;
    const ip = getIp(c);
    const ua = getUserAgent(c);

    const tenantRow = await db.query.tenant.findFirst({
      where: (t, { eq: teq }) => teq(t.slug, input.tenantSlug),
      columns: { id: true },
    });
    if (!tenantRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
    }
    const tenantId = tenantRow.id;

    const existing = await db.query.user.findFirst({
      where: (u, { and: aand, eq: ueq, isNull }) =>
        aand(ueq(u.tenantId, tenantId), ueq(u.email, input.email), isNull(u.deletedAt)),
      columns: { id: true },
    });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await hashPassword(input.password);
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [newUser] = await db
      .insert(user)
      .values({ tenantId, email: input.email, passwordHash, fullName: input.fullName ?? null, active: true })
      .returning({ id: user.id });

    if (!newUser) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

    await db.insert(passwordResetToken).values({
      tenantId,
      userId: newUser.id,
      tokenHash,
      expiresAt: tokenExpiresAt,
    });

    await writeAuthAudit({
      db, tenantId, userId: newUser.id, action: 'user.registered', ip, userAgent: ua,
      requestId: ctx.requestId, meta: { email: input.email },
    });

    // TODO: enqueue email-verification email via BullMQ
    logger.info('auth.register: verification token created', {
      userId: newUser.id, prefix: tokenHash.slice(0, 8),
    });

    return { userId: newUser.id, message: 'Check your email to verify your account.' };
  }),

  // -------------------------------------------------------------------------
  // auth.verifyEmail
  // -------------------------------------------------------------------------
  verifyEmail: publicProcedure.input(VerifyEmailInput).mutation(async ({ ctx, input }) => {
    const { db, c } = ctx;
    const ip = getIp(c);
    const ua = getUserAgent(c);
    const tokenHash = hashToken(input.token);
    const now = new Date();

    const tokenRow = await db.query.passwordResetToken.findFirst({
      where: (t, { and: aand, eq: teq, isNull }) =>
        aand(teq(t.tokenHash, tokenHash), isNull(t.usedAt)),
      columns: { id: true, userId: true, tenantId: true, expiresAt: true },
    });

    if (!tokenRow || tokenRow.expiresAt < now) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired verification link' });
    }

    await Promise.all([
      db.update(passwordResetToken).set({ usedAt: now }).where(eq(passwordResetToken.id, tokenRow.id)),
      db.update(user).set({ emailVerifiedAt: now }).where(eq(user.id, tokenRow.userId)),
    ]);

    await writeAuthAudit({
      db, tenantId: tokenRow.tenantId, userId: tokenRow.userId,
      action: 'user.email_verified', ip, userAgent: ua, requestId: ctx.requestId,
    });

    return { success: true };
  }),

  // -------------------------------------------------------------------------
  // auth.login
  // -------------------------------------------------------------------------
  login: publicProcedure.input(LoginInput).mutation(async ({ ctx, input }) => {
    const { db, redis, c } = ctx;
    const ip = getIp(c);
    const ua = getUserAgent(c);

    const tenantRow = await db.query.tenant.findFirst({
      where: (t, { eq: teq }) => teq(t.slug, input.tenantSlug),
      columns: { id: true },
    });
    if (!tenantRow) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    const tenantId = tenantRow.id;

    // Brute force gate
    const bruteCheck = await checkBruteForce(redis, tenantId, input.email, ip);
    if (!bruteCheck.allowed) {
      await writeAuthAudit({
        db, tenantId, userId: null, action: 'user.locked_out', ip, userAgent: ua,
        requestId: ctx.requestId, meta: { email: input.email, retryAfter: bruteCheck.retryAfterSeconds },
      });
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Account temporarily locked. Retry in ${bruteCheck.retryAfterSeconds}s.`,
      });
    }

    const userRow = await db.query.user.findFirst({
      where: (u, { and: aand, eq: ueq, isNull }) =>
        aand(ueq(u.tenantId, tenantId), ueq(u.email, input.email), isNull(u.deletedAt)),
      columns: { id: true, passwordHash: true, active: true },
    });

    // Always run argon2 to prevent timing-based user enumeration
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const passwordOk = userRow?.passwordHash
      ? await verifyPassword(userRow.passwordHash, input.password)
      : (await verifyPassword(dummyHash, input.password), false);

    if (!userRow || !passwordOk || !userRow.active) {
      await recordFailedAttempt(redis, tenantId, input.email, ip);
      await writeAuthAudit({
        db, tenantId, userId: userRow?.id ?? null, action: 'user.login_failed',
        ip, userAgent: ua, requestId: ctx.requestId,
        meta: { email: input.email, reason: !userRow ? 'not_found' : !passwordOk ? 'bad_password' : 'inactive' },
      });
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    // TOTP gate
    const totpCred = await db.query.totpCredential.findFirst({
      where: eq(totpCredential.userId, userRow.id),
      columns: { encryptedSecret: true, backupCodes: true, confirmedAt: true },
    });

    if (totpCred?.confirmedAt) {
      if (!input.totpCode && !input.backupCode) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '2FA_REQUIRED' });
      }

      let totpValid = false;
      let updatedBackupCodes: string[] | undefined;

      if (input.totpCode) {
        const secret = decryptSecret(totpCred.encryptedSecret, env.AUTH_ENCRYPTION_KEY);
        totpValid = validateTotpCode(input.totpCode, secret);
      } else if (input.backupCode) {
        const codes = totpCred.backupCodes as string[];
        const remaining = await consumeBackupCode(input.backupCode, codes);
        if (remaining !== null) { totpValid = true; updatedBackupCodes = remaining; }
      }

      if (!totpValid) {
        await recordFailedAttempt(redis, tenantId, input.email, ip);
        await writeAuthAudit({
          db, tenantId, userId: userRow.id, action: 'user.login_failed',
          ip, userAgent: ua, requestId: ctx.requestId, meta: { reason: 'bad_totp' },
        });
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid 2FA code' });
      }

      if (updatedBackupCodes) {
        await db.update(totpCredential)
          .set({ backupCodes: updatedBackupCodes })
          .where(eq(totpCredential.userId, userRow.id));
      }
    }

    // Fetch roles via explicit join
    const roleRows = await db
      .select({ slug: role.slug })
      .from(userRole)
      .innerJoin(role, eq(role.id, userRole.roleId))
      .where(eq(userRole.userId, userRow.id));
    const roles = roleRows.map((r) => r.slug);

    await buildSessionAndCookie(ctx, { tenantId, userId: userRow.id, roles, ip, ua });
    await db.update(user).set({ lastLoginAt: new Date() }).where(eq(user.id, userRow.id));
    await clearAccountCounter(redis, tenantId, input.email);

    await writeAuthAudit({
      db, tenantId, userId: userRow.id, action: 'user.login',
      ip, userAgent: ua, requestId: ctx.requestId,
    });

    return { userId: userRow.id, tenantId, roles };
  }),

  // -------------------------------------------------------------------------
  // auth.logout
  // -------------------------------------------------------------------------
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const { sessionId, redis, db, c } = ctx;
    const ip = getIp(c);
    const ua = getUserAgent(c);

    if (sessionId) {
      await destroySession(redis, sessionId);
      await db.update(sessionTable).set({ revokedAt: new Date() }).where(eq(sessionTable.id, sessionId));
      clearSessionCookie(c);

      // Best-effort audit (no tenantId available post-destroy, skip)
      logger.info('auth.logout: session destroyed', { sessionId: sessionId.slice(0, 8) + '…', ip });
    }
    return { success: true };
  }),

  // -------------------------------------------------------------------------
  // auth.passwordReset
  // -------------------------------------------------------------------------
  passwordReset: router({
    request: publicProcedure.input(PasswordResetRequestInput).mutation(async ({ ctx, input }) => {
      const { db, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const tenantRow = await db.query.tenant.findFirst({
        where: (t, { eq: teq }) => teq(t.slug, input.tenantSlug),
        columns: { id: true },
      });
      if (!tenantRow) return { success: true }; // silent — don't leak tenant existence

      const userRow = await db.query.user.findFirst({
        where: (u, { and: aand, eq: ueq, isNull }) =>
          aand(ueq(u.tenantId, tenantRow.id), ueq(u.email, input.email), isNull(u.deletedAt)),
        columns: { id: true },
      });

      if (userRow) {
        const rawToken = generateToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

        await db.insert(passwordResetToken).values({
          tenantId: tenantRow.id, userId: userRow.id, tokenHash, expiresAt,
        });

        await writeAuthAudit({
          db, tenantId: tenantRow.id, userId: userRow.id,
          action: 'user.password_reset_requested', ip, userAgent: ua, requestId: ctx.requestId,
          meta: { email: input.email },
        });

        // TODO: enqueue password reset email via BullMQ
        logger.info('auth.passwordReset.request: token issued', {
          userId: userRow.id, prefix: tokenHash.slice(0, 8),
        });
      }

      return { success: true };
    }),

    confirm: publicProcedure.input(PasswordResetConfirmInput).mutation(async ({ ctx, input }) => {
      const { db, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);
      const tokenHash = hashToken(input.token);
      const now = new Date();

      const tokenRow = await db.query.passwordResetToken.findFirst({
        where: (t, { and: aand, eq: teq, isNull }) =>
          aand(teq(t.tokenHash, tokenHash), isNull(t.usedAt)),
        columns: { id: true, userId: true, tenantId: true, expiresAt: true },
      });

      if (!tokenRow || tokenRow.expiresAt < now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired reset link' });
      }

      const newHash = await hashPassword(input.newPassword);

      await Promise.all([
        db.update(passwordResetToken).set({ usedAt: now }).where(eq(passwordResetToken.id, tokenRow.id)),
        db.update(user).set({ passwordHash: newHash, updatedAt: now }).where(eq(user.id, tokenRow.userId)),
      ]);

      await writeAuthAudit({
        db, tenantId: tokenRow.tenantId, userId: tokenRow.userId,
        action: 'user.password_reset_confirmed', ip, userAgent: ua, requestId: ctx.requestId,
      });

      return { success: true };
    }),
  }),

  // -------------------------------------------------------------------------
  // auth.totp
  // -------------------------------------------------------------------------
  totp: router({
    enable: protectedProcedure.mutation(async ({ ctx }) => {
      const { db } = ctx;

      const userRow = await db.query.user.findFirst({
        where: eq(user.id, ctx.userId),
        columns: { email: true },
      });
      if (!userRow) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Clear any existing unconfirmed credential
      await db.delete(totpCredential).where(
        and(eq(totpCredential.userId, ctx.userId)),
      );

      const { secret, otpauthUrl } = generateTotpSecret(userRow.email);
      const encryptedSecret = encryptSecret(secret, env.AUTH_ENCRYPTION_KEY);
      const { plainCodes, hashedCodes } = await generateBackupCodes();

      await db.insert(totpCredential).values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        encryptedSecret,
        backupCodes: hashedCodes,
        confirmedAt: null,
      });

      return { otpauthUrl, backupCodes: plainCodes };
    }),

    confirm: protectedProcedure.input(TotpConfirmInput).mutation(async ({ ctx, input }) => {
      const { db, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const cred = await db.query.totpCredential.findFirst({
        where: eq(totpCredential.userId, ctx.userId),
        columns: { id: true, encryptedSecret: true, confirmedAt: true },
      });

      if (!cred) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Call totp.enable first' });
      if (cred.confirmedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'TOTP already active' });

      const secret = decryptSecret(cred.encryptedSecret, env.AUTH_ENCRYPTION_KEY);
      if (!validateTotpCode(input.code, secret)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code' });
      }

      await db.update(totpCredential)
        .set({ confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(totpCredential.id, cred.id));

      await writeAuthAudit({
        db, tenantId: ctx.tenantId, userId: ctx.userId, action: 'user.totp_enabled',
        ip, userAgent: ua, requestId: ctx.requestId,
      });

      return { success: true };
    }),

    disable: protectedProcedure.input(TotpDisableInput).mutation(async ({ ctx, input }) => {
      const { db, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const cred = await db.query.totpCredential.findFirst({
        where: eq(totpCredential.userId, ctx.userId),
        columns: { id: true, encryptedSecret: true, confirmedAt: true },
      });

      if (!cred?.confirmedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'TOTP is not enabled' });
      }

      const secret = decryptSecret(cred.encryptedSecret, env.AUTH_ENCRYPTION_KEY);
      if (!validateTotpCode(input.code, secret)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid code' });
      }

      await db.delete(totpCredential).where(eq(totpCredential.id, cred.id));

      await writeAuthAudit({
        db, tenantId: ctx.tenantId, userId: ctx.userId, action: 'user.totp_disabled',
        ip, userAgent: ua, requestId: ctx.requestId,
      });

      return { success: true };
    }),
  }),

  // -------------------------------------------------------------------------
  // auth.webauthn
  // -------------------------------------------------------------------------
  webauthn: router({
    registerOptions: protectedProcedure.mutation(async ({ ctx }) => {
      const { db, redis } = ctx;

      const userRow = await db.query.user.findFirst({
        where: eq(user.id, ctx.userId),
        columns: { email: true, fullName: true },
      });
      if (!userRow) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const existingCreds = await db.query.webauthnCredential.findMany({
        where: eq(webauthnCredential.userId, ctx.userId),
        columns: { credentialId: true, transports: true },
      });

      return generateWebAuthnRegistrationOptions(redis, {
        userId: ctx.userId,
        userEmail: userRow.email,
        userDisplayName: userRow.fullName ?? userRow.email,
        rpId: env.WEBAUTHN_RP_ID,
        rpName: env.WEBAUTHN_RP_NAME,
        existingCredentials: existingCreds.map((ec) => ({
          credentialId: ec.credentialId,
          publicKey: new Uint8Array(0),
          counter: 0,
          deviceType: 'singleDevice' as const,
          backedUp: false,
          transports: (ec.transports ?? []) as [],
        })),
      });
    }),

    registerVerify: protectedProcedure.input(WebAuthnRegisterVerifyInput).mutation(async ({ ctx, input }) => {
      const { db, redis, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const result = await verifyWebAuthnRegistration(redis, {
        userId: ctx.userId,
        rpId: env.WEBAUTHN_RP_ID,
        expectedOrigin: getWebAuthnOrigin(),
        response: input.response,
      });

      await db.insert(webauthnCredential).values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        credentialId: result.credentialId,
        publicKey: Buffer.from(result.publicKey),
        counter: result.counter,
        deviceType: result.deviceType,
        backedUp: result.backedUp,
        transports: result.transports,
        aaguid: result.aaguid,
        name: (input.name ?? 'Security Key').slice(0, 64),
      });

      await writeAuthAudit({
        db, tenantId: ctx.tenantId, userId: ctx.userId, action: 'user.webauthn_registered',
        ip, userAgent: ua, requestId: ctx.requestId,
        meta: { credentialId: result.credentialId.slice(0, 16) + '…' },
      });

      return { success: true };
    }),

    authOptions: publicProcedure.input(WebAuthnAuthOptionsInput).mutation(async ({ ctx, input }) => {
      const { db, redis } = ctx;

      const tenantRow = await db.query.tenant.findFirst({
        where: (t, { eq: teq }) => teq(t.slug, input.tenantSlug),
        columns: { id: true },
      });
      if (!tenantRow) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const userRow = await db.query.user.findFirst({
        where: (u, { and: aand, eq: ueq, isNull }) =>
          aand(ueq(u.tenantId, tenantRow.id), ueq(u.email, input.email), isNull(u.deletedAt)),
        columns: { id: true },
      });
      if (!userRow) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const creds = await db.query.webauthnCredential.findMany({
        where: eq(webauthnCredential.userId, userRow.id),
        columns: { credentialId: true, publicKey: true, counter: true, transports: true, deviceType: true, backedUp: true },
      });

      return generateWebAuthnAuthenticationOptions(redis, {
        userId: userRow.id,
        rpId: env.WEBAUTHN_RP_ID,
        allowCredentials: creds.map((wc) => ({
          credentialId: wc.credentialId,
          publicKey: new Uint8Array(wc.publicKey as Buffer),
          counter: wc.counter,
          deviceType: wc.deviceType as 'singleDevice' | 'multiDevice',
          backedUp: wc.backedUp,
          transports: (wc.transports ?? []) as [],
        })),
      });
    }),

    authVerify: publicProcedure.input(WebAuthnAuthVerifyInput).mutation(async ({ ctx, input }) => {
      const { db, redis, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const tenantRow = await db.query.tenant.findFirst({
        where: (t, { eq: teq }) => teq(t.slug, input.tenantSlug),
        columns: { id: true },
      });
      if (!tenantRow) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const userRow = await db.query.user.findFirst({
        where: (u, { and: aand, eq: ueq, isNull }) =>
          aand(ueq(u.tenantId, tenantRow.id), ueq(u.email, input.email), isNull(u.deletedAt)),
        columns: { id: true, active: true },
      });
      if (!userRow?.active) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const credentialId: string = (input.response as { id: string }).id;
      const cred = await db.query.webauthnCredential.findFirst({
        where: and(
          eq(webauthnCredential.userId, userRow.id),
          eq(webauthnCredential.credentialId, credentialId),
        ),
        columns: { id: true, credentialId: true, publicKey: true, counter: true, transports: true, deviceType: true, backedUp: true },
      });
      if (!cred) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const { newCounter } = await verifyWebAuthnAuthentication(redis, {
        userId: userRow.id,
        rpId: env.WEBAUTHN_RP_ID,
        expectedOrigin: getWebAuthnOrigin(),
        response: input.response,
        credential: {
          credentialId: cred.credentialId,
          publicKey: new Uint8Array(cred.publicKey as Buffer),
          counter: cred.counter,
          deviceType: cred.deviceType as 'singleDevice' | 'multiDevice',
          backedUp: cred.backedUp,
          transports: (cred.transports ?? []) as [],
        },
      });

      await db.update(webauthnCredential)
        .set({ counter: newCounter, lastUsedAt: new Date() })
        .where(eq(webauthnCredential.id, cred.id));

      const roleRows = await db
        .select({ slug: role.slug })
        .from(userRole)
        .innerJoin(role, eq(role.id, userRole.roleId))
        .where(eq(userRole.userId, userRow.id));
      const roles = roleRows.map((r) => r.slug);

      await buildSessionAndCookie(ctx, { tenantId: tenantRow.id, userId: userRow.id, roles, ip, ua });
      await db.update(user).set({ lastLoginAt: new Date() }).where(eq(user.id, userRow.id));

      await writeAuthAudit({
        db, tenantId: tenantRow.id, userId: userRow.id, action: 'user.login',
        ip, userAgent: ua, requestId: ctx.requestId, meta: { method: 'webauthn' },
      });

      return { userId: userRow.id, tenantId: tenantRow.id, roles };
    }),

    removeCredential: protectedProcedure.input(RemoveCredentialInput).mutation(async ({ ctx, input }) => {
      const { db, c } = ctx;
      const ip = getIp(c);
      const ua = getUserAgent(c);

      const cred = await db.query.webauthnCredential.findFirst({
        where: and(
          eq(webauthnCredential.userId, ctx.userId),
          eq(webauthnCredential.credentialId, input.credentialId),
        ),
        columns: { id: true },
      });
      if (!cred) throw new TRPCError({ code: 'NOT_FOUND', message: 'Credential not found' });

      await db.delete(webauthnCredential).where(eq(webauthnCredential.id, cred.id));

      await writeAuthAudit({
        db, tenantId: ctx.tenantId, userId: ctx.userId, action: 'user.webauthn_removed',
        ip, userAgent: ua, requestId: ctx.requestId,
        meta: { credentialId: input.credentialId.slice(0, 16) + '…' },
      });

      return { success: true };
    }),
  }),
});

export type AuthRouter = typeof authRouter;
