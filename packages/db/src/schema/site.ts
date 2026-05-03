/**
 * Sitio — Website Builder entity group (RENA-138)
 *
 * Tables: site, site_page, site_block, site_theme, site_domain,
 *         site_form_submission, site_redirect
 *
 * RLS policy (applied via migration 0021_phase_g_sitio.sql):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  boolean,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';
import { contact } from './contacts.js';
import { lead } from './leads.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sitePageStatusEnum = pgEnum('site_page_status', [
  'draft',
  'published',
]);

export const siteBlockTypeEnum = pgEnum('site_block_type', [
  'Hero',
  'ListingGrid',
  'ListingDetail',
  'ContactForm',
  'AgentBio',
  'Testimonials',
  'Map',
  'Blog',
  'CTA',
  'Footer',
]);

export const siteDomainStatusEnum = pgEnum('site_domain_status', [
  'unverified',
  'pending',
  'verifying',
  'active',
  'failed',
]);

// ---------------------------------------------------------------------------
// site_theme — lookup table (no tenant_id, no RLS)
// ---------------------------------------------------------------------------

export const siteTheme = pgTable('site_theme', {
  code:         text('code').primaryKey(),
  displayName:  text('display_name').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  defaultProps: jsonb('default_props').notNull().default(sql`'{}'::jsonb`),
});

export type SiteTheme = typeof siteTheme.$inferSelect;
export type NewSiteTheme = typeof siteTheme.$inferInsert;

// ---------------------------------------------------------------------------
// site — one site per tenant (typically)
// ---------------------------------------------------------------------------

export const site = pgTable('site', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       uuid('tenant_id').notNull(),
  name:           text('name').notNull(),
  subdomain:      text('subdomain').notNull().unique(),
  customDomain:   text('custom_domain'),
  themeCode:      text('theme_code').notNull().default('moderno').references(() => siteTheme.code),
  brandSettings:  jsonb('brand_settings').notNull().default(sql`'{}'::jsonb`),
  customCss:      text('custom_css'),
  customHeadHtml: text('custom_head_html'),
  publishedAt:    timestamp('published_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:      uuid('created_by').references(() => user.id),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:      uuid('updated_by').references(() => user.id),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  version:        integer('version').notNull().default(1),
});

export type Site = typeof site.$inferSelect;
export type NewSite = typeof site.$inferInsert;

// ---------------------------------------------------------------------------
// site_page
// ---------------------------------------------------------------------------

export const sitePage = pgTable('site_page', {
  id:                uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:          uuid('tenant_id').notNull(),
  siteId:            uuid('site_id').notNull().references(() => site.id),
  slug:              text('slug').notNull(),
  title:             text('title').notNull(),
  metaTitle:         text('meta_title'),
  metaDescription:   text('meta_description'),
  ogImageUrl:        text('og_image_url'),
  puckData:          jsonb('puck_data').notNull().default(sql`'{}'::jsonb`),
  publishedPuckData: jsonb('published_puck_data'),
  status:            sitePageStatusEnum('status').notNull().default('draft'),
  publishedAt:       timestamp('published_at', { withTimezone: true }),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:         uuid('created_by').references(() => user.id),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:         uuid('updated_by').references(() => user.id),
  deletedAt:         timestamp('deleted_at', { withTimezone: true }),
  version:           integer('version').notNull().default(1),
}, (table) => [
  unique('site_page_site_slug_uq').on(table.siteId, table.slug),
]);

export type SitePage = typeof sitePage.$inferSelect;
export type NewSitePage = typeof sitePage.$inferInsert;

// ---------------------------------------------------------------------------
// site_page_snapshot — immutable publish history for rollback (no soft-delete)
// ---------------------------------------------------------------------------

export const sitePageSnapshot = pgTable('site_page_snapshot', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:    uuid('tenant_id').notNull(),
  pageId:      uuid('page_id').notNull().references(() => sitePage.id, { onDelete: 'cascade' }),
  puckData:    jsonb('puck_data').notNull(),
  metaTitle:   text('meta_title'),
  metaDescription: text('meta_description'),
  publishedBy: uuid('published_by').references(() => user.id),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type SitePageSnapshot = typeof sitePageSnapshot.$inferSelect;
export type NewSitePageSnapshot = typeof sitePageSnapshot.$inferInsert;

// ---------------------------------------------------------------------------
// site_block
// ---------------------------------------------------------------------------

export const siteBlock = pgTable('site_block', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  siteId:    uuid('site_id').notNull().references(() => site.id),
  pageId:    uuid('page_id').notNull().references(() => sitePage.id),
  blockType: siteBlockTypeEnum('block_type').notNull(),
  sortOrder: integer('sort_order').notNull(),
  props:     jsonb('props').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version:   integer('version').notNull().default(1),
});

export type SiteBlock = typeof siteBlock.$inferSelect;
export type NewSiteBlock = typeof siteBlock.$inferInsert;

// ---------------------------------------------------------------------------
// site_domain — custom domains with CF Custom Hostnames
// ---------------------------------------------------------------------------

export const siteDomain = pgTable('site_domain', {
  id:                   uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:             uuid('tenant_id').notNull(),
  siteId:              uuid('site_id').notNull().references(() => site.id),
  hostname:             text('hostname').notNull().unique(),
  dnsTarget:            text('dns_target').notNull(),
  ownershipToken:       text('ownership_token'),
  verifiedAt:           timestamp('verified_at', { withTimezone: true }),
  sslActiveAt:          timestamp('ssl_active_at', { withTimezone: true }),
  cloudflareHostnameId: text('cloudflare_hostname_id'),
  status:               siteDomainStatusEnum('status').notNull().default('unverified'),
  lastPolledAt:         timestamp('last_polled_at', { withTimezone: true }),
  errorMessage:         text('error_message'),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:            uuid('created_by').references(() => user.id),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:            uuid('updated_by').references(() => user.id),
  deletedAt:            timestamp('deleted_at', { withTimezone: true }),
  version:              integer('version').notNull().default(1),
});

export type SiteDomain = typeof siteDomain.$inferSelect;
export type NewSiteDomain = typeof siteDomain.$inferInsert;

// ---------------------------------------------------------------------------
// site_form_submission — captured form submissions from public site
// ---------------------------------------------------------------------------

export const siteFormSubmission = pgTable('site_form_submission', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       uuid('tenant_id').notNull(),
  siteId:         uuid('site_id').notNull().references(() => site.id),
  pageId:         uuid('page_id').references(() => sitePage.id),
  blockId:        uuid('block_id').references(() => siteBlock.id),
  data:           jsonb('data').notNull(),
  ip:             inet('ip'),
  userAgent:      text('user_agent'),
  recaptchaScore: numeric('recaptcha_score', { precision: 3, scale: 2 }),
  flaggedAsSpam:  boolean('flagged_as_spam').notNull().default(false),
  leadId:         uuid('lead_id').references(() => lead.id),
  contactId:      uuid('contact_id').references(() => contact.id),
  processedAt:    timestamp('processed_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:      uuid('created_by').references(() => user.id),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:      uuid('updated_by').references(() => user.id),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  version:        integer('version').notNull().default(1),
});

export type SiteFormSubmission = typeof siteFormSubmission.$inferSelect;
export type NewSiteFormSubmission = typeof siteFormSubmission.$inferInsert;

// ---------------------------------------------------------------------------
// site_redirect — 301/302 redirects managed per-site
// ---------------------------------------------------------------------------

export const siteRedirect = pgTable('site_redirect', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       uuid('tenant_id').notNull(),
  siteId:         uuid('site_id').notNull().references(() => site.id),
  sourcePath:     text('source_path').notNull(),
  destinationUrl: text('destination_url').notNull(),
  statusCode:     integer('status_code').notNull().default(301),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:      uuid('created_by').references(() => user.id),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:      uuid('updated_by').references(() => user.id),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  version:        integer('version').notNull().default(1),
}, (table) => [
  unique('site_redirect_site_source_uq').on(table.siteId, table.sourcePath),
]);

export type SiteRedirect = typeof siteRedirect.$inferSelect;
export type NewSiteRedirect = typeof siteRedirect.$inferInsert;
