import Anthropic from '@anthropic-ai/sdk';

export interface EvalCase {
  id: string;
  input: string;
  validate: (output: string) => boolean;
  category?: string;
}

export interface EvalBaseline {
  timestamp: string;
  modelId: string;
  totalSamples: number;
  totalCorrect: number;
  overallAccuracy: number;
  passThreshold: number;
  passed: boolean;
  byIntent: Record<string, { correct: number; total: number; accuracy: number }>;
  misclassifications: { expected: string; predicted: string; query: string }[];
}

export interface FeatureEvalConfig {
  featureId: string;
  systemPrompt: string;
  cases: EvalCase[];
  model?: string;
  threshold?: number;
  maxTokens?: number;
}

export async function runFeatureEval(config: FeatureEvalConfig): Promise<EvalBaseline> {
  const client = new Anthropic();
  const model = config.model ?? 'claude-haiku-4-5-20251001';
  const threshold = config.threshold ?? 0.8;

  const byCategory = new Map<
    string,
    { correct: number; total: number; failures: { query: string; predicted: string }[] }
  >();

  let totalCorrect = 0;

  console.info(`  Running ${config.cases.length} cases for ${config.featureId}...\n`);

  for (let i = 0; i < config.cases.length; i++) {
    const c = config.cases[i]!;
    const cat = c.category ?? 'default';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, { correct: 0, total: 0, failures: [] });
    }

    let text = '';
    try {
      const response = await client.messages.create({
        model,
        max_tokens: config.maxTokens ?? 1024,
        system: config.systemPrompt,
        messages: [{ role: 'user', content: c.input }],
      });
      text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    } catch (err) {
      text = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }

    const isCorrect = c.validate(text);
    const bucket = byCategory.get(cat)!;
    bucket.total++;

    if (isCorrect) {
      bucket.correct++;
      totalCorrect++;
    } else {
      bucket.failures.push({
        query: c.input.slice(0, 100),
        predicted: text.slice(0, 100),
      });
    }

    const mark = isCorrect ? '✓' : '✗';
    console.info(
      `  [${String(i + 1).padStart(2)}/${config.cases.length}] ${mark} ${cat.padEnd(16)} | ${c.id}`,
    );
  }

  const totalSamples = config.cases.length;
  const overallAccuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0;

  const byIntent: EvalBaseline['byIntent'] = {};
  for (const [cat, data] of byCategory) {
    byIntent[cat] = {
      correct: data.correct,
      total: data.total,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
    };
  }

  const misclassifications: EvalBaseline['misclassifications'] = [];
  for (const [cat, data] of byCategory) {
    for (const f of data.failures) {
      misclassifications.push({
        expected: cat,
        predicted: f.predicted,
        query: f.query,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    modelId: model,
    totalSamples,
    totalCorrect,
    overallAccuracy,
    passThreshold: threshold,
    passed: overallAccuracy >= threshold,
    byIntent,
    misclassifications,
  };
}

export function tryParseJSON(text: string): unknown | null {
  const cleaned = text.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function hasFields(obj: unknown, fields: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return fields.every((f) => f in obj);
}
