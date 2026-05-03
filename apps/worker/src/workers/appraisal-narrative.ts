import type { Job } from 'bullmq';
import { and, eq, isNull } from 'drizzle-orm';
import {
  createNodeDb,
  appraisal,
  appraisalComp,
  appraisalReport,
} from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import { generateNarrative } from '@corredor/ai';
import type { NarrativeInput } from '@corredor/ai';
import type Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Job data
// ---------------------------------------------------------------------------

export interface AppraisalNarrativeJobData {
  appraisalId: string;
  tenantId: string;
  locale?: string;
}

export interface AppraisalNarrativeJobResult {
  reportId: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class AppraisalNarrativeWorker extends BaseWorker<AppraisalNarrativeJobData, AppraisalNarrativeJobResult> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private readonly anthropicApiKey: string;

  constructor(redis: Redis, databaseUrl: string, anthropicApiKey: string) {
    super(QUEUE_NAMES.APPRAISAL_AI_NARRATIVE, { redis, concurrency: 3 });
    this.db = createNodeDb(databaseUrl);
    this.anthropicApiKey = anthropicApiKey;
  }

  protected async process(job: Job<AppraisalNarrativeJobData, AppraisalNarrativeJobResult>): Promise<AppraisalNarrativeJobResult> {
    const { appraisalId, tenantId, locale } = job.data;

    const [target] = await this.db
      .select()
      .from(appraisal)
      .where(
        and(
          eq(appraisal.id, appraisalId),
          eq(appraisal.tenantId, tenantId),
          isNull(appraisal.deletedAt),
        ),
      )
      .limit(1);

    if (!target) throw new Error(`Appraisal ${appraisalId} not found`);

    const comps = await this.db
      .select()
      .from(appraisalComp)
      .where(
        and(
          eq(appraisalComp.appraisalId, appraisalId),
          eq(appraisalComp.tenantId, tenantId),
          eq(appraisalComp.isIncluded, true),
        ),
      )
      .orderBy(appraisalComp.distanceM);

    if (comps.length === 0) {
      throw new Error(`No included comps for appraisal ${appraisalId}`);
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
      ...(locale ? { locale } : {}),
    };

    const result = await generateNarrative(narrativeInput, this.anthropicApiKey);

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

    const [existingReport] = await this.db
      .select()
      .from(appraisalReport)
      .where(
        and(
          eq(appraisalReport.appraisalId, appraisalId),
          eq(appraisalReport.tenantId, tenantId),
        ),
      )
      .limit(1);

    let report;
    if (existingReport) {
      [report] = await this.db
        .update(appraisalReport)
        .set(reportData)
        .where(eq(appraisalReport.id, existingReport.id))
        .returning();
    } else {
      [report] = await this.db
        .insert(appraisalReport)
        .values({ tenantId, appraisalId, ...reportData })
        .returning();
    }

    await this.db
      .update(appraisal)
      .set({
        estimatedValueMin: String(result.estimatedValueMin),
        estimatedValueMax: String(result.estimatedValueMax),
        valueCurrency: result.currency as 'ARS' | 'USD',
        status: target.status === 'draft' ? 'in_progress' : target.status,
        updatedAt: new Date(),
      })
      .where(eq(appraisal.id, appraisalId));

    return {
      reportId: report!.id,
      estimatedValueMin: result.estimatedValueMin,
      estimatedValueMax: result.estimatedValueMax,
      currency: result.currency,
    };
  }
}

export function createAppraisalNarrativeWorker(redis: Redis): AppraisalNarrativeWorker | null {
  const anthropicApiKey = process.env['ANTHROPIC_API_KEY'];
  const databaseUrl = process.env['DATABASE_URL'] ?? '';

  if (!anthropicApiKey) {
    return null;
  }

  return new AppraisalNarrativeWorker(redis, databaseUrl, anthropicApiKey);
}
