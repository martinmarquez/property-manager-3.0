/**
 * Billing entity group — Phase G
 *
 * Tables: plan, plan_feature, subscription, invoice, payment,
 *         usage_counter, afip_invoice
 *
 * Schema follows RENA-112 Section 3.3 spec exactly.
 * CHECK constraints enforced in migration SQL; Drizzle uses text columns.
 *
 * RLS policy (applied via migration 0021_billing.sql):
 *   Tenant-scoped tables: subscription, invoice, payment,
 *   usage_counter, afip_invoice.
 *   Catalogue tables (plan, plan_feature): no RLS — shared across tenants.
 */

import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenant, user } from "./tenancy.js";

// ---------------------------------------------------------------------------
// plan  (catalogue — no tenant_id, no RLS)
// ---------------------------------------------------------------------------

export const plan = pgTable("plan", {
  code: text("code").primaryKey(),
  displayName: text("display_name").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),
  billingPeriod: text("billing_period").notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// plan_feature  (catalogue — no tenant_id, no RLS)
// ---------------------------------------------------------------------------

export const planFeature = pgTable(
  "plan_feature",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    planCode: text("plan_code")
      .notNull()
      .references(() => plan.code),
    featureKey: text("feature_key").notNull(),
    featureLimit: integer("feature_limit"),
  },
  (t) => [unique("plan_feature_plan_key_unique").on(t.planCode, t.featureKey)]
);

// ---------------------------------------------------------------------------
// subscription  (tenant-scoped, RLS, UNIQUE on tenant_id)
// ---------------------------------------------------------------------------

export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id)
    .unique(),
  planCode: text("plan_code")
    .notNull()
    .references(() => plan.code),

  status: text("status").notNull().default("trialing"),
  billingProvider: text("billing_provider").notNull(),

  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  mpCustomerId: text("mp_customer_id"),
  mpPreapprovalId: text("mp_preapproval_id"),

  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  dunningStartedAt: timestamp("dunning_started_at", { withTimezone: true }),
  dunningAttempts: integer("dunning_attempts").notNull().default(0),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),

  currency: text("currency").notNull().default("USD"),
  priceAmount: numeric("price_amount", { precision: 10, scale: 2 }),

  fiscalCondition: text("fiscal_condition"),
  cuit: text("cuit"),
  razonSocial: text("razon_social"),
  billingEmail: text("billing_email"),
  billingAddress: jsonb("billing_address"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by").references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: uuid("updated_by").references(() => user.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

// ---------------------------------------------------------------------------
// invoice  (tenant-scoped, RLS)
// ---------------------------------------------------------------------------

export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscription.id),

  provider: text("provider").notNull(),
  providerInvoiceId: text("provider_invoice_id"),

  status: text("status").notNull(),
  amountDue: numeric("amount_due", { precision: 14, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  currency: text("currency").notNull(),

  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  pdfUrl: text("pdf_url"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by").references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: uuid("updated_by").references(() => user.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

// ---------------------------------------------------------------------------
// payment  (tenant-scoped, RLS)
// ---------------------------------------------------------------------------

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoice.id),

  provider: text("provider").notNull(),
  providerPaymentId: text("provider_payment_id").notNull(),

  status: text("status").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  paymentMethod: text("payment_method"),

  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by").references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: uuid("updated_by").references(() => user.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

// ---------------------------------------------------------------------------
// usage_counter  (tenant-scoped, RLS — no universal columns per spec)
// ---------------------------------------------------------------------------

export const usageCounter = pgTable(
  "usage_counter",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id").notNull(),
    counterKey: text("counter_key").notNull(),
    value: integer("value").notNull().default(0),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    unique("usage_counter_tenant_key_period_unique").on(
      t.tenantId,
      t.counterKey,
      t.periodStart
    ),
  ]
);

// ---------------------------------------------------------------------------
// afip_invoice  (tenant-scoped, RLS, UNIQUE on invoice_id)
// ---------------------------------------------------------------------------

export const afipInvoice = pgTable("afip_invoice", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoice.id)
    .unique(),

  invoiceType: text("invoice_type").notNull(),
  invoiceNumber: bigint("invoice_number", { mode: "number" }).notNull(),
  puntoVenta: integer("punto_venta").notNull().default(1),
  cae: text("cae"),
  caeExpiresAt: date("cae_expires_at"),

  wsfeRequest: jsonb("wsfe_request"),
  wsfeResponse: jsonb("wsfe_response"),
  pdfR2Key: text("pdf_r2_key"),

  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by").references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedBy: uuid("updated_by").references(() => user.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type Plan = typeof plan.$inferSelect;
export type NewPlan = typeof plan.$inferInsert;

export type PlanFeature = typeof planFeature.$inferSelect;
export type NewPlanFeature = typeof planFeature.$inferInsert;

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;

export type Invoice = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;

export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;

export type UsageCounter = typeof usageCounter.$inferSelect;
export type NewUsageCounter = typeof usageCounter.$inferInsert;

export type AfipInvoice = typeof afipInvoice.$inferSelect;
export type NewAfipInvoice = typeof afipInvoice.$inferInsert;
