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

logger.info('worker starting');

// TODO Phase D: wire up BullMQ workers
