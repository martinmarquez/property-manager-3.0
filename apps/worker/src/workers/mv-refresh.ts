import { sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { createNodeDb } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type { MvRefreshJobData } from '@corredor/core';
import { REFRESHABLE_MVS } from '@corredor/core';
import type Redis from 'ioredis';

const MV_ALLOWSET = new Set<string>(REFRESHABLE_MVS);

export class MvRefreshWorker extends BaseWorker<MvRefreshJobData, void> {
  private readonly db: ReturnType<typeof createNodeDb>;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.MV_REFRESH, { redis, concurrency: 3 });
    this.db = createNodeDb(databaseUrl);
  }

  protected async process(job: Job<MvRefreshJobData>): Promise<void> {
    const { mvName, tenantId } = job.data;

    if (!MV_ALLOWSET.has(mvName)) {
      throw new Error(`Blocked: mvName "${mvName}" is not in the refresh allowlist`);
    }

    const qualifiedName = `analytics.${mvName}`;

    try {
      await this.db.execute(
        sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${qualifiedName}`),
      );
      this.logger.info('mv_refresh.done', { mv: qualifiedName, tenantId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('does not exist')) {
        this.logger.warn('mv_refresh.mv_missing', { mv: qualifiedName, tenantId });
        return;
      }
      if (msg.includes('does not have a unique index')) {
        this.logger.error('mv_refresh.missing_unique_index', { mv: qualifiedName, tenantId });
        throw err;
      }
      throw err;
    }
  }
}
