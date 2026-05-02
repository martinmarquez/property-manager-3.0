/**
 * Analytics router — RENA-130
 *
 * Procedures (all under analytics.*):
 *   billing.dashboard       MRR, ARR, ARPU, churn, trial conversion, plan distribution
 *   billing.planDistribution Per-plan tenant counts
 *   appraisal.usage         Appraisals created, comp search, AI narrative rate, PDF downloads
 *   report.adoption         Most-viewed reports, export frequency, digest subscription rate
 *   site.metrics            Page views, form submissions, publish frequency, custom domain adoption
 *   kpiTimeseries           Generic KPI timeseries query (30/60/90 days) for any metric
 */

import { z } from 'zod';
import { and, eq, gte, sql } from 'drizzle-orm';
import { kpiSnapshotDaily, analyticsEvent } from '@corredor/db';
import { REPORT_DEFINITIONS, KPI_METRICS } from '@corredor/core';
import { router, protectedProcedure, protectedProcedureNoTx } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

async function sumMetric(
  db: AuthenticatedContext['db'],
  tenantId: string,
  metric: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(value), 0)::numeric` })
    .from(kpiSnapshotDaily)
    .where(
      and(
        eq(kpiSnapshotDaily.tenantId, tenantId),
        eq(kpiSnapshotDaily.metric, metric as never),
        gte(kpiSnapshotDaily.snapshotDate, since.toISOString().slice(0, 10)),
      ),
    );
  return Number(row?.total ?? 0);
}

async function latestMetric(
  db: AuthenticatedContext['db'],
  tenantId: string,
  metric: string,
): Promise<number> {
  const [row] = await db
    .select({ value: kpiSnapshotDaily.value })
    .from(kpiSnapshotDaily)
    .where(
      and(
        eq(kpiSnapshotDaily.tenantId, tenantId),
        eq(kpiSnapshotDaily.metric, metric as never),
      ),
    )
    .orderBy(sql`${kpiSnapshotDaily.snapshotDate} DESC`)
    .limit(1);
  return Number(row?.value ?? 0);
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const billingRouter = router({
  /**
   * analytics.billing.dashboard
   * Platform billing metrics: MRR, ARR, ARPU, churn rate, trial-to-paid conversion.
   * Reads from mv_billing_metrics (refreshed nightly).
   */
  dashboard: protectedProcedureNoTx
    .output(
      z.object({
        mrrArs:                z.number(),
        arrArs:                z.number(),
        arpuArs:               z.number(),
        churnRatePct:          z.number(),
        trialConversionRatePct: z.number(),
        activeSubscriptions:   z.number(),
        trialsActive:          z.number(),
        refreshedAt:           z.string().nullable(),
      }),
    )
    .query(async ({ ctx }) => {
      const { db } = ctx as unknown as AuthenticatedContext;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await db.execute(sql`SELECT * FROM mv_billing_metrics LIMIT 1`);
      const row = ((raw as any).rows ?? [])[0] as {
        mrr_ars: string;
        arr_ars: string;
        arpu_ars: string;
        churn_rate_pct: string;
        trial_conversion_rate_pct: string;
        active_subscriptions: string;
        trials_active: string;
        refreshed_at: string | null;
      } | undefined;

      if (!row) {
        return {
          mrrArs: 0,
          arrArs: 0,
          arpuArs: 0,
          churnRatePct: 0,
          trialConversionRatePct: 0,
          activeSubscriptions: 0,
          trialsActive: 0,
          refreshedAt: null,
        };
      }

      return {
        mrrArs:                Number(row.mrr_ars ?? 0),
        arrArs:                Number(row.arr_ars ?? 0),
        arpuArs:               Number(row.arpu_ars ?? 0),
        churnRatePct:          Number(row.churn_rate_pct ?? 0),
        trialConversionRatePct: Number(row.trial_conversion_rate_pct ?? 0),
        activeSubscriptions:   Number(row.active_subscriptions ?? 0),
        trialsActive:          Number(row.trials_active ?? 0),
        refreshedAt:           row.refreshed_at ?? null,
      };
    }),

  /**
   * analytics.billing.planDistribution
   * Per-plan tenant counts for pie/bar chart.
   */
  planDistribution: protectedProcedureNoTx
    .output(
      z.array(
        z.object({
          planCode:    z.string(),
          tenantCount: z.number(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const { db } = ctx as unknown as AuthenticatedContext;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await db.execute(sql`SELECT plan_code, tenant_count FROM mv_plan_distribution ORDER BY tenant_count DESC`);
      const rows = ((raw as any).rows ?? []) as Array<{ plan_code: string; tenant_count: string }>;

      return rows.map((r) => ({
        planCode:    r.plan_code,
        tenantCount: Number(r.tenant_count),
      }));
    }),
});

// ---------------------------------------------------------------------------

const appraisalRouter = router({
  /**
   * analytics.appraisal.usage
   * Appraisals created, comp search count, AI narrative adoption rate, PDF downloads.
   * Aggregated over the last N days from kpi_snapshot_daily.
   */
  usage: protectedProcedureNoTx
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }))
    .output(
      z.object({
        appraisalsCreated:      z.number(),
        compSearches:           z.number(),
        aiNarrativeRatePct:     z.number(),
        pdfDownloads:           z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx as unknown as AuthenticatedContext;
      const since = daysAgo(input.days);

      const [created, comps, pdfs] = await Promise.all([
        sumMetric(db, tenantId, KPI_METRICS.APPRAISALS_CREATED_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.APPRAISAL_COMP_SEARCHES_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.APPRAISAL_PDF_DOWNLOADS_COUNT, since),
      ]);

      // AI narrative rate: average of daily rates over the window
      const [rateRow] = await db
        .select({ avg: sql<number>`ROUND(AVG(value), 2)::numeric` })
        .from(kpiSnapshotDaily)
        .where(
          and(
            eq(kpiSnapshotDaily.tenantId, tenantId),
            eq(kpiSnapshotDaily.metric, KPI_METRICS.APPRAISAL_AI_NARRATIVE_RATE as never),
            gte(kpiSnapshotDaily.snapshotDate, since.toISOString().slice(0, 10)),
          ),
        );

      return {
        appraisalsCreated:  created,
        compSearches:       comps,
        aiNarrativeRatePct: Number(rateRow?.avg ?? 0),
        pdfDownloads:       pdfs,
      };
    }),
});

// ---------------------------------------------------------------------------

const reportAdoptionRouter = router({
  /**
   * analytics.report.adoption
   * Which reports are viewed most, export frequency, and digest subscription count.
   */
  adoption: protectedProcedureNoTx
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }))
    .output(
      z.object({
        totalViews:         z.number(),
        totalExports:       z.number(),
        digestSubscriptions: z.number(),
        topReports: z.array(
          z.object({
            reportId: z.string(),
            views:    z.number(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx as unknown as AuthenticatedContext;
      const since = daysAgo(input.days);
      const sinceStr = since.toISOString().slice(0, 10);

      const [totalViews, totalExports, digestSubscriptions] = await Promise.all([
        sumMetric(db, tenantId, KPI_METRICS.REPORT_VIEWS_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.REPORT_EXPORTS_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.REPORT_DIGEST_SUBSCRIPTIONS_COUNT, since),
      ]);

      // Top reports by view count from analytics_events
      const topReportRows = await db
        .select({
          reportId: sql<string>`properties->>'report_id'`,
          views:    sql<number>`COUNT(*)::int`,
        })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.tenantId, tenantId),
            eq(analyticsEvent.eventType, 'report.viewed' as never),
            sql`${analyticsEvent.occurredAt}::date >= ${sinceStr}::date`,
            sql`properties->>'report_id' IS NOT NULL`,
          ),
        )
        .groupBy(sql`properties->>'report_id'`)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10);

      return {
        totalViews,
        totalExports,
        digestSubscriptions,
        topReports: topReportRows
          .filter((r) => r.reportId != null)
          .map((r) => ({ reportId: r.reportId, views: r.views })),
      };
    }),
});

// ---------------------------------------------------------------------------

const siteRouter = router({
  /**
   * analytics.site.metrics
   * Page views, form submissions, publish frequency, and custom domain adoption.
   */
  metrics: protectedProcedureNoTx
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }))
    .output(
      z.object({
        pageViews:         z.number(),
        formSubmissions:   z.number(),
        pagesPublished:    z.number(),
        customDomains:     z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx as unknown as AuthenticatedContext;
      const since = daysAgo(input.days);

      const [pageViews, formSubmissions, pagesPublished, customDomains] = await Promise.all([
        sumMetric(db, tenantId, KPI_METRICS.SITE_PAGE_VIEWS_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.SITE_FORM_SUBMISSIONS_COUNT, since),
        sumMetric(db, tenantId, KPI_METRICS.SITE_PAGES_PUBLISHED_COUNT, since),
        // custom domains: use latest value (cumulative, not daily delta)
        latestMetric(db, tenantId, KPI_METRICS.SITE_CUSTOM_DOMAINS_COUNT),
      ]);

      return { pageViews, formSubmissions, pagesPublished, customDomains };
    }),
});

// ---------------------------------------------------------------------------
// Generic KPI timeseries
// ---------------------------------------------------------------------------

const KpiMetricEnum = z.enum(
  Object.values(KPI_METRICS) as [string, ...string[]],
);

// ---------------------------------------------------------------------------
// Root analytics router
// ---------------------------------------------------------------------------

export const analyticsRouter = router({
  billing:  billingRouter,
  appraisal: appraisalRouter,
  report:   reportAdoptionRouter,
  site:     siteRouter,

  /**
   * analytics.reportDefinitions
   * Returns the canonical list of report definitions for the frontend.
   */
  reportDefinitions: protectedProcedureNoTx
    .output(
      z.array(
        z.object({
          id:            z.string(),
          title:         z.string(),
          description:   z.string(),
          dimensionType: z.string(),
          defaultDays:   z.number(),
        }),
      ),
    )
    .query(() => {
      return REPORT_DEFINITIONS.map((r) => ({
        id:            r.id,
        title:         r.title,
        description:   r.description,
        dimensionType: r.dimensionType,
        defaultDays:   r.defaultDays,
      }));
    }),

  /**
   * analytics.kpiTimeseries
   * Returns daily KPI snapshot values for a given metric over N days.
   */
  kpiTimeseries: protectedProcedureNoTx
    .input(
      z.object({
        metric: KpiMetricEnum,
        days:   z.number().int().min(7).max(365).default(30),
      }),
    )
    .output(
      z.array(
        z.object({
          date:  z.string(),
          value: z.number(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx as unknown as AuthenticatedContext;
      const since = daysAgo(input.days);

      const rows = await db
        .select({
          date:  kpiSnapshotDaily.snapshotDate,
          value: kpiSnapshotDaily.value,
        })
        .from(kpiSnapshotDaily)
        .where(
          and(
            eq(kpiSnapshotDaily.tenantId, tenantId),
            eq(kpiSnapshotDaily.metric, input.metric as never),
            gte(kpiSnapshotDaily.snapshotDate, since.toISOString().slice(0, 10)),
          ),
        )
        .orderBy(sql`${kpiSnapshotDaily.snapshotDate} ASC`);

      return rows.map((r) => ({
        date:  String(r.date),
        value: Number(r.value),
      }));
    }),
});

export type AnalyticsRouter = typeof analyticsRouter;
