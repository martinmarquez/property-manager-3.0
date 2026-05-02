import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import {
  createNodeDb,
  setTenantContext,
  docSignatureRequest,
  docSigner,
  docDocument,
  docAuditTrail,
} from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';
import {
  type EsignWebhookJobData,
  SignaturitAdapter,
  DocuSignAdapter,
  registerAdapter,
  getAdapter,
} from '@corredor/documents';

interface ProviderConfigs {
  signaturit?: { apiKey: string; baseUrl: string } | undefined;
  docusign?: { integrationKey: string; secretKey: string; accountId: string } | undefined;
}

export class DocSignWebhookWorker extends BaseWorker<EsignWebhookJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;
  private adaptersInitialized = false;
  private readonly providerConfigs: ProviderConfigs;

  constructor(redis: Redis, databaseUrl: string, configs: ProviderConfigs) {
    super(QUEUE_NAMES.DOC_SIGN_WEBHOOK, { redis });
    this.db = createNodeDb(databaseUrl);
    this.providerConfigs = configs;
  }

  private ensureAdapters(): void {
    if (this.adaptersInitialized) return;
    if (this.providerConfigs.signaturit) {
      registerAdapter(new SignaturitAdapter(this.providerConfigs.signaturit));
    }
    if (this.providerConfigs.docusign) {
      registerAdapter(new DocuSignAdapter(this.providerConfigs.docusign));
    }
    this.adaptersInitialized = true;
  }

  protected async process(job: Job<EsignWebhookJobData, void>): Promise<void> {
    this.ensureAdapters();

    const { provider, payload } = job.data;
    const adapter = getAdapter(provider);
    const event = adapter.parseWebhook(payload);

    // Lookup signature request by provider + external_id (bypasses RLS — db owner role)
    const [sigReq] = await this.db
      .select()
      .from(docSignatureRequest)
      .where(
        and(
          eq(docSignatureRequest.provider, provider),
          eq(docSignatureRequest.externalId, event.externalId),
        ),
      )
      .limit(1);

    if (!sigReq) {
      this.logger.warn('signature request not found', {
        provider,
        externalId: event.externalId,
      });
      return;
    }

    // All tenant-scoped mutations within a transaction with RLS
    await this.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setTenantContext(tx as any, sigReq.tenantId);

      // Write audit trail entry (append-only, Ley 25.506)
      await tx.insert(docAuditTrail).values({
        tenantId: sigReq.tenantId,
        docDocumentId: sigReq.docDocumentId,
        signatureRequestId: sigReq.id,
        signerId: event.signerExternalId
          ? await this.findSignerByExternalId(tx, sigReq.id, event.signerExternalId)
          : null,
        eventType: event.eventType,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        geolocation: event.geolocation ?? null,
        biometricConsent: event.biometricConsent ?? null,
        certificateSerial: event.certificateSerial ?? null,
        certificateUrl: event.certificateUrl ?? null,
        providerEventId: event.providerEventId ?? null,
        occurredAt: new Date(event.occurredAt),
        metadata: event.rawPayload,
      });

      // Update signer status if this is a per-signer event
      if (event.signerExternalId && event.signerStatus) {
        await tx
          .update(docSigner)
          .set({
            status: event.signerStatus,
            ...(event.signerStatus === 'signed' ? { signedAt: new Date(event.occurredAt) } : {}),
            ...(event.signerStatus === 'declined'
              ? { declinedAt: new Date(event.occurredAt) }
              : {}),
          })
          .where(
            and(
              eq(docSigner.signatureRequestId, sigReq.id),
              eq(docSigner.externalSignerId, event.signerExternalId),
            ),
          );
      }

      // Update request-level status
      if (event.requestStatus) {
        await tx
          .update(docSignatureRequest)
          .set({ status: event.requestStatus })
          .where(eq(docSignatureRequest.id, sigReq.id));

        // If completed or cancelled, update the parent document
        if (event.requestStatus === 'completed') {
          await tx
            .update(docDocument)
            .set({
              status: 'signed',
              signedAt: new Date(event.occurredAt),
              signedFileUrl: event.signedFileUrl ?? null,
            })
            .where(eq(docDocument.id, sigReq.docDocumentId));
        } else if (event.requestStatus === 'cancelled' || event.requestStatus === 'declined') {
          await tx
            .update(docDocument)
            .set({ status: 'cancelled' })
            .where(eq(docDocument.id, sigReq.docDocumentId));
        }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async findSignerByExternalId(tx: any, requestId: string, externalSignerId: string): Promise<string | null> {
    const [signer] = await tx
      .select({ id: docSigner.id })
      .from(docSigner)
      .where(
        and(
          eq(docSigner.signatureRequestId, requestId),
          eq(docSigner.externalSignerId, externalSignerId),
        ),
      )
      .limit(1);
    return signer?.id ?? null;
  }
}
