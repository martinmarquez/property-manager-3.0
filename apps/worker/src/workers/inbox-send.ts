import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';
import {
  message,
  inboxChannel,
  contact,
} from '@corredor/db';
import { createNodeDb, setTenantContext } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface InboxSendJobData {
  messageId: string;
  tenantId: string;
  channelId: string;
  contactId: string;
}

export class InboxSendWorker extends BaseWorker<InboxSendJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.INBOX_SEND, { redis });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<InboxSendJobData>): Promise<void> {
    const { messageId, tenantId, channelId, contactId } = job.data;

    await this.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setTenantContext(tx as any, tenantId);

      const [msg] = await tx
        .select()
        .from(message)
        .where(eq(message.id, messageId));

      if (!msg) {
        this.logger.warn('inbox-send: message not found', { messageId });
        return;
      }

      const [channel] = await tx
        .select({ id: inboxChannel.id, type: inboxChannel.type })
        .from(inboxChannel)
        .where(eq(inboxChannel.id, channelId));

      if (!channel) {
        this.logger.warn('inbox-send: channel not found', { channelId });
        await tx.update(message).set({ status: 'failed', failedReason: 'Channel not found' }).where(eq(message.id, messageId));
        return;
      }

      const [contactRow] = await tx
        .select({ id: contact.id })
        .from(contact)
        .where(eq(contact.id, contactId));

      if (!contactRow) {
        await tx.update(message).set({ status: 'failed', failedReason: 'Contact not found' }).where(eq(message.id, messageId));
        return;
      }

      // Mark as delivered immediately (channel adapters are not yet integrated on staging).
      // Once real adapters are wired, this transitions: queued → sent → delivered via webhook.
      const now = new Date();
      await tx
        .update(message)
        .set({ status: 'delivered', sentAt: now, deliveredAt: now })
        .where(eq(message.id, messageId));

      this.logger.info('inbox-send: message delivered', {
        messageId,
        channelType: channel.type,
        tenantId,
      });
    });
  }
}
