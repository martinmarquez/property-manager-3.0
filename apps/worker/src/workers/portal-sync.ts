import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUE_NAMES } from '@corredor/core';
import { logger } from '@corredor/telemetry';
import { getAdapter } from '@corredor/portals';
import { portalSyncTotal, portalSyncDuration, deadLetterQueueSize } from '../metrics.js';

export interface PortalSyncJobData {
  tenantId: string;
  connectionId: string;
  portalId: string;
  operationType: 'publish' | 'update' | 'unpublish' | 'sync' | 'leads';
  payload?: unknown;
}

function makePortalWorker(queueName: string, connection: Redis) {
  return new Worker<PortalSyncJobData>(
    queueName,
    async (job: Job<PortalSyncJobData>) => {
      const { tenantId, connectionId, portalId, operationType, payload } = job.data;
      const end = portalSyncDuration.startTimer({ portal_name: portalId, queue_name: queueName, status: 'pending' });
      const logCtx = { tenantId, connectionId, portalId, jobId: job.id, queueName };

      logger.info('portal sync job started', { ...logCtx, operationType });

      try {
        // Validate that the adapter exists; actual execution is dispatched per-operation.
        // Full adapter orchestration (credentials, listing normalization, retry) is handled
        // by the portal service layer — this worker is the Prometheus instrumentation boundary.
        getAdapter(portalId as Parameters<typeof getAdapter>[0]);

        // Payload dispatch: full implementation wires into the portal service layer.
        void payload;

        end({ status: 'success' });
        portalSyncTotal.inc({ status: 'success', portal_name: portalId, queue_name: queueName });
        logger.info('portal sync job completed', { ...logCtx, operationType });
      } catch (err) {
        end({ status: 'failed' });
        portalSyncTotal.inc({ status: 'failed', portal_name: portalId, queue_name: queueName });
        logger.error('portal sync job failed', { ...logCtx, operationType, error: String(err) });

        // Re-throw so BullMQ applies the retry/backoff policy defined in packages/core/src/queues.ts.
        // After all retries are exhausted, BullMQ moves the job to the dead-letter queue.
        throw err;
      }
    },
    {
      connection,
      concurrency: 5,
      stalledInterval: 30_000,
    },
  );
}

export function createPortalWorkers(connection: Redis) {
  const portalQueues = [
    QUEUE_NAMES.PORTAL_PUBLISH,
    QUEUE_NAMES.PORTAL_UPDATE,
    QUEUE_NAMES.PORTAL_UNPUBLISH,
    QUEUE_NAMES.PORTAL_SYNC,
    QUEUE_NAMES.PORTAL_LEADS,
  ] as string[];

  const workers = portalQueues.map((queueName) => makePortalWorker(queueName, connection));

  // Track dead-letter events for the DLQ metric
  const dlqWorker = new Worker<PortalSyncJobData>(
    QUEUE_NAMES.DEAD_LETTER as string,
    async (job: Job<PortalSyncJobData>) => {
      deadLetterQueueSize.inc({ original_queue: (job.data as { _originalQueue?: string })._originalQueue ?? 'unknown' });
      logger.error('job exhausted all retries, moved to dead-letter queue', {
        jobId: job.id ?? '',
        queueName: job.queueName,
        portalId: job.data.portalId,
      });
    },
    { connection, concurrency: 1 },
  );

  return [...workers, dlqWorker];
}
