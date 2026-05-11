// Saves and prints migration run reports.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { RunReport } from './types.js';

export function saveReport(report: RunReport, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${report.run_id}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export function printReport(report: RunReport): void {
  console.log('\n--- Migration Report ---');
  console.log(`Run ID:  ${report.run_id}`);
  console.log(`Status:  ${report.status}`);
  console.log(`Started: ${report.started_at}`);
  console.log(`Done:    ${report.completed_at}`);
  console.log('');

  for (const [entity, stats] of Object.entries(report.summary)) {
    if (!stats) continue;
    console.log(
      `  ${entity}: total=${stats.total} imported=${stats.imported} skipped=${stats.skipped} failed=${stats.failed}`,
    );
  }

  if (report.warnings.length > 0) {
    const shown = report.warnings.slice(0, 20);
    console.log(`\nWarnings (${report.warnings.length}):`);
    for (const w of shown) {
      console.log(`  [${w.entity}:${w.external_id}] ${w.type}: ${w.message}`);
    }
    if (report.warnings.length > 20) {
      console.log(`  ... and ${report.warnings.length - 20} more`);
    }
  }

  if (report.errors.length > 0) {
    const shown = report.errors.slice(0, 20);
    console.log(`\nErrors (${report.errors.length}):`);
    for (const e of shown) {
      console.log(`  [${e.entity}:${e.external_id}] ${e.type}: ${e.message}`);
    }
    if (report.errors.length > 20) {
      console.log(`  ... and ${report.errors.length - 20} more`);
    }
  }
  console.log('');
}
