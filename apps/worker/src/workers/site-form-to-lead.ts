import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { createNodeDb, setTenantContext, contact, lead, pipeline, pipelineStage, siteFormSubmission } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface SiteFormToLeadJobData {
  tenantId: string;
  submissionId: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  propertyId?: string;
}

export class SiteFormToLeadWorker extends BaseWorker<SiteFormToLeadJobData, void> {
  private readonly databaseUrl: string;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.SITE_FORM_TO_LEAD, { redis, concurrency: 10 });
    this.databaseUrl = databaseUrl;
  }

  protected async process(job: Job<SiteFormToLeadJobData>): Promise<void> {
    const { tenantId, submissionId, name, email, phone, message, propertyId } = job.data;
    const db = createNodeDb(this.databaseUrl);

    await db.transaction(async (tx) => {
      await setTenantContext(tx as never, tenantId, tenantId);

      // Find or create contact
      let contactId: string | undefined;

      if (email) {
        const [existing] = await tx
          .select({ id: contact.id })
          .from(contact)
          .where(and(
            eq(contact.tenantId, tenantId),
            eq(contact.kind, 'person'),
          ))
          .limit(1);

        if (existing) {
          contactId = existing.id;
        }
      }

      if (!contactId) {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] ?? name;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        const phones = phone ? [{ e164: phone, type: 'mobile', whatsapp: false, primary: true }] : [];
        const emails = email ? [{ value: email, type: 'personal', primary: true }] : [];

        const [created] = await tx
          .insert(contact)
          .values({
            tenantId,
            kind: 'person',
            firstName,
            lastName,
            phones,
            emails,
            source: 'website_form',
          })
          .returning();

        contactId = created!.id;
      }

      // Find default pipeline + first open stage for lead creation
      const [defaultPipeline] = await tx
        .select()
        .from(pipeline)
        .where(and(eq(pipeline.tenantId, tenantId), eq(pipeline.isDefault, true)))
        .limit(1);

      if (defaultPipeline) {
        const [firstStage] = await tx
          .select()
          .from(pipelineStage)
          .where(and(
            eq(pipelineStage.pipelineId, defaultPipeline.id),
            eq(pipelineStage.kind, 'open'),
          ))
          .limit(1);

        if (firstStage) {
          const [createdLead] = await tx
            .insert(lead)
            .values({
              tenantId,
              pipelineId:   defaultPipeline.id,
              stageId:      firstStage.id,
              contactId:    contactId!,
              propertyId:   propertyId ?? null,
              title:        message ? message.slice(0, 200) : `Consulta web: ${name}`,
              stageEnteredAt: new Date(),
            })
            .returning();

          // Link lead back to submission
          await tx
            .update(siteFormSubmission)
            .set({
              contactId: contactId!,
              leadId:    createdLead!.id,
              processedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(siteFormSubmission.id, submissionId));

          this.logger.info('form-to-lead completed', {
            submissionId,
            contactId: contactId!,
            leadId: createdLead!.id,
          });
          return;
        }
      }

      // No default pipeline — still link contact
      await tx
        .update(siteFormSubmission)
        .set({
          contactId: contactId!,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(siteFormSubmission.id, submissionId));

      this.logger.info('form-to-contact completed (no default pipeline)', {
        submissionId,
        contactId: contactId!,
      });
    });
  }
}
