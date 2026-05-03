/**
 * BullMQ queue definitions for Corredor.
 *
 * All queue names and their priorities are defined here as a single source of
 * truth. Workers and job producers import from this module to avoid string
 * typos and ensure consistent queue configuration.
 *
 * Priority levels (lower number = higher priority in BullMQ):
 *   1 = critical, 2 = high, 3 = medium, 4 = low
 */

import { Queue, type QueueOptions } from "bullmq";
import type { Redis } from "ioredis";

// ---------------------------------------------------------------------------
// Queue name constants
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  // Portal sync — high priority
  PORTAL_PUBLISH: "portal-publish",
  PORTAL_UPDATE: "portal-update",
  PORTAL_UNPUBLISH: "portal-unpublish",
  PORTAL_SYNC: "portal-sync",
  PORTAL_LEADS: "portal-leads",

  // Inbox — high priority
  INBOX_INGEST: "inbox-ingest",
  INBOX_SEND: "inbox-send",

  // AI pipeline — medium priority
  AI_EMBED: "ai-embed",
  AI_CHUNK_UPSERT: "ai-chunk-upsert",
  RAG_INGEST: "rag-ingest",

  // Document — medium priority
  DOC_GENERATE: "doc-generate",
  DOC_SIGN_WEBHOOK: "doc-sign-webhook",

  // Import — medium priority
  IMPORT_CSV: "import-csv",

  // Sitio (website builder) — high/medium priority
  SITE_FORM_TO_LEAD: "site-form-to-lead",
  SITE_REVALIDATE: "site-revalidate",
  SITE_DOMAIN_SSL_POLL: "site-domain-ssl-poll",

  // Billing — high priority
  BILLING_STRIPE_WEBHOOK: "billing-stripe-webhook",
  BILLING_MP_WEBHOOK: "billing-mp-webhook",
  BILLING_AFIP_INVOICE: "billing-afip-invoice",
  BILLING_AFIP_PDF: "billing-afip-pdf",
  BILLING_DUNNING: "billing-dunning",
  BILLING_USAGE_REFRESH: "billing-usage-refresh",

  // Appraisals — medium priority
  APPRAISAL_AI_NARRATIVE: "appraisal-ai-narrative",
  APPRAISAL_PDF_GENERATE: "appraisal-pdf-generate",

  // Marketing — low priority
  CAMPAIGN_SEND: "campaign-send",
  NURTURE_STEP: "nurture-step",

  // Reports — medium priority
  REPORT_EXPORT: "report-export",
  ANALYTICS_DIGEST: "analytics-digest",

  // Maintenance — low priority
  CLEANUP: "cleanup",
  ANALYTICS_REFRESH: "analytics-refresh",
  MV_REFRESH: "analytics-mv-refresh",

  // Dead-letter — catch-all for exhausted retries
  DEAD_LETTER: "dead-letter",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ---------------------------------------------------------------------------
// Priority constants (BullMQ: lower number = higher priority)
// ---------------------------------------------------------------------------

export const QUEUE_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

// ---------------------------------------------------------------------------
// Default retry backoff: exponential starting at 1m, up to 5 attempts
//
// BullMQ exponential: delay * 2^(attempt-1)
//   attempt 1: 60s  (1 min)
//   attempt 2: 120s (2 min)
//   attempt 3: 240s (4 min)
//   attempt 4: 480s (8 min)
//   attempt 5: 960s (16 min)
//
// For precise per-attempt delays (1m, 5m, 30m, 2h, 8h) register a custom
// backoff strategy at the Worker level via WorkerOptions.settings.backoffStrategy.
// ---------------------------------------------------------------------------

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 60_000, // base delay: 1 minute
  },
  removeOnComplete: { count: 100 },
  removeOnFail: false, // keep failed jobs so dead-letter worker can archive them
};

/**
 * Precise per-attempt backoff delays matching the architecture spec.
 * Register as WorkerOptions.settings.backoffStrategy in BaseWorker subclasses
 * that need exact timing (portal-sync, ai-embed).
 */
export const PRECISE_BACKOFF_DELAYS_MS = [
  1 * 60 * 1000,      // attempt 1: 1 minute
  5 * 60 * 1000,      // attempt 2: 5 minutes
  30 * 60 * 1000,     // attempt 3: 30 minutes
  2 * 60 * 60 * 1000, // attempt 4: 2 hours
  8 * 60 * 60 * 1000, // attempt 5: 8 hours
] as const;

/**
 * Custom backoff strategy function — pass to WorkerOptions.settings.backoffStrategy.
 * Falls back to exponential for attempt counts beyond the defined delays.
 */
export function preciseBackoffStrategy(attemptsMade: number): number {
  const idx = Math.min(attemptsMade - 1, PRECISE_BACKOFF_DELAYS_MS.length - 1);
  return PRECISE_BACKOFF_DELAYS_MS[idx] ?? PRECISE_BACKOFF_DELAYS_MS[PRECISE_BACKOFF_DELAYS_MS.length - 1] ?? 60_000;
}

// ---------------------------------------------------------------------------
// Queue metadata — priority & concurrency per queue
// ---------------------------------------------------------------------------

interface QueueMeta {
  priority: number;
  defaultConcurrency: number;
}

export const QUEUE_META: Record<QueueName, QueueMeta> = {
  [QUEUE_NAMES.PORTAL_PUBLISH]:   { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 5  },
  [QUEUE_NAMES.PORTAL_UPDATE]:    { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 10 },
  [QUEUE_NAMES.PORTAL_UNPUBLISH]: { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 5  },
  [QUEUE_NAMES.PORTAL_SYNC]:      { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 3  },
  [QUEUE_NAMES.PORTAL_LEADS]:     { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 10 },
  [QUEUE_NAMES.INBOX_INGEST]:     { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 20 },
  [QUEUE_NAMES.INBOX_SEND]:       { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 10 },
  [QUEUE_NAMES.AI_EMBED]:         { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 5  },
  [QUEUE_NAMES.AI_CHUNK_UPSERT]:  { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 5  },
  [QUEUE_NAMES.RAG_INGEST]:       { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.DOC_GENERATE]:     { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.DOC_SIGN_WEBHOOK]: { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 5  },
  [QUEUE_NAMES.IMPORT_CSV]:       { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.SITE_FORM_TO_LEAD]:   { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 10 },
  [QUEUE_NAMES.SITE_REVALIDATE]:     { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 5  },
  [QUEUE_NAMES.SITE_DOMAIN_SSL_POLL]:{ priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.BILLING_STRIPE_WEBHOOK]: { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 5  },
  [QUEUE_NAMES.BILLING_MP_WEBHOOK]:     { priority: QUEUE_PRIORITY.HIGH,   defaultConcurrency: 5  },
  [QUEUE_NAMES.BILLING_AFIP_INVOICE]:   { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.BILLING_AFIP_PDF]:       { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 2  },
  [QUEUE_NAMES.BILLING_DUNNING]:        { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 2  },
  [QUEUE_NAMES.BILLING_USAGE_REFRESH]:  { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 1  },
  [QUEUE_NAMES.APPRAISAL_AI_NARRATIVE]: { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.APPRAISAL_PDF_GENERATE]: { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 2  },
  [QUEUE_NAMES.REPORT_EXPORT]:       { priority: QUEUE_PRIORITY.MEDIUM, defaultConcurrency: 3  },
  [QUEUE_NAMES.ANALYTICS_DIGEST]:    { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 2  },
  [QUEUE_NAMES.CAMPAIGN_SEND]:    { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 2  },
  [QUEUE_NAMES.NURTURE_STEP]:     { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 2  },
  [QUEUE_NAMES.CLEANUP]:          { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 1  },
  [QUEUE_NAMES.ANALYTICS_REFRESH]:{ priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 1  },
  [QUEUE_NAMES.MV_REFRESH]:       { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 3  },
  [QUEUE_NAMES.DEAD_LETTER]:      { priority: QUEUE_PRIORITY.LOW,    defaultConcurrency: 1  },
};

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

/**
 * Creates a typed BullMQ Queue instance for the given queue name.
 * All queues share the same Redis connection and default retry config.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createQueue<TJobData = unknown, TJobResult = unknown>(
  name: QueueName,
  redis: Redis,
  opts?: Partial<QueueOptions>
): Queue<TJobData, TJobResult, string> {
  return new Queue<TJobData, TJobResult, string>(name, {
    connection: redis,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...opts,
  }) as Queue<TJobData, TJobResult, string>;
}
