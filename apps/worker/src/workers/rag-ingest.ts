import type { Job } from 'bullmq';
import { eq, and, sql } from 'drizzle-orm';
import {
  createNodeDb,
  setTenantContext,
  aiEmbedding,
  property,
  type NodeDb,
} from '@corredor/db';
import {
  BaseWorker,
  QUEUE_NAMES,
  chunkEntity,
  Embedder,
  type EntityType,
} from '@corredor/core';
import type Redis from 'ioredis';

export interface RagIngestJobData {
  tenantId: string;
  entityType: EntityType;
  entityId: string;
  action?: 'upsert' | 'delete';
  force?: boolean;
}

export class RagIngestWorker extends BaseWorker<RagIngestJobData, void> {
  private readonly db: NodeDb;
  private readonly embedder: Embedder;

  constructor(redis: Redis, databaseUrl: string, openaiApiKey: string) {
    super(QUEUE_NAMES.RAG_INGEST, { redis, concurrency: 3 });
    this.db = createNodeDb(databaseUrl);
    this.embedder = new Embedder({ apiKey: openaiApiKey, redis });
  }

  protected async process(job: Job<RagIngestJobData>): Promise<void> {
    const { tenantId, entityType, entityId, action = 'upsert' } = job.data;
    this.logger.info('rag_ingest.start', { tenantId, entityType, entityId, action });

    if (action === 'delete') {
      await this.deleteEmbeddings(tenantId, entityType, entityId);
      return;
    }

    const entityData = await this.fetchEntityData(tenantId, entityType, entityId);
    if (!entityData) {
      this.logger.warn('rag_ingest.entity_not_found', { tenantId, entityType, entityId });
      await this.deleteEmbeddings(tenantId, entityType, entityId);
      return;
    }

    const chunks = chunkEntity({
      entityType,
      entityId,
      tenantId,
      data: entityData,
    });

    if (chunks.length === 0) {
      this.logger.info('rag_ingest.no_chunks', { tenantId, entityType, entityId });
      await this.deleteEmbeddings(tenantId, entityType, entityId);
      return;
    }

    const embedResults = await this.embedder.embedBatch(
      chunks.map((c) => c.content),
    );

    await this.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setTenantContext(tx as any, tenantId);

      await tx.delete(aiEmbedding).where(
        and(
          eq(aiEmbedding.tenantId, tenantId),
          eq(aiEmbedding.entityType, entityType),
          eq(aiEmbedding.entityId, entityId),
        ),
      );

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const embed = embedResults[i]!;

        await tx.insert(aiEmbedding).values({
          tenantId,
          entityType,
          entityId,
          chunkIndex: chunk.chunkIndex,
          sourceField: chunk.sourceField,
          content: chunk.content,
          embedding: embed.embedding,
          tokenCount: embed.tokenCount,
          metadata: chunk.metadata,
        });
      }
    });

    this.logger.info('rag_ingest.complete', {
      tenantId,
      entityType,
      entityId,
      chunkCount: chunks.length,
    });
  }

  private async deleteEmbeddings(
    tenantId: string,
    entityType: EntityType,
    entityId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setTenantContext(tx as any, tenantId);
      await tx.delete(aiEmbedding).where(
        and(
          eq(aiEmbedding.tenantId, tenantId),
          eq(aiEmbedding.entityType, entityType),
          eq(aiEmbedding.entityId, entityId),
        ),
      );
    });

    this.logger.info('rag_ingest.deleted', { tenantId, entityType, entityId });
  }

  private async fetchEntityData(
    tenantId: string,
    entityType: EntityType,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    switch (entityType) {
      case 'property':
        return this.fetchProperty(tenantId, entityId);
      case 'contact_note':
        return this.fetchContactNote(tenantId, entityId);
      case 'document_page':
        return this.fetchDocumentPage(tenantId, entityId);
      case 'property_description':
        return this.fetchPropertyDescription(tenantId, entityId);
      case 'conversation_message':
        return this.fetchConversationMessage(tenantId, entityId);
      default:
        this.logger.warn('rag_ingest.unknown_entity_type', { entityType });
        return null;
    }
  }

  private async fetchProperty(
    tenantId: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.db
      .select()
      .from(property)
      .where(
        and(
          eq(property.id, entityId),
          eq(property.tenantId, tenantId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || row.deletedAt) return null;
    return row as unknown as Record<string, unknown>;
  }

  private async fetchContactNote(
    tenantId: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    // contact_note entities use the contact table's notes field
    const result = await this.db.execute(
      sql`SELECT id, first_name, last_name, notes
          FROM contact
          WHERE id = ${entityId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
          LIMIT 1`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (result as any).rows?.[0];
    if (!row?.notes) return null;
    return {
      notes: row.notes,
      contactName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    };
  }

  private async fetchDocumentPage(
    tenantId: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.db.execute(
      sql`SELECT id, status, file_url
          FROM doc_document
          WHERE id = ${entityId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
          LIMIT 1`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (result as any).rows?.[0];
    if (!row) return null;
    return { content: '', pageNumber: 1 };
  }

  private async fetchPropertyDescription(
    tenantId: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.db.execute(
      sql`SELECT body, locale, tone, target_portal
          FROM property_ai_description
          WHERE id = ${entityId} AND tenant_id = ${tenantId}
          LIMIT 1`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (result as any).rows?.[0];
    if (!row) return null;
    return row;
  }

  private async fetchConversationMessage(
    _tenantId: string,
    _entityId: string,
  ): Promise<Record<string, unknown> | null> {
    // Inbox/conversation tables are not yet implemented — return null for now
    return null;
  }
}
