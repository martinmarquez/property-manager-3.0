// Writes transformed records to the Corredor import API in batches.

import type {
  EntityStats,
  LogEntry,
  EntityKind,
  CorredorImportProperty,
  CorredorImportContact,
  CorredorImportLead,
  CorredorImportUser,
  CorredorBulkResponse,
} from '../types.js';
import type { CorredorClient } from '../adapters/corredor-api.js';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function writeBatched<T extends { external_id: string }>(
  records: T[],
  kind: EntityKind,
  importFn: (batch: T[]) => Promise<CorredorBulkResponse>,
  dryRun: boolean,
): Promise<{ stats: EntityStats; errors: LogEntry[] }> {
  const stats: EntityStats = { total: records.length, imported: 0, skipped: 0, failed: 0 };
  const errors: LogEntry[] = [];

  if (dryRun) {
    stats.imported = records.length;
    return { stats, errors };
  }

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      const res = await importFn(batch);
      stats.imported += res.imported + res.updated;
      for (const err of res.errors) {
        stats.failed++;
        errors.push({
          entity: kind,
          external_id: err.external_id,
          type: err.code,
          message: err.message,
        });
      }
    } catch (e) {
      for (const rec of batch) {
        stats.failed++;
        errors.push({
          entity: kind,
          external_id: rec.external_id,
          type: 'request_error',
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (i + BATCH_SIZE < records.length) await sleep(BATCH_DELAY_MS);
  }

  return { stats, errors };
}

export async function writeProperties(
  records: CorredorImportProperty[],
  client: CorredorClient,
  dryRun: boolean,
): Promise<{ stats: EntityStats; errors: LogEntry[] }> {
  return writeBatched(records, 'properties', (b) => client.importProperties(b), dryRun);
}

export async function writeContacts(
  records: CorredorImportContact[],
  client: CorredorClient,
  dryRun: boolean,
): Promise<{ stats: EntityStats; errors: LogEntry[] }> {
  return writeBatched(records, 'contacts', (b) => client.importContacts(b), dryRun);
}

export async function writeLeads(
  records: CorredorImportLead[],
  client: CorredorClient,
  dryRun: boolean,
): Promise<{ stats: EntityStats; errors: LogEntry[] }> {
  return writeBatched(records, 'leads', (b) => client.importLeads(b), dryRun);
}

export async function writeUsers(
  records: CorredorImportUser[],
  client: CorredorClient,
  dryRun: boolean,
): Promise<{ stats: EntityStats; errors: LogEntry[] }> {
  return writeBatched(records, 'users', (b) => client.importUsers(b), dryRun);
}
