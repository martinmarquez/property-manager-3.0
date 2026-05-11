/**
 * Mobile tRPC router — Phase H (RENA-198)
 *
 * Sub-routers (all under mobile.*):
 *   devices.*       — device token registration + management
 *   notifications.* — notification preference CRUD
 *   sync.*          — offline delta-sync endpoints
 *   auth.*          — biometric device trust management
 *   version.*       — app version policy / update enforcement
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, gt, or, isNull } from 'drizzle-orm';
import {
  pushDevice,
  notificationPreference,
  deviceTrust,
  appVersionPolicy,
  property,
  contact,
  lead,
} from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';
import { QUEUE_NAMES } from '@corredor/core';
import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// devices
// ---------------------------------------------------------------------------

const devicesRouter = router({
  register: protectedProcedure
    .input(
      z.object({
        platform: z.enum(['fcm', 'apns']),
        token: z.string().min(1).max(4096),
        deviceInfo: z
          .object({
            model: z.string().optional(),
            osVersion: z.string().optional(),
            appVersion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId, db } = ctx;
      await db
        .insert(pushDevice)
        .values({
          tenantId,
          userId,
          platform: input.platform,
          token: input.token,
          deviceInfo: input.deviceInfo ?? null,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pushDevice.userId, pushDevice.token],
          set: {
            platform: input.platform,
            deviceInfo: input.deviceInfo ?? null,
            lastSeenAt: new Date(),
            revokedAt: null,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  revoke: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId, db } = ctx;
      await db
        .update(pushDevice)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(pushDevice.tenantId, tenantId),
            eq(pushDevice.userId, userId),
            eq(pushDevice.token, input.token),
          ),
        );
      return { ok: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId, userId, db } = ctx;
    return db
      .select({
        id: pushDevice.id,
        platform: pushDevice.platform,
        deviceInfo: pushDevice.deviceInfo,
        createdAt: pushDevice.createdAt,
        lastSeenAt: pushDevice.lastSeenAt,
      })
      .from(pushDevice)
      .where(
        and(
          eq(pushDevice.tenantId, tenantId),
          eq(pushDevice.userId, userId),
          isNull(pushDevice.revokedAt),
        ),
      );
  }),
});

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

const notificationsRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId, userId, db } = ctx;
    return db
      .select()
      .from(notificationPreference)
      .where(
        and(
          eq(notificationPreference.tenantId, tenantId),
          eq(notificationPreference.userId, userId),
        ),
      );
  }),

  setPreference: protectedProcedure
    .input(
      z.object({
        category: z.string().nullable(),
        enabled: z.boolean(),
        quietFrom: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        quietTo: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId, db } = ctx;
      await db
        .insert(notificationPreference)
        .values({
          tenantId,
          userId,
          category: input.category,
          enabled: input.enabled,
          quietFrom: input.quietFrom ?? null,
          quietTo: input.quietTo ?? null,
        })
        .onConflictDoUpdate({
          target: [notificationPreference.userId, notificationPreference.category],
          set: {
            enabled: input.enabled,
            quietFrom: input.quietFrom ?? null,
            quietTo: input.quietTo ?? null,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// sync — offline delta queries
// ---------------------------------------------------------------------------

const MAX_SYNC_LIMIT = 200;

const syncRouter = router({
  properties: protectedProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(MAX_SYNC_LIMIT).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, db } = ctx;
      const since = input.cursor ? new Date(input.cursor) : new Date(0);

      const rows = await db
        .select({
          id: property.id,
          updatedAt: property.updatedAt,
          deletedAt: property.deletedAt,
        })
        .from(property)
        .where(
          and(
            eq(property.tenantId, tenantId),
            gt(property.updatedAt, since),
          ),
        )
        .limit(input.limit);

      const nextCursor = rows.length === input.limit ? rows[rows.length - 1]?.updatedAt?.toISOString() : null;
      return { rows, nextCursor };
    }),

  contacts: protectedProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(MAX_SYNC_LIMIT).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, db } = ctx;
      const since = input.cursor ? new Date(input.cursor) : new Date(0);

      const rows = await db
        .select({
          id: contact.id,
          updatedAt: contact.updatedAt,
          deletedAt: contact.deletedAt,
        })
        .from(contact)
        .where(
          and(
            eq(contact.tenantId, tenantId),
            gt(contact.updatedAt, since),
          ),
        )
        .limit(input.limit);

      const nextCursor = rows.length === input.limit ? rows[rows.length - 1]?.updatedAt?.toISOString() : null;
      return { rows, nextCursor };
    }),

  leads: protectedProcedure
    .input(
      z.object({
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(MAX_SYNC_LIMIT).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, db } = ctx;
      const since = input.cursor ? new Date(input.cursor) : new Date(0);

      const rows = await db
        .select({
          id: lead.id,
          updatedAt: lead.updatedAt,
          deletedAt: lead.deletedAt,
        })
        .from(lead)
        .where(
          and(
            eq(lead.tenantId, tenantId),
            gt(lead.updatedAt, since),
          ),
        )
        .limit(input.limit);

      const nextCursor = rows.length === input.limit ? rows[rows.length - 1]?.updatedAt?.toISOString() : null;
      return { rows, nextCursor };
    }),
});

// ---------------------------------------------------------------------------
// auth — biometric device trust
// ---------------------------------------------------------------------------

const mobileAuthRouter = router({
  bindDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.string().min(1).max(512),
        biometricChallenge: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId, sessionId, db } = ctx;
      const challengeHash = createHash('sha256').update(input.biometricChallenge).digest('hex');
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

      await db.insert(deviceTrust).values({
        tenantId,
        userId,
        deviceId: input.deviceId,
        sessionId,
        challengeHash,
        expiresAt,
      });

      return { ok: true, expiresAt };
    }),

  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId, db } = ctx;
      await db
        .update(deviceTrust)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(deviceTrust.tenantId, tenantId),
            eq(deviceTrust.userId, userId),
            eq(deviceTrust.deviceId, input.deviceId),
          ),
        );
      return { ok: true };
    }),

  listTrustedDevices: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId, userId, db } = ctx;
    return db
      .select({
        id: deviceTrust.id,
        deviceId: deviceTrust.deviceId,
        createdAt: deviceTrust.createdAt,
        expiresAt: deviceTrust.expiresAt,
      })
      .from(deviceTrust)
      .where(
        and(
          eq(deviceTrust.tenantId, tenantId),
          eq(deviceTrust.userId, userId),
          isNull(deviceTrust.revokedAt),
          gt(deviceTrust.expiresAt, new Date()),
        ),
      );
  }),
});

// ---------------------------------------------------------------------------
// version — app version policy
// ---------------------------------------------------------------------------

const versionRouter = router({
  check: protectedProcedure
    .input(
      z.object({
        platform: z.enum(['ios', 'android']),
        currentVersion: z.string(),
        buildNumber: z.number().int().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { db } = ctx;
      const [policy] = await db
        .select()
        .from(appVersionPolicy)
        .where(eq(appVersionPolicy.platform, input.platform))
        .limit(1);

      if (!policy) {
        return { updateRequired: false, updateAvailable: false };
      }

      const semverCompare = (a: string, b: string): number => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
          if (diff !== 0) return diff;
        }
        return 0;
      };

      const belowMinimum = semverCompare(input.currentVersion, policy.minimumVersion) < 0;
      const belowBuild = input.buildNumber != null && policy.minimumBuildNumber != null
        ? input.buildNumber < policy.minimumBuildNumber
        : false;
      const updateRequired = (belowMinimum || belowBuild) && policy.forceUpdate;
      const updateAvailable = semverCompare(input.currentVersion, policy.latestVersion) < 0;

      return {
        updateRequired,
        updateAvailable,
        minimumVersion: policy.minimumVersion,
        latestVersion: policy.latestVersion,
        releaseNotes: policy.releaseNotes,
        featureFlags: policy.featureFlags as Record<string, unknown>,
      };
    }),
});

// ---------------------------------------------------------------------------
// Root mobile router
// ---------------------------------------------------------------------------

export const mobileRouter = router({
  devices: devicesRouter,
  notifications: notificationsRouter,
  sync: syncRouter,
  auth: mobileAuthRouter,
  version: versionRouter,
});
