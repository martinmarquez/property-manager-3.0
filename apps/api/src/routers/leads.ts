/**
 * Leads router — RENA-33
 *
 * Procedures (all under leads.*):
 *   list           Paginated, filterable lead list (for list view)
 *   kanban         Leads grouped by stage with counts + value sums
 *   get            Single lead with contact, property, stage history
 *   create         Create lead + first history entry
 *   update         Update lead fields
 *   moveStage      Move lead to a new stage (fires events, records history)
 *   bulkMoveStage  Batch move leads to a target stage
 *   delete         Soft-delete lead
 *   funnel         Aggregated funnel analytics
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, or, isNull, asc, desc, sql, inArray, gte, lte } from 'drizzle-orm';
import { lead, leadStageHistory, pipelineStage, contact, property, currencyEnum } from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ListInput = z.object({
  pipelineId: z.string().uuid(),
  stageId:    z.string().uuid().optional(),
  ownerId:    z.string().uuid().optional(),
  search:     z.string().max(200).optional(),
  sortBy:     z.enum(['created_at', 'expected_value', 'expected_close_date', 'score', 'stage_entered_at']).default('created_at'),
  sortDir:    z.enum(['asc', 'desc']).default('desc'),
  limit:      z.number().int().min(1).max(100).default(50),
  cursor:     z.string().optional(),
});

const KanbanInput = z.object({
  pipelineId:  z.string().uuid(),
  maxPerStage: z.number().int().min(1).max(200).default(50),
});

const CreateInput = z.object({
  pipelineId:        z.string().uuid(),
  stageId:           z.string().uuid(),
  contactId:         z.string().uuid(),
  propertyId:        z.string().uuid().optional(),
  title:             z.string().max(300).optional(),
  expectedValue:     z.string().optional(),
  expectedCurrency:  z.enum(currencyEnum.enumValues).default('USD'),
  expectedCloseDate: z.string().date().optional(),
  score:             z.number().int().min(0).max(100).default(0),
  ownerUserId:       z.string().uuid().optional(),
});

const UpdateInput = z.object({
  id:                z.string().uuid(),
  title:             z.string().max(300).optional(),
  expectedValue:     z.string().optional(),
  expectedCurrency:  z.enum(currencyEnum.enumValues).optional(),
  expectedCloseDate: z.string().date().nullable().optional(),
  score:             z.number().int().min(0).max(100).optional(),
  ownerUserId:       z.string().uuid().nullable().optional(),
  propertyId:        z.string().uuid().nullable().optional(),
});

const MoveStageInput = z.object({
  id:            z.string().uuid(),
  targetStageId: z.string().uuid(),
  lostReason:    z.string().max(500).optional(),
});

const BulkMoveInput = z.object({
  ids:           z.array(z.string().uuid()).min(1).max(100),
  targetStageId: z.string().uuid(),
});

const FunnelInput = z.object({
  pipelineId: z.string().uuid(),
  dateFrom:   z.string().date().optional(),
  dateTo:     z.string().date().optional(),
  ownerId:    z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const leadsRouter = router({
  list: protectedProcedure
    .input(ListInput)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(lead.tenantId, ctx.tenantId),
        eq(lead.pipelineId, input.pipelineId),
        isNull(lead.deletedAt),
      ];
      if (input.stageId) conditions.push(eq(lead.stageId, input.stageId));
      if (input.ownerId)  conditions.push(eq(lead.ownerUserId, input.ownerId));

      const sortColMap = {
        created_at:          lead.createdAt,
        expected_value:      lead.expectedValue,
        expected_close_date: lead.expectedCloseDate,
        score:               lead.score,
        stage_entered_at:    lead.stageEnteredAt,
      };
      const sortCol  = sortColMap[input.sortBy];
      const isDesc   = input.sortDir === 'desc';

      if (input.cursor) {
        let cursorSortVal: unknown;
        let cursorId: string;
        try {
          const decoded = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8')) as { v: unknown; id: string };
          cursorSortVal = decoded.v;
          cursorId = decoded.id;
          if (cursorSortVal === undefined || !cursorId) throw new Error('missing fields');
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
        }
        conditions.push(
          or(
            isDesc
              ? sql`${sortCol} < ${cursorSortVal}`
              : sql`${sortCol} > ${cursorSortVal}`,
            and(
              sql`${sortCol} = ${cursorSortVal}`,
              isDesc
                ? sql`${lead.id} > ${cursorId}::uuid`
                : sql`${lead.id} < ${cursorId}::uuid`,
            ),
          )!,
        );
      }

      const orderFn = isDesc ? desc : asc;
      const rows = await ctx.db
        .select({
          lead:              lead,
          contactFirstName:  contact.firstName,
          contactLastName:   contact.lastName,
          contactLegalName:  contact.legalName,
          contactKind:       contact.kind,
          propertyRef:       property.referenceCode,
          propertyType:      property.propertyType,
          stageName:         pipelineStage.name,
          stageColor:        pipelineStage.color,
          stageKind:         pipelineStage.kind,
          stageSlaHours:     pipelineStage.slaHours,
        })
        .from(lead)
        .leftJoin(contact,       eq(lead.contactId, contact.id))
        .leftJoin(property,      eq(lead.propertyId, property.id))
        .leftJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
        .where(and(...conditions))
        .orderBy(orderFn(sortCol), lead.id)
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items   = rows.slice(0, input.limit);
      const lastItem = hasMore ? items[items.length - 1] : null;

      let nextCursor: string | null = null;
      if (lastItem) {
        const l = lastItem.lead;
        const sortValMap = {
          created_at:          l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
          expected_value:      l.expectedValue,
          expected_close_date: l.expectedCloseDate,
          score:               l.score,
          stage_entered_at:    l.stageEnteredAt instanceof Date ? l.stageEnteredAt.toISOString() : l.stageEnteredAt,
        };
        nextCursor = Buffer.from(JSON.stringify({ v: sortValMap[input.sortBy], id: l.id })).toString('base64');
      }

      return { items, nextCursor };
    }),

  kanban: protectedProcedure
    .input(KanbanInput)
    .query(async ({ ctx, input }) => {
      const stages = await ctx.db
        .select()
        .from(pipelineStage)
        .where(and(eq(pipelineStage.pipelineId, input.pipelineId), eq(pipelineStage.tenantId, ctx.tenantId)))
        .orderBy(asc(pipelineStage.position));

      if (stages.length === 0) return [];

      const stageIds = stages.map((s) => s.id);
      const leads = await ctx.db
        .select({
          lead:             lead,
          contactFirstName: contact.firstName,
          contactLastName:  contact.lastName,
          contactLegalName: contact.legalName,
          contactKind:      contact.kind,
          propertyRef:      property.referenceCode,
        })
        .from(lead)
        .leftJoin(contact,  eq(lead.contactId, contact.id))
        .leftJoin(property, eq(lead.propertyId, property.id))
        .where(and(eq(lead.tenantId, ctx.tenantId), inArray(lead.stageId, stageIds), isNull(lead.deletedAt)))
        .orderBy(desc(lead.stageEnteredAt));

      const aggregates = await ctx.db
        .select({
          stageId:    lead.stageId,
          count:      sql<number>`count(*)::int`,
          totalValue: sql<string>`coalesce(sum(expected_value), 0)::text`,
        })
        .from(lead)
        .where(and(eq(lead.tenantId, ctx.tenantId), inArray(lead.stageId, stageIds), isNull(lead.deletedAt)))
        .groupBy(lead.stageId);

      const aggMap = new Map(aggregates.map((a) => [a.stageId, a]));
      const leadsByStage = new Map<string, typeof leads>();
      for (const l of leads) {
        const arr = leadsByStage.get(l.lead.stageId) ?? [];
        arr.push(l);
        leadsByStage.set(l.lead.stageId, arr);
      }

      return stages.map((stage) => ({
        stage,
        count:      aggMap.get(stage.id)?.count      ?? 0,
        totalValue: aggMap.get(stage.id)?.totalValue ?? '0',
        leads:      (leadsByStage.get(stage.id) ?? []).slice(0, input.maxPerStage),
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          lead:             lead,
          contactFirstName: contact.firstName,
          contactLastName:  contact.lastName,
          contactLegalName: contact.legalName,
          contactKind:      contact.kind,
          contactPhones:    contact.phones,
          contactEmails:    contact.emails,
          propertyRef:      property.referenceCode,
          propertyType:     property.propertyType,
          propertyAddress:  property.addressStreet,
          stageName:        pipelineStage.name,
          stageColor:       pipelineStage.color,
          stageKind:        pipelineStage.kind,
          stageSlaHours:    pipelineStage.slaHours,
        })
        .from(lead)
        .leftJoin(contact,       eq(lead.contactId, contact.id))
        .leftJoin(property,      eq(lead.propertyId, property.id))
        .leftJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId), isNull(lead.deletedAt)));

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      const history = await ctx.db
        .select({
          id:         leadStageHistory.id,
          stageId:    leadStageHistory.stageId,
          stageName:  pipelineStage.name,
          stageColor: pipelineStage.color,
          enteredAt:  leadStageHistory.enteredAt,
          exitedAt:   leadStageHistory.exitedAt,
          movedBy:    leadStageHistory.movedBy,
        })
        .from(leadStageHistory)
        .leftJoin(pipelineStage, eq(leadStageHistory.stageId, pipelineStage.id))
        .where(eq(leadStageHistory.leadId, input.id))
        .orderBy(asc(leadStageHistory.enteredAt));

      return { ...row, history };
    }),

  create: protectedProcedure
    .input(CreateInput)
    .mutation(async ({ ctx, input }) => {
      const [stage] = await ctx.db
        .select()
        .from(pipelineStage)
        .where(and(
          eq(pipelineStage.id, input.stageId),
          eq(pipelineStage.pipelineId, input.pipelineId),
          eq(pipelineStage.tenantId, ctx.tenantId),
        ));

      if (!stage) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stage does not belong to this pipeline' });
      }

      const now = new Date();
      const rows = await ctx.db
        .insert(lead)
        .values({
          tenantId:          ctx.tenantId,
          pipelineId:        input.pipelineId,
          stageId:           input.stageId,
          contactId:         input.contactId,
          propertyId:        input.propertyId ?? null,
          title:             input.title ?? null,
          expectedValue:     input.expectedValue ?? null,
          expectedCurrency:  input.expectedCurrency,
          expectedCloseDate: input.expectedCloseDate ?? null,
          score:             input.score,
          ownerUserId:       input.ownerUserId ?? ctx.userId,
          stageEnteredAt:    now,
          wonAt:             stage.kind === 'won'  ? now : null,
          lostAt:            stage.kind === 'lost' ? now : null,
          createdBy:         ctx.userId,
          updatedBy:         ctx.userId,
        })
        .returning();
      const created = rows[0]!;

      await ctx.db.insert(leadStageHistory).values({
        tenantId:  ctx.tenantId,
        leadId:    created.id,
        stageId:   input.stageId,
        enteredAt: now,
        movedBy:   ctx.userId,
      });

      return created;
    }),

  update: protectedProcedure
    .input(UpdateInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(lead)
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId), isNull(lead.deletedAt)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.title             !== undefined) updates.title             = input.title;
      if (input.expectedValue     !== undefined) updates.expectedValue     = input.expectedValue;
      if (input.expectedCurrency  !== undefined) updates.expectedCurrency  = input.expectedCurrency;
      if (input.expectedCloseDate !== undefined) updates.expectedCloseDate = input.expectedCloseDate;
      if (input.score             !== undefined) updates.score             = input.score;
      if (input.ownerUserId       !== undefined) updates.ownerUserId       = input.ownerUserId;
      if (input.propertyId        !== undefined) updates.propertyId        = input.propertyId;

      const [updated] = await ctx.db
        .update(lead)
        .set(updates)
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  moveStage: protectedProcedure
    .input(MoveStageInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(lead)
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId), isNull(lead.deletedAt)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }
      if (existing.stageId === input.targetStageId) return existing;

      const [targetStage] = await ctx.db
        .select()
        .from(pipelineStage)
        .where(and(
          eq(pipelineStage.id, input.targetStageId),
          eq(pipelineStage.pipelineId, existing.pipelineId),
          eq(pipelineStage.tenantId, ctx.tenantId),
        ));

      if (!targetStage) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target stage does not belong to this pipeline' });
      }

      const now = new Date();

      await ctx.db
        .update(leadStageHistory)
        .set({ exitedAt: now })
        .where(and(eq(leadStageHistory.leadId, input.id), isNull(leadStageHistory.exitedAt)));

      await ctx.db.insert(leadStageHistory).values({
        tenantId:  ctx.tenantId,
        leadId:    input.id,
        stageId:   input.targetStageId,
        enteredAt: now,
        movedBy:   ctx.userId,
      });

      const updates: Record<string, unknown> = {
        stageId:        input.targetStageId,
        stageEnteredAt: now,
        updatedAt:      now,
        updatedBy:      ctx.userId,
        version:        existing.version + 1,
      };

      if (targetStage.kind === 'won') {
        updates.wonAt      = now;
        updates.lostAt     = null;
        updates.lostReason = null;
      } else if (targetStage.kind === 'lost') {
        updates.lostAt     = now;
        updates.lostReason = input.lostReason ?? null;
        updates.wonAt      = null;
      } else {
        updates.wonAt      = null;
        updates.lostAt     = null;
        updates.lostReason = null;
      }

      const [updated] = await ctx.db
        .update(lead)
        .set(updates)
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  bulkMoveStage: protectedProcedure
    .input(BulkMoveInput)
    .mutation(async ({ ctx, input }) => {
      const [targetStage] = await ctx.db
        .select()
        .from(pipelineStage)
        .where(and(eq(pipelineStage.id, input.targetStageId), eq(pipelineStage.tenantId, ctx.tenantId)));

      if (!targetStage) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target stage not found' });
      }

      const existingLeads = await ctx.db
        .select()
        .from(lead)
        .where(and(eq(lead.tenantId, ctx.tenantId), inArray(lead.id, input.ids), isNull(lead.deletedAt)));

      if (existingLeads.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No leads found' });
      }

      const now    = new Date();
      const toMove = existingLeads.filter((l) => l.stageId !== input.targetStageId);
      if (toMove.length === 0) return { moved: 0, results: [] };

      const moveIds = toMove.map((l) => l.id);

      await ctx.db
        .update(leadStageHistory)
        .set({ exitedAt: now })
        .where(and(inArray(leadStageHistory.leadId, moveIds), isNull(leadStageHistory.exitedAt)));

      await ctx.db.insert(leadStageHistory).values(
        toMove.map((l) => ({
          tenantId:  ctx.tenantId,
          leadId:    l.id,
          stageId:   input.targetStageId,
          enteredAt: now,
          movedBy:   ctx.userId,
        })),
      );

      const leadUpdates: Record<string, unknown> = {
        stageId:        input.targetStageId,
        stageEnteredAt: now,
        updatedAt:      now,
        updatedBy:      ctx.userId,
        version:        sql`${lead.version} + 1`,
      };

      if (targetStage.kind === 'won') {
        leadUpdates.wonAt      = now;
        leadUpdates.lostAt     = null;
        leadUpdates.lostReason = null;
      } else if (targetStage.kind === 'lost') {
        leadUpdates.lostAt     = now;
        leadUpdates.wonAt      = null;
        leadUpdates.lostReason = null;
      } else {
        leadUpdates.wonAt      = null;
        leadUpdates.lostAt     = null;
        leadUpdates.lostReason = null;
      }

      await ctx.db
        .update(lead)
        .set(leadUpdates)
        .where(and(eq(lead.tenantId, ctx.tenantId), inArray(lead.id, moveIds)));

      const results = toMove.map((l) => ({ leadId: l.id, previousStageId: l.stageId }));
      return { moved: results.length, results };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(lead)
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId), isNull(lead.deletedAt)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      await ctx.db
        .update(lead)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.userId,
          updatedAt: new Date(),
          updatedBy: ctx.userId,
        })
        .where(and(eq(lead.id, input.id), eq(lead.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  funnel: protectedProcedure
    .input(FunnelInput)
    .query(async ({ ctx, input }) => {
      const stages = await ctx.db
        .select()
        .from(pipelineStage)
        .where(and(eq(pipelineStage.pipelineId, input.pipelineId), eq(pipelineStage.tenantId, ctx.tenantId)))
        .orderBy(asc(pipelineStage.position));

      if (stages.length === 0) return [];

      const stageIds   = stages.map((s) => s.id);
      const conditions = [inArray(leadStageHistory.stageId, stageIds)];

      if (input.dateFrom) conditions.push(gte(leadStageHistory.enteredAt, new Date(input.dateFrom)));
      if (input.dateTo)   conditions.push(lte(leadStageHistory.enteredAt, new Date(input.dateTo + 'T23:59:59.999Z')));

      const baseSelect = {
        stageId:         leadStageHistory.stageId,
        count:           sql<number>`count(distinct ${leadStageHistory.leadId})::int`,
        avgDaysInStage:  sql<number>`coalesce(avg(extract(epoch from (${leadStageHistory.exitedAt} - ${leadStageHistory.enteredAt})) / 86400.0), 0)::float`,
      };

      let aggregates: { stageId: string; count: number; avgDaysInStage: number }[];

      if (input.ownerId) {
        aggregates = await ctx.db
          .select(baseSelect)
          .from(leadStageHistory)
          .innerJoin(lead, eq(leadStageHistory.leadId, lead.id))
          .where(and(...conditions, eq(lead.tenantId, ctx.tenantId), eq(lead.ownerUserId, input.ownerId)))
          .groupBy(leadStageHistory.stageId);
      } else {
        aggregates = await ctx.db
          .select(baseSelect)
          .from(leadStageHistory)
          .where(and(...conditions, eq(leadStageHistory.tenantId, ctx.tenantId)))
          .groupBy(leadStageHistory.stageId);
      }

      const aggMap = new Map(aggregates.map((a) => [a.stageId, a]));
      let previousCount = 0;

      return stages.map((stage, idx) => {
        const agg   = aggMap.get(stage.id);
        const count = agg?.count ?? 0;
        const conversionPct =
          idx === 0 || previousCount === 0
            ? (idx === 0 ? 100 : 0)
            : Math.round((count / previousCount) * 10000) / 100;
        previousCount = count;
        return {
          stage,
          count,
          conversionPct,
          avgDaysInStage: Math.round((agg?.avgDaysInStage ?? 0) * 100) / 100,
        };
      });
    }),
});
