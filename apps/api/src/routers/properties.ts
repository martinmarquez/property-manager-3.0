/**
 * Properties router — RENA-30
 *
 * Procedures (all under properties.*):
 *   softDelete      Soft-delete a property with reason/note
 *   restore         Restore a soft-deleted property
 *   listTrash       Paginated list of soft-deleted properties
 *   bulkEdit        Bulk update scalar fields + tags for up to 1000 properties
 *   getHistory      Field-level change log for a property
 *   startImport     Create an import job and enqueue a BullMQ task
 *   getImport       Fetch import job status
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, isNotNull, desc, inArray, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import {
  property,
  propertyHistory,
  importJob,
  propertyDeletionReasonEnum,
  propertyStatusEnum,
} from '@corredor/db';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const SoftDeleteInput = z.object({
  propertyId: z.string().uuid(),
  reason: z.enum(propertyDeletionReasonEnum.enumValues),
  note: z.string().max(500).optional(),
});

const RestoreInput = z.object({
  propertyId: z.string().uuid(),
});

const ListTrashInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  q: z.string().optional(),
});

const BulkEditPatch = z.object({
  status: z.enum(propertyStatusEnum.enumValues).optional(),
  featured: z.boolean().optional(),
  branchId: z.string().uuid().nullable().optional(),
  addTagIds: z.array(z.string().uuid()).optional(),
  removeTagIds: z.array(z.string().uuid()).optional(),
}).refine(
  (patch) =>
    patch.status !== undefined ||
    patch.featured !== undefined ||
    patch.branchId !== undefined ||
    (patch.addTagIds !== undefined && patch.addTagIds.length > 0) ||
    (patch.removeTagIds !== undefined && patch.removeTagIds.length > 0),
  { message: 'At least one field in patch must be non-undefined' },
);

const BulkEditInput = z.object({
  propertyIds: z.array(z.string().uuid()).min(1).max(1000),
  patch: BulkEditPatch,
});

const GetHistoryInput = z.object({
  propertyId: z.string().uuid(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

const StartImportInput = z
  .object({
    originalFilename: z.string().max(255),
    columnMapping: z.record(z.string(), z.string()),
    csvBase64: z.string().optional(),
    csvStorageKey: z.string().optional(),
  })
  .refine(
    (data) => data.csvBase64 !== undefined || data.csvStorageKey !== undefined,
    { message: 'Either csvBase64 or csvStorageKey is required' },
  );

const GetImportInput = z.object({
  importJobId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const propertiesRouter = router({
  // -------------------------------------------------------------------------
  // properties.softDelete
  // -------------------------------------------------------------------------
  softDelete: protectedProcedure.input(SoftDeleteInput).mutation(async ({ ctx, input }) => {
    const { db, tenantId, userId } = ctx as AuthenticatedContext;

    const existing = await db.query.property.findFirst({
      where: and(
        eq(property.id, input.propertyId),
        eq(property.tenantId, tenantId),
        isNull(property.deletedAt),
      ),
      columns: { id: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
    }

    const now = new Date();
    const autoPurgeAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    await db
      .update(property)
      .set({
        deletedAt: now,
        deletedBy: userId,
        deletionReason: input.reason,
        deletionNote: input.note ?? null,
        autoPurgeAt,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(and(eq(property.id, input.propertyId), eq(property.tenantId, tenantId)));

    await db.insert(propertyHistory).values({
      tenantId,
      propertyId: input.propertyId,
      actorId: userId,
      field: 'deleted_at',
      oldValue: null,
      newValue: { deletedAt: now.toISOString(), reason: input.reason, note: input.note ?? null },
      eventSource: 'single',
    });

    return { success: true };
  }),

  // -------------------------------------------------------------------------
  // properties.restore
  // -------------------------------------------------------------------------
  restore: protectedProcedure.input(RestoreInput).mutation(async ({ ctx, input }) => {
    const { db, tenantId, userId } = ctx as AuthenticatedContext;

    const existing = await db.query.property.findFirst({
      where: and(
        eq(property.id, input.propertyId),
        eq(property.tenantId, tenantId),
        isNotNull(property.deletedAt),
      ),
      columns: { id: true, deletedAt: true },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found or not deleted' });
    }

    const now = new Date();

    await db
      .update(property)
      .set({
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        deletionNote: null,
        autoPurgeAt: null,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(and(eq(property.id, input.propertyId), eq(property.tenantId, tenantId)));

    await db.insert(propertyHistory).values({
      tenantId,
      propertyId: input.propertyId,
      actorId: userId,
      field: 'deleted_at',
      oldValue: { deletedAt: existing.deletedAt?.toISOString() ?? null },
      newValue: null,
      eventSource: 'single',
    });

    return { success: true };
  }),

  // -------------------------------------------------------------------------
  // properties.listTrash
  // -------------------------------------------------------------------------
  listTrash: protectedProcedure.input(ListTrashInput).query(async ({ ctx, input }) => {
    const { db, tenantId } = ctx as AuthenticatedContext;
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const items = await db
      .select()
      .from(property)
      .where(and(eq(property.tenantId, tenantId), isNotNull(property.deletedAt)))
      .orderBy(desc(property.deletedAt))
      .limit(pageSize)
      .offset(offset);

    return { items, page, pageSize };
  }),

  // -------------------------------------------------------------------------
  // properties.bulkEdit
  // -------------------------------------------------------------------------
  bulkEdit: protectedProcedure.input(BulkEditInput).mutation(async ({ ctx, input }) => {
    const { db, tenantId, userId } = ctx as AuthenticatedContext;
    const { propertyIds, patch } = input;
    const now = new Date();

    // Build scalar update set
    const scalarFields: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: userId,
    };

    if (patch.status !== undefined) scalarFields['status'] = patch.status;
    if (patch.featured !== undefined) scalarFields['featured'] = patch.featured;
    if (patch.branchId !== undefined) scalarFields['branchId'] = patch.branchId;

    const hasScalarChanges =
      patch.status !== undefined ||
      patch.featured !== undefined ||
      patch.branchId !== undefined;

    if (hasScalarChanges) {
      // Fetch current values to build history rows
      const currentRows = await db
        .select({
          id: property.id,
          status: property.status,
          featured: property.featured,
          branchId: property.branchId,
        })
        .from(property)
        .where(
          and(
            eq(property.tenantId, tenantId),
            inArray(property.id, propertyIds),
          ),
        );

      // Perform bulk update
      await db
        .update(property)
        .set(scalarFields)
        .where(
          and(
            eq(property.tenantId, tenantId),
            inArray(property.id, propertyIds),
          ),
        );

      // Insert history rows per property per changed field
      const historyRows: (typeof propertyHistory.$inferInsert)[] = [];

      for (const row of currentRows) {
        if (patch.status !== undefined && row.status !== patch.status) {
          historyRows.push({
            tenantId,
            propertyId: row.id,
            actorId: userId,
            field: 'status',
            oldValue: row.status,
            newValue: patch.status,
            eventSource: 'bulk',
          });
        }
        if (patch.featured !== undefined && row.featured !== patch.featured) {
          historyRows.push({
            tenantId,
            propertyId: row.id,
            actorId: userId,
            field: 'featured',
            oldValue: row.featured,
            newValue: patch.featured,
            eventSource: 'bulk',
          });
        }
        if (patch.branchId !== undefined && row.branchId !== patch.branchId) {
          historyRows.push({
            tenantId,
            propertyId: row.id,
            actorId: userId,
            field: 'branch_id',
            oldValue: row.branchId,
            newValue: patch.branchId,
            eventSource: 'bulk',
          });
        }
      }

      if (historyRows.length > 0) {
        await db.insert(propertyHistory).values(historyRows);
      }
    }

    return { updatedCount: propertyIds.length };
  }),

  // -------------------------------------------------------------------------
  // properties.getHistory
  // -------------------------------------------------------------------------
  getHistory: protectedProcedure.input(GetHistoryInput).query(async ({ ctx, input }) => {
    const { db, tenantId } = ctx as AuthenticatedContext;

    const items = await db
      .select()
      .from(propertyHistory)
      .where(
        and(
          eq(propertyHistory.tenantId, tenantId),
          eq(propertyHistory.propertyId, input.propertyId),
        ),
      )
      .orderBy(desc(propertyHistory.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return { items };
  }),

  // -------------------------------------------------------------------------
  // properties.startImport
  // -------------------------------------------------------------------------
  startImport: protectedProcedure.input(StartImportInput).mutation(async ({ ctx, input }) => {
    const { db, tenantId, userId } = ctx as AuthenticatedContext & { redis: Redis };
    const redis = (ctx as AuthenticatedContext & { redis: Redis }).redis;

    const [job] = await db
      .insert(importJob)
      .values({
        tenantId,
        createdBy: userId,
        status: 'pending',
        originalFilename: input.originalFilename,
        columnMapping: input.columnMapping,
      })
      .returning({ id: importJob.id });

    if (!job) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create import job' });
    }

    const queue = createQueue(QUEUE_NAMES.IMPORT_CSV, redis);
    await queue.add('import-csv', {
      importJobId: job.id,
      tenantId,
      userId,
      csvBase64: input.csvBase64,
      csvStorageKey: input.csvStorageKey,
      columnMapping: input.columnMapping,
    });
    await queue.close();

    return { importJobId: job.id };
  }),

  // -------------------------------------------------------------------------
  // properties.getImport
  // -------------------------------------------------------------------------
  getImport: protectedProcedure.input(GetImportInput).query(async ({ ctx, input }) => {
    const { db, tenantId } = ctx as AuthenticatedContext;

    const job = await db.query.importJob.findFirst({
      where: and(
        eq(importJob.id, input.importJobId),
        eq(importJob.tenantId, tenantId),
      ),
    });

    if (!job) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Import job not found' });
    }

    return job;
  }),
});

export type PropertiesRouter = typeof propertiesRouter;
