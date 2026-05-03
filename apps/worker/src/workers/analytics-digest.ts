import type { Job } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { reportDigestSubscription } from '@corredor/db';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Job data
// ---------------------------------------------------------------------------

export interface DigestJobData {
  frequency: 'daily' | 'weekly' | 'monthly';
  dryRun?: boolean;
}

interface DigestResult {
  sent: number;
  skipped: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// MV slug → view name
// ---------------------------------------------------------------------------

const MV_MAP: Record<string, string> = {
  pipeline_conversion: 'analytics.mv_pipeline_conversion',
  listing_performance: 'analytics.mv_listing_performance',
  agent_productivity:  'analytics.mv_agent_productivity',
  portal_roi:          'analytics.mv_portal_roi',
  revenue_forecast:    'analytics.mv_revenue_forecast',
  retention_cohort:    'analytics.mv_retention_cohort',
  zone_heatmap:        'analytics.mv_zone_heatmap',
  ai_usage_value:      'analytics.mv_ai_usage_value',
  sla_adherence:       'analytics.mv_sla_adherence',
  commission_owed:     'analytics.mv_commission_owed',
  billing_metrics:     'mv_billing_metrics',
};

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class AnalyticsDigestWorker extends BaseWorker<DigestJobData, DigestResult> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.ANALYTICS_DIGEST, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<DigestJobData>): Promise<DigestResult> {
    const { frequency, dryRun } = job.data;
    const result: DigestResult = { sent: 0, skipped: 0, errors: 0 };

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDow = now.getUTCDay();
    const currentDom = now.getUTCDate();

    const subs = await this.db
      .select()
      .from(reportDigestSubscription)
      .where(
        and(
          eq(reportDigestSubscription.active, true),
          eq(reportDigestSubscription.frequency, frequency),
        ),
      );

    for (const sub of subs) {
      try {
        if (!this.shouldSend(sub, frequency, currentHour, currentDow, currentDom)) {
          result.skipped++;
          continue;
        }

        if (sub.lastSentAt) {
          const hoursSinceLast = (now.getTime() - sub.lastSentAt.getTime()) / 3_600_000;
          const minHours = frequency === 'daily' ? 20 : frequency === 'weekly' ? 160 : 672;
          if (hoursSinceLast < minHours) {
            result.skipped++;
            continue;
          }
        }

        const mv = MV_MAP[sub.reportSlug];
        if (!mv) {
          this.logger.warn('digest.unknown_slug', { slug: sub.reportSlug });
          result.skipped++;
          continue;
        }

        let rows: Record<string, unknown>[] = [];
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const queryResult = await this.db.execute(sql.raw(
            `SELECT * FROM ${mv} WHERE tenant_id = '${sub.tenantId}' LIMIT 50`,
          ));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rows = ((queryResult as any).rows ?? []) as Record<string, unknown>[];
        } catch {
          result.skipped++;
          continue;
        }

        if (rows.length === 0) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          this.logger.info('digest.dry_run', {
            userId: sub.userId,
            slug: sub.reportSlug,
            rowCount: rows.length,
          });
        } else {
          // TODO: Render HTML email from React Email template and send via SES/Postmark
          // For now, log the digest delivery intent
          this.logger.info('digest.send', {
            userId: sub.userId,
            tenantId: sub.tenantId,
            slug: sub.reportSlug,
            rowCount: rows.length,
            unsubscribeToken: sub.unsubscribeToken,
          });
        }

        await this.db
          .update(reportDigestSubscription)
          .set({ lastSentAt: now, updatedAt: now })
          .where(eq(reportDigestSubscription.id, sub.id));

        result.sent++;
      } catch (err) {
        this.logger.error('digest.subscription_error', {
          subscriptionId: sub.id,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    this.logger.info('digest.batch_complete', {
      frequency,
      ...result,
    });

    return result;
  }

  private shouldSend(
    sub: typeof reportDigestSubscription.$inferSelect,
    frequency: string,
    currentHour: number,
    currentDow: number,
    currentDom: number,
  ): boolean {
    if (sub.hourUtc !== currentHour) return false;

    if (frequency === 'weekly' && sub.dayOfWeek !== null && sub.dayOfWeek !== currentDow) {
      return false;
    }

    if (frequency === 'monthly' && currentDom !== 1) {
      return false;
    }

    return true;
  }
}
