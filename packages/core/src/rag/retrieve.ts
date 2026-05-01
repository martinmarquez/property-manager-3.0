import type { Embedder } from './embedder.js';

export interface RetrievalResult {
  id: string;
  entityType: string;
  entityId: string;
  chunkIndex: number;
  content: string;
  sourceField: string | null;
  metadata: Record<string, unknown>;
  score: number;
}

export interface RetrieveOptions {
  tenantId: string;
  query: string;
  topK?: number;
  entityTypes?: string[];
  rrfK?: number;
}

interface DbRow {
  id: string;
  entity_type: string;
  entity_id: string;
  chunk_index: number;
  content: string;
  source_field: string | null;
  metadata: Record<string, unknown>;
  rank?: number;
  similarity?: number;
}

// Minimal DB interface — compatible with pg Pool, Drizzle raw, or Neon serverless
export interface SqlClient {
  query(text: string, params: unknown[]): Promise<{ rows: DbRow[] }>;
}

function rrfScore(rank: number, k: number): number {
  return 1 / (k + rank);
}

function fuseResults(
  vectorResults: DbRow[],
  keywordResults: DbRow[],
  k: number,
): RetrievalResult[] {
  const scores = new Map<string, { row: DbRow; score: number }>();

  for (let i = 0; i < vectorResults.length; i++) {
    const row = vectorResults[i]!;
    const key = `${row.entity_type}:${row.entity_id}:${row.chunk_index}`;
    const existing = scores.get(key);
    const s = rrfScore(i + 1, k);
    if (existing) {
      existing.score += s;
    } else {
      scores.set(key, { row, score: s });
    }
  }

  for (let i = 0; i < keywordResults.length; i++) {
    const row = keywordResults[i]!;
    const key = `${row.entity_type}:${row.entity_id}:${row.chunk_index}`;
    const existing = scores.get(key);
    const s = rrfScore(i + 1, k);
    if (existing) {
      existing.score += s;
    } else {
      scores.set(key, { row, score: s });
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ row, score }) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      sourceField: row.source_field,
      metadata: row.metadata ?? {},
      score,
    }));
}

export async function retrieve(
  db: SqlClient,
  embedder: Embedder,
  opts: RetrieveOptions,
): Promise<RetrievalResult[]> {
  const topK = opts.topK ?? 10;
  const rrfK = opts.rrfK ?? 60;
  const fetchK = topK * 3;

  const { embedding } = await embedder.embed(opts.query);
  const embeddingStr = `[${embedding.join(',')}]`;

  const entityFilter = opts.entityTypes?.length
    ? `AND entity_type = ANY($3::ai_entity_type[])`
    : '';

  const vectorParams: unknown[] = [opts.tenantId, embeddingStr, fetchK];
  const keywordParams: unknown[] = [opts.tenantId, opts.query, fetchK];

  if (opts.entityTypes?.length) {
    vectorParams.splice(2, 0, opts.entityTypes);
    keywordParams.splice(2, 0, opts.entityTypes);
  }

  const vectorQuery = `
    SELECT id, entity_type, entity_id, chunk_index, content, source_field, metadata,
           1 - (embedding <=> $2::vector) AS similarity
    FROM ai_embedding
    WHERE tenant_id = $1 ${entityFilter}
    ORDER BY embedding <=> $2::vector
    LIMIT $${opts.entityTypes?.length ? 4 : 3}
  `;

  const keywordQuery = `
    SELECT id, entity_type, entity_id, chunk_index, content, source_field, metadata,
           similarity(content, $2) AS similarity
    FROM ai_embedding
    WHERE tenant_id = $1 ${entityFilter}
      AND content % $2
    ORDER BY similarity(content, $2) DESC
    LIMIT $${opts.entityTypes?.length ? 4 : 3}
  `;

  const [vectorResult, keywordResult] = await Promise.all([
    db.query(vectorQuery, vectorParams),
    db.query(keywordQuery, keywordParams),
  ]);

  const fused = fuseResults(vectorResult.rows, keywordResult.rows, rrfK);
  return fused.slice(0, topK);
}
