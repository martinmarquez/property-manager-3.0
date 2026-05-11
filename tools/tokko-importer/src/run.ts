#!/usr/bin/env node
// Full CLI implementation — cli.ts imports this module.

import { Command } from 'commander';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CorredorClient } from './adapters/corredor-api.js';
import { fetchAllProperties, fetchAllContacts, fetchAllLeads, fetchAllUsers } from './pipeline/fetch.js';
import { validateProperty, validateContact, validateLead } from './pipeline/validate.js';
import { transformProperty, transformContact, transformLead, transformUser } from './pipeline/transform.js';
import { writeProperties, writeContacts, writeLeads, writeUsers } from './pipeline/write.js';
import { loadCheckpoint, saveCheckpoint, createCheckpoint, markEntityComplete } from './checkpoint.js';
import { saveReport, printReport } from './report.js';
import { ProgressDisplay } from './progress.js';
import type { CliOptions, RunReport, EntityStats, LogEntry, EntityKind } from './types.js';

const DATA_LOSS_THRESHOLD = 0.001;
const REPORTS_DIR = '.tokko-import/reports';
const ALL_ENTITIES: EntityKind[] = ['users', 'properties', 'contacts', 'leads'];

function generateRunId(): string {
  return `run-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

export async function runMigration(opts: CliOptions): Promise<void> {
  const runId = opts.runId || generateRunId();
  const progress = new ProgressDisplay();
  const allWarnings: LogEntry[] = [];
  const allErrors: LogEntry[] = [];
  const summary: Partial<Record<EntityKind, EntityStats>> = {};

  const checkpoint = opts.resume
    ? (loadCheckpoint(runId) ?? createCheckpoint(runId, opts))
    : createCheckpoint(runId, opts);

  const client = new CorredorClient(opts.corredorUrl, opts.corredorApiKey);

  if (!opts.dryRun) {
    const ok = await client.ping();
    if (!ok) {
      progress.log('ERROR: Cannot reach Corredor API. Check --corredor-url and --corredor-api-key.');
      process.exit(1);
    }
  }

  const entitiesToRun = opts.entities.filter(
    (e) => e !== 'agency-config' && !checkpoint.completed_entities.includes(e),
  );

  progress.log(`Run ID: ${runId}${opts.dryRun ? ' [DRY RUN]' : ''}`);
  progress.log(`Entities: ${entitiesToRun.join(', ')}`);

  // ── Users ──────────────────────────────────────────────────────────────
  if (entitiesToRun.includes('users')) {
    progress.log('Fetching users...');
    const tokkoUsers = await fetchAllUsers(opts);
    const transformed = tokkoUsers.flatMap((u) => {
      const r = transformUser(u);
      return r ? [r] : [];
    });
    progress.start('users', transformed.length);
    const { stats, errors } = await writeUsers(transformed, client, opts.dryRun);
    stats.skipped = tokkoUsers.length - transformed.length;
    summary['users'] = stats;
    allErrors.push(...errors);
    markEntityComplete(checkpoint, 'users');
    saveCheckpoint(checkpoint);
    progress.done('users');
  }

  // ── Properties ─────────────────────────────────────────────────────────
  if (entitiesToRun.includes('properties')) {
    progress.log('Fetching properties...');
    const tokkoProps = await fetchAllProperties(opts);
    const validProps: ReturnType<typeof transformProperty>[] = [];
    let validationSkipped = 0;

    for (const p of tokkoProps) {
      const vr = validateProperty(p);
      if (vr.skip) {
        validationSkipped++;
      } else {
        for (const w of vr.warnings) {
          allWarnings.push({ entity: 'properties', external_id: String(p.id), type: w.type, message: w.message });
        }
        validProps.push(transformProperty(p));
      }
    }

    progress.start('properties', validProps.length);
    const { stats, errors } = await writeProperties(validProps, client, opts.dryRun);
    stats.total = tokkoProps.length;
    stats.skipped = validationSkipped;
    summary['properties'] = stats;
    allErrors.push(...errors);
    markEntityComplete(checkpoint, 'properties');
    saveCheckpoint(checkpoint);
    progress.done('properties');
  }

  // ── Contacts ───────────────────────────────────────────────────────────
  const importedContactIds = new Set<string>();

  if (entitiesToRun.includes('contacts')) {
    progress.log('Fetching contacts...');
    const tokkoContacts = await fetchAllContacts(opts);
    const validContacts: ReturnType<typeof transformContact>[] = [];
    let validationSkipped = 0;

    for (const c of tokkoContacts) {
      const vr = validateContact(c);
      if (vr.skip) {
        validationSkipped++;
      } else {
        for (const w of vr.warnings) {
          allWarnings.push({ entity: 'contacts', external_id: String(c.id), type: w.type, message: w.message });
        }
        validContacts.push(transformContact(c));
        importedContactIds.add(String(c.id));
      }
    }

    progress.start('contacts', validContacts.length);
    const { stats, errors } = await writeContacts(validContacts, client, opts.dryRun);
    stats.total = tokkoContacts.length;
    stats.skipped = validationSkipped;
    summary['contacts'] = stats;
    allErrors.push(...errors);
    markEntityComplete(checkpoint, 'contacts');
    saveCheckpoint(checkpoint);
    progress.done('contacts');
  }

  // ── Leads ──────────────────────────────────────────────────────────────
  if (entitiesToRun.includes('leads')) {
    progress.log('Fetching leads...');
    const tokkoLeads = await fetchAllLeads(opts);
    const validLeads: ReturnType<typeof transformLead>[] = [];
    let validationSkipped = 0;

    for (const l of tokkoLeads) {
      const vr = validateLead(l, importedContactIds);
      if (vr.skip) {
        validationSkipped++;
      } else {
        for (const w of vr.warnings) {
          allWarnings.push({ entity: 'leads', external_id: String(l.id), type: w.type, message: w.message });
        }
        validLeads.push(transformLead(l));
      }
    }

    progress.start('leads', validLeads.length);
    const { stats, errors } = await writeLeads(validLeads, client, opts.dryRun);
    stats.total = tokkoLeads.length;
    stats.skipped = validationSkipped;
    summary['leads'] = stats;
    allErrors.push(...errors);
    markEntityComplete(checkpoint, 'leads');
    saveCheckpoint(checkpoint);
    progress.done('leads');
  }

  // ── Report ─────────────────────────────────────────────────────────────
  const report: RunReport = {
    run_id: runId,
    started_at: checkpoint.started_at,
    completed_at: new Date().toISOString(),
    status: allErrors.length === 0 ? 'completed' : 'completed_with_errors',
    summary,
    warnings: allWarnings,
    errors: allErrors,
  };

  const reportPath = saveReport(report, REPORTS_DIR);
  printReport(report);
  progress.log(`Report saved to: ${reportPath}`);

  // ── Data loss gate ──────────────────────────────────────────────────────
  let totalFailed = 0;
  let totalProcessed = 0;
  for (const stats of Object.values(summary)) {
    if (!stats) continue;
    totalFailed += stats.failed;
    totalProcessed += stats.total;
  }

  if (totalProcessed > 0 && totalFailed / totalProcessed > DATA_LOSS_THRESHOLD) {
    console.error(
      `\nData loss gate FAILED: ${totalFailed}/${totalProcessed} records failed ` +
        `(${((totalFailed / totalProcessed) * 100).toFixed(2)}% > ${(DATA_LOSS_THRESHOLD * 100).toFixed(1)}% threshold)`,
    );
    process.exit(1);
  }
}

// ── Commander CLI setup ─────────────────────────────────────────────────────

function buildOpts(options: Record<string, unknown>, entities: EntityKind[]): CliOptions {
  const opts: CliOptions = {
    tokkoApiKey: String(options['tokkoApiKey'] ?? ''),
    tokkoAgencyId: String(options['tokkoAgencyId'] ?? ''),
    corredorApiKey: String(options['corredorApiKey'] ?? ''),
    corredorUrl: String(options['corredorUrl'] ?? 'http://localhost:3000'),
    dryRun: Boolean(options['dryRun']),
    resume: Boolean(options['resume']),
    runId: String(options['runId'] ?? ''),
    concurrency: parseInt(String(options['concurrency'] ?? '10'), 10),
    logLevel: (options['logLevel'] as CliOptions['logLevel']) ?? 'info',
    output: (options['output'] as CliOptions['output']) ?? 'terminal',
    noUpdate: !options['update'],
    entities,
  };
  if (options['fromZip']) opts.fromZip = String(options['fromZip']);
  return opts;
}

const program = new Command();

program
  .name('tokko-import')
  .description('Tokko Broker → Corredor data migration tool')
  .version('0.1.0');

function addCommonOptions(cmd: Command): Command {
  return cmd
    .option('--tokko-api-key <key>', 'Tokko API key', process.env['TOKKO_API_KEY'])
    .option('--tokko-agency-id <id>', 'Tokko agency ID', process.env['TOKKO_AGENCY_ID'])
    .option('--corredor-api-key <key>', 'Corredor API key', process.env['CORREDOR_API_KEY'])
    .option('--corredor-url <url>', 'Corredor API base URL', process.env['CORREDOR_URL'] ?? 'http://localhost:3000')
    .option('--dry-run', 'Validate and transform but do not write to Corredor', false)
    .option('--resume', 'Resume from existing checkpoint', false)
    .option('--run-id <id>', 'Run ID for --resume', '')
    .option('--concurrency <n>', 'Photo HEAD-check concurrency', '10')
    .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
    .option('--output <format>', 'Output format (terminal|json|csv)', 'terminal')
    .option('--from-zip <path>', 'Import from ZIP archive instead of live API')
    .option('--no-update', 'Skip updating records that already exist');
}

addCommonOptions(program.command('all').description('Full migration: users → properties → contacts → leads'))
  .action(async (opts: Record<string, unknown>) => {
    await runMigration(buildOpts(opts, ALL_ENTITIES));
  });

addCommonOptions(program.command('properties').description('Migrate properties only'))
  .action(async (opts: Record<string, unknown>) => {
    await runMigration(buildOpts(opts, ['properties']));
  });

addCommonOptions(program.command('contacts').description('Migrate contacts only'))
  .action(async (opts: Record<string, unknown>) => {
    await runMigration(buildOpts(opts, ['contacts']));
  });

addCommonOptions(program.command('leads').description('Migrate leads only'))
  .action(async (opts: Record<string, unknown>) => {
    await runMigration(buildOpts(opts, ['leads']));
  });

addCommonOptions(program.command('users').description('Migrate users only'))
  .action(async (opts: Record<string, unknown>) => {
    await runMigration(buildOpts(opts, ['users']));
  });

program
  .command('report <run-id>')
  .description('Print a saved migration report')
  .action((runId: string) => {
    const filePath = `.tokko-import/reports/${runId}.json`;
    try {
      const report = JSON.parse(readFileSync(filePath, 'utf-8')) as RunReport;
      printReport(report);
    } catch {
      console.error(`Report not found: ${filePath}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
