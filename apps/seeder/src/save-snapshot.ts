/**
 * Demo snapshot save command (RENA-208)
 *
 * Exports the current demo tenant state to demo-snapshot.json
 * for use with the reset command.
 *
 * Run: pnpm --filter @corredor/seeder demo:save-snapshot
 * CLI: pnpm demo:save-snapshot --tenant demo
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@corredor/db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../');
config({ path: resolve(repoRoot, '.env.local') });
config({ path: resolve(repoRoot, '.env') });
config();

const DATABASE_URL =
  process.env['DATABASE_URL_UNPOOLED']?.includes('REPLACE_ME')
    ? process.env['DATABASE_URL']
    : (process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']);

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
}

const tenantArg = process.argv.find((a) => a.startsWith('--tenant'));
const tenantSlug = tenantArg?.includes('=')
  ? tenantArg.split('=')[1]
  : process.argv[process.argv.indexOf('--tenant') + 1] ?? 'demo';

const SNAPSHOT_PATH = resolve(__dirname, '../demo-snapshot.json');

const client = postgres(DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const SNAPSHOT_TABLES = [
  'user', 'branch', 'role', 'user_role', 'feature_flag', 'subscription',
  'contact', 'property', 'property_listing', 'property_media', 'property_history',
  'pipeline', 'pipeline_stage', 'lead', 'lead_stage_history',
  'calendar_event_type', 'calendar_event', 'calendar_event_attendee',
  'inbox_channel', 'conversation', 'message',
  'appraisal', 'appraisal_comp', 'appraisal_report',
  'analytics_event', 'kpi_snapshot_daily',
];

async function saveSnapshot() {
  console.log(`📸 Saving demo snapshot for tenant: ${tenantSlug}\n`);

  const [tenant] = await db
    .select()
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, tenantSlug!))
    .limit(1);

  if (!tenant) {
    console.error(`❌ Tenant "${tenantSlug}" not found.`);
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`  Found tenant: ${tenant.name} (${tenantId})`);

  const tables: Record<string, unknown[]> = {};
  let totalRows = 0;

  for (const table of SNAPSHOT_TABLES) {
    const rows = await db.execute(
      sql.raw(`SELECT * FROM "${table}" WHERE tenant_id = '${tenantId}'`)
    );
    tables[table] = rows as unknown[];
    totalRows += (rows as unknown[]).length;
    console.log(`  ✓ ${table}: ${(rows as unknown[]).length} rows`);
  }

  const snapshot = {
    metadata: {
      createdAt: new Date().toISOString(),
      tenantSlug: tenantSlug!,
      tenantId,
      totalRows,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      planCode: tenant.planCode,
    },
    tables,
  };

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  const sizeMb = (Buffer.byteLength(JSON.stringify(snapshot)) / 1024 / 1024).toFixed(2);

  console.log(`\n✅ Snapshot saved to: ${SNAPSHOT_PATH}`);
  console.log(`   Total rows: ${totalRows}`);
  console.log(`   File size: ${sizeMb} MB`);

  await client.end();
}

saveSnapshot().catch((err) => {
  console.error('Snapshot save failed:', err);
  process.exit(1);
});
