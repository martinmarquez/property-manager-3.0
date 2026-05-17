/**
 * Mobile app tables — Phase H (RENA-198)
 *
 * Tables:
 *   push_device           — registered FCM/APNs device tokens per user
 *   notification_preference — per-user push notification opt-in/out per category
 *   device_trust          — biometric session token bindings
 *   app_version_policy    — minimum version enforcement + soft/hard update flags
 *
 * RLS: all tables carry tenant_id for row-level isolation.
 */

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenant, user } from './tenancy.js';

// ---------------------------------------------------------------------------
// push_device
// ---------------------------------------------------------------------------

export const pushDevice = pgTable(
  'push_device',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** 'fcm' | 'apns' */
    platform: text('platform').notNull(),
    token: text('token').notNull(),
    /** Optional device fingerprint / model string for diagnostics. */
    deviceInfo: jsonb('device_info'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [unique('push_device_user_token_unique').on(t.userId, t.token)],
);

// ---------------------------------------------------------------------------
// notification_preference
// ---------------------------------------------------------------------------

export const notificationPreference = pgTable(
  'notification_preference',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /**
     * Notification category — e.g. 'new_message', 'task_due', 'deal_update'.
     * NULL = global setting that applies to all categories not explicitly overridden.
     */
    category: text('category'),
    enabled: boolean('enabled').notNull().default(true),
    /** Quiet hours in HH:MM 24-h local time. NULL = no quiet hours. */
    quietFrom: text('quiet_from'),
    quietTo: text('quiet_to'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [unique('notification_pref_user_category_unique').on(t.userId, t.category)],
);

// ---------------------------------------------------------------------------
// device_trust
// ---------------------------------------------------------------------------

export const deviceTrust = pgTable('device_trust', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** Opaque device identifier — SHA-256 hash of hardware identifiers. */
  deviceId: text('device_id').notNull(),
  /** The session this biometric binding was created from. */
  sessionId: text('session_id').notNull(),
  /** Biometric challenge nonce hash used to bind the device. */
  challengeHash: text('challenge_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// app_version_policy
// ---------------------------------------------------------------------------

export const appVersionPolicy = pgTable('app_version_policy', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 'ios' | 'android' */
  platform: text('platform').notNull().unique(),
  /** Semantic version string: "2.3.0" */
  minimumVersion: text('minimum_version').notNull(),
  /** If true, clients below minimumVersion are hard-blocked. */
  forceUpdate: boolean('force_update').notNull().default(false),
  /** Latest released version — used for soft-update prompts. */
  latestVersion: text('latest_version').notNull(),
  /** Human-readable release notes shown in the update prompt. */
  releaseNotes: text('release_notes'),
  /** Feature flags gated per minimum app version (jsonb map). */
  featureFlags: jsonb('feature_flags').notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  /** Minimum build number (integer) for alternative hard-block check. */
  minimumBuildNumber: integer('minimum_build_number'),
});
