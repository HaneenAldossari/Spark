#!/usr/bin/env node
/**
 * One-shot DB migration for Spark.
 * Uses the Supabase Management API (requires a Personal Access Token)
 * to execute the SQL files in this directory in order.
 *
 * Usage:
 *   SUPABASE_PAT=sbp_xxx PROJECT_REF=afnsajiqcatxttjnihoi node db/migrate.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PAT = process.env.SUPABASE_PAT;
const REF = process.env.PROJECT_REF;
if (!PAT || !REF) {
  console.error('Missing SUPABASE_PAT or PROJECT_REF env');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const FILES = ['01_schema.sql', '02_rls.sql'];

async function runSql(label, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ ${label} — HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
  return text;
}

for (const f of FILES) {
  const sql = await readFile(join(here, f), 'utf8');
  await runSql(f, sql);
}

// Verification — list public tables
const verify = await runSql(
  'verify',
  `select table_name from information_schema.tables where table_schema='public' order by table_name;`,
);
console.log('--- public tables ---');
console.log(verify);
