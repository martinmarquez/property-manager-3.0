#!/usr/bin/env npx tsx
/**
 * AI Eval Runner — orchestrates evaluation of all AI features.
 *
 * For features with real eval implementations (currently only `copilot`),
 * delegates to the actual eval script via child_process. For features
 * without eval cases yet, reports them as "pending_cases".
 *
 * Usage:  pnpm --filter @corredor/eval-runner eval
 * Env:    ANTHROPIC_API_KEY  — required for real evals
 *         EVAL_OUTPUT_FILE   — optional path to write the JSON summary
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureEvalResult {
  id: string;
  title: string;
  status: 'evaluated' | 'pending_cases' | 'error';
  accuracy?: number;
  threshold: number;
  passed?: boolean;
  error?: string;
}

interface EvalSummary {
  timestamp: string;
  features: FeatureEvalResult[];
  runnableCount: number;
  passedCount: number;
  pendingCount: number;
  overallPassed: boolean;
}

/** Shape written by the classifier eval when EVAL_OUTPUT_FILE is set. */
interface ClassifierBaseline {
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

// ---------------------------------------------------------------------------
// Feature registry
// ---------------------------------------------------------------------------

interface FeatureSpec {
  id: string;
  title: string;
  threshold: number;
  /** If set, the eval can actually be executed. */
  evalCommand?: string;
}

const FEATURES: FeatureSpec[] = [
  {
    id: 'property.search',
    title: 'Semantic property search',
    threshold: 0.8,
    // TODO: implement eval cases for property.search
  },
  {
    id: 'lead.match_explain',
    title: 'Lead-property match explain',
    threshold: 0.8,
    // TODO: implement eval cases for lead.match_explain
  },
  {
    id: 'property.description',
    title: 'Description generator',
    threshold: 0.8,
    // TODO: implement eval cases for property.description
  },
  {
    id: 'inbox.draft',
    title: 'Email/WhatsApp drafter',
    threshold: 0.8,
    // TODO: implement eval cases for inbox.draft
  },
  {
    id: 'meeting.summarize',
    title: 'Call/meeting note summarizer',
    threshold: 0.8,
    // TODO: implement eval cases for meeting.summarize
  },
  {
    id: 'document.qa',
    title: 'Document Q&A',
    threshold: 0.8,
    // TODO: implement eval cases for document.qa
  },
  {
    id: 'appraisal.assist',
    title: 'Appraisal assistant',
    threshold: 0.8,
    // TODO: implement eval cases for appraisal.assist
  },
  {
    id: 'pipeline.insights',
    title: 'Pipeline insights',
    threshold: 0.8,
    // TODO: implement eval cases for pipeline.insights
  },
  {
    id: 'portal.optimizer',
    title: 'Portal listing optimizer',
    threshold: 0.8,
    // TODO: implement eval cases for portal.optimizer
  },
  {
    id: 'duplicate.detect',
    title: 'Duplicate detector',
    threshold: 0.8,
    // TODO: implement eval cases for duplicate.detect
  },
  {
    id: 'copilot',
    title: 'Copilot (includes classifier)',
    threshold: 0.8,
    evalCommand: 'pnpm --filter @corredor/ai eval:classifier',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRunnable(f: FeatureSpec): boolean {
  return f.evalCommand != null;
}

/**
 * Spawn the classifier eval, capture its JSON output via a temp file,
 * and return the parsed baseline record.
 */
function runClassifierEval(feature: FeatureSpec): FeatureEvalResult {
  const tmpFile = path.join(os.tmpdir(), `eval-classifier-${Date.now()}.json`);

  try {
    // Inherit stdio so the real eval's per-sample output streams to the terminal.
    // The JSON baseline is captured via EVAL_OUTPUT_FILE.
    execSync(feature.evalCommand!, {
      stdio: 'inherit',
      env: { ...process.env, EVAL_OUTPUT_FILE: tmpFile },
      // Allow up to 5 minutes — the classifier eval hits a remote API.
      timeout: 5 * 60 * 1000,
    });

    // Parse the JSON baseline the classifier eval wrote.
    const raw = fs.readFileSync(tmpFile, 'utf-8');
    const baseline: ClassifierBaseline = JSON.parse(raw);

    return {
      id: feature.id,
      title: feature.title,
      status: 'evaluated',
      accuracy: baseline.overallAccuracy,
      threshold: feature.threshold,
      passed: baseline.overallAccuracy >= feature.threshold,
    };
  } catch (err) {
    // The eval itself may exit(1) on threshold failure. In that case the
    // temp file may still have been written before the process exited.
    if (fs.existsSync(tmpFile)) {
      try {
        const raw = fs.readFileSync(tmpFile, 'utf-8');
        const baseline: ClassifierBaseline = JSON.parse(raw);
        return {
          id: feature.id,
          title: feature.title,
          status: 'evaluated',
          accuracy: baseline.overallAccuracy,
          threshold: feature.threshold,
          passed: baseline.overallAccuracy >= feature.threshold,
        };
      } catch {
        // Fall through to generic error handling.
      }
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      id: feature.id,
      title: feature.title,
      status: 'error',
      threshold: feature.threshold,
      error: message,
    };
  } finally {
    // Clean up temp file.
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // best-effort cleanup
    }
  }
}

function buildPendingResult(feature: FeatureSpec): FeatureEvalResult {
  return {
    id: feature.id,
    title: feature.title,
    status: 'pending_cases',
    threshold: feature.threshold,
  };
}

// ---------------------------------------------------------------------------
// Table printer
// ---------------------------------------------------------------------------

function printTable(results: FeatureEvalResult[]): void {
  const colId = 24;
  const colStatus = 14;
  const colAccuracy = 10;
  const colResult = 8;

  const header =
    'Feature'.padEnd(colId) +
    'Status'.padEnd(colStatus) +
    'Accuracy'.padStart(colAccuracy) +
    'Result'.padStart(colResult);

  console.info('\n' + '='.repeat(header.length));
  console.info('AI EVAL SUMMARY');
  console.info('='.repeat(header.length));
  console.info(header);
  console.info('-'.repeat(header.length));

  for (const r of results) {
    const acc =
      r.accuracy != null ? `${(r.accuracy * 100).toFixed(1)}%` : '-';
    let result = '-';
    if (r.status === 'evaluated') {
      result = r.passed ? 'PASS' : 'FAIL';
    } else if (r.status === 'error') {
      result = 'ERROR';
    } else {
      result = 'PENDING';
    }

    console.info(
      r.id.padEnd(colId) +
        r.status.padEnd(colStatus) +
        acc.padStart(colAccuracy) +
        result.padStart(colResult),
    );
  }

  console.info('-'.repeat(header.length));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.info('[eval-runner] Starting AI feature evaluation...\n');

  const results: FeatureEvalResult[] = [];

  for (const feature of FEATURES) {
    if (isRunnable(feature)) {
      console.info(`\n>>> Running eval for: ${feature.id} (${feature.title})`);
      console.info('-'.repeat(60));
      const result = runClassifierEval(feature);
      results.push(result);
    } else {
      results.push(buildPendingResult(feature));
    }
  }

  // Compute aggregates.
  const runnableResults = results.filter(
    (r) => r.status === 'evaluated' || r.status === 'error',
  );
  const runnableCount = runnableResults.length;
  const passedCount = results.filter((r) => r.passed === true).length;
  const pendingCount = results.filter((r) => r.status === 'pending_cases').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  // Overall passes when every evaluated feature meets threshold and none errored.
  const overallPassed =
    runnableCount > 0 &&
    errorCount === 0 &&
    runnableResults.every((r) => r.passed === true);

  const summary: EvalSummary = {
    timestamp: new Date().toISOString(),
    features: results,
    runnableCount,
    passedCount,
    pendingCount,
    overallPassed,
  };

  // Print human-readable table.
  printTable(results);

  console.info(
    `\nRunnable: ${runnableCount}  |  Passed: ${passedCount}  |  Pending: ${pendingCount}  |  Errors: ${errorCount}`,
  );
  console.info(`Overall: ${overallPassed ? 'PASS' : 'FAIL'}\n`);

  // Write JSON to stdout.
  const jsonOutput = JSON.stringify(summary, null, 2);
  console.info('--- JSON Summary ---');
  console.info(jsonOutput);

  // Optionally write JSON to file.
  const outputFile = process.env['EVAL_OUTPUT_FILE'];
  if (outputFile) {
    fs.writeFileSync(outputFile, jsonOutput);
    console.info(`\nSummary written to: ${outputFile}`);
  }

  // Exit with failure if any runnable feature is below threshold or errored.
  if (!overallPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[eval-runner] Fatal error:', err);
  process.exit(1);
});
