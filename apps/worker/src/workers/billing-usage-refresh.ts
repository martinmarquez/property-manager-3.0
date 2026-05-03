import { sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { tenant } from '@corredor/db';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface BillingUsageRefreshJobData {
  tenantId?: string;
}

export class BillingUsageRefreshWorker extends BaseWorker<BillingUsageRefreshJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.BILLING_USAGE_REFRESH, { redis, concurrency: 1 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<BillingUsageRefreshJobData>): Promise<void> {
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodStartIso = periodStart.toISOString();

    const tenantIds: string[] = job.data.tenantId
      ? [job.data.tenantId]
      : (
          await this.db
            .select({ id: tenant.id })
            .from(tenant)
            .where(sql`deleted_at IS NULL`)
        ).map((r) => r.id);

    job.log(`Refreshing usage counters for ${tenantIds.length} tenant(s)`);

    for (const tid of tenantIds) {
      await this.db.execute(sql`
        INSERT INTO usage_counter (tenant_id, counter_key, value, period_start, updated_at)
        VALUES (
          ${tid}::uuid,
          'user_count',
          (SELECT count(*) FROM "user" WHERE tenant_id = ${tid}::uuid AND active = true AND deleted_at IS NULL),
          ${periodStartIso}::timestamptz,
          now()
        )
        ON CONFLICT (tenant_id, counter_key, period_start)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `);

      await this.db.execute(sql`
        INSERT INTO usage_counter (tenant_id, counter_key, value, period_start, updated_at)
        VALUES (
          ${tid}::uuid,
          'property_count',
          (SELECT count(*) FROM property WHERE tenant_id = ${tid}::uuid AND deleted_at IS NULL),
          ${periodStartIso}::timestamptz,
          now()
        )
        ON CONFLICT (tenant_id, counter_key, period_start)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `);
    }

    job.log(`Done — refreshed user_count + property_count for ${tenantIds.length} tenant(s)`);
  }
}
