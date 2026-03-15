#!/usr/bin/env node
// scripts/migrate.mjs — Database migration runner
//
// Usage:
//   node scripts/migrate.mjs                    → apply unapplied migrations (requires DATABASE_URL)
//   PRINT_ONLY=1 node scripts/migrate.mjs       → print SQL for Supabase SQL Editor
//   INCLUDE_SEEDS=true node scripts/migrate.mjs → also apply *_example_* seed files

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'api', 'supabase', 'migrations');

// Load api/.env
const require = createRequire(import.meta.url);
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: join(ROOT, 'api', '.env') });
} catch {
  // dotenv unavailable — rely on env vars already set
}

const DATABASE_URL = process.env.DATABASE_URL;
const PRINT_ONLY = process.env.PRINT_ONLY === '1';
const INCLUDE_SEEDS = process.env.INCLUDE_SEEDS === 'true';

function getMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && (INCLUDE_SEEDS || !f.includes('_example_')))
    .sort();
}

async function runWithDatabase() {
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('ERROR: pg package not found. Run: npm install (from repo root)');
    process.exit(1);
  }

  const { Client } = pg;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map(r => r.filename));
  const files = getMigrationFiles();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  SKIP   ${file}`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  APPLY  ${file}`);
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    count++;
  }

  await client.end();

  if (count === 0) {
    console.log('All migrations already applied — nothing to do.');
  } else {
    console.log(`\nApplied ${count} migration(s).`);
  }
}

function printOnly() {
  const files = getMigrationFiles();
  console.log('-- ================================================================');
  console.log('-- Wedding Planner: SQL migrations for Supabase SQL Editor');
  console.log('-- Paste the contents below into: Supabase project > SQL Editor');
  console.log('-- ================================================================\n');
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`-- ---- ${file} ----`);
    console.log(sql);
  }
}

if (PRINT_ONLY || !DATABASE_URL) {
  if (!PRINT_ONLY && !DATABASE_URL) {
    console.log('No DATABASE_URL found in api/.env — printing SQL for manual application.\n');
    console.log('Tip: add DATABASE_URL to api/.env and re-run to apply automatically.\n');
  }
  printOnly();
} else {
  runWithDatabase().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
