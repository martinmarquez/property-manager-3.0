import type { Job } from 'bullmq';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface RagIngestJobData {
  tenantId: string;
  /** The kind of entity being ingested into the RAG pipeline. */
  entityType: 'property' | 'contact' | 'document';
  entityId: string;
  /** Optional: force re-embed even if the entity hasn't changed. */
  force?: boolean;
}

export class RagIngestWorker extends BaseWorker<RagIngestJobData, void> {
  constructor(redis: Redis) {
    super(QUEUE_NAMES.RAG_INGEST, { redis, concurrency: 3 });
  }

  // Phase F implementation: chunk → embed (text-embedding-3-small) → upsert pgvector
  protected async process(job: Job<RagIngestJobData>): Promise<void> {
    const { tenantId, entityType, entityId } = job.data;
    this.logger.info('rag_ingest.received', { tenantId, entityType, entityId });
    // TODO(RENA-F): implement chunking, OpenAI embedding call, and pgvector upsert
    throw new Error('RagIngestWorker not yet implemented — Phase F feature work pending');
  }
}
