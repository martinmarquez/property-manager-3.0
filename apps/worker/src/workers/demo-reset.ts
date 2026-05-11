import { sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { tenant } from '@corredor/db';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';
import { execSync } from 'child_process';

export interface DemoResetJobData {
  tenantSlug?: string;
}

export class DemoResetWorker extends BaseWorker<DemoResetJobData, void> {
  constructor(redis: Redis) {
    super(QUEUE_NAMES.DEMO_RESET, { redis, concurrency: 1 });
  }

  protected async process(job: Job<DemoResetJobData>): Promise<void> {
    const slug = job.data.tenantSlug ?? 'demo';
    job.log(`Resetting demo tenant: ${slug}`);

    try {
      execSync(`pnpm --filter @corredor/seeder demo:reset -- --tenant ${slug}`, {
        stdio: 'pipe',
        timeout: 300_000,
      });
      job.log(`Demo tenant "${slug}" reset successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      job.log(`Demo reset failed: ${msg}`);
      throw err;
    }
  }
}
