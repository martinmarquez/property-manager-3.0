import { config } from 'dotenv';
import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../');

// Load repo-root .env.local first (local Docker), then fall back to packages/db/.env (Neon dev branch).
// dotenv does not override vars already set in the environment.
config({ path: resolve(repoRoot, '.env.local') });
config({ path: resolve(repoRoot, '.env') });
config(); // packages/db/.env (CWD)

// Prefer DATABASE_URL for local dev; Neon users should set DATABASE_URL_UNPOOLED
// for direct (non-pooled) migration connections.
const url =
  process.env['DATABASE_URL_UNPOOLED']?.includes('REPLACE_ME')
    ? process.env['DATABASE_URL']
    : (process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']);

if (!url) throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');

const migrationsFolder = resolve(__dirname, '../migrations');

const pool = new Pool({ connectionString: url });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsFolder))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows: applied } = await pool.query<{ name: string }>(
    'SELECT name FROM __migrations',
  );
  const appliedSet = new Set(applied.map((r) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    const sql = await readFile(resolve(migrationsFolder, file), 'utf8');
    console.log(`  apply ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO __migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }

  console.log('Migrations complete.');
} finally {
  await pool.end();
}
