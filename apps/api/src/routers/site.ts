/**
 * Sitio (Website Builder) router — RENA-139
 *
 * 23 procedures covering:
 *   Site CRUD:            create, get, update, delete
 *   Page CRUD:            pages.list, pages.get, pages.create, pages.update, pages.delete
 *   Page publish:         pages.publish, pages.unpublish
 *   Publish history:      pages.publishHistory, pages.rollback
 *   Domain management:    domains.list, domains.add, domains.verify, domains.remove
 *   Form submissions:     forms.list, forms.get, forms.markContacted, forms.markSpam, forms.submit (public)
 *   Public listing feed:  publicListingFeed
 *   Themes:               themes.list
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, asc, desc, sql, gte, lte } from 'drizzle-orm';
import {
  site,
  sitePage,
  sitePageSnapshot,
  siteDomain,
  siteFormSubmission,
  siteTheme,
  property,
  contact,
} from '@corredor/db';
import { router, protectedProcedure, publicProcedure, withFeatureGate } from '../trpc.js';
import { QUEUE_NAMES } from '@corredor/core';

const siteProcedure = protectedProcedure.use(withFeatureGate('site_builder'));

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const SiteCreateInput = z.object({
  name:          z.string().min(1).max(200),
  subdomain:     z.string().min(3).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
  themeCode:     z.string().max(50).default('moderno'),
  brandSettings: z.record(z.unknown()).optional(),
});

const SiteUpdateInput = z.object({
  name:           z.string().min(1).max(200).optional(),
  themeCode:      z.string().max(50).optional(),
  brandSettings:  z.record(z.unknown()).optional(),
  customCss:      z.string().max(50_000).nullable().optional(),
  customHeadHtml: z.string().max(10_000).nullable().optional(),
});

const PageCreateInput = z.object({
  siteId:          z.string().uuid(),
  slug:            z.string().min(1).max(200).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
  title:           z.string().min(1).max(300),
  metaTitle:       z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImageUrl:      z.string().url().optional(),
  puckData:        z.record(z.unknown()).optional(),
});

const PageUpdateInput = z.object({
  id:              z.string().uuid(),
  slug:            z.string().min(1).max(200).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/).optional(),
  title:           z.string().min(1).max(300).optional(),
  metaTitle:       z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  ogImageUrl:      z.string().url().nullable().optional(),
  puckData:        z.record(z.unknown()).optional(),
});

const PageListInput = z.object({
  siteId: z.string().uuid(),
  status: z.enum(['draft', 'published']).optional(),
});

const DomainAddInput = z.object({
  siteId:   z.string().uuid(),
  hostname: z.string().min(4).max(253).regex(/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/),
});

const FormListInput = z.object({
  siteId:   z.string().uuid().optional(),
  status:   z.enum(['new', 'contacted', 'spam']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo:   z.string().date().optional(),
  limit:    z.number().int().min(1).max(100).default(50),
  cursor:   z.string().optional(),
});

const FormSubmitInput = z.object({
  siteId:         z.string().uuid(),
  pageId:         z.string().uuid().optional(),
  propertyId:     z.string().uuid().optional(),
  name:           z.string().min(1).max(200),
  email:          z.string().email().optional(),
  phone:          z.string().max(30).optional(),
  message:        z.string().max(2000).optional(),
  formData:       z.record(z.unknown()).optional(),
  recaptchaToken: z.string(),
});

const PublishHistoryInput = z.object({
  pageId: z.string().uuid(),
  limit:  z.number().int().min(1).max(50).default(20),
});

const PublicListingFeedInput = z.object({
  subdomain: z.string(),
  limit:     z.number().int().min(1).max(100).default(20),
  cursor:    z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper: verify site ownership
// ---------------------------------------------------------------------------

async function verifySiteOwnership(
  db: Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]['ctx']['db'],
  tenantId: string,
  siteId: string,
) {
  const [s] = await db
    .select({ id: site.id })
    .from(site)
    .where(and(eq(site.id, siteId), eq(site.tenantId, tenantId), isNull(site.deletedAt)));
  if (!s) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
  return s;
}

// ---------------------------------------------------------------------------
// Helper: verify reCAPTCHA v3 token
// ---------------------------------------------------------------------------

async function verifyRecaptcha(token: string): Promise<number> {
  const secret = process.env['RECAPTCHA_SECRET_KEY'];
  if (!secret) return 1.0; // bypass in dev

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json() as { success: boolean; score?: number };
  return data.success ? (data.score ?? 0) : 0;
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const pagesRouter = router({
  list: siteProcedure
    .input(PageListInput)
    .query(async ({ ctx, input }) => {
      await verifySiteOwnership(ctx.db, ctx.tenantId, input.siteId);

      const conditions = [
        eq(sitePage.siteId, input.siteId),
        eq(sitePage.tenantId, ctx.tenantId),
        isNull(sitePage.deletedAt),
      ];
      if (input.status) conditions.push(eq(sitePage.status, input.status));

      return ctx.db
        .select()
        .from(sitePage)
        .where(and(...conditions))
        .orderBy(asc(sitePage.slug));
    }),

  get: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.id),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
      return page;
    }),

  create: siteProcedure
    .input(PageCreateInput)
    .mutation(async ({ ctx, input }) => {
      await verifySiteOwnership(ctx.db, ctx.tenantId, input.siteId);

      const [existing] = await ctx.db
        .select({ id: sitePage.id })
        .from(sitePage)
        .where(and(
          eq(sitePage.siteId, input.siteId),
          eq(sitePage.slug, input.slug),
          isNull(sitePage.deletedAt),
        ));
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Slug already exists' });

      const [page] = await ctx.db
        .insert(sitePage)
        .values({
          tenantId:        ctx.tenantId,
          siteId:          input.siteId,
          slug:            input.slug,
          title:           input.title,
          metaTitle:       input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          ogImageUrl:      input.ogImageUrl ?? null,
          puckData:        input.puckData ?? {},
          createdBy:       ctx.userId,
          updatedBy:       ctx.userId,
        })
        .returning();

      return page!;
    }),

  update: siteProcedure
    .input(PageUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.id),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      if (input.slug && input.slug !== existing.slug) {
        const [dup] = await ctx.db
          .select({ id: sitePage.id })
          .from(sitePage)
          .where(and(
            eq(sitePage.siteId, existing.siteId),
            eq(sitePage.slug, input.slug),
            isNull(sitePage.deletedAt),
          ));
        if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'Slug already exists' });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.slug            !== undefined) updates.slug            = input.slug;
      if (input.title           !== undefined) updates.title           = input.title;
      if (input.metaTitle       !== undefined) updates.metaTitle       = input.metaTitle;
      if (input.metaDescription !== undefined) updates.metaDescription = input.metaDescription;
      if (input.ogImageUrl      !== undefined) updates.ogImageUrl      = input.ogImageUrl;
      if (input.puckData        !== undefined) updates.puckData        = input.puckData;

      const [updated] = await ctx.db
        .update(sitePage)
        .set(updates)
        .where(and(eq(sitePage.id, input.id), eq(sitePage.tenantId, ctx.tenantId)))
        .returning();

      return updated!;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.id),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      await ctx.db
        .update(sitePage)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId })
        .where(and(eq(sitePage.id, input.id), eq(sitePage.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  publish: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.id),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      const now = new Date();

      // Save snapshot for rollback history
      await ctx.db.insert(sitePageSnapshot).values({
        tenantId:        ctx.tenantId,
        pageId:          page.id,
        puckData:        page.puckData,
        metaTitle:       page.metaTitle,
        metaDescription: page.metaDescription,
        publishedBy:     ctx.userId,
        publishedAt:     now,
      });

      // Promote current puckData to published
      const [published] = await ctx.db
        .update(sitePage)
        .set({
          publishedPuckData: page.puckData,
          status:            'published',
          publishedAt:       now,
          updatedAt:         now,
          updatedBy:         ctx.userId,
          version:           page.version + 1,
        })
        .where(and(eq(sitePage.id, input.id), eq(sitePage.tenantId, ctx.tenantId)))
        .returning();

      // Enqueue ISR revalidation
      const queue = ctx.queues[QUEUE_NAMES.SITE_REVALIDATE];
      if (queue) {
        await queue.add('revalidate', {
          tenantId: ctx.tenantId,
          siteId:   page.siteId,
          pageId:   page.id,
          slug:     page.slug,
        });
      }

      return published!;
    }),

  unpublish: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.id),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      const [updated] = await ctx.db
        .update(sitePage)
        .set({
          publishedPuckData: null,
          status:            'draft',
          publishedAt:       null,
          updatedAt:         new Date(),
          updatedBy:         ctx.userId,
          version:           page.version + 1,
        })
        .where(and(eq(sitePage.id, input.id), eq(sitePage.tenantId, ctx.tenantId)))
        .returning();

      // Enqueue ISR revalidation to purge
      const queue = ctx.queues[QUEUE_NAMES.SITE_REVALIDATE];
      if (queue) {
        await queue.add('revalidate', {
          tenantId: ctx.tenantId,
          siteId:   page.siteId,
          pageId:   page.id,
          slug:     page.slug,
        });
      }

      return updated!;
    }),

  publishHistory: siteProcedure
    .input(PublishHistoryInput)
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select({ id: sitePage.id })
        .from(sitePage)
        .where(and(
          eq(sitePage.id, input.pageId),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      return ctx.db
        .select()
        .from(sitePageSnapshot)
        .where(eq(sitePageSnapshot.pageId, input.pageId))
        .orderBy(desc(sitePageSnapshot.publishedAt))
        .limit(input.limit);
    }),

  rollback: siteProcedure
    .input(z.object({ snapshotId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [snapshot] = await ctx.db
        .select()
        .from(sitePageSnapshot)
        .where(and(
          eq(sitePageSnapshot.id, input.snapshotId),
          eq(sitePageSnapshot.tenantId, ctx.tenantId),
        ));
      if (!snapshot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Snapshot not found' });

      const [page] = await ctx.db
        .select()
        .from(sitePage)
        .where(and(
          eq(sitePage.id, snapshot.pageId),
          eq(sitePage.tenantId, ctx.tenantId),
          isNull(sitePage.deletedAt),
        ));
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });

      const now = new Date();

      // Save current state as new snapshot before rolling back
      await ctx.db.insert(sitePageSnapshot).values({
        tenantId:        ctx.tenantId,
        pageId:          page.id,
        puckData:        page.puckData,
        metaTitle:       page.metaTitle,
        metaDescription: page.metaDescription,
        publishedBy:     ctx.userId,
        publishedAt:     now,
      });

      // Restore the snapshot content
      const [restored] = await ctx.db
        .update(sitePage)
        .set({
          puckData:          snapshot.puckData,
          publishedPuckData: snapshot.puckData,
          metaTitle:         snapshot.metaTitle,
          metaDescription:   snapshot.metaDescription,
          status:            'published',
          publishedAt:       now,
          updatedAt:         now,
          updatedBy:         ctx.userId,
          version:           page.version + 1,
        })
        .where(and(eq(sitePage.id, snapshot.pageId), eq(sitePage.tenantId, ctx.tenantId)))
        .returning();

      // Enqueue ISR revalidation
      const queue = ctx.queues[QUEUE_NAMES.SITE_REVALIDATE];
      if (queue) {
        await queue.add('revalidate', {
          tenantId: ctx.tenantId,
          siteId:   page.siteId,
          pageId:   page.id,
          slug:     page.slug,
        });
      }

      return restored!;
    }),
});

const domainsRouter = router({
  list: siteProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifySiteOwnership(ctx.db, ctx.tenantId, input.siteId);

      return ctx.db
        .select()
        .from(siteDomain)
        .where(and(
          eq(siteDomain.siteId, input.siteId),
          eq(siteDomain.tenantId, ctx.tenantId),
          isNull(siteDomain.deletedAt),
        ))
        .orderBy(asc(siteDomain.createdAt));
    }),

  add: siteProcedure
    .input(DomainAddInput)
    .mutation(async ({ ctx, input }) => {
      await verifySiteOwnership(ctx.db, ctx.tenantId, input.siteId);

      // Check uniqueness across all tenants
      const [existing] = await ctx.db
        .select({ id: siteDomain.id })
        .from(siteDomain)
        .where(and(eq(siteDomain.hostname, input.hostname), isNull(siteDomain.deletedAt)));
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Domain already registered' });
      }

      // Create Cloudflare Custom Hostname via API
      const cfResult = await createCloudflareHostname(input.hostname);

      const [domain] = await ctx.db
        .insert(siteDomain)
        .values({
          tenantId:             ctx.tenantId,
          siteId:               input.siteId,
          hostname:             input.hostname,
          dnsTarget:            cfResult.dnsTarget,
          cloudflareHostnameId: cfResult.hostnameId,
          status:               'pending',
          createdBy:            ctx.userId,
          updatedBy:            ctx.userId,
        })
        .returning();

      // Enqueue SSL polling
      const queue = ctx.queues[QUEUE_NAMES.SITE_DOMAIN_SSL_POLL];
      if (queue) {
        await queue.add('poll-ssl', {
          tenantId: ctx.tenantId,
          domainId: domain!.id,
          cfHostnameId: cfResult.hostnameId,
        }, {
          delay: 30_000,
          attempts: 60,
          backoff: { type: 'fixed', delay: 30_000 },
        });
      }

      return domain!;
    }),

  verify: siteProcedure
    .input(z.object({ domainId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [domain] = await ctx.db
        .select()
        .from(siteDomain)
        .where(and(
          eq(siteDomain.id, input.domainId),
          eq(siteDomain.tenantId, ctx.tenantId),
          isNull(siteDomain.deletedAt),
        ));
      if (!domain) throw new TRPCError({ code: 'NOT_FOUND', message: 'Domain not found' });

      if (!domain.cloudflareHostnameId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No Cloudflare hostname registered' });
      }

      const cfStatus = await pollCloudflareHostname(domain.cloudflareHostnameId);

      const updates: Record<string, unknown> = {
        status:       cfStatus.status,
        lastPolledAt: new Date(),
        updatedAt:    new Date(),
        updatedBy:    ctx.userId,
        version:      domain.version + 1,
      };

      if (cfStatus.verified) {
        updates.verifiedAt = new Date();
      }
      if (cfStatus.sslActive) {
        updates.sslActiveAt = new Date();
        updates.status = 'active';
      }
      if (cfStatus.error) {
        updates.errorMessage = cfStatus.error;
        updates.status = 'failed';
      }

      const [updated] = await ctx.db
        .update(siteDomain)
        .set(updates)
        .where(and(eq(siteDomain.id, input.domainId), eq(siteDomain.tenantId, ctx.tenantId)))
        .returning();

      return updated!;
    }),

  remove: siteProcedure
    .input(z.object({ domainId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [domain] = await ctx.db
        .select()
        .from(siteDomain)
        .where(and(
          eq(siteDomain.id, input.domainId),
          eq(siteDomain.tenantId, ctx.tenantId),
          isNull(siteDomain.deletedAt),
        ));
      if (!domain) throw new TRPCError({ code: 'NOT_FOUND', message: 'Domain not found' });

      // Delete from Cloudflare
      if (domain.cloudflareHostnameId) {
        await deleteCloudflareHostname(domain.cloudflareHostnameId);
      }

      await ctx.db
        .update(siteDomain)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId })
        .where(and(eq(siteDomain.id, input.domainId), eq(siteDomain.tenantId, ctx.tenantId)));

      return { success: true };
    }),
});

const formsRouter = router({
  list: siteProcedure
    .input(FormListInput)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(siteFormSubmission.tenantId, ctx.tenantId),
        isNull(siteFormSubmission.deletedAt),
      ];
      if (input.siteId) conditions.push(eq(siteFormSubmission.siteId, input.siteId));
      if (input.status) {
        if (input.status === 'spam') {
          conditions.push(eq(siteFormSubmission.flaggedAsSpam, true));
        } else if (input.status === 'new') {
          conditions.push(isNull(siteFormSubmission.processedAt));
          conditions.push(eq(siteFormSubmission.flaggedAsSpam, false));
        } else {
          conditions.push(sql`${siteFormSubmission.processedAt} IS NOT NULL`);
          conditions.push(eq(siteFormSubmission.flaggedAsSpam, false));
        }
      }
      if (input.dateFrom) conditions.push(gte(siteFormSubmission.createdAt, new Date(input.dateFrom)));
      if (input.dateTo)   conditions.push(lte(siteFormSubmission.createdAt, new Date(input.dateTo + 'T23:59:59.999Z')));

      if (input.cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8')) as { ts: string; id: string };
          conditions.push(
            sql`(${siteFormSubmission.createdAt}, ${siteFormSubmission.id}) < (${decoded.ts}::timestamptz, ${decoded.id}::uuid)`
          );
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
        }
      }

      const rows = await ctx.db
        .select({
          submission:    siteFormSubmission,
          contactName:   contact.firstName,
        })
        .from(siteFormSubmission)
        .leftJoin(contact, eq(siteFormSubmission.contactId, contact.id))
        .where(and(...conditions))
        .orderBy(desc(siteFormSubmission.createdAt), desc(siteFormSubmission.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const last = hasMore ? items[items.length - 1] : null;
      const nextCursor = last
        ? Buffer.from(JSON.stringify({
            ts: last.submission.createdAt instanceof Date ? last.submission.createdAt.toISOString() : last.submission.createdAt,
            id: last.submission.id,
          })).toString('base64')
        : null;

      return { items, nextCursor };
    }),

  get: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          submission:       siteFormSubmission,
          contactFirstName: contact.firstName,
          contactLastName:  contact.lastName,
          contactEmails:    contact.emails,
          contactPhones:    contact.phones,
        })
        .from(siteFormSubmission)
        .leftJoin(contact, eq(siteFormSubmission.contactId, contact.id))
        .where(and(
          eq(siteFormSubmission.id, input.id),
          eq(siteFormSubmission.tenantId, ctx.tenantId),
          isNull(siteFormSubmission.deletedAt),
        ));
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });
      return row;
    }),

  markContacted: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(siteFormSubmission)
        .where(and(
          eq(siteFormSubmission.id, input.id),
          eq(siteFormSubmission.tenantId, ctx.tenantId),
          isNull(siteFormSubmission.deletedAt),
        ));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });

      const [updated] = await ctx.db
        .update(siteFormSubmission)
        .set({
          processedAt: new Date(),
          updatedAt:   new Date(),
          updatedBy:   ctx.userId,
          version:     existing.version + 1,
        })
        .where(and(eq(siteFormSubmission.id, input.id), eq(siteFormSubmission.tenantId, ctx.tenantId)))
        .returning();

      return updated!;
    }),

  markSpam: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(siteFormSubmission)
        .where(and(
          eq(siteFormSubmission.id, input.id),
          eq(siteFormSubmission.tenantId, ctx.tenantId),
          isNull(siteFormSubmission.deletedAt),
        ));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });

      const [updated] = await ctx.db
        .update(siteFormSubmission)
        .set({
          flaggedAsSpam: true,
          updatedAt:     new Date(),
          updatedBy:     ctx.userId,
          version:       existing.version + 1,
        })
        .where(and(eq(siteFormSubmission.id, input.id), eq(siteFormSubmission.tenantId, ctx.tenantId)))
        .returning();

      return updated!;
    }),

  submit: publicProcedure
    .input(FormSubmitInput)
    .mutation(async ({ ctx, input }) => {
      // Verify reCAPTCHA v3 — reject below threshold 0.5
      const score = await verifyRecaptcha(input.recaptchaToken);
      if (score < 0.5) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'reCAPTCHA verification failed' });
      }

      // Look up site (RLS not active on public procedure; verify site exists)
      const [s] = await ctx.db
        .select({ id: site.id, tenantId: site.tenantId })
        .from(site)
        .where(and(eq(site.id, input.siteId), isNull(site.deletedAt)));
      if (!s) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

      const ip = ctx.c.req.header('CF-Connecting-IP')
        ?? ctx.c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
        ?? null;

      const [submission] = await ctx.db
        .insert(siteFormSubmission)
        .values({
          tenantId:       s.tenantId,
          siteId:         input.siteId,
          pageId:         input.pageId ?? null,
          data:           {
            name:       input.name,
            email:      input.email,
            phone:      input.phone,
            message:    input.message,
            propertyId: input.propertyId,
            ...input.formData,
          },
          ip,
          userAgent:      ctx.c.req.header('User-Agent') ?? null,
          recaptchaScore: String(score),
          flaggedAsSpam:  score < 0.5,
        })
        .returning();

      // Enqueue form-to-lead job
      const queue = ctx.queues[QUEUE_NAMES.SITE_FORM_TO_LEAD];
      if (queue) {
        await queue.add('form-to-lead', {
          tenantId:     s.tenantId,
          submissionId: submission!.id,
          name:         input.name,
          email:        input.email,
          phone:        input.phone,
          message:      input.message,
          propertyId:   input.propertyId,
        });
      }

      return { success: true, id: submission!.id };
    }),
});

const themesRouter = router({
  list: siteProcedure
    .query(async ({ ctx }) => {
      return ctx.db
        .select()
        .from(siteTheme)
        .orderBy(asc(siteTheme.code));
    }),
});

// ---------------------------------------------------------------------------
// Cloudflare Custom Hostnames API helpers
// ---------------------------------------------------------------------------

const CF_API = 'https://api.cloudflare.com/client/v4';

async function cfFetch(path: string, opts?: RequestInit) {
  const token = process.env['CLOUDFLARE_API_TOKEN'];
  const zoneId = process.env['CLOUDFLARE_ZONE_ID'];
  if (!token || !zoneId) {
    return { hostnameId: null, dnsTarget: 'cname.corredor.app', verified: false, sslActive: false, error: null, status: 'pending' as const };
  }

  const res = await fetch(`${CF_API}/zones/${zoneId}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  return res.json();
}

async function createCloudflareHostname(hostname: string) {
  const token = process.env['CLOUDFLARE_API_TOKEN'];
  if (!token) {
    return { hostnameId: null, dnsTarget: 'cname.corredor.app' };
  }

  const data = await cfFetch('/custom_hostnames', {
    method: 'POST',
    body: JSON.stringify({
      hostname,
      ssl: { method: 'http', type: 'dv', wildcard: false },
    }),
  }) as { result?: { id: string; custom_origin_server?: string }; success: boolean; errors?: { message: string }[] };

  if (!data.success) {
    const msg = data.errors?.[0]?.message ?? 'Cloudflare API error';
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
  }

  return {
    hostnameId: data.result?.id ?? null,
    dnsTarget: data.result?.custom_origin_server ?? 'cname.corredor.app',
  };
}

async function pollCloudflareHostname(hostnameId: string) {
  const data = await cfFetch(`/custom_hostnames/${hostnameId}`) as {
    result?: {
      status: string;
      ssl?: { status: string };
      verification_errors?: string[];
    };
    success: boolean;
  };

  if (!data.success || !data.result) {
    return { verified: false, sslActive: false, error: 'Failed to poll', status: 'pending' as const };
  }

  const r = data.result;
  const verified = r.status === 'active';
  const sslActive = r.ssl?.status === 'active';
  const error = r.verification_errors?.[0] ?? null;

  let status: 'pending' | 'verifying' | 'active' | 'failed' = 'pending';
  if (error) status = 'failed';
  else if (sslActive) status = 'active';
  else if (verified) status = 'verifying';

  return { verified, sslActive, error, status };
}

async function deleteCloudflareHostname(hostnameId: string) {
  await cfFetch(`/custom_hostnames/${hostnameId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Root site router — all 23 endpoints
// ---------------------------------------------------------------------------

export const siteRouter = router({
  // Site CRUD (4)
  create: siteProcedure
    .input(SiteCreateInput)
    .mutation(async ({ ctx, input }) => {
      // Check tenant doesn't already have a site
      const [existing] = await ctx.db
        .select({ id: site.id })
        .from(site)
        .where(and(eq(site.tenantId, ctx.tenantId), isNull(site.deletedAt)));
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Tenant already has a site' });

      const [s] = await ctx.db
        .insert(site)
        .values({
          tenantId:      ctx.tenantId,
          name:          input.name,
          subdomain:     input.subdomain,
          themeCode:     input.themeCode,
          brandSettings: input.brandSettings ?? {},
          createdBy:     ctx.userId,
          updatedBy:     ctx.userId,
        })
        .returning();

      return s!;
    }),

  get: siteProcedure
    .query(async ({ ctx }) => {
      const [s] = await ctx.db
        .select()
        .from(site)
        .where(and(eq(site.tenantId, ctx.tenantId), isNull(site.deletedAt)));
      if (!s) throw new TRPCError({ code: 'NOT_FOUND', message: 'No site configured' });
      return s;
    }),

  update: siteProcedure
    .input(SiteUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(site)
        .where(and(eq(site.tenantId, ctx.tenantId), isNull(site.deletedAt)));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'No site configured' });

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.name           !== undefined) updates.name           = input.name;
      if (input.themeCode      !== undefined) updates.themeCode      = input.themeCode;
      if (input.brandSettings  !== undefined) updates.brandSettings  = input.brandSettings;
      if (input.customCss      !== undefined) updates.customCss      = input.customCss;
      if (input.customHeadHtml !== undefined) updates.customHeadHtml = input.customHeadHtml;

      const [updated] = await ctx.db
        .update(site)
        .set(updates)
        .where(and(eq(site.id, existing.id), eq(site.tenantId, ctx.tenantId)))
        .returning();

      return updated!;
    }),

  delete: siteProcedure
    .mutation(async ({ ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(site)
        .where(and(eq(site.tenantId, ctx.tenantId), isNull(site.deletedAt)));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'No site configured' });

      await ctx.db
        .update(site)
        .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId })
        .where(and(eq(site.id, existing.id), eq(site.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  // Sub-routers
  pages:   pagesRouter,     // 9 endpoints
  domains: domainsRouter,   // 4 endpoints
  forms:   formsRouter,     // 5 endpoints (incl. public submit)
  themes:  themesRouter,    // 1 endpoint

  // Public listing feed (1) — serves published properties for tenant sites
  publicListingFeed: publicProcedure
    .input(PublicListingFeedInput)
    .query(async ({ ctx, input }) => {
      // Resolve tenant from subdomain
      const [s] = await ctx.db
        .select({ id: site.id, tenantId: site.tenantId })
        .from(site)
        .where(and(eq(site.subdomain, input.subdomain), isNull(site.deletedAt)));

      if (!s) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });

      const conditions = [
        eq(property.tenantId, s.tenantId),
        eq(property.status, 'active'),
        isNull(property.deletedAt),
      ];

      if (input.cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8')) as { ts: string; id: string };
          conditions.push(
            sql`(${property.createdAt}, ${property.id}) < (${decoded.ts}::timestamptz, ${decoded.id}::uuid)`
          );
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
        }
      }

      const rows = await ctx.db
        .select({
          id:            property.id,
          referenceCode: property.referenceCode,
          title:         property.title,
          description:   property.description,
          propertyType:  property.propertyType,
          coveredAreaM2: property.coveredAreaM2,
          totalAreaM2:   property.totalAreaM2,
          rooms:         property.rooms,
          bedrooms:      property.bedrooms,
          bathrooms:     property.bathrooms,
          province:      property.province,
          locality:      property.locality,
          neighborhood:  property.neighborhood,
          addressStreet: property.addressStreet,
          lat:           property.lat,
          lng:           property.lng,
          featured:      property.featured,
          createdAt:     property.createdAt,
        })
        .from(property)
        .where(and(...conditions))
        .orderBy(desc(property.featured), desc(property.createdAt), desc(property.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const last = hasMore ? items[items.length - 1] : null;
      const nextCursor = last
        ? Buffer.from(JSON.stringify({
            ts: last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt,
            id: last.id,
          })).toString('base64')
        : null;

      return { items, nextCursor };
    }),
});
