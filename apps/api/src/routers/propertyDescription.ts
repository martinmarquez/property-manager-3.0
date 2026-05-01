import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, sql, asc } from 'drizzle-orm';
import {
  property,
  propertyListing,
  propertyAiDescription,
  descriptionGenerationLog,
} from '@corredor/db';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import {
  generateDescription,
  generateInputSchema,
  type PropertyAttributes,
} from '@corredor/ai';
import { router, protectedProcedure, protectedProcedureNoTx } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';
import { env } from '../env.js';

const MAX_DRAFTS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPropertyAttributes(
  db: AuthenticatedContext['db'],
  tenantId: string,
  propertyId: string,
): Promise<PropertyAttributes | null> {
  const rows = await db
    .select({
      id: property.id,
      referenceCode: property.referenceCode,
      title: property.title,
      propertyType: property.propertyType,
      subtype: property.subtype,
      coveredAreaM2: property.coveredAreaM2,
      totalAreaM2: property.totalAreaM2,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      toilets: property.toilets,
      garages: property.garages,
      ageYears: property.ageYears,
      province: property.province,
      locality: property.locality,
      neighborhood: property.neighborhood,
      addressStreet: property.addressStreet,
      addressNumber: property.addressNumber,
      status: property.status,
      featured: property.featured,
    })
    .from(property)
    .where(
      and(
        eq(property.id, propertyId),
        eq(property.tenantId, tenantId),
        isNull(property.deletedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const p = rows[0]!;

  const listings = await db
    .select({
      kind: propertyListing.kind,
      priceAmount: propertyListing.priceAmount,
      priceCurrency: propertyListing.priceCurrency,
    })
    .from(propertyListing)
    .where(
      and(
        eq(propertyListing.propertyId, propertyId),
        eq(propertyListing.tenantId, tenantId),
      ),
    );

  return {
    ...p,
    operations: listings.map((l) => ({
      kind: l.kind,
      priceAmount: l.priceAmount,
      priceCurrency: l.priceCurrency,
    })),
  };
}

async function pruneOldestDrafts(
  db: AuthenticatedContext['db'],
  tenantId: string,
  propertyId: string,
): Promise<void> {
  const existing = await db
    .select({ id: propertyAiDescription.id })
    .from(propertyAiDescription)
    .where(
      and(
        eq(propertyAiDescription.propertyId, propertyId),
        eq(propertyAiDescription.tenantId, tenantId),
      ),
    )
    .orderBy(desc(propertyAiDescription.createdAt));

  if (existing.length >= MAX_DRAFTS) {
    const toDelete = existing.slice(MAX_DRAFTS - 1).map((r) => r.id);
    for (const id of toDelete) {
      await db
        .delete(propertyAiDescription)
        .where(eq(propertyAiDescription.id, id));
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const propertyDescriptionRouter = router({
  /**
   * Generate an AI property description.
   * Uses protectedProcedureNoTx to avoid holding a DB transaction during the LLM call.
   */
  generate: protectedProcedureNoTx
    .input(generateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, userId, db, redis } = ctx as AuthenticatedContext;

      if (!env.ANTHROPIC_API_KEY) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI descriptions not configured — ANTHROPIC_API_KEY missing',
        });
      }

      const attrs = await fetchPropertyAttributes(db, tenantId, input.propertyId);
      if (!attrs) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const startMs = Date.now();

      const result = await generateDescription({
        attrs,
        tone: input.tone,
        portal: input.portal,
        extraInstructions: input.extraInstructions,
        anthropicApiKey: env.ANTHROPIC_API_KEY,
      });

      const latencyMs = Date.now() - startMs;

      // Log generation attempt for analytics (fire-and-forget, non-transactional)
      db.insert(descriptionGenerationLog)
        .values({
          tenantId,
          actorId: userId,
          propertyId: input.propertyId,
          tone: input.tone,
          portal: input.portal,
          inputTokens: result.promptTokens,
          outputTokens: result.completionTokens,
          latencyMs,
          saved: false,
        })
        .catch(() => {});

      return {
        body: result.body,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        retried: result.retried,
        latencyMs,
      };
    }),

  /**
   * Save a generated description as a draft and optionally set it as active.
   */
  save: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        body: z.string().min(1).max(5000),
        tone: z.enum(['formal', 'casual', 'lujo']).default('formal'),
        portal: z.enum(['zonaprop', 'mercadolibre', 'argenprop', 'general']).default('general'),
        extraInstructions: z.string().max(500).optional(),
        model: z.string().default('claude-sonnet-4-6-20250514'),
        promptTokens: z.number().int().min(0).default(0),
        completionTokens: z.number().int().min(0).default(0),
        setActive: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, userId, db, redis } = ctx as AuthenticatedContext;

      // Verify property exists
      const propRows = await db
        .select({ id: property.id })
        .from(property)
        .where(
          and(
            eq(property.id, input.propertyId),
            eq(property.tenantId, tenantId),
            isNull(property.deletedAt),
          ),
        )
        .limit(1);

      if (propRows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      // Prune oldest drafts to stay within MAX_DRAFTS
      await pruneOldestDrafts(db, tenantId, input.propertyId);

      // If setting as active, deactivate all other descriptions for this property
      if (input.setActive) {
        await db
          .update(propertyAiDescription)
          .set({ isDraft: true, updatedAt: new Date() })
          .where(
            and(
              eq(propertyAiDescription.propertyId, input.propertyId),
              eq(propertyAiDescription.tenantId, tenantId),
            ),
          );
      }

      const [inserted] = await db
        .insert(propertyAiDescription)
        .values({
          tenantId,
          propertyId: input.propertyId,
          body: input.body,
          tone: input.tone,
          targetPortal: input.portal,
          isDraft: !input.setActive,
          model: input.model,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          createdBy: userId,
        })
        .returning();

      // Fire RAG re-index for the property so the new description is searchable
      const queue = createQueue(QUEUE_NAMES.RAG_INGEST, redis);
      await queue.add('reindex-property-description', {
        tenantId,
        entityType: 'property',
        entityId: input.propertyId,
        force: true,
      });
      await queue.close();

      // Update the analytics log to mark as saved
      db.update(descriptionGenerationLog)
        .set({ saved: true })
        .where(
          and(
            eq(descriptionGenerationLog.tenantId, tenantId),
            eq(descriptionGenerationLog.propertyId, input.propertyId),
            eq(descriptionGenerationLog.saved, false),
          ),
        )
        .catch(() => {});

      return inserted!;
    }),

  /**
   * List AI description drafts for a property (max 5, newest first).
   */
  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;

      const rows = await db
        .select()
        .from(propertyAiDescription)
        .where(
          and(
            eq(propertyAiDescription.propertyId, input.propertyId),
            eq(propertyAiDescription.tenantId, tenantId),
          ),
        )
        .orderBy(desc(propertyAiDescription.createdAt))
        .limit(MAX_DRAFTS);

      return rows;
    }),

  /**
   * Delete an AI description draft.
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;

      const rows = await db
        .select({ id: propertyAiDescription.id })
        .from(propertyAiDescription)
        .where(
          and(
            eq(propertyAiDescription.id, input.id),
            eq(propertyAiDescription.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Description not found' });
      }

      await db
        .delete(propertyAiDescription)
        .where(eq(propertyAiDescription.id, input.id));

      return { deleted: true };
    }),

  /**
   * Set a description as the active one for portal sync.
   */
  setActive: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;

      const rows = await db
        .select({
          id: propertyAiDescription.id,
          propertyId: propertyAiDescription.propertyId,
        })
        .from(propertyAiDescription)
        .where(
          and(
            eq(propertyAiDescription.id, input.id),
            eq(propertyAiDescription.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Description not found' });
      }

      const { propertyId } = rows[0]!;

      // Deactivate all descriptions for this property
      await db
        .update(propertyAiDescription)
        .set({ isDraft: true, updatedAt: new Date() })
        .where(
          and(
            eq(propertyAiDescription.propertyId, propertyId),
            eq(propertyAiDescription.tenantId, tenantId),
          ),
        );

      // Activate the selected one
      const [updated] = await db
        .update(propertyAiDescription)
        .set({ isDraft: false, updatedAt: new Date() })
        .where(eq(propertyAiDescription.id, input.id))
        .returning();

      return updated!;
    }),
});
