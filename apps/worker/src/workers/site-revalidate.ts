import type { Job } from 'bullmq';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

export interface SiteRevalidateJobData {
  tenantId: string;
  siteId: string;
  pageId: string;
  slug: string;
}

export class SiteRevalidateWorker extends BaseWorker<SiteRevalidateJobData, void> {
  constructor(redis: Redis) {
    super(QUEUE_NAMES.SITE_REVALIDATE, { redis, concurrency: 5 });
  }

  protected async process(job: Job<SiteRevalidateJobData>): Promise<void> {
    const { tenantId, siteId, pageId, slug } = job.data;

    const cfApiToken = process.env['CLOUDFLARE_API_TOKEN'];
    const cfAccountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
    const pagesProject = process.env['CF_PAGES_PROJECT'] ?? 'corredor-tenant-sites';

    if (!cfApiToken || !cfAccountId) {
      this.logger.warn('ISR revalidation skipped — Cloudflare credentials not set', { tenantId, pageId });
      return;
    }

    // Purge cache by tag via Cloudflare Pages API
    const tags = [
      `site:${siteId}`,
      `page:${pageId}`,
      `tenant:${tenantId}`,
      `slug:${slug}`,
    ];

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProject}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn('CF Pages cache purge non-200', { status: res.status, body: text });

      // Fallback: purge by prefix URL
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProject}/purge_cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [`/${slug}`] }),
        },
      );
    }

    this.logger.info('ISR revalidation triggered', { siteId, pageId, slug, tags });
  }
}
