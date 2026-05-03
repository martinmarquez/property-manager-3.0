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
import { createMailer } from '@corredor/core';
import { ImportCsvWorker } from './workers/import-csv.js';
import { ImportContactsCsvWorker } from './workers/import-contacts-csv.js';
import { DocSignWebhookWorker } from './workers/doc-sign-webhook.js';
import { createDocGenerateWorker } from './workers/doc-generate.js';
import { RagIngestWorker } from './workers/rag-ingest.js';
import { AnalyticsDigestWorker } from './workers/analytics-digest.js';
import { MvRefreshWorker } from './workers/mv-refresh.js';
import { SiteFormToLeadWorker } from './workers/site-form-to-lead.js';
import { SiteRevalidateWorker } from './workers/site-revalidate.js';
import { SiteDomainSslPollWorker } from './workers/site-domain-ssl-poll.js';
import { BillingUsageRefreshWorker } from './workers/billing-usage-refresh.js';
import { BillingStripeWebhookWorker } from './workers/billing-stripe-webhook.js';
import { BillingMPWebhookWorker } from './workers/billing-mp-webhook.js';
import { BillingAfipInvoiceWorker } from './workers/billing-afip-invoice.js';
import { BillingDunningWorker } from './workers/billing-dunning.js';
import { createAppraisalPdfWorker } from './workers/appraisal-pdf.js';
import { createQueue, QUEUE_NAMES } from '@corredor/core';
import type { MvRefreshJobData } from '@corredor/core';

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

// Email transport — Mailhog in dev, SES SMTP in prod
const smtpHost = process.env['SMTP_HOST'];
const mailer = smtpHost
  ? createMailer({
      host: smtpHost,
      port: Number(process.env['SMTP_PORT'] ?? '1025'),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth: process.env['SMTP_USER']
        ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] ?? '' }
        : undefined,
      from: process.env['EMAIL_FROM'] ?? 'no-reply@corredor.local',
    })
  : null;
if (!mailer) {
  logger.warn('email transport disabled — SMTP_HOST not set');
}

// Phase G: Analytics digest worker — daily/weekly scheduled report email digests
const analyticsDigestWorker = new AnalyticsDigestWorker(redis, databaseUrl, mailer);

// Phase G: Sitio (website builder) workers
const siteFormToLeadWorker = new SiteFormToLeadWorker(redis, databaseUrl);
const siteRevalidateWorker = new SiteRevalidateWorker(redis);
const siteDomainSslPollWorker = new SiteDomainSslPollWorker(redis, databaseUrl);

// Phase G: Billing usage counter nightly refresh
const billingUsageRefreshWorker = new BillingUsageRefreshWorker(redis, databaseUrl);

// Phase G: Billing payment workers
const billingStripeWebhookWorker = new BillingStripeWebhookWorker(redis, databaseUrl);
const billingMPWebhookWorker = new BillingMPWebhookWorker(redis, databaseUrl, process.env['MP_ACCESS_TOKEN']);
const billingAfipInvoiceWorker = new BillingAfipInvoiceWorker(redis, databaseUrl, {
  cuit: process.env['AFIP_CUIT'] ?? '',
  privateKey: process.env['AFIP_PRIVATE_KEY'] ?? '',
  certificate: process.env['AFIP_CERTIFICATE'] ?? '',
  sandbox: process.env['AFIP_SANDBOX'] !== 'false',
});
const billingDunningWorker = new BillingDunningWorker(redis, databaseUrl);

// Phase G: Appraisal PDF generation worker — Playwright HTML→PDF, R2 upload, presigned URLs
const appraisalPdfWorker = createAppraisalPdfWorker(redis);
if (!appraisalPdfWorker) {
  logger.warn('appraisal-pdf worker disabled — CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set');
}

// Phase G: Analytics MV refresh worker — event-driven + scheduled CONCURRENT refresh
const mvRefreshWorker = new MvRefreshWorker(redis, databaseUrl);

const activeQueues = ['import-csv', 'import-contacts-csv', 'doc-sign-webhook', 'analytics-digest', 'site-form-to-lead', 'site-revalidate', 'site-domain-ssl-poll', 'billing-usage-refresh', 'billing-stripe-webhook', 'billing-mp-webhook', 'billing-afip-invoice', 'billing-dunning', 'analytics-mv-refresh'];
if (docGenerateWorker) activeQueues.push('doc-generate');
if (ragIngestWorker) activeQueues.push('rag-ingest');
if (appraisalPdfWorker) activeQueues.push('appraisal-pdf-generate');
logger.info('worker ready', { queues: activeQueues });

// Register BullMQ repeatable cron jobs for scheduled MV refresh
void (async () => {
  const mvRefreshQueue = createQueue<MvRefreshJobData>(QUEUE_NAMES.MV_REFRESH, redis);
  const hourlyMvs = ['mv_pipeline_conversion', 'mv_listing_performance', 'mv_agent_productivity', 'mv_zone_heatmap', 'mv_sla_adherence'] as const;
  const nightlyMvs = ['mv_portal_roi', 'mv_revenue_forecast', 'mv_retention_cohort', 'mv_ai_usage_value', 'mv_commission_owed'] as const;
  for (const mvName of hourlyMvs) {
    await mvRefreshQueue.add('mv-refresh', { mvName, tenantId: 'system' }, {
      jobId: `cron:${mvName}:hourly`,
      repeat: { pattern: '0 * * * *' },
      removeOnComplete: { count: 24 },
      removeOnFail: false,
    });
  }
  for (const mvName of nightlyMvs) {
    await mvRefreshQueue.add('mv-refresh', { mvName, tenantId: 'system' }, {
      jobId: `cron:${mvName}:nightly`,
      repeat: { pattern: '0 3 * * *' },
      removeOnComplete: { count: 7 },
      removeOnFail: false,
    });
  }
  logger.info('mv-refresh cron jobs registered', { hourly: hourlyMvs.length, nightly: nightlyMvs.length });
})();

void importCsvWorker;
void importContactsCsvWorker;
void docSignWebhookWorker;
void docGenerateWorker;
void ragIngestWorker;
void analyticsDigestWorker;
void siteFormToLeadWorker;
void siteRevalidateWorker;
void siteDomainSslPollWorker;
void billingUsageRefreshWorker;
void billingStripeWebhookWorker;
void billingMPWebhookWorker;
void billingAfipInvoiceWorker;
void billingDunningWorker;
void appraisalPdfWorker;
void mvRefreshWorker;
