#!/usr/bin/env npx tsx
/**
 * Intent classifier evaluation script.
 * Runs the classifier against a labeled dataset and reports accuracy.
 * Exit code 1 if overall accuracy < 80%.
 *
 * Usage: pnpm --filter @corredor/ai eval:classifier
 * Requires: ANTHROPIC_API_KEY environment variable
 */
import Anthropic from '@anthropic-ai/sdk';
import { classifyIntent, type IntentType } from '../classifier.js';
import { evalDataset, type EvalSample } from './intent-eval-dataset.js';

const ACCURACY_THRESHOLD = 0.8;

interface IntentResult {
  correct: number;
  total: number;
  failures: { query: string; predicted: IntentType }[];
}

async function runEval() {
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('ERROR: ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  const client = new Anthropic();
  const results = new Map<IntentType, IntentResult>();

  const intents: IntentType[] = [
    'property_search', 'lead_info', 'schedule', 'document_qa',
    'market_analysis', 'general', 'action_confirm',
  ];
  for (const intent of intents) {
    results.set(intent, { correct: 0, total: 0, failures: [] });
  }

  console.log(`Running classifier eval: ${evalDataset.length} samples\n`);

  let totalCorrect = 0;

  for (let i = 0; i < evalDataset.length; i++) {
    const sample = evalDataset[i]!;
    const result = await classifyIntent(client, sample.query, sample.context);
    const isCorrect = result.type === sample.expectedIntent;

    const bucket = results.get(sample.expectedIntent)!;
    bucket.total++;
    if (isCorrect) {
      bucket.correct++;
      totalCorrect++;
    } else {
      bucket.failures.push({ query: sample.query, predicted: result.type });
    }

    const mark = isCorrect ? '✓' : '✗';
    const extra = isCorrect ? '' : ` (got: ${result.type})`;
    console.log(
      `  [${String(i + 1).padStart(2)}/${evalDataset.length}] ${mark} ${sample.expectedIntent.padEnd(16)} | ${sample.query.slice(0, 60)}${extra}`,
    );
  }

  const overallAccuracy = totalCorrect / evalDataset.length;

  console.log('\n' + '═'.repeat(72));
  console.log('RESULTS');
  console.log('═'.repeat(72));
  console.log(
    `\n${'Intent'.padEnd(18)} ${'Correct'.padStart(7)} / ${'Total'.padStart(5)}   ${'Accuracy'.padStart(8)}`,
  );
  console.log('─'.repeat(48));

  for (const intent of intents) {
    const r = results.get(intent)!;
    if (r.total === 0) continue;
    const acc = ((r.correct / r.total) * 100).toFixed(1);
    console.log(
      `${intent.padEnd(18)} ${String(r.correct).padStart(7)} / ${String(r.total).padStart(5)}   ${acc.padStart(7)}%`,
    );
  }

  console.log('─'.repeat(48));
  console.log(
    `${'OVERALL'.padEnd(18)} ${String(totalCorrect).padStart(7)} / ${String(evalDataset.length).padStart(5)}   ${(overallAccuracy * 100).toFixed(1).padStart(7)}%`,
  );
  console.log();

  const failedIntents = intents.filter((i) => {
    const r = results.get(i)!;
    return r.failures.length > 0;
  });

  if (failedIntents.length > 0) {
    console.log('MISCLASSIFICATIONS:');
    for (const intent of failedIntents) {
      const r = results.get(intent)!;
      for (const f of r.failures) {
        console.log(`  expected=${intent}  predicted=${f.predicted}  query="${f.query}"`);
      }
    }
    console.log();
  }

  if (overallAccuracy < ACCURACY_THRESHOLD) {
    console.log(
      `FAIL: Overall accuracy ${(overallAccuracy * 100).toFixed(1)}% is below ${ACCURACY_THRESHOLD * 100}% threshold`,
    );
    process.exit(1);
  }

  console.log(
    `PASS: Overall accuracy ${(overallAccuracy * 100).toFixed(1)}% meets ${ACCURACY_THRESHOLD * 100}% threshold`,
  );
}

runEval().catch((err) => {
  console.error('Eval failed:', err);
  process.exit(1);
});
