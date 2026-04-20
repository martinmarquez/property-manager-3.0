/**
 * Tenancy + Auth entity group
 *
 * Tables: tenant, branch, user, role, user_role, api_key, webhook,
 *         audit_log, feature_flag, tenant_domain
 *
 * Universal columns applied to every table except tenant and audit_log:
 *   id, tenant_id, created_at, created_by, updated_at, updated_by,
 *   deleted_at, version
 *
 * RLS policy (applied via raw SQL in migration):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  bigserial,
  boolean,
  customType,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// citext custom type (case-insensitive text, requires extension)
// ---------------------------------------------------------------------------
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// ---------------------------------------------------------------------------
// Reusable universal column builder
// Returns common columns shared by every table except tenant and audit_log.
// Usage: spread into pgTable definition after domain-specific columns.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function universalCols(userTable: PgTableWithColumns<any>) {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdBy: uuid("created_by").references(() => userTable.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedBy: uuid("updated_by").references(() => userTable.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
  };
}

// ---------------------------------------------------------------------------
// tenant
// ---------------------------------------------------------------------------
export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull().default("AR"),
  timezone: text("timezone")
    .notNull()
    .default("America/Argentina/Buenos_Aires"),
  currency: text("currency").notNull().default("ARS"),
  locale: text("locale").notNull().default("es-AR"),
  // plan_code intentionally plain text — FK to billing.plan added in Phase G
  planCode: text("plan_code").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// user  (quoted in SQL to avoid reserved word conflict)
// ---------------------------------------------------------------------------
export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    email: citext("email").notNull(),
    passwordHash: text("password_hash"), // argon2id; null = SSO-only
    totpSecret: text("totp_secret"),
    webauthnCredentials: jsonb("webauthn_credentials"),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    locale: text("locale").notNull().default("es-AR"),
    timezone: text("timezone"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    invitedBy: uuid("invited_by"), // self-ref resolved below via $onUpdateFn or raw FK
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
  },
  (t) => [unique("user_tenant_email_unique").on(t.tenantId, t.email)]
);

// ---------------------------------------------------------------------------
// branch
// ---------------------------------------------------------------------------
export const branch = pgTable("branch", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  parentBranchId: uuid("parent_branch_id"), // self-referential; raw FK in migration
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// role
// ---------------------------------------------------------------------------
export const role = pgTable("role", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  // system roles (owner, admin, agent, …) cannot be deleted
  isSystem: boolean("is_system").notNull().default(false),
  // array of permission strings, e.g. ["property:read","property:write"]
  permissions: jsonb("permissions").notNull().default(sql`'[]'::jsonb`),
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// user_role  (join table with metadata)
// ---------------------------------------------------------------------------
export const userRole = pgTable("user_role", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  roleId: uuid("role_id")
    .notNull()
    .references(() => role.id),
  // null = tenant-wide; non-null = branch-scoped
  branchId: uuid("branch_id").references(() => branch.id),
  grantedBy: uuid("granted_by").references(() => user.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// api_key
// ---------------------------------------------------------------------------
export const apiKey = pgTable("api_key", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  name: text("name").notNull(),
  // SHA-256 hash of the actual key; never store plaintext
  keyHash: text("key_hash").notNull().unique(),
  // first 8 chars shown in UI (e.g. "crdr_abc")
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").notNull().default(sql`'[]'::jsonb`),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// webhook
// ---------------------------------------------------------------------------
export const webhook = pgTable("webhook", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  url: text("url").notNull(),
  // HMAC-SHA256 secret stored hashed; the raw secret is shown once on creation
  secretHash: text("secret_hash").notNull(),
  // array of event types to subscribe to, e.g. ["property.created", "lead.stage_changed"]
  events: jsonb("events").notNull().default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// audit_log  (append-only; bigserial PK; no universal columns; no soft-delete)
// ---------------------------------------------------------------------------
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  userId: uuid("user_id").references(() => user.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(), // create | update | delete | restore | publish | sign | …
  diff: jsonb("diff"),
  ip: inet("ip"),
  userAgent: text("user_agent"),
  requestId: text("request_id"),
  at: timestamp("at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// feature_flag  (per-tenant feature toggles)
// ---------------------------------------------------------------------------
export const featureFlag = pgTable(
  "feature_flag",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    // 0–100 gradual rollout percentage (0 = disabled for all, 100 = enabled for all)
    rolloutPct: integer("rollout_pct").notNull().default(0),
    payload: jsonb("payload"), // arbitrary config for the flag
    ...universalCols(user),
  },
  (t) => [unique("feature_flag_tenant_key_unique").on(t.tenantId, t.key)]
);

// ---------------------------------------------------------------------------
// tenant_domain  (custom domains for white-label tenants)
// ---------------------------------------------------------------------------
export const tenantDomain = pgTable("tenant_domain", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id),
  domain: text("domain").notNull().unique(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  sslProvisionedAt: timestamp("ssl_provisioned_at", { withTimezone: true }),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...universalCols(user),
});

// ---------------------------------------------------------------------------
// Type exports (inferred from schema)
// ---------------------------------------------------------------------------
export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Branch = typeof branch.$inferSelect;
export type NewBranch = typeof branch.$inferInsert;

export type Role = typeof role.$inferSelect;
export type NewRole = typeof role.$inferInsert;

export type UserRole = typeof userRole.$inferSelect;
export type NewUserRole = typeof userRole.$inferInsert;

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;

export type Webhook = typeof webhook.$inferSelect;
export type NewWebhook = typeof webhook.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export type FeatureFlag = typeof featureFlag.$inferSelect;
export type NewFeatureFlag = typeof featureFlag.$inferInsert;

export type TenantDomain = typeof tenantDomain.$inferSelect;
export type NewTenantDomain = typeof tenantDomain.$inferInsert;
