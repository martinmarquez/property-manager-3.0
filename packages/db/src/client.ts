/**
 * Drizzle client factory
 *
 * createDb()         — Neon HTTP transport (edge / serverless, default)
 * createNodeDb()     — pg Pool (long-running Node processes: API server, workers)
 *
 * Every multi-statement transaction MUST call setTenantContext() at the start
 * to activate RLS.  Single-statement superuser bootstrap queries may skip it.
 *
 * Usage:
 *   const db = createDb(process.env.DATABASE_URL);
 *   await db.transaction(async (tx) => {
 *     await setTenantContext(tx, tenantId, userId);
 *     // ... queries scoped to tenant via RLS
 *   });
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { Pool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index.js';

export type DbSchema = typeof schema;

// ---------------------------------------------------------------------------
// Default: Neon HTTP serverless client
// ---------------------------------------------------------------------------
export function createDb(databaseUrl: string) {
  const conn = neon(databaseUrl);
  return drizzleNeon(conn, { schema });
}

export type Db = ReturnType<typeof createDb>;

// ---------------------------------------------------------------------------
// Node-postgres (pooled) client — for long-running workers
// ---------------------------------------------------------------------------
export function createNodeDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  return drizzlePg(pool, { schema });
}

export type NodeDb = ReturnType<typeof createNodeDb>;

// ---------------------------------------------------------------------------
// RLS context helper — call at the start of every application transaction
// ---------------------------------------------------------------------------
export async function setTenantContext(
  db: Db,
  tenantId: string,
  userId?: string,
) {
  await db.execute(
    sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
  );
  if (userId) {
    await db.execute(
      sql`SELECT set_config('app.user_id', ${userId}, true)`,
    );
  }
}
