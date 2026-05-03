import type { Job } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { reportDigestSubscription, user } from '@corredor/db';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES, REPORT_DEFINITIONS } from '@corredor/core';
import type { Mailer } from '@corredor/core';
import type Redis from 'ioredis';
import { render } from '@react-email/render';
import { DigestEmail } from '../email/digest-template.js';

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
  private readonly mailer: Mailer | null;
  private readonly appUrl: string;

  constructor(redis: Redis, databaseUrl: string, mailer?: Mailer | null) {
    super(QUEUE_NAMES.ANALYTICS_DIGEST, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
    this.mailer = mailer ?? null;
    this.appUrl = process.env['APP_URL'] ?? 'https://app.corredor.ar';
  }

  protected async process(job: Job<DigestJobData>): Promise<DigestResult> {
    const { frequency, dryRun } = job.data;
    const result: DigestResult = { sent: 0, skipped: 0, errors: 0 };

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDow = now.getUTCDay();
    const currentDom = now.getUTCDate();

    const subs = await this.db
      .select({
        id: reportDigestSubscription.id,
        tenantId: reportDigestSubscription.tenantId,
        userId: reportDigestSubscription.userId,
        reportSlug: reportDigestSubscription.reportSlug,
        frequency: reportDigestSubscription.frequency,
        dayOfWeek: reportDigestSubscription.dayOfWeek,
        hourUtc: reportDigestSubscription.hourUtc,
        timezone: reportDigestSubscription.timezone,
        filters: reportDigestSubscription.filters,
        active: reportDigestSubscription.active,
        unsubscribeToken: reportDigestSubscription.unsubscribeToken,
        lastSentAt: reportDigestSubscription.lastSentAt,
        lastSendError: reportDigestSubscription.lastSendError,
        userEmail: user.email,
        userFullName: user.fullName,
      })
      .from(reportDigestSubscription)
      .innerJoin(user, eq(reportDigestSubscription.userId, user.id))
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

        const reportDef = REPORT_DEFINITIONS.find((r) => r.id === sub.reportSlug);
        const reportTitle = reportDef?.title ?? sub.reportSlug.replace(/_/g, ' ');
        const unsubscribeUrl = `${this.appUrl}/reportes/unsubscribe?token=${sub.unsubscribeToken}`;
        const reportUrl = `${this.appUrl}/reportes/${sub.reportSlug}`;

        if (dryRun) {
          this.logger.info('digest.dry_run', {
            userId: sub.userId,
            email: sub.userEmail,
            slug: sub.reportSlug,
            rowCount: rows.length,
          });
        } else if (!this.mailer) {
          this.logger.warn('digest.no_mailer', {
            userId: sub.userId,
            slug: sub.reportSlug,
            rowCount: rows.length,
          });
          result.skipped++;
          continue;
        } else {
          const html = await render(
            DigestEmail({
              reportTitle,
              reportSlug: sub.reportSlug,
              frequency: frequency as 'daily' | 'weekly' | 'monthly',
              recipientName: sub.userFullName,
              rows,
              unsubscribeUrl,
              reportUrl,
            }),
          );

          await this.mailer.sendMail({
            to: sub.userEmail,
            subject: `${reportTitle} — Resumen ${frequency === 'daily' ? 'diario' : frequency === 'weekly' ? 'semanal' : 'mensual'}`,
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });

          this.logger.info('digest.sent', {
            userId: sub.userId,
            email: sub.userEmail,
            slug: sub.reportSlug,
            rowCount: rows.length,
          });
        }

        await this.db
          .update(reportDigestSubscription)
          .set({ lastSentAt: now, lastSendError: null, updatedAt: now })
          .where(eq(reportDigestSubscription.id, sub.id));

        result.sent++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error('digest.subscription_error', {
          subscriptionId: sub.id,
          error: errorMsg,
        });

        try {
          await this.db
            .update(reportDigestSubscription)
            .set({ lastSendError: errorMsg.slice(0, 500), updatedAt: now })
            .where(eq(reportDigestSubscription.id, sub.id));
        } catch {
          // best-effort error tracking
        }

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
    sub: { hourUtc: number; dayOfWeek: number | null },
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
