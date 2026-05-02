/**
 * Pipelines router — RENA-33
 *
 * Procedures (all under pipelines.*):
 *   list       All non-deleted pipelines with stages
 *   get        Single pipeline with stages
 *   create     Create pipeline with stages (validates min 2 stages, ≥1 won, ≥1 lost)
 *   update     Update pipeline + full stage replacement
 *   delete     Delete pipeline (blocked if has active leads)
 *   reorder    Reorder pipeline display positions
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, asc, sql, inArray } from 'drizzle-orm';
import { pipeline, pipelineStage, lead, pipelineTypeEnum, stageKindEnum } from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const stageInputSchema = z.object({
  id:       z.string().uuid().optional(),
  name:     z.string().min(1).max(100),
  kind:     z.enum(stageKindEnum.enumValues),
  color:    z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#4669ff'),
  slaHours: z.number().int().min(1).max(8760).nullable().optional(),
  position: z.number().int().min(0),
});

type StageInput = z.infer<typeof stageInputSchema>;

function validateStages(stages: StageInput[]): void {
  if (stages.length < 2) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pipeline must have at least 2 stages' });
  }
  if (!stages.some((s) => s.kind === 'won')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pipeline must have at least 1 "won" stage' });
  }
  if (!stages.some((s) => s.kind === 'lost')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pipeline must have at least 1 "lost" stage' });
  }
}

const CreateInput = z.object({
  name:      z.string().min(1).max(200),
  type:      z.enum(pipelineTypeEnum.enumValues).default('custom'),
  isDefault: z.boolean().default(false),
  stages:    z.array(stageInputSchema).min(2),
});

const UpdateInput = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1).max(200).optional(),
  type:      z.enum(pipelineTypeEnum.enumValues).optional(),
  isDefault: z.boolean().optional(),
  stages:    z.array(stageInputSchema).min(2).optional(),
});

const ReorderInput = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const pipelinesRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select()
        .from(pipeline)
        .where(and(eq(pipeline.tenantId, ctx.tenantId), isNull(pipeline.deletedAt)))
        .orderBy(asc(pipeline.position), asc(pipeline.createdAt));

      const pipelineIds = rows.map((r) => r.id);
      if (pipelineIds.length === 0) return [];

      const stages = await ctx.db
        .select()
        .from(pipelineStage)
        .where(inArray(pipelineStage.pipelineId, pipelineIds))
        .orderBy(asc(pipelineStage.position));

      const stagesByPipeline = new Map<string, typeof stages>();
      for (const s of stages) {
        const arr = stagesByPipeline.get(s.pipelineId) ?? [];
        arr.push(s);
        stagesByPipeline.set(s.pipelineId, arr);
      }

      return rows.map((p) => ({ ...p, stages: stagesByPipeline.get(p.id) ?? [] }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(pipeline)
        .where(and(eq(pipeline.id, input.id), eq(pipeline.tenantId, ctx.tenantId), isNull(pipeline.deletedAt)));

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline not found' });
      }

      const stages = await ctx.db
        .select()
        .from(pipelineStage)
        .where(eq(pipelineStage.pipelineId, row.id))
        .orderBy(asc(pipelineStage.position));

      return { ...row, stages };
    }),

  create: protectedProcedure
    .input(CreateInput)
    .mutation(async ({ ctx, input }) => {
      validateStages(input.stages);

      if (input.isDefault) {
        await ctx.db
          .update(pipeline)
          .set({ isDefault: false, updatedAt: new Date(), updatedBy: ctx.userId })
          .where(and(eq(pipeline.tenantId, ctx.tenantId), eq(pipeline.isDefault, true), isNull(pipeline.deletedAt)));
      }

      const createdRows = await ctx.db
        .insert(pipeline)
        .values({
          tenantId:  ctx.tenantId,
          name:      input.name,
          type:      input.type,
          isDefault: input.isDefault,
          position:  0,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();
      const created = createdRows[0]!;

      const stageValues = input.stages.map((s, idx) => ({
        tenantId:   ctx.tenantId,
        pipelineId: created.id,
        name:       s.name,
        kind:       s.kind,
        color:      s.color,
        slaHours:   s.slaHours ?? null,
        position:   idx,
        createdBy:  ctx.userId,
        updatedBy:  ctx.userId,
      }));

      const stages = await ctx.db.insert(pipelineStage).values(stageValues).returning();
      return { ...created, stages };
    }),

  update: protectedProcedure
    .input(UpdateInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(pipeline)
        .where(and(eq(pipeline.id, input.id), eq(pipeline.tenantId, ctx.tenantId), isNull(pipeline.deletedAt)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline not found' });
      }

      if (input.isDefault && !existing.isDefault) {
        await ctx.db
          .update(pipeline)
          .set({ isDefault: false, updatedAt: new Date(), updatedBy: ctx.userId })
          .where(and(eq(pipeline.tenantId, ctx.tenantId), eq(pipeline.isDefault, true), isNull(pipeline.deletedAt)));
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.name      !== undefined) updates.name      = input.name;
      if (input.type      !== undefined) updates.type      = input.type;
      if (input.isDefault !== undefined) updates.isDefault = input.isDefault;

      const [updated] = await ctx.db
        .update(pipeline)
        .set(updates)
        .where(and(eq(pipeline.id, input.id), eq(pipeline.tenantId, ctx.tenantId)))
        .returning();

      type PipelineStageRow = typeof pipelineStage.$inferSelect;
      let stages: PipelineStageRow[] = [];
      if (input.stages) {
        validateStages(input.stages);

        const existingStages = await ctx.db
          .select()
          .from(pipelineStage)
          .where(eq(pipelineStage.pipelineId, input.id));

        const incomingIds    = new Set(input.stages.filter((s) => s.id).map((s) => s.id));
        const removedStageIds = existingStages
          .filter((s) => !incomingIds.has(s.id))
          .map((s) => s.id);

        if (removedStageIds.length > 0) {
          const [activeLeadCount] = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(lead)
            .where(and(eq(lead.tenantId, ctx.tenantId), inArray(lead.stageId, removedStageIds), isNull(lead.deletedAt)));

          if (activeLeadCount && activeLeadCount.count > 0) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Cannot remove stages that have active leads',
            });
          }
        }

        await ctx.db.delete(pipelineStage).where(eq(pipelineStage.pipelineId, input.id));

        const stageValues = input.stages.map((s, idx) => ({
          id:         s.id,
          tenantId:   ctx.tenantId,
          pipelineId: input.id,
          name:       s.name,
          kind:       s.kind,
          color:      s.color,
          slaHours:   s.slaHours ?? null,
          position:   idx,
          createdBy:  ctx.userId,
          updatedBy:  ctx.userId,
        }));

        stages = await ctx.db.insert(pipelineStage).values(stageValues).returning();
      }

      return { ...updated, stages };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(pipeline)
        .where(and(eq(pipeline.id, input.id), eq(pipeline.tenantId, ctx.tenantId), isNull(pipeline.deletedAt)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline not found' });
      }

      const [activeLeadCount] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(lead)
        .where(and(eq(lead.tenantId, ctx.tenantId), eq(lead.pipelineId, input.id), isNull(lead.deletedAt)));

      if (activeLeadCount && activeLeadCount.count > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot delete pipeline with active leads',
        });
      }

      await ctx.db
        .update(pipeline)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId })
        .where(and(eq(pipeline.id, input.id), eq(pipeline.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(ReorderInput)
    .mutation(async ({ ctx, input }) => {
      for (let i = 0; i < input.ids.length; i++) {
        await ctx.db
          .update(pipeline)
          .set({ position: i, updatedAt: new Date(), updatedBy: ctx.userId })
          .where(and(eq(pipeline.id, input.ids[i]!), eq(pipeline.tenantId, ctx.tenantId)));
      }
      return { success: true };
    }),
});
