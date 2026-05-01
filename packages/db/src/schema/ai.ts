import {
  boolean,
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenant, user } from './tenancy.js';
import { property } from './properties.js';

// ---------------------------------------------------------------------------
// Custom type: pgvector vector(512)
// ---------------------------------------------------------------------------

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(512)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    const str = String(value);
    return str
      .slice(1, -1)
      .split(',')
      .map(Number);
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const aiEntityTypeEnum = pgEnum('ai_entity_type', [
  'property',
  'contact_note',
  'conversation_message',
  'document_page',
  'property_description',
]);

export const copilotIntentEnum = pgEnum('copilot_intent', [
  'property_search',
  'lead_info',
  'schedule',
  'document_qa',
  'market_analysis',
  'general',
  'action_confirm',
]);

export const copilotTurnRoleEnum = pgEnum('copilot_turn_role', [
  'user',
  'assistant',
  'system',
  'tool',
]);

// ---------------------------------------------------------------------------
// ai_embedding — vector store for all RAG content
// ---------------------------------------------------------------------------

export const aiEmbedding = pgTable('ai_embedding', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  entityType: aiEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  chunkIndex: integer('chunk_index').notNull().default(0),
  sourceField: text('source_field'),
  content: text('content').notNull(),
  embedding: vector('embedding').notNull(),
  tokenCount: integer('token_count').notNull().default(0),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AiEmbedding = typeof aiEmbedding.$inferSelect;
export type NewAiEmbedding = typeof aiEmbedding.$inferInsert;

// ---------------------------------------------------------------------------
// copilot_session
// ---------------------------------------------------------------------------

export const copilotSession = pgTable('copilot_session', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  title: text('title'),
  context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
  isActive: boolean('is_active').notNull().default(true),
  turnCount: integer('turn_count').notNull().default(0),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CopilotSession = typeof copilotSession.$inferSelect;
export type NewCopilotSession = typeof copilotSession.$inferInsert;

// ---------------------------------------------------------------------------
// copilot_turn
// ---------------------------------------------------------------------------

export const copilotTurn = pgTable('copilot_turn', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  sessionId: uuid('session_id').notNull().references(() => copilotSession.id, { onDelete: 'cascade' }),
  role: copilotTurnRoleEnum('role').notNull(),
  intent: copilotIntentEnum('intent'),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  // tokenCount kept for backward compat; prefer inputTokens + outputTokens for cost math
  tokenCount: integer('token_count').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  latencyMs: integer('latency_ms'),
  totalMs: integer('total_ms'),
  model: text('model'),
  // analytics fields
  actionType: text('action_type'),
  actionConfirmed: boolean('action_confirmed'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CopilotTurn = typeof copilotTurn.$inferSelect;
export type NewCopilotTurn = typeof copilotTurn.$inferInsert;

// ---------------------------------------------------------------------------
// copilot_quota_usage
// ---------------------------------------------------------------------------

export const copilotQuotaUsage = pgTable('copilot_quota_usage', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  month: text('month').notNull(),
  totalTokens: bigint('total_tokens', { mode: 'number' }).notNull().default(0),
  totalRequests: integer('total_requests').notNull().default(0),
  embeddingTokens: bigint('embedding_tokens', { mode: 'number' }).notNull().default(0),
  chatTokens: bigint('chat_tokens', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CopilotQuotaUsage = typeof copilotQuotaUsage.$inferSelect;
export type NewCopilotQuotaUsage = typeof copilotQuotaUsage.$inferInsert;

// ---------------------------------------------------------------------------
// property_ai_description
// ---------------------------------------------------------------------------

export const propertyAiDescription = pgTable('property_ai_description', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  propertyId: uuid('property_id').notNull().references(() => property.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull().default('es-AR'),
  tone: text('tone').notNull().default('professional'),
  targetPortal: text('target_portal'),
  body: text('body').notNull(),
  isDraft: boolean('is_draft').notNull().default(true),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PropertyAiDescription = typeof propertyAiDescription.$inferSelect;
export type NewPropertyAiDescription = typeof propertyAiDescription.$inferInsert;
