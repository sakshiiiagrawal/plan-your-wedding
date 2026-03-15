#!/usr/bin/env node
// scripts/setup.mjs — Cross-platform setup script (Windows-compatible alternative to setup.sh)
// Usage: node scripts/setup.mjs

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function checkNodeVersion() {
  const major = parseInt(process.version.slice(1).split('.')[0], 10);
  if (major < 20) {
    console.error(`Node.js 20+ required (found ${process.version}). Install from https://nodejs.org`);
    process.exit(1);
  }
}

function installDeps() {
  console.log('\nInstalling dependencies...');
  const targets = [
    ['root', ROOT],
    ['shared', join(ROOT, 'shared')],
    ['api', join(ROOT, 'api')],
    ['frontend', join(ROOT, 'frontend')],
  ];
  for (const [label, cwd] of targets) {
    console.log(`  → ${label}/`);
    execSync('npm install', { cwd, stdio: 'inherit' });
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

async function configureEnv() {
  console.log('\n--- Supabase Configuration ---');
  console.log('Find these in your Supabase project: Settings > API\n');

  const supabaseUrl = (await ask('SUPABASE_URL (e.g. https://xxxx.supabase.co): ')).trim();
  const serviceKey  = (await ask('SUPABASE_SERVICE_KEY (service_role key): ')).trim();
  const anonKey     = (await ask('SUPABASE_ANON_KEY (anon/public key): ')).trim();

  const jwtInput  = (await ask('JWT_SECRET (press Enter to auto-generate): ')).trim();
  const jwtSecret = jwtInput || randomBytes(48).toString('base64');
  if (!jwtInput) console.log('  → Auto-generated JWT_SECRET');

  console.log('\n--- Optional: Direct database access ---');
  console.log('Needed for `npm run db:migrate`. Format:');
  console.log('  postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres\n');
  const dbUrl = (await ask('DATABASE_URL (press Enter to skip): ')).trim();

  // Build api/.env from .env.example
  const examplePath = join(ROOT, '.env.example');
  let env = existsSync(examplePath) ? readFileSync(examplePath, 'utf8') : '';

  const setVar = (key, val) => {
    if (!val) return;
    const re = new RegExp(`^${key}=.*$`, 'm');
    env = re.test(env) ? env.replace(re, `${key}=${val}`) : env + `\n${key}=${val}`;
  };

  setVar('SUPABASE_URL', supabaseUrl);
  setVar('SUPABASE_SERVICE_KEY', serviceKey);
  setVar('SUPABASE_ANON_KEY', anonKey);
  setVar('JWT_SECRET', jwtSecret);
  setVar('DATABASE_URL', dbUrl);

  writeFileSync(join(ROOT, 'api', '.env'), env);
  console.log('✓ Created api/.env');

  // Write frontend/.env
  const frontendEnv = [
    `VITE_API_URL=http://localhost:3001`,
    `VITE_SUPABASE_URL=${supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
  ].join('\n') + '\n';

  writeFileSync(join(ROOT, 'frontend', '.env'), frontendEnv);
  console.log('✓ Created frontend/.env');
}

async function main() {
  console.log('==================================================');
  console.log('  Wedding Planner — Project Setup');
  console.log('==================================================');

  checkNodeVersion();

  const apiEnvExists      = existsSync(join(ROOT, 'api', '.env'));
  const frontendEnvExists = existsSync(join(ROOT, 'frontend', '.env'));

  if (apiEnvExists && frontendEnvExists) {
    const ans = (await ask('\napi/.env and frontend/.env already exist. Reconfigure? [y/N]: ')).trim();
    if (ans.toLowerCase() === 'y') {
      await configureEnv();
    } else {
      console.log('Skipping env configuration.');
    }
  } else {
    await configureEnv();
  }

  installDeps();

  rl.close();

  console.log('\n==================================================');
  console.log('  Setup complete!');
  console.log('==================================================');
  console.log('\nNext steps:');
  console.log('  1. npm run db:migrate   — apply schema to your database');
  console.log('  2. npm run dev          — start API (:3001) + frontend (:5173)');
  console.log('  3. Open http://localhost:5173/onboard to create your admin account\n');
}

main().catch(err => {
  console.error(err.message);
  rl.close();
  process.exit(1);
});
