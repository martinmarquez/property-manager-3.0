/**
 * Unified Inbox entity group
 *
 * Tables: inbox_channel, conversation, message, canned_response, auto_triage_rule
 *
 * RLS policy (applied via migration):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  boolean,
  integer,
  jsonb,
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

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const channelTypeEnum = pgEnum('channel_type', [
  'whatsapp', 'email', 'sms', 'webchat', 'instagram', 'facebook',
]);

export const channelStatusEnum = pgEnum('channel_status', [
  'active', 'inactive', 'pending_verification',
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open', 'assigned', 'pending', 'resolved', 'closed',
]);

export const messageDirectionEnum = pgEnum('message_direction', [
  'in', 'out',
]);

export const messageContentTypeEnum = pgEnum('message_content_type', [
  'text', 'image', 'video', 'audio', 'document', 'template', 'location', 'contact_card',
]);

export const messageStatusEnum = pgEnum('message_status', [
  'queued', 'sent', 'delivered', 'read', 'failed',
]);

// ---------------------------------------------------------------------------
// inbox_channel — channel configuration per tenant
// ---------------------------------------------------------------------------

export const inboxChannel = pgTable('inbox_channel', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  type:      channelTypeEnum('type').notNull(),
  name:      text('name').notNull(),
  config:    jsonb('config'),
  status:    channelStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version:   integer('version').notNull().default(1),
}, (t) => [
  unique('inbox_channel_tenant_name_unique').on(t.tenantId, t.name),
]);

export type InboxChannel = typeof inboxChannel.$inferSelect;
export type NewInboxChannel = typeof inboxChannel.$inferInsert;

// ---------------------------------------------------------------------------
// conversation — thread linking a channel, contact, and agent
// ---------------------------------------------------------------------------

export const conversation = pgTable('conversation', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:           uuid('tenant_id').notNull(),
  channelId:          uuid('channel_id').notNull().references(() => inboxChannel.id),
  contactId:          uuid('contact_id').notNull().references(() => contact.id),
  assignedAgentId:    uuid('assigned_agent_id').references(() => user.id),
  status:             conversationStatusEnum('status').notNull().default('open'),
  subject:            text('subject'),
  lastMessageAt:      timestamp('last_message_at', { withTimezone: true }),
  messageCount:       integer('message_count').notNull().default(0),
  slaFirstResponseAt: timestamp('sla_first_response_at', { withTimezone: true }),
  slaResolvedAt:      timestamp('sla_resolved_at', { withTimezone: true }),
  metadata:           jsonb('metadata'),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:          uuid('created_by').references(() => user.id),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:          uuid('updated_by').references(() => user.id),
  deletedAt:          timestamp('deleted_at', { withTimezone: true }),
  version:            integer('version').notNull().default(1),
});

export type Conversation = typeof conversation.$inferSelect;
export type NewConversation = typeof conversation.$inferInsert;

// ---------------------------------------------------------------------------
// message — individual message within a conversation (append-only)
// ---------------------------------------------------------------------------

export const message = pgTable('message', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:         uuid('tenant_id').notNull(),
  conversationId:   uuid('conversation_id').notNull().references(() => conversation.id),
  direction:        messageDirectionEnum('direction').notNull(),
  channelMessageId: text('channel_message_id'),
  contentType:      messageContentTypeEnum('content_type').notNull(),
  content:          jsonb('content').notNull(),
  status:           messageStatusEnum('status').notNull().default('queued'),
  senderUserId:     uuid('sender_user_id').references(() => user.id),
  sentAt:           timestamp('sent_at', { withTimezone: true }),
  deliveredAt:      timestamp('delivered_at', { withTimezone: true }),
  readAt:           timestamp('read_at', { withTimezone: true }),
  failedReason:     text('failed_reason'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;

// ---------------------------------------------------------------------------
// canned_response — reusable message templates
// ---------------------------------------------------------------------------

export const cannedResponse = pgTable('canned_response', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  tags:      jsonb('tags').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version:   integer('version').notNull().default(1),
});

export type CannedResponse = typeof cannedResponse.$inferSelect;
export type NewCannedResponse = typeof cannedResponse.$inferInsert;

// ---------------------------------------------------------------------------
// auto_triage_rule — automated routing / tagging rules
// ---------------------------------------------------------------------------

export const autoTriageRule = pgTable('auto_triage_rule', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:   uuid('tenant_id').notNull(),
  name:       text('name').notNull(),
  conditions: jsonb('conditions').notNull(),
  action:     jsonb('action').notNull(),
  priority:   integer('priority').notNull().default(0),
  enabled:    boolean('enabled').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:  uuid('created_by').references(() => user.id),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:  uuid('updated_by').references(() => user.id),
  deletedAt:  timestamp('deleted_at', { withTimezone: true }),
  version:    integer('version').notNull().default(1),
});

export type AutoTriageRule = typeof autoTriageRule.$inferSelect;
export type NewAutoTriageRule = typeof autoTriageRule.$inferInsert;
