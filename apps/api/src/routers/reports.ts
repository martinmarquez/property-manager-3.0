import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  reportDigestSubscription,
  reportShareLink,
} from '@corredor/db';
import {
  REPORT_DEFINITIONS,
  checkRateLimit,
} from '@corredor/core';
import {
  router,
  protectedProcedure,
  protectedProcedureNoTx,
  publicProcedure,
  withFeatureGate,
} from '../trpc.js';
import type { AuthenticatedContext, AnyDb } from '../trpc.js';
import { requirePermission } from '../lib/auth/rbac.js';

const reportProcedure = protectedProcedure.use(withFeatureGate('reports_export'));
const reportProcedureNoTx = protectedProcedureNoTx.use(withFeatureGate('reports_export'));

// ---------------------------------------------------------------------------
// MV slug registry — maps report slugs to MV names and access rules
// ---------------------------------------------------------------------------

const MV_SLUG_REGISTRY: Record<
  string,
  { mv: string; agentScoped: boolean }
> = {
  pipeline_conversion: { mv: 'analytics.mv_pipeline_conversion', agentScoped: false },
  listing_performance: { mv: 'analytics.mv_listing_performance', agentScoped: false },
  agent_productivity:  { mv: 'analytics.mv_agent_productivity',  agentScoped: true },
  portal_roi:          { mv: 'analytics.mv_portal_roi',          agentScoped: false },
  revenue_forecast:    { mv: 'analytics.mv_revenue_forecast',    agentScoped: false },
  retention_cohort:    { mv: 'analytics.mv_retention_cohort',    agentScoped: false },
  zone_heatmap:        { mv: 'analytics.mv_zone_heatmap',        agentScoped: false },
  ai_usage_value:      { mv: 'analytics.mv_ai_usage_value',      agentScoped: false },
  sla_adherence:       { mv: 'analytics.mv_sla_adherence',       agentScoped: true },
  commission_owed:     { mv: 'analytics.mv_commission_owed',     agentScoped: true },
  billing_metrics:     { mv: 'mv_billing_metrics',               agentScoped: false },
};

const VALID_SLUGS = Object.keys(MV_SLUG_REGISTRY);

const reportSlugSchema = z.string().refine(
  (s) => VALID_SLUGS.includes(s),
  { message: `Must be one of: ${VALID_SLUGS.join(', ')}` },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAgentOnly(roles: string[]): boolean {
  return roles.includes('agent') &&
    !roles.includes('manager') &&
    !roles.includes('admin') &&
    !roles.includes('owner');
}

async function queryMv(
  db: AnyDb,
  mv: string,
  tenantId: string,
  opts: {
    agentId?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const limit = opts.limit ?? 500;
  const offset = opts.offset ?? 0;

  // mv is from our hardcoded MV_SLUG_REGISTRY — safe for sql.raw().
  // All user-derived values (tenantId, agentId, dateFrom) are parameterized.
  const filters: ReturnType<typeof sql>[] = [
    sql`tenant_id = ${tenantId}`,
  ];

  if (opts.agentId) {
    filters.push(sql`agent_id = ${opts.agentId}`);
  }
  if (opts.dateFrom) {
    filters.push(sql`(cohort_month >= ${opts.dateFrom}::date OR report_month >= ${opts.dateFrom}::date OR report_day >= ${opts.dateFrom}::date OR week >= ${opts.dateFrom}::date OR TRUE)`);
  }

  const where = sql.join(filters, sql` AND `);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countResult: any = await db.execute(
      sql`SELECT COUNT(*) AS total FROM ${sql.raw(mv)} WHERE ${where}`,
    );
    const total = Number(countResult?.rows?.[0]?.total ?? 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataResult: any = await db.execute(
      sql`SELECT * FROM ${sql.raw(mv)} WHERE ${where} ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`,
    );
    const rows = (dataResult?.rows ?? []) as Record<string, unknown>[];

    return { rows, total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return { rows: [], total: 0 };
    }
    throw err;
  }
}

function signShareToken(
  tenantId: string,
  reportSlug: string,
  expiresAt: number,
  secret: string,
): string {
  const payload = `${tenantId}:${reportSlug}:${expiresAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({
    tid: tenantId,
    slug: reportSlug,
    exp: expiresAt,
    sig,
  })).toString('base64url');
  return token;
}

function verifyShareToken(
  token: string,
  secret: string,
): { tenantId: string; slug: string; exp: number } | null {
  try {
    const json = JSON.parse(Buffer.from(token, 'base64url').toString());
    const { tid, slug, exp, sig } = json;
    if (!tid || !slug || !exp || !sig) return null;
    if (Date.now() > exp * 1000) return null;
    const expectedSig = createHmac('sha256', secret)
      .update(`${tid}:${slug}:${exp}`)
      .digest('hex');
    if (sig !== expectedSig) return null;
    return { tenantId: tid, slug, exp };
  } catch {
    return null;
  }
}

function toCsvRow(row: Record<string, unknown>): string {
  return Object.values(row)
    .map((v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const dataRouter = router({
  list: reportProcedureNoTx
    .output(z.array(z.object({
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      available: z.boolean(),
    })))
    .query(async ({ ctx }) => {
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      return VALID_SLUGS.map((slug) => {
        const def = REPORT_DEFINITIONS.find((r) => r.id === slug);
        return {
          slug,
          title: def?.title ?? slug.replace(/_/g, ' '),
          description: def?.description ?? '',
          available: true,
        };
      });
    }),

  get: reportProcedureNoTx
    .input(z.object({
      slug: reportSlugSchema,
      limit: z.number().int().min(1).max(1000).default(500),
      offset: z.number().int().min(0).default(0),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .output(z.object({
      slug: z.string(),
      rows: z.array(z.record(z.unknown())),
      total: z.number(),
      refreshedAt: z.string().nullable(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId, userId, roles } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      const entry = MV_SLUG_REGISTRY[input.slug]!;

      const agentId = entry.agentScoped && isAgentOnly(roles)
        ? userId
        : undefined;

      const { rows, total } = await queryMv(db, entry.mv, tenantId, {
        agentId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        limit: input.limit,
        offset: input.offset,
      });

      const refreshedAt = rows.length > 0
        ? String(rows[0]?.['refreshed_at'] ?? null)
        : null;

      return { slug: input.slug, rows, total, refreshedAt };
    }),

  refresh: reportProcedureNoTx
    .input(z.object({ slug: reportSlugSchema }))
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, redis, tenantId } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      const rateLimitKey = `ratelimit:mv_refresh:${tenantId}:${input.slug}`;
      const result = await checkRateLimit(redis, rateLimitKey, {
        scope: 'mv_refresh',
        capacity: 1,
        refillRate: 1 / 60,
      });

      if (!result.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `MV refresh rate-limited. Retry in ${result.retryAfterSeconds}s`,
        });
      }

      const entry = MV_SLUG_REGISTRY[input.slug]!;

      try {
        await db.execute(sql.raw(
          `REFRESH MATERIALIZED VIEW CONCURRENTLY ${entry.mv}`,
        ));
        return { success: true, message: `${input.slug} refreshed` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('does not exist')) {
          return { success: false, message: `View ${input.slug} not available yet` };
        }
        throw err;
      }
    }),
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const exportRouter = router({
  generate: reportProcedureNoTx
    .input(z.object({
      slug: reportSlugSchema,
      format: z.enum(['csv', 'xlsx']).default('csv'),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .output(z.object({
      format: z.string(),
      filename: z.string(),
      contentType: z.string(),
      data: z.string(),
      rowCount: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId, roles } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:export');

      const entry = MV_SLUG_REGISTRY[input.slug]!;
      const agentId = entry.agentScoped && isAgentOnly(roles)
        ? userId
        : undefined;

      const { rows } = await queryMv(db, entry.mv, tenantId, {
        agentId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        limit: 10_000,
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${input.slug}_${timestamp}`;

      if (input.format === 'csv') {
        if (rows.length === 0) {
          return {
            format: 'csv',
            filename: `${filename}.csv`,
            contentType: 'text/csv',
            data: '',
            rowCount: 0,
          };
        }

        const headers = Object.keys(rows[0]!);
        const csvLines = [
          headers.join(','),
          ...rows.map((row) => toCsvRow(row)),
        ];

        return {
          format: 'csv',
          filename: `${filename}.csv`,
          contentType: 'text/csv',
          data: csvLines.join('\n'),
          rowCount: rows.length,
        };
      }

      // XLSX via ExcelJS — return base64-encoded workbook
      // ExcelJS is loaded dynamically so it's not a hard dependency
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ExcelJS = await import('exceljs') as any;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(input.slug);

        if (rows.length > 0) {
          const headers = Object.keys(rows[0]!);
          sheet.addRow(headers);

          for (const row of rows) {
            sheet.addRow(headers.map((h) => {
              const v = row[h];
              if (v === null || v === undefined) return '';
              if (typeof v === 'object') return JSON.stringify(v);
              return v;
            }));
          }

          // Auto-fit columns
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sheet.columns.forEach((col: any) => {
            let maxLen = 10;
            col.eachCell?.({ includeEmpty: false }, (cell: { value?: unknown }) => {
              const len = String(cell.value ?? '').length;
              if (len > maxLen) maxLen = Math.min(len, 50);
            });
            col.width = maxLen + 2;
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return {
          format: 'xlsx',
          filename: `${filename}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          data: Buffer.from(buffer).toString('base64'),
          rowCount: rows.length,
        };
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'XLSX export unavailable — exceljs not installed',
        });
      }
    }),
});

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

const shareLinkRouter = router({
  create: reportProcedure
    .input(z.object({
      slug: reportSlugSchema,
      filters: z.record(z.unknown()).default({}),
      ttlDays: z.number().int().min(1).max(30).default(7),
    }))
    .output(z.object({
      id: z.string(),
      token: z.string(),
      url: z.string(),
      expiresAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId, c } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:export');

      const expiresAt = new Date(Date.now() + input.ttlDays * 86_400_000);
      const expiresEpoch = Math.floor(expiresAt.getTime() / 1000);
      const secret = process.env['AUTH_ENCRYPTION_KEY'] ?? 'dev-secret-not-for-production';
      const token = signShareToken(tenantId, input.slug, expiresEpoch, secret);

      const [row] = await db
        .insert(reportShareLink)
        .values({
          tenantId,
          createdBy: userId,
          reportSlug: input.slug,
          token,
          filters: input.filters,
          expiresAt,
        })
        .returning({ id: reportShareLink.id });

      const host = c.req.header('Host') ?? 'app.corredor.ar';
      const proto = c.req.header('X-Forwarded-Proto') ?? 'https';
      const url = `${proto}://${host}/api/reports/shared/${token}`;

      return {
        id: row!.id,
        token,
        url,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  resolve: publicProcedure
    .input(z.object({ token: z.string() }))
    .output(z.object({
      slug: z.string(),
      filters: z.record(z.unknown()),
      rows: z.array(z.record(z.unknown())),
      total: z.number(),
      expiresAt: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const secret = process.env['AUTH_ENCRYPTION_KEY'] ?? 'dev-secret-not-for-production';
      const decoded = verifyShareToken(input.token, secret);

      if (!decoded) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired share link' });
      }

      const { db } = ctx;

      // Increment view count
      await db.execute(sql`
        UPDATE report_share_link
        SET view_count = view_count + 1
        WHERE token = ${input.token}
          AND expires_at > NOW()
      `);

      const entry = MV_SLUG_REGISTRY[decoded.slug];
      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      }

      const { rows, total } = await queryMv(db, entry.mv, decoded.tenantId, {
        limit: 500,
      });

      return {
        slug: decoded.slug,
        filters: {},
        rows,
        total,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      };
    }),
});

// ---------------------------------------------------------------------------
// Digest subscription CRUD
// ---------------------------------------------------------------------------

const digestRouter = router({
  list: reportProcedureNoTx
    .output(z.array(z.object({
      id: z.string(),
      reportSlug: z.string(),
      frequency: z.string(),
      dayOfWeek: z.number().nullable(),
      hourUtc: z.number(),
      timezone: z.string(),
      filters: z.record(z.unknown()),
      active: z.boolean(),
      lastSentAt: z.string().nullable(),
    })))
    .query(async ({ ctx }) => {
      const { db, tenantId, userId } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      const rows = await db
        .select()
        .from(reportDigestSubscription)
        .where(
          and(
            eq(reportDigestSubscription.tenantId, tenantId),
            eq(reportDigestSubscription.userId, userId),
          ),
        );

      return rows.map((r) => ({
        id: r.id,
        reportSlug: r.reportSlug,
        frequency: r.frequency,
        dayOfWeek: r.dayOfWeek,
        hourUtc: r.hourUtc,
        timezone: r.timezone,
        filters: (r.filters ?? {}) as Record<string, unknown>,
        active: r.active,
        lastSentAt: r.lastSentAt?.toISOString() ?? null,
      }));
    }),

  create: reportProcedure
    .input(z.object({
      reportSlug: reportSlugSchema,
      frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      hourUtc: z.number().int().min(0).max(23).default(8),
      timezone: z.string().default('America/Argentina/Buenos_Aires'),
      filters: z.record(z.unknown()).default({}),
    }))
    .output(z.object({
      id: z.string(),
      unsubscribeToken: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      const dayOfWeek = input.frequency === 'weekly'
        ? (input.dayOfWeek ?? 1)
        : input.dayOfWeek ?? null;

      const [row] = await db
        .insert(reportDigestSubscription)
        .values({
          tenantId,
          userId,
          reportSlug: input.reportSlug,
          frequency: input.frequency,
          dayOfWeek,
          hourUtc: input.hourUtc,
          timezone: input.timezone,
          filters: input.filters,
        })
        .onConflictDoUpdate({
          target: [
            reportDigestSubscription.tenantId,
            reportDigestSubscription.userId,
            reportDigestSubscription.reportSlug,
          ],
          set: {
            frequency: input.frequency,
            dayOfWeek,
            hourUtc: input.hourUtc,
            timezone: input.timezone,
            filters: input.filters,
            active: true,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: reportDigestSubscription.id,
          unsubscribeToken: reportDigestSubscription.unsubscribeToken,
        });

      return { id: row!.id, unsubscribeToken: row!.unsubscribeToken };
    }),

  update: reportProcedure
    .input(z.object({
      id: z.string().uuid(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      hourUtc: z.number().int().min(0).max(23).optional(),
      timezone: z.string().optional(),
      filters: z.record(z.unknown()).optional(),
      active: z.boolean().optional(),
    }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      const { id, ...updates } = input;
      const setClause: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.frequency !== undefined) setClause['frequency'] = updates.frequency;
      if (updates.dayOfWeek !== undefined) setClause['dayOfWeek'] = updates.dayOfWeek;
      if (updates.hourUtc !== undefined) setClause['hourUtc'] = updates.hourUtc;
      if (updates.timezone !== undefined) setClause['timezone'] = updates.timezone;
      if (updates.filters !== undefined) setClause['filters'] = updates.filters;
      if (updates.active !== undefined) setClause['active'] = updates.active;

      await db
        .update(reportDigestSubscription)
        .set(setClause)
        .where(
          and(
            eq(reportDigestSubscription.id, id),
            eq(reportDigestSubscription.tenantId, tenantId),
            eq(reportDigestSubscription.userId, userId),
          ),
        );

      return { success: true };
    }),

  delete: reportProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId, userId } = ctx as unknown as AuthenticatedContext;
      requirePermission(ctx as unknown as AuthenticatedContext, 'reports:read');

      await db
        .delete(reportDigestSubscription)
        .where(
          and(
            eq(reportDigestSubscription.id, input.id),
            eq(reportDigestSubscription.tenantId, tenantId),
            eq(reportDigestSubscription.userId, userId),
          ),
        );

      return { success: true };
    }),

  unsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      await db
        .update(reportDigestSubscription)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(reportDigestSubscription.unsubscribeToken, input.token));

      return { success: true };
    }),
});

// ---------------------------------------------------------------------------
// Root reports router
// ---------------------------------------------------------------------------

export const reportsRouter = router({
  data:      dataRouter,
  export:    exportRouter,
  shareLink: shareLinkRouter,
  digest:    digestRouter,
});

export type ReportsRouter = typeof reportsRouter;
