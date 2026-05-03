import { unstable_cache } from 'next/cache';
import { eq, and, asc, isNull, sql, desc } from 'drizzle-orm';
import {
  site,
  sitePage,
  siteBlock,
  siteDomain,
  siteRedirect,
} from '@corredor/db';
import {
  property,
  propertyListing,
  propertyMedia,
} from '@corredor/db';
import { getDb } from './db';
import type {
  SiteData,
  PageData,
  BlockData,
  ThemeCode,
  ListingCardData,
} from './types';

// ─── Site resolution ────────────────────────────────────────

export const getSiteBySubdomain = unstable_cache(
  async (subdomain: string): Promise<SiteData | null> => {
    const db = getDb();
    const rows = await db
      .select({
        id: site.id,
        tenantId: site.tenantId,
        name: site.name,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
        themeCode: site.themeCode,
        brandSettings: site.brandSettings,
        customCss: site.customCss,
        customHeadHtml: site.customHeadHtml,
      })
      .from(site)
      .where(
        and(eq(site.subdomain, subdomain), isNull(site.deletedAt)),
      )
      .limit(1);

    if (!rows[0]) return null;
    return { ...rows[0], themeCode: rows[0].themeCode as ThemeCode } as SiteData;
  },
  ['site-by-subdomain'],
  { tags: ['site'], revalidate: 120 },
);

export const getSiteByCustomDomain = unstable_cache(
  async (hostname: string): Promise<SiteData | null> => {
    const db = getDb();
    const rows = await db
      .select({
        siteId: siteDomain.siteId,
      })
      .from(siteDomain)
      .where(
        and(
          eq(siteDomain.hostname, hostname),
          eq(siteDomain.status, 'active'),
          isNull(siteDomain.deletedAt),
        ),
      )
      .limit(1);

    if (!rows[0]) return null;

    const sites = await db
      .select({
        id: site.id,
        tenantId: site.tenantId,
        name: site.name,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
        themeCode: site.themeCode,
        brandSettings: site.brandSettings,
        customCss: site.customCss,
        customHeadHtml: site.customHeadHtml,
      })
      .from(site)
      .where(and(eq(site.id, rows[0].siteId), isNull(site.deletedAt)))
      .limit(1);

    if (!sites[0]) return null;
    return { ...sites[0], themeCode: sites[0].themeCode as ThemeCode } as SiteData;
  },
  ['site-by-domain'],
  { tags: ['site'], revalidate: 120 },
);

// ─── Page data ──────────────────────────────────────────────

export const getPage = unstable_cache(
  async (siteId: string, slug: string): Promise<PageData | null> => {
    const db = getDb();
    const pages = await db
      .select({
        id: sitePage.id,
        siteId: sitePage.siteId,
        slug: sitePage.slug,
        title: sitePage.title,
        metaTitle: sitePage.metaTitle,
        metaDescription: sitePage.metaDescription,
        ogImageUrl: sitePage.ogImageUrl,
      })
      .from(sitePage)
      .where(
        and(
          eq(sitePage.siteId, siteId),
          eq(sitePage.slug, slug),
          eq(sitePage.status, 'published'),
          isNull(sitePage.deletedAt),
        ),
      )
      .limit(1);

    if (!pages[0]) return null;
    const page = pages[0];

    const blocks = await db
      .select({
        id: siteBlock.id,
        blockType: siteBlock.blockType,
        sortOrder: siteBlock.sortOrder,
        props: siteBlock.props,
      })
      .from(siteBlock)
      .where(
        and(
          eq(siteBlock.pageId, page.id),
          eq(siteBlock.siteId, siteId),
          isNull(siteBlock.deletedAt),
        ),
      )
      .orderBy(asc(siteBlock.sortOrder));

    return {
      ...page,
      blocks: blocks.map((b) => ({
        ...b,
        props: (b.props ?? {}) as Record<string, unknown>,
      })) as BlockData[],
    };
  },
  ['page'],
  { tags: ['site'], revalidate: 60 },
);

export const getPageSlugs = unstable_cache(
  async (siteId: string): Promise<string[]> => {
    const db = getDb();
    const pages = await db
      .select({ slug: sitePage.slug })
      .from(sitePage)
      .where(
        and(
          eq(sitePage.siteId, siteId),
          eq(sitePage.status, 'published'),
          isNull(sitePage.deletedAt),
        ),
      );
    return pages.map((p) => p.slug);
  },
  ['page-slugs'],
  { tags: ['site'], revalidate: 120 },
);

// ─── Redirects ──────────────────────────────────────────────

export const getRedirects = unstable_cache(
  async (siteId: string) => {
    const db = getDb();
    return db
      .select({
        sourcePath: siteRedirect.sourcePath,
        destinationUrl: siteRedirect.destinationUrl,
        statusCode: siteRedirect.statusCode,
      })
      .from(siteRedirect)
      .where(
        and(eq(siteRedirect.siteId, siteId), isNull(siteRedirect.deletedAt)),
      );
  },
  ['redirects'],
  { tags: ['site'], revalidate: 300 },
);

// ─── Listings (for ListingGrid, ListingDetail, Map) ─────────

export const getListings = unstable_cache(
  async (
    tenantId: string,
    opts: {
      operationFilter?: string;
      propertyTypeFilter?: string;
      localityFilter?: string;
      limit?: number;
      offset?: number;
      featured?: boolean;
    } = {},
  ): Promise<ListingCardData[]> => {
    const db = getDb();
    const conditions = [
      eq(property.tenantId, tenantId),
      eq(property.status, 'active'),
      isNull(property.deletedAt),
    ];

    if (opts.propertyTypeFilter) {
      conditions.push(sql`${property.propertyType} = ${opts.propertyTypeFilter}`);
    }
    if (opts.localityFilter) {
      conditions.push(eq(property.locality, opts.localityFilter));
    }
    if (opts.featured) {
      conditions.push(eq(property.featured, true));
    }
    if (opts.operationFilter) {
      conditions.push(sql`${propertyListing.kind} = ${opts.operationFilter}`);
    }

    const rows = await db
      .select({
        id: property.id,
        referenceCode: property.referenceCode,
        title: property.title,
        propertyType: property.propertyType,
        operationKind: propertyListing.kind,
        priceAmount: propertyListing.priceAmount,
        priceCurrency: propertyListing.priceCurrency,
        coveredAreaM2: property.coveredAreaM2,
        totalAreaM2: property.totalAreaM2,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        locality: property.locality,
        neighborhood: property.neighborhood,
        thumbUrl: propertyMedia.thumbUrl,
        lat: property.lat,
        lng: property.lng,
      })
      .from(property)
      .innerJoin(propertyListing, eq(propertyListing.propertyId, property.id))
      .leftJoin(
        propertyMedia,
        and(
          eq(propertyMedia.propertyId, property.id),
          eq(propertyMedia.sortOrder, 0),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(property.featured), desc(property.createdAt))
      .limit(opts.limit ?? 12)
      .offset(opts.offset ?? 0);
    return rows as ListingCardData[];
  },
  ['listings'],
  { tags: ['listings'], revalidate: 60 },
);

export const getListingById = unstable_cache(
  async (tenantId: string, propertyId: string) => {
    const db = getDb();
    const rows = await db
      .select({
        id: property.id,
        referenceCode: property.referenceCode,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType,
        coveredAreaM2: property.coveredAreaM2,
        totalAreaM2: property.totalAreaM2,
        rooms: property.rooms,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        garages: property.garages,
        ageYears: property.ageYears,
        locality: property.locality,
        neighborhood: property.neighborhood,
        addressStreet: property.addressStreet,
        lat: property.lat,
        lng: property.lng,
      })
      .from(property)
      .where(
        and(
          eq(property.id, propertyId),
          eq(property.tenantId, tenantId),
          eq(property.status, 'active'),
          isNull(property.deletedAt),
        ),
      )
      .limit(1);

    if (!rows[0]) return null;

    const listings = await db
      .select({
        kind: propertyListing.kind,
        priceAmount: propertyListing.priceAmount,
        priceCurrency: propertyListing.priceCurrency,
      })
      .from(propertyListing)
      .where(eq(propertyListing.propertyId, propertyId));

    const media = await db
      .select({
        id: propertyMedia.id,
        mediaType: propertyMedia.mediaType,
        thumbUrl: propertyMedia.thumbUrl,
        mediumUrl: propertyMedia.mediumUrl,
        fullUrl: propertyMedia.fullUrl,
        caption: propertyMedia.caption,
      })
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, propertyId))
      .orderBy(asc(propertyMedia.sortOrder));

    return { ...rows[0], listings, media };
  },
  ['listing-detail'],
  { tags: ['listings'], revalidate: 60 },
);

// ─── Listing count (for pagination) ────────────────────────

export const getListingCount = unstable_cache(
  async (
    tenantId: string,
    opts: {
      operationFilter?: string;
      propertyTypeFilter?: string;
      localityFilter?: string;
    } = {},
  ): Promise<number> => {
    const db = getDb();
    const conditions = [
      eq(property.tenantId, tenantId),
      eq(property.status, 'active'),
      isNull(property.deletedAt),
    ];

    if (opts.propertyTypeFilter) {
      conditions.push(sql`${property.propertyType} = ${opts.propertyTypeFilter}`);
    }
    if (opts.localityFilter) {
      conditions.push(eq(property.locality, opts.localityFilter));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(property)
      .where(and(...conditions));

    return Number(result[0]?.count ?? 0);
  },
  ['listing-count'],
  { tags: ['listings'], revalidate: 60 },
);
