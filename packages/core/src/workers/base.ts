/**
 * BaseWorker — abstract BullMQ worker with standard Corredor infrastructure.
 *
 * Features:
 *  - Graceful shutdown (SIGTERM / SIGINT drains active jobs before exit)
 *  - Sentry error capture per failed job
 *  - OpenTelemetry span per job execution
 *  - Structured logging with job metadata
 *  - Configurable concurrency per queue
 *  - Dead-letter archiving on exhausted retries
 */

import {
  Worker,
  type Job,
  type WorkerOptions,
  type Processor,
} from "bullmq";
import * as Sentry from "@sentry/node";
import { trace, SpanStatusCode, type Tracer } from "@opentelemetry/api";
import type { Redis } from "ioredis";
import {
  QUEUE_META,
  QUEUE_NAMES,
  createQueue,
  type QueueName,
} from "../queues.js";

// ---------------------------------------------------------------------------
// Logger interface — consumers can inject pino or console
// ---------------------------------------------------------------------------

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: Logger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

// ---------------------------------------------------------------------------
// Dead-letter job payload
// ---------------------------------------------------------------------------

interface DeadLetterJobData {
  originalQueue: string;
  originalJobId: string | undefined;
  originalJobName: string;
  originalPayload: unknown;
  error: string;
  failedAt: string;
  attemptsMade: number;
}

// ---------------------------------------------------------------------------
// BaseWorker
// ---------------------------------------------------------------------------

export interface BaseWorkerOptions {
  redis: Redis;
  /** Override concurrency; defaults to QUEUE_META[queueName].defaultConcurrency */
  concurrency?: number;
  logger?: Logger;
  /** OpenTelemetry tracer name. Defaults to "@corredor/core/worker". */
  tracerName?: string;
}

export abstract class BaseWorker<
  TJobData = unknown,
  TJobResult = unknown
> {
  protected readonly worker: Worker<TJobData, TJobResult>;
  protected readonly logger: Logger;
  protected readonly tracer: Tracer;
  protected readonly redis: Redis;
  private readonly queueName: QueueName;
  private isShuttingDown = false;

  constructor(queueName: QueueName, opts: BaseWorkerOptions) {
    this.queueName = queueName;
    this.redis = opts.redis;
    this.logger = opts.logger ?? defaultLogger;
    this.tracer = trace.getTracer(
      opts.tracerName ?? "@corredor/core/worker"
    );

    const meta = QUEUE_META[queueName];
    const concurrency = opts.concurrency ?? meta.defaultConcurrency;

    const workerOpts: WorkerOptions = {
      connection: opts.redis,
      concurrency,
      // BullMQ stalledInterval: how often to check for stalled jobs (ms)
      stalledInterval: 30_000,
      // Max time a job can be active before being considered stalled (ms)
      maxStalledCount: 2,
    };

    this.worker = new Worker<TJobData, TJobResult>(
      queueName,
      this.createProcessor(),
      workerOpts
    );

    this.attachLifecycleHandlers();
    this.registerShutdownHandlers();
  }

  /**
   * Implement this in subclasses: the core job logic.
   * Throw to signal failure; BullMQ will retry according to the queue config.
   */
  protected abstract process(job: Job<TJobData, TJobResult>): Promise<TJobResult>;

  private createProcessor(): Processor<TJobData, TJobResult> {
    return async (job: Job<TJobData, TJobResult>): Promise<TJobResult> => {
      const span = this.tracer.startSpan(`worker.${this.queueName}`, {
        attributes: {
          "job.id": job.id ?? "unknown",
          "job.name": job.name,
          "job.queue": this.queueName,
          "job.attempts": job.attemptsMade,
        },
      });

      const startTime = Date.now();

      this.logger.info("job.started", {
        queue: this.queueName,
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade + 1,
      });

      try {
        const result = await this.process(job);

        const duration = Date.now() - startTime;
        this.logger.info("job.completed", {
          queue: this.queueName,
          jobId: job.id,
          jobName: job.name,
          durationMs: duration,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        const error = err instanceof Error ? err : new Error(String(err));

        this.logger.error("job.failed", {
          queue: this.queueName,
          jobId: job.id,
          jobName: job.name,
          durationMs: duration,
          attempt: job.attemptsMade + 1,
          error: error.message,
        });

        Sentry.captureException(error, {
          tags: {
            queue: this.queueName,
            jobId: job.id ?? "unknown",
            jobName: job.name,
          },
          extra: {
            jobData: job.data,
            attemptsMade: job.attemptsMade,
          },
        });

        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

        throw error;
      } finally {
        span.end();
      }
    };
  }

  private attachLifecycleHandlers(): void {
    this.worker.on("failed", async (job, err) => {
      if (!job) return;

      // If this is the final attempt, archive to dead-letter queue
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade >= maxAttempts) {
        await this.archiveToDeadLetter(job, err);
      }
    });

    this.worker.on("error", (err) => {
      this.logger.error("worker.error", { queue: this.queueName, error: err.message });
      Sentry.captureException(err, { tags: { queue: this.queueName } });
    });
  }

  private async archiveToDeadLetter(
    job: Job<TJobData>,
    err: Error
  ): Promise<void> {
    try {
      const dlQueue = createQueue<DeadLetterJobData>(
        QUEUE_NAMES.DEAD_LETTER,
        this.redis
      );

      await dlQueue.add("archive", {
        originalQueue: this.queueName,
        originalJobId: job.id,
        originalJobName: job.name,
        originalPayload: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
      });

      await dlQueue.close();

      this.logger.warn("job.dead_lettered", {
        queue: this.queueName,
        jobId: job.id,
        jobName: job.name,
        error: err.message,
      });
    } catch (archiveErr) {
      this.logger.error("dead_letter.archive_failed", {
        queue: this.queueName,
        jobId: job.id,
        error: archiveErr instanceof Error ? archiveErr.message : String(archiveErr),
      });
    }
  }

  private registerShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      this.logger.info("worker.shutdown_initiated", {
        queue: this.queueName,
        signal,
      });

      try {
        // Close worker gracefully — waits for active jobs to finish
        await this.worker.close();
        this.logger.info("worker.shutdown_complete", { queue: this.queueName });
      } catch (err) {
        this.logger.error("worker.shutdown_error", {
          queue: this.queueName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  }

  /** Close the underlying BullMQ worker (useful in tests). */
  async close(): Promise<void> {
    await this.worker.close();
  }

  /** Pause the worker — stops picking up new jobs. */
  async pause(): Promise<void> {
    await this.worker.pause();
  }

  /** Resume a paused worker. */
  async resume(): Promise<void> {
    this.worker.resume();
  }
}
