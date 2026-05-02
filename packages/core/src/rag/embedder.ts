import type { RedisClient } from '../rate-limit.js';
import { checkRateLimit, RateLimitPresets } from '../rate-limit.js';

export interface EmbedResult {
  embedding: number[];
  tokenCount: number;
}

export interface EmbedderOptions {
  apiKey: string;
  redis: RedisClient;
  model?: string;
  dimensions?: number;
  maxRetries?: number;
  baseUrl?: string;
}

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 512;
const MAX_BATCH_SIZE = 2048;

async function callOpenAIEmbeddings(
  texts: string[],
  opts: { apiKey: string; model: string; dimensions: number; baseUrl: string },
): Promise<{ embeddings: number[][]; totalTokens: number }> {
  const response = await fetch(`${opts.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: opts.model,
      dimensions: opts.dimensions,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(
      new Error(`OpenAI embeddings error ${response.status}: ${body}`),
      { status: response.status },
    );
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };

  const sorted = json.data.sort((a, b) => a.index - b.index);
  return {
    embeddings: sorted.map((d) => d.embedding),
    totalTokens: json.usage.total_tokens,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Embedder {
  private readonly apiKey: string;
  private readonly redis: RedisClient;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;

  constructor(opts: EmbedderOptions) {
    this.apiKey = opts.apiKey;
    this.redis = opts.redis;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;
    this.maxRetries = opts.maxRetries ?? 5;
    this.baseUrl = opts.baseUrl ?? 'https://api.openai.com/v1';
  }

  async embed(text: string): Promise<EmbedResult> {
    const results = await this.embedBatch([text]);
    return results[0]!;
  }

  async embedBatch(texts: string[]): Promise<EmbedResult[]> {
    if (texts.length === 0) return [];

    const allResults: EmbedResult[] = [];

    for (let offset = 0; offset < texts.length; offset += MAX_BATCH_SIZE) {
      const batch = texts.slice(offset, offset + MAX_BATCH_SIZE);
      const batchResults = await this.embedBatchWithRetry(batch);
      allResults.push(...batchResults);
    }

    return allResults;
  }

  private async embedBatchWithRetry(texts: string[]): Promise<EmbedResult[]> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      await this.waitForRateLimit(texts.length);

      try {
        const { embeddings, totalTokens } = await callOpenAIEmbeddings(texts, {
          apiKey: this.apiKey,
          model: this.model,
          dimensions: this.dimensions,
          baseUrl: this.baseUrl,
        });

        const tokensPerText = Math.ceil(totalTokens / texts.length);
        return embeddings.map((embedding) => ({
          embedding,
          tokenCount: tokensPerText,
        }));
      } catch (err) {
        const status = typeof err === 'object' && err !== null && 'status' in err ? (err as { status: number }).status : 0;
        if (status === 429 || status === 503 || status === 500) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 60_000);
          const jitter = Math.random() * backoffMs * 0.1;
          await sleep(backoffMs + jitter);
          continue;
        }
        throw err;
      }
    }

    throw new Error(`OpenAI embedding failed after ${this.maxRetries} retries`);
  }

  private async waitForRateLimit(requestCount: number): Promise<void> {
    for (let i = 0; i < requestCount; i++) {
      const result = await checkRateLimit(
        this.redis,
        'ratelimit:openai_embed:global',
        RateLimitPresets.OPENAI_EMBED,
      );

      if (!result.allowed) {
        await sleep(result.retryAfterSeconds * 1000);
      }
    }
  }
}
