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

logger.info('worker starting');

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const databaseUrl = process.env['DATABASE_URL'] ?? '';

const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

const importCsvWorker = new ImportCsvWorker(redis, databaseUrl);
logger.info('worker ready', { queues: ['import-csv'] });

void importCsvWorker;
