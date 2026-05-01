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
