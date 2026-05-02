import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  inet,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenant, user } from './tenancy.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const docTemplateKindEnum = pgEnum('doc_template_kind', [
  'reserva', 'boleto', 'escritura', 'recibo_sena',
  'autorizacion_venta', 'contrato_locacion', 'recibo_alquiler',
  'carta_oferta', 'custom',
]);

export const docSignatureLevelEnum = pgEnum('doc_signature_level', [
  'firma_electronica', 'firma_digital',
]);

export const docStatusEnum = pgEnum('doc_status', [
  'draft', 'pending_signature', 'signed', 'expired', 'cancelled',
]);

export const docSignerStatusEnum = pgEnum('doc_signer_status', [
  'pending', 'signed', 'declined', 'expired',
]);

export const esignProviderEnum = pgEnum('esign_provider', [
  'signaturit', 'docusign',
]);

export const esignFlowKindEnum = pgEnum('esign_flow_kind', [
  'sequential', 'parallel',
]);

export const esignRequestStatusEnum = pgEnum('esign_request_status', [
  'pending', 'completed', 'declined', 'expired', 'cancelled',
]);

// ---------------------------------------------------------------------------
// doc_template
// ---------------------------------------------------------------------------

export const docTemplate = pgTable('doc_template', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  kind: docTemplateKindEnum('kind').notNull(),
  bodyHtml: text('body_html').notNull().default(''),
  requiredBindings: jsonb('required_bindings').notNull().default(sql`'[]'::jsonb`),
  minSignatureLevel: docSignatureLevelEnum('min_signature_level').notNull().default('firma_digital'),
  jurisdiction: text('jurisdiction'),
  sourceTemplateId: uuid('source_template_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// doc_template_revision
// ---------------------------------------------------------------------------

export const docTemplateRevision = pgTable('doc_template_revision', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  templateId: uuid('template_id').notNull().references(() => docTemplate.id),
  revisionNumber: integer('revision_number').notNull(),
  bodyHtml: text('body_html').notNull(),
  requiredBindings: jsonb('required_bindings').notNull().default(sql`'[]'::jsonb`),
  changedBy: uuid('changed_by').references(() => user.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// doc_clause
// ---------------------------------------------------------------------------

export const docClause = pgTable('doc_clause', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  requiredBy: text('required_by'),
  bodyHtml: text('body_html').notNull(),
  tags: jsonb('tags').notNull().default(sql`'[]'::jsonb`),
  isRequired: boolean('is_required').notNull().default(false),
  applicableKinds: jsonb('applicable_kinds').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// doc_document
// ---------------------------------------------------------------------------

export const docDocument = pgTable('doc_document', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  templateId: uuid('template_id').notNull().references(() => docTemplate.id),
  templateRevisionId: uuid('template_revision_id').references(() => docTemplateRevision.id),
  version: integer('version').notNull().default(1),
  previousVersionId: uuid('previous_version_id'),
  status: docStatusEnum('status').notNull().default('draft'),
  fileUrl: text('file_url'),
  signedFileUrl: text('signed_file_url'),
  fileObjectKey: text('file_object_key'),
  fieldBindingsSnapshot: jsonb('field_bindings_snapshot').notNull().default(sql`'{}'::jsonb`),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  leadId: uuid('lead_id'),
  propertyId: uuid('property_id'),
  contactBuyerId: uuid('contact_buyer_id'),
  contactSellerId: uuid('contact_seller_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// doc_signature_request
// ---------------------------------------------------------------------------

export const docSignatureRequest = pgTable('doc_signature_request', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  docDocumentId: uuid('doc_document_id').notNull().references(() => docDocument.id),
  provider: esignProviderEnum('provider').notNull(),
  externalId: text('external_id').notNull(),
  flowKind: esignFlowKindEnum('flow_kind').notNull().default('sequential'),
  status: esignRequestStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  reminderEveryDays: integer('reminder_every_days'),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  senderName: text('sender_name'),
  senderEmail: text('sender_email'),
  customMessage: text('custom_message'),
  providerMetadata: jsonb('provider_metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// doc_signer
// ---------------------------------------------------------------------------

export const docSigner = pgTable('doc_signer', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  docDocumentId: uuid('doc_document_id').notNull().references(() => docDocument.id),
  signatureRequestId: uuid('signature_request_id').references(() => docSignatureRequest.id),
  contactId: uuid('contact_id'),
  userId: uuid('user_id').references(() => user.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  roleLabel: text('role_label'),
  signatureOrder: integer('signature_order').notNull().default(0),
  signatureLevel: docSignatureLevelEnum('signature_level').notNull().default('firma_electronica'),
  status: docSignerStatusEnum('status').notNull().default('pending'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  declinedAt: timestamp('declined_at', { withTimezone: true }),
  declineReason: text('decline_reason'),
  externalSignerId: text('external_signer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// doc_audit_trail — append-only (Ley 25.506)
// ---------------------------------------------------------------------------

export const docAuditTrail = pgTable('doc_audit_trail', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  docDocumentId: uuid('doc_document_id').notNull().references(() => docDocument.id),
  signatureRequestId: uuid('signature_request_id').references(() => docSignatureRequest.id),
  signerId: uuid('signer_id').references(() => docSigner.id),
  eventType: text('event_type').notNull(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'),
  biometricConsent: boolean('biometric_consent'),
  certificateSerial: text('certificate_serial'),
  certificateUrl: text('certificate_url'),
  providerEventId: text('provider_event_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata'),
});
