/**
 * Referral program schema — Phase H (RENA-204)
 *
 * Tables:
 *   referral_codes        — one unique code per user; tracks aggregate counts
 *   referral_attributions — each click/signup/conversion linked to a code
 *
 * RLS: referral_codes enforces tenant isolation.
 *      referral_attributions is append-only; reads filtered in application layer.
 */

import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenant, user } from './tenancy.js';

// ---------------------------------------------------------------------------
// referral_codes
// ---------------------------------------------------------------------------

export const referralCode = pgTable('referral_codes', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       uuid('tenant_id').notNull().references(() => tenant.id),
  userId:         uuid('user_id').notNull().references(() => user.id),
  code:           text('code').notNull().unique(),
  clickCount:     integer('click_count').notNull().default(0),
  signupCount:    integer('signup_count').notNull().default(0),
  convertedCount: integer('converted_count').notNull().default(0),
  rewardGrantedAt: timestamp('reward_granted_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ReferralCode = typeof referralCode.$inferSelect;
export type NewReferralCode = typeof referralCode.$inferInsert;

// ---------------------------------------------------------------------------
// referral_attributions
// ---------------------------------------------------------------------------

export const referralAttributionStatusEnum = ['clicked', 'signed_up', 'converted'] as const;
export type ReferralAttributionStatus = typeof referralAttributionStatusEnum[number];

export const referralAttribution = pgTable('referral_attributions', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId:   uuid('referral_code_id').notNull().references(() => referralCode.id),
  referrerTenantId: uuid('referrer_tenant_id').notNull(),
  refereeTenantId:  uuid('referee_tenant_id'),
  refereeUserId:    uuid('referee_user_id'),
  status:           text('status').notNull().default('clicked').$type<ReferralAttributionStatus>(),
  convertedAt:      timestamp('converted_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ReferralAttribution = typeof referralAttribution.$inferSelect;
export type NewReferralAttribution = typeof referralAttribution.$inferInsert;
