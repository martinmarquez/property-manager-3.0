import dns from 'node:dns/promises';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createNodeDb, siteDomain } from '@corredor/db';
import { BaseWorker, QUEUE_NAMES } from '@corredor/core';
import type Redis from 'ioredis';

const EXPECTED_CNAME_SUFFIX = '.corredor.app';

export interface SiteDomainSslPollJobData {
  tenantId: string;
  domainId: string;
  cfHostnameId: string | null;
}

export class SiteDomainSslPollWorker extends BaseWorker<SiteDomainSslPollJobData, void> {
  private readonly databaseUrl: string;

  constructor(redis: Redis, databaseUrl: string) {
    super(QUEUE_NAMES.SITE_DOMAIN_SSL_POLL, { redis, concurrency: 3 });
    this.databaseUrl = databaseUrl;
  }

  protected async process(job: Job<SiteDomainSslPollJobData>): Promise<void> {
    const { domainId, cfHostnameId } = job.data;

    if (!cfHostnameId) {
      this.logger.warn('SSL poll skipped — no Cloudflare hostname ID', { domainId });
      return;
    }

    const cfApiToken = process.env['CLOUDFLARE_API_TOKEN'];
    const cfZoneId = process.env['CLOUDFLARE_ZONE_ID'];

    if (!cfApiToken || !cfZoneId) {
      this.logger.warn('SSL poll skipped — Cloudflare credentials not set', { domainId });
      return;
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${cfHostnameId}`,
      {
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await res.json() as {
      success: boolean;
      result?: {
        status: string;
        ssl?: { status: string };
        verification_errors?: string[];
      };
    };

    if (!data.success || !data.result) {
      this.logger.warn('CF Custom Hostnames API error', { domainId, cfHostnameId });
      throw new Error('Cloudflare API returned unsuccessful response');
    }

    const r = data.result;
    const verified = r.status === 'active';
    const sslActive = r.ssl?.status === 'active';
    const error = r.verification_errors?.[0] ?? null;

    const db = createNodeDb(this.databaseUrl);

    // Fetch hostname for independent DNS verification
    const [domainRow] = await db
      .select({ hostname: siteDomain.hostname })
      .from(siteDomain)
      .where(eq(siteDomain.id, domainId));

    const updates: Record<string, unknown> = {
      lastPolledAt: new Date(),
      updatedAt:    new Date(),
    };

    if (verified) {
      updates.verifiedAt = new Date();
      updates.status = 'verifying';
    }

    if (sslActive) {
      // Independent CNAME verification before promoting to active
      let cnameValid = false;
      if (domainRow) {
        try {
          const cnames = await dns.resolveCname(domainRow.hostname);
          cnameValid = cnames.some(
            (c) => c.endsWith(EXPECTED_CNAME_SUFFIX) || c === 'cname.corredor.app',
          );
        } catch {
          // ENOTFOUND / ENODATA — CNAME not configured
        }
      }

      if (cnameValid) {
        updates.sslActiveAt = new Date();
        updates.status = 'active';
      } else {
        this.logger.warn('SSL active on Cloudflare but CNAME does not point to our edge', {
          domainId,
          hostname: domainRow?.hostname,
        });
        updates.errorMessage = 'CNAME does not resolve to corredor.app — verify your DNS configuration';
        updates.status = 'failed';
      }
    }

    if (error) {
      updates.errorMessage = error;
      updates.status = 'failed';
    }

    await db
      .update(siteDomain)
      .set(updates)
      .where(eq(siteDomain.id, domainId));

    this.logger.info('SSL poll completed', {
      domainId,
      verified,
      sslActive,
      cnameVerified: updates.status === 'active',
      status: updates.status ?? 'pending',
    });

    if (!sslActive && !error) {
      throw new Error('SSL not yet active — will retry');
    }
  }
}
