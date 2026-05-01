// Telemetry must be initialized before all other imports so instrumentation patches apply.
import { initSentryNode, initOtel, logger } from '@corredor/telemetry';

initSentryNode({
  dsn: process.env.SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

initOtel({
  serviceName: 'corredor-worker',
  serviceVersion: process.env.SENTRY_RELEASE,
  environment: process.env.NODE_ENV ?? 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

// BullMQ worker entrypoint
// Queues: portal-publish, portal-update, portal-unpublish, portal-sync, portal-leads,
//         ai-embed, ai-eval, email-send, doc-pdf, import-csv

import Redis from 'ioredis';
import { ImportCsvWorker } from './workers/import-csv.js';
import { ImportContactsCsvWorker } from './workers/import-contacts-csv.js';
import { DocSignWebhookWorker } from './workers/doc-sign-webhook.js';
import { createDocGenerateWorker } from './workers/doc-generate.js';
import { RagIngestWorker } from './workers/rag-ingest.js';

logger.info('worker starting');

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const databaseUrl = process.env['DATABASE_URL'] ?? '';

const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

const importCsvWorker = new ImportCsvWorker(redis, databaseUrl);
const importContactsCsvWorker = new ImportContactsCsvWorker(redis, databaseUrl);

const docSignWebhookWorker = new DocSignWebhookWorker(redis, databaseUrl, {
  signaturit: process.env['SIGNATURIT_API_KEY']
    ? { apiKey: process.env['SIGNATURIT_API_KEY'], baseUrl: process.env['SIGNATURIT_BASE_URL'] ?? 'https://api.sandbox.signaturit.com' }
    : undefined,
  docusign: process.env['DOCUSIGN_INTEGRATION_KEY']
    ? {
        integrationKey: process.env['DOCUSIGN_INTEGRATION_KEY'],
        secretKey: process.env['DOCUSIGN_SECRET_KEY'] ?? '',
        accountId: process.env['DOCUSIGN_ACCOUNT_ID'] ?? '',
      }
    : undefined,
});

const docGenerateWorker = createDocGenerateWorker(redis);
if (!docGenerateWorker) {
  logger.warn('doc-generate worker disabled — CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set');
}

// Phase F: RAG ingest worker — chunk → embed → upsert pipeline
const ragIngestWorker = process.env['OPENAI_API_KEY']
  ? new RagIngestWorker(redis, databaseUrl, process.env['OPENAI_API_KEY'])
  : null;
if (!ragIngestWorker) {
  logger.warn('rag-ingest worker disabled — OPENAI_API_KEY not set');
}

const activeQueues = ['import-csv', 'import-contacts-csv', 'doc-sign-webhook'];
if (docGenerateWorker) activeQueues.push('doc-generate');
if (ragIngestWorker) activeQueues.push('rag-ingest');
logger.info('worker ready', { queues: activeQueues });

void importCsvWorker;
void importContactsCsvWorker;
void docSignWebhookWorker;
void docGenerateWorker;
void ragIngestWorker;
