/**
 * Portals router — RENA-60
 *
 * Procedures (all under portals.*):
 *   connections.list        List portal connections for tenant
 *   connections.create      Create a new portal connection
 *   connections.delete      Soft-delete a portal connection
 *   connections.test        Test connection credentials
 *   publications.publish    Publish a property to a portal (enqueues job)
 *   publications.unpublish  Unpublish a property from a portal (enqueues job)
 *   publications.bulkPublish Publish multiple properties to a portal
 *   publications.syncStatus  Get sync status per property per portal
 *   portalLeads.list        List leads received from portals
 *   syncLogs.list           List sync logs for a connection
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  eq, and, isNull, desc, gte,
} from 'drizzle-orm';
import {
  portalConnection,
  propertyPortalPublication,
  portalSyncLog,
} from '@corredor/db';
import { QUEUE_NAMES } from '@corredor/core';
import { encryptCredentials, portalIdSchema } from '@corredor/portals';
import { router, protectedProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Shared column set — every portalConnection column EXCEPT credentials
// ---------------------------------------------------------------------------

const portalConnectionColumns = {
  id:           portalConnection.id,
  tenantId:     portalConnection.tenantId,
  portal:       portalConnection.portal,
  label:        portalConnection.label,
  status:       portalConnection.status,
  config:       portalConnection.config,
  lastSyncAt:   portalConnection.lastSyncAt,
  errorMessage: portalConnection.errorMessage,
  deletedAt:    portalConnection.deletedAt,
  createdAt:    portalConnection.createdAt,
  createdBy:    portalConnection.createdBy,
  updatedAt:    portalConnection.updatedAt,
  updatedBy:    portalConnection.updatedBy,
  version:      portalConnection.version,
} as const;

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ConnectionCreateInput = z.object({
  portal: portalIdSchema,
  label: z.string().max(100).optional(),
  credentials: z.record(z.unknown()),
  config: z.record(z.unknown()).default({}),
});

const PublishInput = z.object({
  propertyId: z.string().uuid(),
  portalConnectionId: z.string().uuid(),
  portalSpecificFields: z.record(z.unknown()).default({}),
});

const BulkPublishInput = z.object({
  propertyIds: z.array(z.string().uuid()).min(1).max(50),
  portalConnectionId: z.string().uuid(),
});

const SyncStatusInput = z.object({
  propertyId: z.string().uuid().optional(),
  portalConnectionId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const PortalLeadsInput = z.object({
  portalConnectionId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const SyncLogsInput = z.object({
  connectionId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const connectionsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db
        .select(portalConnectionColumns)
        .from(portalConnection)
        .where(and(
          eq(portalConnection.tenantId, ctx.tenantId),
          isNull(portalConnection.deletedAt),
        ))
        .orderBy(desc(portalConnection.createdAt));
    }),

  create: protectedProcedure
    .input(ConnectionCreateInput)
    .mutation(async ({ ctx, input }) => {
      const encrypted = encryptCredentials(input.credentials);

      const [created] = await ctx.db
        .insert(portalConnection)
        .values({
          tenantId: ctx.tenantId,
          portal: input.portal,
          label: input.label ?? null,
          status: 'pending_auth',
          credentials: encrypted,
          config: input.config,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning(portalConnectionColumns);

      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: portalConnection.id })
        .from(portalConnection)
        .where(and(
          eq(portalConnection.id, input.id),
          eq(portalConnection.tenantId, ctx.tenantId),
          isNull(portalConnection.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal connection not found' });
      }

      await ctx.db
        .update(portalConnection)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.userId,
        })
        .where(eq(portalConnection.id, input.id));

      return { success: true };
    }),

  testConnection: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [conn] = await ctx.db
        .select()
        .from(portalConnection)
        .where(and(
          eq(portalConnection.id, input.id),
          eq(portalConnection.tenantId, ctx.tenantId),
          isNull(portalConnection.deletedAt),
        ));

      if (!conn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal connection not found' });
      }

      const { getAdapter, registerAdapter, mercadolibreAdapter, proppitAdapter } = await import('@corredor/portals');
      registerAdapter(mercadolibreAdapter);
      registerAdapter(proppitAdapter);

      const adapter = getAdapter(conn.portal);
      const result = await adapter.validateCredentials(conn.credentials);

      const newStatus = result.valid ? 'active' : 'error';
      await ctx.db
        .update(portalConnection)
        .set({
          status: newStatus,
          errorMessage: result.valid ? null : result.error ?? 'Validation failed',
          updatedAt: new Date(),
          updatedBy: ctx.userId,
        })
        .where(eq(portalConnection.id, input.id));

      return result;
    }),
});

const publicationsRouter = router({
  publish: protectedProcedure
    .input(PublishInput)
    .mutation(async ({ ctx, input }) => {
      const [conn] = await ctx.db
        .select({ id: portalConnection.id, status: portalConnection.status })
        .from(portalConnection)
        .where(and(
          eq(portalConnection.id, input.portalConnectionId),
          eq(portalConnection.tenantId, ctx.tenantId),
          isNull(portalConnection.deletedAt),
        ));

      if (!conn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal connection not found' });
      }

      if (conn.status !== 'active') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Portal connection is not active' });
      }

      const [pub] = await ctx.db
        .insert(propertyPortalPublication)
        .values({
          tenantId: ctx.tenantId,
          propertyId: input.propertyId,
          portalConnectionId: input.portalConnectionId,
          status: 'draft',
          portalSpecificFields: input.portalSpecificFields,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      const queue = ctx.queues?.[QUEUE_NAMES.PORTAL_PUBLISH];
      if (queue) {
        await queue.add('publish', {
          publicationId: pub!.id,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        });
      }

      return pub;
    }),

  unpublish: protectedProcedure
    .input(z.object({ publicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pub] = await ctx.db
        .select()
        .from(propertyPortalPublication)
        .where(and(
          eq(propertyPortalPublication.id, input.publicationId),
          eq(propertyPortalPublication.tenantId, ctx.tenantId),
          isNull(propertyPortalPublication.deletedAt),
        ));

      if (!pub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Publication not found' });
      }

      await ctx.db
        .update(propertyPortalPublication)
        .set({
          status: 'unpublishing',
          updatedAt: new Date(),
          updatedBy: ctx.userId,
        })
        .where(eq(propertyPortalPublication.id, input.publicationId));

      const queue = ctx.queues?.[QUEUE_NAMES.PORTAL_UNPUBLISH];
      if (queue) {
        await queue.add('unpublish', {
          publicationId: input.publicationId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        });
      }

      return { success: true };
    }),

  bulkPublish: protectedProcedure
    .input(BulkPublishInput)
    .mutation(async ({ ctx, input }) => {
      const [conn] = await ctx.db
        .select({ id: portalConnection.id, status: portalConnection.status })
        .from(portalConnection)
        .where(and(
          eq(portalConnection.id, input.portalConnectionId),
          eq(portalConnection.tenantId, ctx.tenantId),
          isNull(portalConnection.deletedAt),
        ));

      if (!conn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal connection not found' });
      }

      if (conn.status !== 'active') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Portal connection is not active' });
      }

      const pubs = await ctx.db
        .insert(propertyPortalPublication)
        .values(input.propertyIds.map((propertyId) => ({
          tenantId: ctx.tenantId,
          propertyId,
          portalConnectionId: input.portalConnectionId,
          status: 'draft' as const,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })))
        .returning();

      const queue = ctx.queues?.[QUEUE_NAMES.PORTAL_PUBLISH];
      if (queue) {
        for (const pub of pubs) {
          await queue.add('publish', {
            publicationId: pub.id,
            tenantId: ctx.tenantId,
            userId: ctx.userId,
          });
        }
      }

      return { created: pubs.length, publications: pubs };
    }),

  syncStatus: protectedProcedure
    .input(SyncStatusInput)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(propertyPortalPublication.tenantId, ctx.tenantId),
        isNull(propertyPortalPublication.deletedAt),
      ];

      if (input.propertyId) {
        conditions.push(eq(propertyPortalPublication.propertyId, input.propertyId));
      }
      if (input.portalConnectionId) {
        conditions.push(eq(propertyPortalPublication.portalConnectionId, input.portalConnectionId));
      }

      return ctx.db
        .select({
          publication: propertyPortalPublication,
          connectionPortal: portalConnection.portal,
          connectionLabel: portalConnection.label,
          connectionStatus: portalConnection.status,
        })
        .from(propertyPortalPublication)
        .leftJoin(portalConnection, eq(propertyPortalPublication.portalConnectionId, portalConnection.id))
        .where(and(...conditions))
        .orderBy(desc(propertyPortalPublication.updatedAt))
        .limit(input.limit);
    }),
});

const portalLeadsRouter = router({
  list: protectedProcedure
    .input(PortalLeadsInput)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(portalSyncLog.tenantId, ctx.tenantId),
        eq(portalSyncLog.action, 'fetch_leads'),
        eq(portalSyncLog.status, 'success'),
      ];

      if (input.portalConnectionId) {
        conditions.push(eq(portalSyncLog.portalConnectionId, input.portalConnectionId));
      }
      if (input.since) {
        conditions.push(gte(portalSyncLog.createdAt, new Date(input.since)));
      }

      const logs = await ctx.db
        .select({
          log: portalSyncLog,
          connectionPortal: portalConnection.portal,
          connectionLabel: portalConnection.label,
        })
        .from(portalSyncLog)
        .leftJoin(portalConnection, eq(portalSyncLog.portalConnectionId, portalConnection.id))
        .where(and(...conditions))
        .orderBy(desc(portalSyncLog.createdAt))
        .limit(input.limit);

      return logs.map((row) => ({
        ...row.log,
        portal: row.connectionPortal,
        connectionLabel: row.connectionLabel,
        leads: (row.log.responsePayload as { leads?: unknown[] } | null)?.leads ?? [],
      }));
    }),
});

const syncLogsRouter = router({
  list: protectedProcedure
    .input(SyncLogsInput)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(portalSyncLog)
        .where(and(
          eq(portalSyncLog.tenantId, ctx.tenantId),
          eq(portalSyncLog.portalConnectionId, input.connectionId),
        ))
        .orderBy(desc(portalSyncLog.createdAt))
        .limit(input.limit);
    }),
});

// ---------------------------------------------------------------------------
// Composed portals router
// ---------------------------------------------------------------------------

export const portalsRouter = router({
  connections:  connectionsRouter,
  publications: publicationsRouter,
  portalLeads:  portalLeadsRouter,
  syncLogs:     syncLogsRouter,
});
