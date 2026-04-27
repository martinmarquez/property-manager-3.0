import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, isNull } from 'drizzle-orm';
import {
  docDocument,
  docSignatureRequest,
  docSigner,
  docAuditTrail,
} from '@corredor/db';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import {
  type ESignProvider,
  type SignatureAdapter,
  registerAdapter,
  getAdapter,
  hasAdapter,
  SignaturitAdapter,
  DocuSignAdapter,
} from '@corredor/documents';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';

let adaptersInitialized = false;

function ensureAdapters(): void {
  if (adaptersInitialized) return;
  if (process.env['SIGNATURIT_API_KEY']) {
    registerAdapter(
      new SignaturitAdapter({
        apiKey: process.env['SIGNATURIT_API_KEY'],
        baseUrl: process.env['SIGNATURIT_BASE_URL'] ?? 'https://api.sandbox.signaturit.com',
      }),
    );
  }
  if (process.env['DOCUSIGN_INTEGRATION_KEY']) {
    registerAdapter(
      new DocuSignAdapter({
        integrationKey: process.env['DOCUSIGN_INTEGRATION_KEY'],
        secretKey: process.env['DOCUSIGN_SECRET_KEY'] ?? '',
        accountId: process.env['DOCUSIGN_ACCOUNT_ID'] ?? '',
      }),
    );
  }
  adaptersInitialized = true;
}

const signerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  order: z.number().int().min(0),
  roleLabel: z.string().optional(),
  contactId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  signatureLevel: z.enum(['firma_electronica', 'firma_digital']).default('firma_electronica'),
});

export const esignRouter = router({
  sendForSignature: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        provider: z.enum(['signaturit', 'docusign']).default('signaturit'),
        flowKind: z.enum(['sequential', 'parallel']).default('sequential'),
        signers: z.array(signerInput).min(1),
        expiresInDays: z.number().int().min(1).max(90).default(30),
        senderName: z.string().optional(),
        senderEmail: z.string().email().optional(),
        customMessage: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ensureAdapters();
      const authCtx = ctx as unknown as AuthenticatedContext;
      const adapter = getAdapter(input.provider);

      const [doc] = await authCtx.db
        .select()
        .from(docDocument)
        .where(
          and(
            eq(docDocument.id, input.documentId),
            isNull(docDocument.deletedAt),
          ),
        )
        .limit(1);

      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      if (!doc.fileUrl) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Document has no generated file' });

      const result = await adapter.createSignatureRequest({
        fileUrl: doc.fileUrl,
        fileName: `document-${doc.id}.pdf`,
        signers: input.signers.map((s) => ({
          name: s.name,
          email: s.email,
          order: s.order,
          roleLabel: s.roleLabel,
        })),
        flowKind: input.flowKind,
        expiresInDays: input.expiresInDays,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        customMessage: input.customMessage,
      });

      const [sigReq] = await authCtx.db
        .insert(docSignatureRequest)
        .values({
          tenantId: authCtx.tenantId,
          docDocumentId: input.documentId,
          provider: input.provider,
          externalId: result.externalId,
          flowKind: input.flowKind,
          status: 'pending',
          expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
          senderName: input.senderName ?? null,
          senderEmail: input.senderEmail ?? null,
          customMessage: input.customMessage ?? null,
          providerMetadata: result.providerMetadata,
          createdBy: authCtx.userId,
        })
        .returning();

      const signerValues = input.signers.map((s, i) => ({
        tenantId: authCtx.tenantId,
        docDocumentId: input.documentId,
        signatureRequestId: sigReq!.id,
        contactId: s.contactId ?? null,
        userId: s.userId ?? null,
        name: s.name,
        email: s.email,
        roleLabel: s.roleLabel ?? null,
        signatureOrder: s.order,
        signatureLevel: s.signatureLevel as 'firma_electronica' | 'firma_digital',
        externalSignerId: result.signerExternalIds[i] ?? null,
      }));

      await authCtx.db.insert(docSigner).values(signerValues);

      await authCtx.db
        .update(docDocument)
        .set({ status: 'pending_signature' })
        .where(eq(docDocument.id, input.documentId));

      await authCtx.db.insert(docAuditTrail).values({
        tenantId: authCtx.tenantId,
        docDocumentId: input.documentId,
        signatureRequestId: sigReq!.id,
        eventType: 'signature_request_created',
        metadata: { provider: input.provider, flowKind: input.flowKind },
      });

      return { signatureRequestId: sigReq!.id, externalId: result.externalId };
    }),

  getStatus: protectedProcedure
    .input(z.object({ signatureRequestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [sigReq] = await authCtx.db
        .select()
        .from(docSignatureRequest)
        .where(eq(docSignatureRequest.id, input.signatureRequestId))
        .limit(1);

      if (!sigReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature request not found' });

      const signers = await authCtx.db
        .select()
        .from(docSigner)
        .where(eq(docSigner.signatureRequestId, sigReq.id));

      return {
        id: sigReq.id,
        status: sigReq.status,
        provider: sigReq.provider,
        flowKind: sigReq.flowKind,
        expiresAt: sigReq.expiresAt.toISOString(),
        signers: signers.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
          signedAt: s.signedAt?.toISOString() ?? null,
          declinedAt: s.declinedAt?.toISOString() ?? null,
        })),
      };
    }),

  sendReminder: protectedProcedure
    .input(z.object({ signatureRequestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdapters();
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [sigReq] = await authCtx.db
        .select()
        .from(docSignatureRequest)
        .where(eq(docSignatureRequest.id, input.signatureRequestId))
        .limit(1);

      if (!sigReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature request not found' });
      if (sigReq.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot send reminder for non-pending request' });

      const adapter = getAdapter(sigReq.provider as ESignProvider);
      await adapter.sendReminder(sigReq.externalId);

      await authCtx.db
        .update(docSignatureRequest)
        .set({ lastReminderAt: new Date() })
        .where(eq(docSignatureRequest.id, sigReq.id));

      await authCtx.db.insert(docAuditTrail).values({
        tenantId: authCtx.tenantId,
        docDocumentId: sigReq.docDocumentId,
        signatureRequestId: sigReq.id,
        eventType: 'reminder_sent',
      });

      return { ok: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ signatureRequestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdapters();
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [sigReq] = await authCtx.db
        .select()
        .from(docSignatureRequest)
        .where(eq(docSignatureRequest.id, input.signatureRequestId))
        .limit(1);

      if (!sigReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature request not found' });
      if (sigReq.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only cancel pending requests' });

      const adapter = getAdapter(sigReq.provider as ESignProvider);
      await adapter.cancel(sigReq.externalId);

      await authCtx.db
        .update(docSignatureRequest)
        .set({ status: 'cancelled' })
        .where(eq(docSignatureRequest.id, sigReq.id));

      await authCtx.db
        .update(docDocument)
        .set({ status: 'cancelled' })
        .where(eq(docDocument.id, sigReq.docDocumentId));

      await authCtx.db.insert(docAuditTrail).values({
        tenantId: authCtx.tenantId,
        docDocumentId: sigReq.docDocumentId,
        signatureRequestId: sigReq.id,
        eventType: 'signature_request_cancelled',
      });

      return { ok: true };
    }),

  downloadSigned: protectedProcedure
    .input(z.object({ signatureRequestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      ensureAdapters();
      const authCtx = ctx as unknown as AuthenticatedContext;

      const [sigReq] = await authCtx.db
        .select()
        .from(docSignatureRequest)
        .where(eq(docSignatureRequest.id, input.signatureRequestId))
        .limit(1);

      if (!sigReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature request not found' });
      if (sigReq.status !== 'completed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Signature not yet completed' });

      const adapter = getAdapter(sigReq.provider as ESignProvider);
      const { url } = await adapter.downloadSignedFile(sigReq.externalId);
      return { url };
    }),

  auditTrail: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const authCtx = ctx as unknown as AuthenticatedContext;

      const rows = await authCtx.db
        .select()
        .from(docAuditTrail)
        .where(eq(docAuditTrail.docDocumentId, input.documentId))
        .orderBy(desc(docAuditTrail.occurredAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        occurredAt: r.occurredAt.toISOString(),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        geolocation: r.geolocation,
        biometricConsent: r.biometricConsent,
        certificateSerial: r.certificateSerial,
        certificateUrl: r.certificateUrl,
        providerEventId: r.providerEventId,
        metadata: r.metadata,
      }));
    }),
});
