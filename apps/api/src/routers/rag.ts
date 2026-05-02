import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { property } from '@corredor/db';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

export const ragRouter = router({
  reindexProperty: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, redis } = ctx as AuthenticatedContext;

      const rows = await (ctx as AuthenticatedContext).db
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

      if (rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const queue = createQueue(QUEUE_NAMES.RAG_INGEST, redis);
      await queue.add('reindex-property', {
        tenantId,
        entityType: 'property',
        entityId: input.propertyId,
        force: true,
      });
      await queue.close();

      return { queued: true, propertyId: input.propertyId };
    }),

  reindexTenant: protectedProcedure
    .input(
      z.object({
        batchSize: z.number().int().min(1).max(500).default(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, roles, redis } = ctx as AuthenticatedContext;

      if (!roles.includes('admin') && !roles.includes('owner')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can trigger tenant-wide re-index',
        });
      }

      const allProperties = await (ctx as AuthenticatedContext).db
        .select({ id: property.id })
        .from(property)
        .where(
          and(
            eq(property.tenantId, tenantId),
            isNull(property.deletedAt),
          ),
        );

      const queue = createQueue(QUEUE_NAMES.RAG_INGEST, redis);
      let queued = 0;

      for (let i = 0; i < allProperties.length; i += input.batchSize) {
        const batch = allProperties.slice(i, i + input.batchSize);
        const jobs = batch.map((p) => ({
          name: 'reindex-tenant',
          data: {
            tenantId,
            entityType: 'property' as const,
            entityId: p.id,
            force: true,
          },
        }));
        await queue.addBulk(jobs);
        queued += jobs.length;
      }

      await queue.close();

      return { queued, totalProperties: allProperties.length };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId, db } = ctx as AuthenticatedContext;

    const result = await db.execute(
      sql`SELECT entity_type, count(*)::int as count
          FROM ai_embedding
          WHERE tenant_id = ${tenantId}
          GROUP BY entity_type
          ORDER BY entity_type`,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (result as any).rows ?? [];
    return {
      embeddings: rows as Array<{ entity_type: string; count: number }>,
    };
  }),
});
