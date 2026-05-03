import {
  boolean,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';

// ---------------------------------------------------------------------------
// report_digest_subscription — user subscriptions to scheduled report digests
// ---------------------------------------------------------------------------

export const reportDigestSubscription = pgTable('report_digest_subscription', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:         uuid('tenant_id').notNull(),
  userId:           uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  reportSlug:       text('report_slug').notNull(),
  frequency:        text('frequency').notNull().default('weekly'),
  dayOfWeek:        smallint('day_of_week'),
  hourUtc:          smallint('hour_utc').notNull().default(8),
  timezone:         text('timezone').notNull().default('America/Argentina/Buenos_Aires'),
  filters:          jsonb('filters').notNull().default(sql`'{}'::jsonb`),
  active:           boolean('active').notNull().default(true),
  unsubscribeToken: text('unsubscribe_token').notNull().default(sql`encode(gen_random_bytes(32), 'hex')`),
  lastSentAt:       timestamp('last_sent_at', { withTimezone: true }),
  lastSendError:    text('last_send_error'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ReportDigestSubscription = typeof reportDigestSubscription.$inferSelect;
export type NewReportDigestSubscription = typeof reportDigestSubscription.$inferInsert;

// ---------------------------------------------------------------------------
// report_share_link — signed share links for report snapshots
// ---------------------------------------------------------------------------

export const reportShareLink = pgTable('report_share_link', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:   uuid('tenant_id').notNull(),
  createdBy:  uuid('created_by').notNull().references(() => user.id),
  reportSlug: text('report_slug').notNull(),
  token:      text('token').notNull().unique(),
  filters:    jsonb('filters').notNull().default(sql`'{}'::jsonb`),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  viewCount:  integer('view_count').notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ReportShareLink = typeof reportShareLink.$inferSelect;
export type NewReportShareLink = typeof reportShareLink.$inferInsert;
