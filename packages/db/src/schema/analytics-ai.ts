import { bigserial, boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenant } from './tenancy.js';
import { user } from './tenancy.js';

// ---------------------------------------------------------------------------
// ai_embedding_log  — per-operation embedding token log for cost tracking
// Separate from ai_embedding (vector store). One row per embed call.
// ---------------------------------------------------------------------------

export const aiEmbeddingLog = pgTable('ai_embedding_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  model: text('model').notNull().default('text-embedding-3-small'),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  tokenCount: integer('token_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AiEmbeddingLog = typeof aiEmbeddingLog.$inferSelect;
export type NewAiEmbeddingLog = typeof aiEmbeddingLog.$inferInsert;

// ---------------------------------------------------------------------------
// search_query_log  — one row per search invocation
// Tracks volume, zero-result rate, click-through rate, match type distribution.
// ---------------------------------------------------------------------------

export const searchQueryLog = pgTable('search_query_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => user.id, { onDelete: 'set null' }),
  queryText: text('query_text').notNull(),
  searchType: text('search_type').notNull().default('hybrid'),
  resultCount: integer('result_count').notNull().default(0),
  clickedRank: integer('clicked_rank'),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SearchQueryLog = typeof searchQueryLog.$inferSelect;
export type NewSearchQueryLog = typeof searchQueryLog.$inferInsert;

// ---------------------------------------------------------------------------
// description_generation_log  — one row per AI description generation attempt
// Tracks save rate, tone/portal distribution, generation latency.
// ---------------------------------------------------------------------------

export const descriptionGenerationLog = pgTable('description_generation_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => user.id, { onDelete: 'set null' }),
  propertyId: uuid('property_id'),
  tone: text('tone'),
  portal: text('portal'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  latencyMs: integer('latency_ms'),
  saved: boolean('saved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DescriptionGenerationLog = typeof descriptionGenerationLog.$inferSelect;
export type NewDescriptionGenerationLog = typeof descriptionGenerationLog.$inferInsert;
