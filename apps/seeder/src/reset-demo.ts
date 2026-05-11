/**
 * Demo reset command (RENA-208)
 *
 * Restores the demo tenant from a snapshot, recalculates timestamps
 * to appear fresh, and regenerates inbox message timestamps.
 *
 * Run: pnpm --filter @corredor/seeder demo:reset
 * CLI: pnpm demo:reset --tenant demo
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
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

// Parse --tenant arg
const tenantArg = process.argv.find((a) => a.startsWith('--tenant'));
const tenantSlug = tenantArg?.includes('=')
  ? tenantArg.split('=')[1]
  : process.argv[process.argv.indexOf('--tenant') + 1] ?? 'demo';

const SNAPSHOT_PATH = resolve(__dirname, '../demo-snapshot.json');

interface SnapshotData {
  tenant: Record<string, unknown>;
  tables: Record<string, Array<Record<string, unknown>>>;
  metadata: {
    createdAt: string;
    tenantSlug: string;
    tenantId: string;
  };
}

const client = postgres(DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const DEMO_TABLES = [
  'analytics_event', 'kpi_snapshot_daily', 'appraisal_report', 'appraisal_comp',
  'appraisal', 'message', 'conversation', 'inbox_channel', 'calendar_event_attendee',
  'calendar_event', 'calendar_event_type', 'lead_stage_history', 'lead',
  'pipeline_stage', 'pipeline', 'property_listing', 'property_media',
  'property_history', 'property', 'contact', 'subscription', 'feature_flag',
  'user_role', 'role', 'branch', 'session', 'user',
];

async function resetDemo() {
  console.log(`🔄 Resetting demo tenant: ${tenantSlug}\n`);

  // Find tenant
  const [tenant] = await db
    .select()
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, tenantSlug!))
    .limit(1);

  if (!tenant) {
    console.error(`❌ Tenant "${tenantSlug}" not found. Run seed:demo first.`);
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`  Found tenant: ${tenant.name} (${tenantId})`);

  // Check for snapshot
  const hasSnapshot = existsSync(SNAPSHOT_PATH);

  if (hasSnapshot) {
    console.log('→ Restoring from snapshot...');
    const snapshot: SnapshotData = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));

    if (snapshot.metadata.tenantId !== tenantId) {
      console.warn(`  ⚠ Snapshot tenant ID mismatch. Snapshot: ${snapshot.metadata.tenantId}, Current: ${tenantId}`);
      console.warn('  Proceeding with clean reset instead.');
      await cleanAndReseed(tenantId);
    } else {
      await restoreFromSnapshot(tenantId, snapshot);
    }
  } else {
    console.log('→ No snapshot found. Performing clean reset...');
    await cleanAndReseed(tenantId);
  }

  // Recalculate timestamps to appear fresh
  console.log('→ Recalculating timestamps...');
  await recalculateTimestamps(tenantId);

  console.log('\n✅ Demo reset complete!');
  await client.end();
}

async function cleanAndReseed(tenantId: string) {
  console.log('→ Deleting existing demo data...');

  for (const table of DEMO_TABLES) {
    await db.execute(sql.raw(`DELETE FROM "${table}" WHERE tenant_id = '${tenantId}'`));
  }
  console.log('  ✓ Existing data cleared');

  // Re-run the seeder
  console.log('→ Re-seeding demo data...');
  const { execSync } = await import('child_process');
  execSync('pnpm --filter @corredor/seeder seed:demo', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env as NodeJS.ProcessEnv,
  });
}

async function restoreFromSnapshot(tenantId: string, snapshot: SnapshotData) {
  // Delete existing data in dependency order
  console.log('  Clearing existing data...');
  for (const table of DEMO_TABLES) {
    await db.execute(sql.raw(`DELETE FROM "${table}" WHERE tenant_id = '${tenantId}'`));
  }

  // Restore in reverse dependency order
  const restoreOrder = [...DEMO_TABLES].reverse();
  for (const table of restoreOrder) {
    const rows = snapshot.tables[table];
    if (!rows || rows.length === 0) continue;

    // Build bulk insert
    const columns = Object.keys(rows[0]!);
    const colList = columns.map((c) => `"${c}"`).join(', ');

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const valuePlaceholders = batch.map((row) => {
        const vals = columns.map((col) => {
          const v = row[col];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return String(v);
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        return `(${vals.join(', ')})`;
      }).join(',\n');

      await db.execute(sql.raw(
        `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders} ON CONFLICT DO NOTHING`
      ));
    }
    console.log(`  ✓ Restored ${rows.length} rows to ${table}`);
  }
}

async function recalculateTimestamps(tenantId: string) {
  const now = new Date();

  // Shift all timestamps so the most recent activity appears as "today"
  // Find the max created_at across key tables
  const [maxTs] = await db.execute(sql.raw(`
    SELECT MAX(latest) as max_ts FROM (
      SELECT MAX(created_at) as latest FROM "property" WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT MAX(created_at) FROM "contact" WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT MAX(created_at) FROM "lead" WHERE tenant_id = '${tenantId}'
    ) t
  `));

  if (!maxTs || !(maxTs as Record<string, unknown>)['max_ts']) {
    console.log('  No timestamps to recalculate');
    return;
  }

  const maxDate = new Date((maxTs as Record<string, unknown>)['max_ts'] as string);
  const offsetMs = now.getTime() - maxDate.getTime();
  const offsetInterval = `${Math.floor(offsetMs / 1000)} seconds`;

  // Shift timestamps in key tables
  const timestampTables = [
    { table: 'property', cols: ['created_at', 'updated_at'] },
    { table: 'contact', cols: ['created_at', 'updated_at'] },
    { table: 'lead', cols: ['created_at', 'updated_at', 'stage_entered_at'] },
    { table: 'conversation', cols: ['created_at', 'updated_at', 'last_message_at'] },
    { table: 'message', cols: ['created_at'] },
    { table: 'calendar_event', cols: ['start_at', 'end_at'] },
    { table: 'analytics_event', cols: ['occurred_at', 'created_at'] },
    { table: 'kpi_snapshot_daily', cols: ['created_at'] },
  ];

  for (const { table, cols } of timestampTables) {
    const setClauses = cols.map((c) => `"${c}" = "${c}" + INTERVAL '${offsetInterval}'`).join(', ');
    await db.execute(sql.raw(
      `UPDATE "${table}" SET ${setClauses} WHERE tenant_id = '${tenantId}'`
    ));
  }

  // Shift KPI dates
  await db.execute(sql.raw(
    `UPDATE "kpi_snapshot_daily" SET "date" = "date" + INTERVAL '${offsetInterval}' WHERE tenant_id = '${tenantId}'`
  ));

  console.log(`  ✓ Timestamps shifted by ${Math.round(offsetMs / 86400000)} days`);

  // Make inbox messages appear fresh (last few hours)
  await db.execute(sql.raw(`
    UPDATE "message" m SET "created_at" = NOW() - (RANDOM() * INTERVAL '48 hours')
    WHERE m.tenant_id = '${tenantId}'
    AND m.conversation_id IN (
      SELECT id FROM "conversation" WHERE tenant_id = '${tenantId}' ORDER BY created_at DESC LIMIT 3
    )
  `));
  console.log('  ✓ Recent inbox messages refreshed');

  // Move some calendar events to upcoming days
  await db.execute(sql.raw(`
    UPDATE "calendar_event" SET
      "start_at" = NOW() + (RANDOM() * INTERVAL '7 days') + INTERVAL '8 hours',
      "end_at" = NOW() + (RANDOM() * INTERVAL '7 days') + INTERVAL '9 hours'
    WHERE tenant_id = '${tenantId}'
    AND "start_at" < NOW()
    ORDER BY "start_at" DESC
    LIMIT 8
  `));
  console.log('  ✓ Upcoming calendar events refreshed');
}

resetDemo().catch((err) => {
  console.error('Demo reset failed:', err);
  process.exit(1);
});
