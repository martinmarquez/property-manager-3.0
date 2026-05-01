import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import {
  docTemplate,
  docTemplateRevision,
  docDocument,
  docClause,
} from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

export const documentsRouter = router({
  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  listTemplates: protectedProcedure
    .input(
      z.object({
        kind: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const conditions = [
        isNull(docTemplate.deletedAt),
        eq(docTemplate.isActive, true),
      ];
      if (input.kind) {
        conditions.push(sql`${docTemplate.kind} = ${input.kind}`);
      }

      const rows = await authCtx.db
        .select()
        .from(docTemplate)
        .where(and(...conditions))
        .orderBy(desc(docTemplate.updatedAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const [tmpl] = await authCtx.db
        .select()
        .from(docTemplate)
        .where(and(eq(docTemplate.id, input.id), isNull(docTemplate.deletedAt)))
        .limit(1);

      if (!tmpl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      return tmpl;
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(100),
        name: z.string().min(1).max(255),
        kind: z.enum([
          'reserva', 'boleto', 'escritura', 'recibo_sena',
          'autorizacion_venta', 'contrato_locacion', 'recibo_alquiler',
          'carta_oferta', 'custom',
        ]),
        bodyHtml: z.string().default(''),
        requiredBindings: z.array(z.string()).default([]),
        minSignatureLevel: z.enum(['firma_electronica', 'firma_digital']).default('firma_digital'),
        jurisdiction: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [created] = await authCtx.db
        .insert(docTemplate)
        .values({
          tenantId: authCtx.tenantId,
          slug: input.slug,
          name: input.name,
          kind: input.kind,
          bodyHtml: input.bodyHtml,
          requiredBindings: input.requiredBindings,
          minSignatureLevel: input.minSignatureLevel,
          jurisdiction: input.jurisdiction ?? null,
          createdBy: authCtx.userId,
          updatedBy: authCtx.userId,
        })
        .returning();

      await authCtx.db.insert(docTemplateRevision).values({
        tenantId: authCtx.tenantId,
        templateId: created!.id,
        revisionNumber: 1,
        bodyHtml: input.bodyHtml,
        requiredBindings: input.requiredBindings,
        changedBy: authCtx.userId,
      });

      return created;
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        bodyHtml: z.string().optional(),
        requiredBindings: z.array(z.string()).optional(),
        minSignatureLevel: z.enum(['firma_electronica', 'firma_digital']).optional(),
        jurisdiction: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const { id, ...updates } = input;

      const [existing] = await authCtx.db
        .select()
        .from(docTemplate)
        .where(and(eq(docTemplate.id, id), isNull(docTemplate.deletedAt)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });

      const newVersion = existing.version + 1;
      const [updated] = await authCtx.db
        .update(docTemplate)
        .set({
          ...updates,
          version: newVersion,
          updatedBy: authCtx.userId,
        })
        .where(eq(docTemplate.id, id))
        .returning();

      if (updates.bodyHtml !== undefined) {
        await authCtx.db.insert(docTemplateRevision).values({
          tenantId: authCtx.tenantId,
          templateId: id,
          revisionNumber: newVersion,
          bodyHtml: updates.bodyHtml,
          requiredBindings: updates.requiredBindings ?? existing.requiredBindings as string[],
          changedBy: authCtx.userId,
        });
      }

      return updated;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await authCtx.db
        .update(docTemplate)
        .set({ deletedAt: new Date(), updatedBy: authCtx.userId })
        .where(and(eq(docTemplate.id, input.id), isNull(docTemplate.deletedAt)));
      return { ok: true };
    }),

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  listDocuments: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid().optional(),
        status: z.enum(['draft', 'pending_signature', 'signed', 'expired', 'cancelled']).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const conditions = [isNull(docDocument.deletedAt)];
      if (input.templateId) conditions.push(eq(docDocument.templateId, input.templateId));
      if (input.status) conditions.push(eq(docDocument.status, input.status));

      return authCtx.db
        .select()
        .from(docDocument)
        .where(and(...conditions))
        .orderBy(desc(docDocument.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  getDocument: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const [doc] = await authCtx.db
        .select()
        .from(docDocument)
        .where(and(eq(docDocument.id, input.id), isNull(docDocument.deletedAt)))
        .limit(1);
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      return doc;
    }),

  createDocument: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        fieldBindings: z.record(z.unknown()).default({}),
        leadId: z.string().uuid().optional(),
        propertyId: z.string().uuid().optional(),
        contactBuyerId: z.string().uuid().optional(),
        contactSellerId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [tmpl] = await authCtx.db
        .select()
        .from(docTemplate)
        .where(and(eq(docTemplate.id, input.templateId), isNull(docTemplate.deletedAt)))
        .limit(1);

      if (!tmpl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });

      const [doc] = await authCtx.db
        .insert(docDocument)
        .values({
          tenantId: authCtx.tenantId,
          templateId: input.templateId,
          fieldBindingsSnapshot: input.fieldBindings,
          leadId: input.leadId ?? null,
          propertyId: input.propertyId ?? null,
          contactBuyerId: input.contactBuyerId ?? null,
          contactSellerId: input.contactSellerId ?? null,
          createdBy: authCtx.userId,
          updatedBy: authCtx.userId,
        })
        .returning();

      return doc;
    }),

  // ---------------------------------------------------------------------------
  // Clauses
  // ---------------------------------------------------------------------------

  listClauses: protectedProcedure
    .input(
      z.object({
        jurisdiction: z.string().optional(),
        kind: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      const conditions = [isNull(docClause.deletedAt)];
      if (input.jurisdiction) conditions.push(eq(docClause.jurisdiction, input.jurisdiction));

      return authCtx.db
        .select()
        .from(docClause)
        .where(and(...conditions))
        .orderBy(desc(docClause.updatedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
