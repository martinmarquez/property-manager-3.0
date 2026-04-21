/**
 * Auth credential tables — Phase A (RENA-5)
 *
 * Tables: session, password_reset_token, totp_credential, webauthn_credential
 *
 * Design notes:
 * - Sessions are stored primarily in Redis for performance.
 *   The session table here is an audit trail / recovery surface.
 * - TOTP and WebAuthn credentials are normalised out of the user row
 *   so they can be queried, rotated, and revoked independently.
 * - All tables carry tenant_id for RLS enforcement.
 *
 * RLS policy (applied via migration):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  bigint,
  boolean,
  customType,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// bytea is not a named export in all drizzle-orm/pg-core versions; use customType
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
import { tenant, user } from './tenancy.js';

// ---------------------------------------------------------------------------
// session
// Mirror of the Redis session for audit / forcible revocation.
// Redis is authoritative — this table is append-only.
// ---------------------------------------------------------------------------
export const session = pgTable('session', {
  id: text('id').primaryKey(), // 256-bit hex from generateSessionId()
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  roles: jsonb('roles').notNull().default(sql`'[]'::jsonb`),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// password_reset_token
// One-use time-limited tokens for password reset flow.
// ---------------------------------------------------------------------------
export const passwordResetToken = pgTable('password_reset_token', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  // SHA-256 hex digest of the raw token sent to the user's email.
  // Never store plaintext.
  tokenHash: text('token_hash').notNull().unique(),
  // 'email_verification' | 'password_reset' — prevents cross-purpose token reuse (ASVS V3.5.2).
  purpose: text('purpose').notNull().default('password_reset'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// totp_credential
// One row per user; confirmed once the user verifies their first code.
// ---------------------------------------------------------------------------
export const totpCredential = pgTable('totp_credential', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => user.id),
  // AES-256-GCM encrypted TOTP secret.  Key = env.AUTH_ENCRYPTION_KEY.
  encryptedSecret: text('encrypted_secret').notNull(),
  // Array of argon2id-hashed backup codes (8 × 10-char codes).
  // Each code is removed from the array once consumed.
  backupCodes: jsonb('backup_codes').notNull().default(sql`'[]'::jsonb`),
  // Null until the user successfully verifies their first code.
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ---------------------------------------------------------------------------
// webauthn_credential
// One row per registered authenticator/passkey.
// ---------------------------------------------------------------------------
export const webauthnCredential = pgTable('webauthn_credential', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  // Base64URL-encoded credential ID as issued by the authenticator.
  credentialId: text('credential_id').notNull().unique(),
  // CBOR-encoded public key bytes.
  publicKey: bytea('public_key').notNull(),
  // Signature counter — monotonically increasing; used for clone detection.
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  // 'singleDevice' | 'multiDevice'
  deviceType: text('device_type').notNull().default('singleDevice'),
  // Array of AuthenticatorTransport strings (e.g. ['internal', 'hybrid'])
  transports: jsonb('transports').notNull().default(sql`'[]'::jsonb`),
  // AAGUID identifies the authenticator model (all-zeros = unknown).
  aaguid: text('aaguid'),
  // Human-readable name set by the user, e.g. "iPhone 15 Touch ID"
  name: text('name').notNull().default('Security Key'),
  backedUp: boolean('backed_up').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type PasswordResetToken = typeof passwordResetToken.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetToken.$inferInsert;

export type TotpCredential = typeof totpCredential.$inferSelect;
export type NewTotpCredential = typeof totpCredential.$inferInsert;

export type WebauthnCredential = typeof webauthnCredential.$inferSelect;
export type NewWebauthnCredential = typeof webauthnCredential.$inferInsert;
