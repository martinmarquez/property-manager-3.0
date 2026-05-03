import { z } from 'zod';
import { eq, and, sql, desc, isNull, ne } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  appraisal,
  appraisalComp,
  appraisalReport,
  property,
  propertyListing,
  propertyMedia,
} from '@corredor/db';
import { generateNarrative, type NarrativeInput } from '@corredor/ai';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import { router, protectedProcedure, protectedProcedureNoTx, withFeatureGate } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';
import { env } from '../env.js';

const appraisalProcedure = protectedProcedure.use(withFeatureGate('appraisals'));
const appraisalProcedureNoTx = protectedProcedureNoTx.use(withFeatureGate('appraisals'));

// ---------------------------------------------------------------------------
// Shared Zod schemas
// ---------------------------------------------------------------------------

const appraisalCreateInput = z.object({
  propertyId: z.string().uuid().optional(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().max(30).optional(),
  addressStreet: z.string().min(1).max(500),
  addressNumber: z.string().max(20).optional(),
  locality: z.string().max(200).optional(),
  province: z.string().max(200).optional(),
  country: z.string().max(10).default('AR'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  propertyType: z.enum([
    'apartment', 'ph', 'house', 'quinta', 'land', 'office',
    'commercial', 'garage', 'warehouse', 'farm', 'hotel',
    'building', 'business_fund', 'development',
  ]),
  operationKind: z.enum(['sale', 'rent', 'temp_rent', 'commercial_rent', 'commercial_sale']),
  coveredAreaM2: z.number().positive().optional(),
  totalAreaM2: z.number().positive().optional(),
  rooms: z.number().int().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  garages: z.number().int().min(0).optional(),
  ageYears: z.number().int().min(0).optional(),
  purpose: z.enum(['sale', 'rent', 'guarantee', 'inheritance', 'tax', 'insurance', 'judicial', 'other']).default('sale'),
  valueCurrency: z.enum(['ARS', 'USD']).default('USD'),
  appraiserName: z.string().max(200).optional(),
  appraiserMatricula: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

const appraisalUpdateInput = z.object({
  id: z.string().uuid(),
  clientName: z.string().min(1).max(200).optional(),
  clientEmail: z.string().email().nullable().optional(),
  clientPhone: z.string().max(30).nullable().optional(),
  addressStreet: z.string().min(1).max(500).optional(),
  addressNumber: z.string().max(20).nullable().optional(),
  locality: z.string().max(200).nullable().optional(),
  province: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  coveredAreaM2: z.number().positive().nullable().optional(),
  totalAreaM2: z.number().positive().nullable().optional(),
  rooms: z.number().int().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  garages: z.number().int().min(0).nullable().optional(),
  ageYears: z.number().int().min(0).nullable().optional(),
  operationKind: z.enum(['sale', 'rent', 'temp_rent', 'commercial_rent', 'commercial_sale']).optional(),
  purpose: z.enum(['sale', 'rent', 'guarantee', 'inheritance', 'tax', 'insurance', 'judicial', 'other']).optional(),
  estimatedValueMin: z.string().optional(),
  estimatedValueMax: z.string().optional(),
  valueCurrency: z.enum(['ARS', 'USD']).optional(),
  appraiserName: z.string().max(200).nullable().optional(),
  appraiserMatricula: z.string().max(100).nullable().optional(),
  appraiserSignatureUrl: z.string().url().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAppraisalOrThrow(
  ctx: AuthenticatedContext,
  appraisalId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(appraisal)
    .where(
      and(
        eq(appraisal.id, appraisalId),
        eq(appraisal.tenantId, ctx.tenantId),
        isNull(appraisal.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Appraisal not found' });
  }
  return row;
}

// ---------------------------------------------------------------------------
// Router — 15 endpoints
// ---------------------------------------------------------------------------

export const appraisalsRouter = router({
  // ─── 1. List appraisals ──────────────────────────────────────────────────
  list: appraisalProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived']).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(appraisal.tenantId, ctx.tenantId),
        isNull(appraisal.deletedAt),
      ];
      if (input.status) {
        conditions.push(eq(appraisal.status, input.status));
      }

      const rows = await ctx.db
        .select()
        .from(appraisal)
        .where(and(...conditions))
        .orderBy(desc(appraisal.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  // ─── 2. Get single appraisal ────────────────────────────────────────────
  get: appraisalProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getAppraisalOrThrow(ctx, input.id);
    }),

  // ─── 3. Create appraisal ────────────────────────────────────────────────
  create: appraisalProcedure
    .input(appraisalCreateInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(appraisal)
        .values({
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
          ...input,
        })
        .returning();

      return row!;
    }),

  // ─── 4. Update appraisal ────────────────────────────────────────────────
  update: appraisalProcedure
    .input(appraisalUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await getAppraisalOrThrow(ctx, input.id);
      const { id, ...updates } = input;

      const [row] = await ctx.db
        .update(appraisal)
        .set({
          ...updates,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
          version: existing.version + 1,
        })
        .where(
          and(
            eq(appraisal.id, id),
            eq(appraisal.tenantId, ctx.tenantId),
          ),
        )
        .returning();

      return row!;
    }),

  // ─── 5. Update status ───────────────────────────────────────────────────
  updateStatus: appraisalProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.id);

      const [row] = await ctx.db
        .update(appraisal)
        .set({
          status: input.status,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appraisal.id, input.id),
            eq(appraisal.tenantId, ctx.tenantId),
          ),
        )
        .returning();

      return row!;
    }),

  // ─── 6. Soft delete ─────────────────────────────────────────────────────
  delete: appraisalProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.id);

      await ctx.db
        .update(appraisal)
        .set({ deletedAt: new Date(), updatedBy: ctx.userId, updatedAt: new Date() })
        .where(
          and(
            eq(appraisal.id, input.id),
            eq(appraisal.tenantId, ctx.tenantId),
          ),
        );

      return { deleted: true };
    }),

  // ─── 7. Duplicate appraisal ─────────────────────────────────────────────
  duplicate: appraisalProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const source = await getAppraisalOrThrow(ctx, input.id);

      const [row] = await ctx.db
        .insert(appraisal)
        .values({
          tenantId: ctx.tenantId,
          propertyId: source.propertyId,
          clientName: source.clientName,
          clientEmail: source.clientEmail,
          clientPhone: source.clientPhone,
          addressStreet: source.addressStreet,
          addressNumber: source.addressNumber,
          locality: source.locality,
          province: source.province,
          country: source.country,
          lat: source.lat,
          lng: source.lng,
          propertyType: source.propertyType,
          operationKind: source.operationKind,
          coveredAreaM2: source.coveredAreaM2,
          totalAreaM2: source.totalAreaM2,
          rooms: source.rooms,
          bedrooms: source.bedrooms,
          bathrooms: source.bathrooms,
          garages: source.garages,
          ageYears: source.ageYears,
          purpose: source.purpose,
          status: 'draft',
          valueCurrency: source.valueCurrency,
          appraiserName: source.appraiserName,
          appraiserMatricula: source.appraiserMatricula,
          appraiserSignatureUrl: source.appraiserSignatureUrl,
          notes: source.notes,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      return row!;
    }),

  // ─── 8. Search comps (PostGIS ST_DWithin) ───────────────────────────────
  searchComps: appraisalProcedure
    .input(
      z.object({
        appraisalId: z.string().uuid(),
        maxResults: z.number().int().min(1).max(50).default(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await getAppraisalOrThrow(ctx, input.appraisalId);

      if (target.lat == null || target.lng == null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appraisal subject must have lat/lng to search comps',
        });
      }

      const subjectPoint = sql`ST_SetSRID(ST_MakePoint(${target.lng}, ${target.lat}), 4326)::geography`;

      let results: Array<{
        id: string;
        address: string;
        lat: number | null;
        lng: number | null;
        distanceM: number;
        propertyType: string;
        operationKind: string;
        coveredAreaM2: number | null;
        totalAreaM2: number | null;
        rooms: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        priceAmount: string | null;
        priceCurrency: string;
        pricePerM2: number | null;
        photoUrl: string | null;
        listingStatus: string;
      }> = [];

      // Auto-expand radius: start at 2km, increment by 1km, up to 10km
      const MIN_COMPS = 10;
      const START_RADIUS = 2000;
      const MAX_RADIUS = 10000;
      const STEP = 1000;

      for (let radius = START_RADIUS; radius <= MAX_RADIUS; radius += STEP) {
        const propertyPoint = sql`ST_SetSRID(ST_MakePoint(${property.lng}, ${property.lat}), 4326)::geography`;

        results = await ctx.db
          .select({
            id: property.id,
            address: sql<string>`COALESCE(${property.addressStreet} || ' ' || COALESCE(${property.addressNumber}, ''), ${property.addressStreet})`,
            lat: property.lat,
            lng: property.lng,
            distanceM: sql<number>`ST_Distance(${propertyPoint}, ${subjectPoint})`,
            propertyType: property.propertyType,
            operationKind: propertyListing.kind,
            coveredAreaM2: property.coveredAreaM2,
            totalAreaM2: property.totalAreaM2,
            rooms: property.rooms,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            priceAmount: propertyListing.priceAmount,
            priceCurrency: propertyListing.priceCurrency,
            pricePerM2: sql<number | null>`
              CASE WHEN ${property.coveredAreaM2} > 0 AND ${propertyListing.priceAmount} IS NOT NULL
                THEN (${propertyListing.priceAmount}::numeric / ${property.coveredAreaM2})
                ELSE NULL
              END`,
            photoUrl: sql<string | null>`(
              SELECT ${propertyMedia.thumbUrl}
              FROM ${propertyMedia}
              WHERE ${propertyMedia.propertyId} = ${property.id}
              ORDER BY ${propertyMedia.sortOrder} ASC
              LIMIT 1
            )`,
            listingStatus: property.status,
          })
          .from(property)
          .innerJoin(propertyListing, eq(propertyListing.propertyId, property.id))
          .where(
            and(
              eq(property.tenantId, ctx.tenantId),
              isNull(property.deletedAt),
              ne(property.id, target.propertyId ?? '00000000-0000-0000-0000-000000000000'),
              eq(property.propertyType, target.propertyType),
              eq(propertyListing.kind, target.operationKind),
              sql`${property.lat} IS NOT NULL AND ${property.lng} IS NOT NULL`,
              sql`ST_DWithin(${propertyPoint}, ${subjectPoint}, ${radius})`,
            ),
          )
          .orderBy(sql`ST_Distance(${propertyPoint}, ${subjectPoint})`)
          .limit(input.maxResults);

        if (results.length >= MIN_COMPS) break;
      }

      // Store found comps
      if (results.length > 0) {
        // Remove previous search results for this appraisal
        await ctx.db
          .delete(appraisalComp)
          .where(
            and(
              eq(appraisalComp.appraisalId, input.appraisalId),
              eq(appraisalComp.tenantId, ctx.tenantId),
            ),
          );

        await ctx.db.insert(appraisalComp).values(
          results.map((r) => ({
            tenantId: ctx.tenantId,
            appraisalId: input.appraisalId,
            sourcePropertyId: r.id,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            distanceM: r.distanceM,
            propertyType: r.propertyType as typeof target.propertyType,
            operationKind: r.operationKind as typeof target.operationKind,
            coveredAreaM2: r.coveredAreaM2,
            totalAreaM2: r.totalAreaM2,
            rooms: r.rooms,
            bedrooms: r.bedrooms,
            bathrooms: r.bathrooms,
            priceAmount: r.priceAmount,
            priceCurrency: r.priceCurrency as 'ARS' | 'USD',
            pricePerM2: r.pricePerM2 != null ? String(r.pricePerM2) : null,
            photoUrl: r.photoUrl,
            listingStatus: r.listingStatus,
            isIncluded: true,
          })),
        );
      }

      return {
        comps: results,
        totalFound: results.length,
        radiusUsedM: results.length >= MIN_COMPS
          ? Math.min(
              START_RADIUS + Math.ceil((MIN_COMPS - 1) / 1) * STEP,
              MAX_RADIUS,
            )
          : MAX_RADIUS,
      };
    }),

  // ─── 9. List comps for an appraisal ─────────────────────────────────────
  listComps: appraisalProcedure
    .input(z.object({ appraisalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.appraisalId);

      return ctx.db
        .select()
        .from(appraisalComp)
        .where(
          and(
            eq(appraisalComp.appraisalId, input.appraisalId),
            eq(appraisalComp.tenantId, ctx.tenantId),
          ),
        )
        .orderBy(appraisalComp.distanceM);
    }),

  // ─── 10. Toggle comp inclusion ──────────────────────────────────────────
  toggleComp: appraisalProcedure
    .input(
      z.object({
        compId: z.string().uuid(),
        isIncluded: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [comp] = await ctx.db
        .select()
        .from(appraisalComp)
        .where(
          and(
            eq(appraisalComp.id, input.compId),
            eq(appraisalComp.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!comp) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comp not found' });
      }

      const [updated] = await ctx.db
        .update(appraisalComp)
        .set({ isIncluded: input.isIncluded })
        .where(eq(appraisalComp.id, input.compId))
        .returning();

      return updated!;
    }),

  // ─── 11. Generate AI narrative (TA-04) ──────────────────────────────────
  generateNarrative: appraisalProcedureNoTx
    .input(z.object({ appraisalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!env.ANTHROPIC_API_KEY) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'AI not configured' });
      }

      // Fetch appraisal outside transaction (protectedProcedureNoTx)
      const { createDb, setTenantContext } = await import('@corredor/db');
      const db = createDb(env.DATABASE_URL);
      await db.transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await setTenantContext(tx as any, ctx.tenantId, ctx.userId);
      });

      const [target] = await db
        .select()
        .from(appraisal)
        .where(
          and(
            eq(appraisal.id, input.appraisalId),
            eq(appraisal.tenantId, ctx.tenantId),
            isNull(appraisal.deletedAt),
          ),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Appraisal not found' });
      }

      const comps = await db
        .select()
        .from(appraisalComp)
        .where(
          and(
            eq(appraisalComp.appraisalId, input.appraisalId),
            eq(appraisalComp.tenantId, ctx.tenantId),
            eq(appraisalComp.isIncluded, true),
          ),
        )
        .orderBy(appraisalComp.distanceM);

      if (comps.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No included comps found. Run comp search first.',
        });
      }

      const narrativeInput: NarrativeInput = {
        subject: {
          address: `${target.addressStreet} ${target.addressNumber ?? ''}`.trim(),
          propertyType: target.propertyType,
          operationKind: target.operationKind,
          coveredAreaM2: target.coveredAreaM2,
          totalAreaM2: target.totalAreaM2,
          rooms: target.rooms,
          bedrooms: target.bedrooms,
          bathrooms: target.bathrooms,
          garages: target.garages,
          ageYears: target.ageYears,
          locality: target.locality,
          province: target.province,
        },
        comps: comps.map((c) => ({
          address: c.address,
          distanceM: c.distanceM,
          coveredAreaM2: c.coveredAreaM2,
          totalAreaM2: c.totalAreaM2,
          priceAmount: c.priceAmount,
          priceCurrency: c.priceCurrency,
          pricePerM2: c.pricePerM2,
          rooms: c.rooms,
          bedrooms: c.bedrooms,
          bathrooms: c.bathrooms,
          listingStatus: c.listingStatus,
        })),
        purpose: target.purpose,
        currency: target.valueCurrency,
      };

      const result = await generateNarrative(narrativeInput, env.ANTHROPIC_API_KEY);

      // Upsert report
      const [existingReport] = await db
        .select()
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, input.appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      const reportData = {
        estimatedValueMin: String(result.estimatedValueMin),
        estimatedValueMax: String(result.estimatedValueMax),
        valueCurrency: result.currency as 'ARS' | 'USD',
        narrativeMd: result.narrativeMd,
        compsSummary: result.compsSummary,
        methodologyNote: result.methodologyNote,
        aiModel: result.model,
        aiLatencyMs: result.latencyMs,
        aiInputTokens: result.inputTokens,
        aiOutputTokens: result.outputTokens,
        aiRawOutput: result.rawOutput,
        updatedAt: new Date(),
      };

      let report;
      if (existingReport) {
        [report] = await db
          .update(appraisalReport)
          .set(reportData)
          .where(eq(appraisalReport.id, existingReport.id))
          .returning();
      } else {
        [report] = await db
          .insert(appraisalReport)
          .values({
            tenantId: ctx.tenantId,
            appraisalId: input.appraisalId,
            ...reportData,
          })
          .returning();
      }

      // Update appraisal value range
      await db
        .update(appraisal)
        .set({
          estimatedValueMin: String(result.estimatedValueMin),
          estimatedValueMax: String(result.estimatedValueMax),
          valueCurrency: result.currency as 'ARS' | 'USD',
          status: target.status === 'draft' ? 'in_progress' : target.status,
          updatedAt: new Date(),
          updatedBy: ctx.userId,
        })
        .where(eq(appraisal.id, input.appraisalId));

      return report!;
    }),

  // ─── 12. Generate PDF (TA-05) ───────────────────────────────────────────
  generatePdf: appraisalProcedure
    .input(z.object({ appraisalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const target = await getAppraisalOrThrow(ctx, input.appraisalId);

      const [report] = await ctx.db
        .select()
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, input.appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!report?.narrativeMd) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Generate AI narrative before creating PDF',
        });
      }

      // Enqueue PDF generation job
      const queue = createQueue(QUEUE_NAMES.APPRAISAL_PDF_GENERATE, ctx.redis);
      await queue.add('generate-pdf', {
        appraisalId: input.appraisalId,
        reportId: report.id,
        tenantId: ctx.tenantId,
      });
      await queue.close();

      return { queued: true, reportId: report.id };
    }),

  // ─── 13. Get report ─────────────────────────────────────────────────────
  getReport: appraisalProcedure
    .input(z.object({ appraisalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.appraisalId);

      const [report] = await ctx.db
        .select()
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, input.appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      return report ?? null;
    }),

  // ─── 14. Get/refresh signed PDF URL ─────────────────────────────────────
  getPdfUrl: appraisalProcedure
    .input(z.object({ appraisalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.appraisalId);

      const [report] = await ctx.db
        .select()
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, input.appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!report?.pdfStorageKey) {
        return { url: null, expiresAt: null };
      }

      // If URL is still valid (> 1 day remaining), return it
      if (report.pdfUrl && report.pdfExpiresAt && report.pdfExpiresAt > new Date()) {
        return { url: report.pdfUrl, expiresAt: report.pdfExpiresAt.toISOString() };
      }

      // Generate a new presigned URL via S3-compatible API
      if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'R2 storage not configured' });
      }

      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      const expiresIn = 7 * 24 * 60 * 60; // 7 days
      const command = new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: report.pdfStorageKey,
      });

      const url = await getSignedUrl(s3, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update stored URL
      await ctx.db
        .update(appraisalReport)
        .set({ pdfUrl: url, pdfExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(appraisalReport.id, report.id));

      return { url, expiresAt: expiresAt.toISOString() };
    }),

  // ─── 15. Update report (narrative edit / value range) ──────────────────
  updateReport: appraisalProcedure
    .input(
      z.object({
        appraisalId: z.string().uuid(),
        narrativeMd: z.string().max(20000).optional(),
        estimatedValueMin: z.string().optional(),
        estimatedValueMax: z.string().optional(),
        valueCurrency: z.enum(['ARS', 'USD']).optional(),
        methodologyNote: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.appraisalId);
      const { appraisalId, ...fields } = input;

      const [existing] = await ctx.db
        .select({ id: appraisalReport.id })
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No report found; run generateNarrative first' });
      }

      const updates: Partial<typeof appraisalReport.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (fields.narrativeMd !== undefined) updates.narrativeMd = fields.narrativeMd;
      if (fields.estimatedValueMin !== undefined) updates.estimatedValueMin = fields.estimatedValueMin;
      if (fields.estimatedValueMax !== undefined) updates.estimatedValueMax = fields.estimatedValueMax;
      if (fields.valueCurrency !== undefined) updates.valueCurrency = fields.valueCurrency;
      if (fields.methodologyNote !== undefined) updates.methodologyNote = fields.methodologyNote;

      const [updated] = await ctx.db
        .update(appraisalReport)
        .set(updates)
        .where(eq(appraisalReport.id, existing.id))
        .returning();

      return updated!;
    }),

  // ─── 16. Share report (generate share token) ────────────────────────────
  shareReport: appraisalProcedure
    .input(
      z.object({
        appraisalId: z.string().uuid(),
        expiresInDays: z.number().int().min(1).max(90).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getAppraisalOrThrow(ctx, input.appraisalId);

      const [report] = await ctx.db
        .select()
        .from(appraisalReport)
        .where(
          and(
            eq(appraisalReport.appraisalId, input.appraisalId),
            eq(appraisalReport.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No report found for this appraisal' });
      }

      const shareToken = crypto.randomUUID();
      const shareExpiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

      const [updated] = await ctx.db
        .update(appraisalReport)
        .set({ shareToken, shareExpiresAt, updatedAt: new Date() })
        .where(eq(appraisalReport.id, report.id))
        .returning();

      return {
        shareToken: updated!.shareToken,
        shareExpiresAt: updated!.shareExpiresAt?.toISOString(),
      };
    }),
});
