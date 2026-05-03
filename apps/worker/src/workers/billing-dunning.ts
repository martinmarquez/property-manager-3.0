import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createNodeDb, subscription, tenant } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES, createQueue } from '@corredor/core';
import type Redis from 'ioredis';

interface DunningJobData {
  tenantId: string;
  subscriptionId: string;
  attempt: number;
  startedAt: string; // ISO timestamp of when dunning began
}

const GRACE_PERIOD_DAYS = 3;

export class BillingDunningWorker extends BaseWorker<DunningJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.BILLING_DUNNING, { redis, concurrency: 2 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<DunningJobData, void>): Promise<void> {
    const { tenantId, subscriptionId, attempt, startedAt } = job.data;

    const [sub] = await this.db
      .select()
      .from(subscription)
      .where(eq(subscription.id, subscriptionId))
      .limit(1);

    if (!sub) {
      this.logger.info('Subscription not found, stopping dunning', { subscriptionId });
      return;
    }

    // If subscription recovered (payment received), stop dunning
    if (sub.status === 'active') {
      this.logger.info('Subscription recovered during dunning', { subscriptionId });
      return;
    }

    // If already cancelled/paused by another process, stop
    if (sub.status === 'cancelled' || sub.status === 'paused') {
      this.logger.info('Subscription already terminated, stopping dunning', { subscriptionId, status: sub.status });
      return;
    }

    const dunningStart = new Date(startedAt || job.timestamp);
    const daysSinceDunning = Math.floor(
      (Date.now() - dunningStart.getTime()) / 86_400_000,
    );

    if (daysSinceDunning >= GRACE_PERIOD_DAYS) {
      // Grace period exhausted — pause subscription
      await this.db
        .update(subscription)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, subscriptionId));

      // Downgrade tenant to trial
      await this.db
        .update(tenant)
        .set({ planCode: 'trial' })
        .where(eq(tenant.id, tenantId));

      await this.sendDunningEmail(tenantId, 'suspended');
      this.logger.info('Subscription paused after dunning grace period', { subscriptionId });
      return;
    }

    // Send reminder email based on attempt
    if (attempt === 1) {
      await this.sendDunningEmail(tenantId, 'reminder_day1');
    } else if (attempt >= 2) {
      await this.sendDunningEmail(tenantId, 'reminder_day3');
    }

    // Schedule next check in 24h
    const queue = createQueue(QUEUE_NAMES.BILLING_DUNNING, this.redis);
    await queue.add(
      `dunning-attempt-${attempt + 1}`,
      {
        tenantId,
        subscriptionId,
        attempt: attempt + 1,
        startedAt: startedAt || dunningStart.toISOString(),
      },
      { delay: 86_400_000 },
    );
    await queue.close();
  }

  private async sendDunningEmail(
    tenantId: string,
    emailType: 'reminder_day1' | 'reminder_day3' | 'suspended',
  ): Promise<void> {
    const [t] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, tenantId))
      .limit(1);

    if (!t) return;

    // TODO: Integrate with SES/Postmark email service
    this.logger.info('Dunning email queued', {
      tenantId,
      tenantName: t.name,
      emailType,
    });
  }
}
