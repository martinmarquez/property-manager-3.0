/**
 * PushSendWorker — Phase H (RENA-198)
 *
 * Consumes the PUSH_SEND queue and delivers push notifications to registered
 * device tokens via APNs (iOS) or FCM (Android).
 *
 * Job data contract (PushSendJobData):
 *   userId      — target user
 *   tenantId    — tenant for RLS
 *   category    — notification category ('new_message' | 'task_due' | 'deal_update')
 *   title       — notification title
 *   body        — notification body
 *   deepLink    — optional deep-link path
 *   badge       — optional iOS badge count
 *   data        — optional extra key/value pairs
 */

import type { Job } from 'bullmq';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import {
  pushDevice,
  notificationPreference,
  createNodeDb,
} from '@corredor/db';
import {
  BaseWorker,
  QUEUE_NAMES,
  createPushProvider,
  type PushPayload,
  type APNsConfig,
  type FCMConfig,
} from '@corredor/core';
import type Redis from 'ioredis';

export interface PushSendJobData {
  userId: string;
  tenantId: string;
  category: string;
  title: string;
  body: string;
  deepLink?: string;
  badge?: number;
  data?: Record<string, string>;
}

function isInQuietHours(from: string | null, to: string | null): boolean {
  if (!from || !to) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (from <= to) return hhmm >= from && hhmm < to;
  // Spans midnight
  return hhmm >= from || hhmm < to;
}

export class PushSendWorker extends BaseWorker<PushSendJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly apnsConfig: APNsConfig | undefined;
  private readonly fcmConfig: FCMConfig | undefined;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.PUSH_SEND, { redis, concurrency: 20 });
    this.db = createNodeDb(databaseUrl);

    if (process.env['APNS_KEY'] && process.env['APNS_KEY_ID'] && process.env['APNS_TEAM_ID'] && process.env['APNS_BUNDLE_ID']) {
      this.apnsConfig = {
        privateKey: process.env['APNS_KEY'],
        keyId: process.env['APNS_KEY_ID'],
        teamId: process.env['APNS_TEAM_ID'],
        bundleId: process.env['APNS_BUNDLE_ID'],
        environment: process.env['NODE_ENV'] === 'production' ? 'production' : 'sandbox',
      };
    }

    if (process.env['FCM_SERVICE_ACCOUNT_JSON'] && process.env['FCM_PROJECT_ID']) {
      this.fcmConfig = {
        serviceAccountJson: process.env['FCM_SERVICE_ACCOUNT_JSON'],
        projectId: process.env['FCM_PROJECT_ID'],
      };
    }
  }

  protected async process(job: Job<PushSendJobData>): Promise<void> {
    const { userId, tenantId, category, title, body, deepLink, badge, data } = job.data;

    // Check global + category-specific notification preferences
    const prefs = await this.db
      .select()
      .from(notificationPreference)
      .where(
        and(
          eq(notificationPreference.tenantId, tenantId),
          eq(notificationPreference.userId, userId),
        ),
      );

    const globalPref = prefs.find((p) => p.category === null);
    const categoryPref = prefs.find((p) => p.category === category);

    const effectivePref = categoryPref ?? globalPref;
    if (effectivePref && !effectivePref.enabled) {
      this.logger.info('push.send.suppressed_by_preference', { userId, category });
      return;
    }
    if (effectivePref && isInQuietHours(effectivePref.quietFrom, effectivePref.quietTo)) {
      this.logger.info('push.send.suppressed_quiet_hours', { userId, category });
      return;
    }

    // Load active device tokens
    const devices = await this.db
      .select({ id: pushDevice.id, platform: pushDevice.platform, token: pushDevice.token })
      .from(pushDevice)
      .where(
        and(
          eq(pushDevice.tenantId, tenantId),
          eq(pushDevice.userId, userId),
          isNull(pushDevice.revokedAt),
        ),
      );

    if (devices.length === 0) return;

    const payload: PushPayload = { title, body, deepLink, badge, data };

    const apnsDevices = devices.filter((d) => d.platform === 'apns');
    const fcmDevices = devices.filter((d) => d.platform === 'fcm');

    const staleTokens: string[] = [];

    if (apnsDevices.length > 0 && this.apnsConfig) {
      const provider = createPushProvider('apns', { apns: this.apnsConfig });
      const results = await provider.sendBatch(
        apnsDevices.map((d) => d.token),
        payload,
      );
      for (const [token, result] of results) {
        if (!result.success) {
          this.logger.warn('push.send.apns_error', { token: token.slice(0, 8), error: result.error });
          if (result.error === 'BadDeviceToken' || result.error === 'Unregistered') {
            staleTokens.push(token);
          }
        }
      }
    }

    if (fcmDevices.length > 0 && this.fcmConfig) {
      const provider = createPushProvider('fcm', { fcm: this.fcmConfig });
      const results = await provider.sendBatch(
        fcmDevices.map((d) => d.token),
        payload,
      );
      for (const [token, result] of results) {
        if (!result.success) {
          this.logger.warn('push.send.fcm_error', { token: token.slice(0, 8), error: result.error });
          if (result.error?.includes('registration-token-not-registered')) {
            staleTokens.push(token);
          }
        }
      }
    }

    // Auto-revoke stale tokens
    if (staleTokens.length > 0) {
      await this.db
        .update(pushDevice)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(pushDevice.userId, userId),
            inArray(pushDevice.token, staleTokens),
          ),
        );
      this.logger.info('push.send.stale_tokens_revoked', { count: staleTokens.length });
    }
  }
}
