#!/usr/bin/env node
// Collection only: deliberately does not import the postcard pipeline, output,
// archive, dispatch or email modules. Inventory has its own service-only tables.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { MUNICIPALITIES, main: census } = require('./gta-market-census.cjs');

function validateRows(rows) {
  const names = new Set(MUNICIPALITIES.map(m => m.name));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Empty GTA census; inventory was not changed');
  const seen = new Set();
  for (const row of rows) {
    if (!/^\d+$/.test(row.zpid) || row.state !== 'ON' || !names.has(row.municipality)) {
      throw new Error('Invalid GTA census row; inventory was not changed');
    }
    if (seen.has(row.zpid)) throw new Error('Duplicate GTA listing ID; inventory was not changed');
    seen.add(row.zpid);
  }
  return rows;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL and service-role key are required');
  // Never reuse the old August census or another region's latest actor run.
  process.env.RECOVER_LATEST = 'false';
  const collectedAt = new Date().toISOString();
  const runId = process.env.GITHUB_RUN_ID
    ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
    : `local-${Date.now()}`;
  const { rows, report } = await census();
  validateRows(rows);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc('ingest_gta_collection', {
    p_run_id: runId, p_collected_at: collectedAt, p_rows: rows, p_report: report,
  });
  if (error) throw new Error(`GTA inventory transaction failed: ${error.message}`);
  const summary = { ...data, postcard_generation: 'held', reason: 'Return address pending' };
  fs.writeFileSync(path.join(__dirname, '.gta-census', 'collection-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## GTA collection complete\n\n${data.observed} listings observed; ${data.inserted} first observations.\n\n` +
      `Initial baseline: ${data.baseline}. Postcard generation held: return address pending.\n\n` +
      `Municipalities with no results: ${report.municipalities_with_zero_rows.join(', ') || 'none'}.\n`);
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { validateRows };
