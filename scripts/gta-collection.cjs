#!/usr/bin/env node
// Collection only. This module never calls postcard, dispatch or email code.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { MUNICIPALITIES, main: census } = require('./gta-market-census.cjs');
const BUCKET = 'gta-inventory';
const { getRegionConfig } = require('./postcard-region-config.cjs');

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

function mergeObservations(previous, rows, runId, collectedAt) {
  validateRows(rows);
  if (previous && (previous.version !== 1 || !Array.isArray(previous.inventory) || !previous.baseline_run_id)) {
    throw new Error('Invalid previous inventory; refusing to reset baseline');
  }
  if (previous && collectedAt <= previous.collected_at) throw new Error('Refusing an older inventory snapshot');
  const inventory = new Map((previous?.inventory || []).map(row => [row.zpid, row]));
  let inserted = 0;
  for (const row of rows) {
    const prior = inventory.get(row.zpid);
    if (!prior) inserted++;
    inventory.set(row.zpid, {
      zpid: row.zpid, municipality: row.municipality,
      first_seen_at: prior?.first_seen_at || collectedAt,
      last_seen_at: collectedAt, baseline: prior ? prior.baseline : !previous,
      data: row,
    });
  }
  return {
    version: 1, baseline_run_id: previous?.baseline_run_id || runId,
    run_id: runId, collected_at: collectedAt, observed: rows.length, inserted,
    baseline: !previous, inventory: [...inventory.values()],
  };
}

async function prepareStorage(db) {
  let { data: bucket, error } = await db.storage.getBucket(BUCKET);
  if (error) {
    const result = await db.storage.createBucket(BUCKET, { public: false });
    if (result.error) throw new Error(`Cannot prepare private GTA storage: ${result.error.message}`);
    bucket = { public: false };
  }
  if (bucket.public) throw new Error('GTA inventory bucket must be private');
  const storage = db.storage.from(BUCKET);
  const listed = await storage.list('', { search: 'latest.json', limit: 100 });
  if (listed.error) throw new Error(`Cannot inspect GTA baseline: ${listed.error.message}`);
  let previous = null;
  if (listed.data.some(item => item.name === 'latest.json')) {
    const downloaded = await storage.download('latest.json');
    if (downloaded.error) throw new Error(`Cannot read GTA baseline: ${downloaded.error.message}`);
    previous = JSON.parse(await downloaded.data.text());
  }
  return { storage, previous };
}

async function putJson(storage, name, value, upsert = false) {
  const { error } = await storage.upload(name, Buffer.from(JSON.stringify(value)), {
    contentType: 'application/json', upsert,
  });
  if (error) throw new Error(`Cannot save ${name}: ${error.message}`);
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL and service-role key are required');
  const db = createClient(url, key, { auth: { persistSession: false } });
  // Validate durable storage before starting a paid scrape.
  const { storage, previous } = await prepareStorage(db);
  process.env.RECOVER_LATEST = 'false';
  const collectedAt = new Date().toISOString();
  const runId = process.env.GITHUB_RUN_ID
    ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
    : `local-${Date.now()}`;
  const { rows, report } = await census();
  const snapshot = mergeObservations(previous, rows, runId, collectedAt);
  // Immutable run snapshots precede the latest pointer, so interrupted saves
  // cannot replace a valid baseline with a partial inventory.
  await putJson(storage, `runs/${runId}/inventory.json`, snapshot);
  await putJson(storage, `runs/${runId}/report.json`, report);
  await putJson(storage, 'latest.json', snapshot, true);
  const summary = {
    run_id: runId, observed: snapshot.observed, inserted: snapshot.inserted,
    baseline: snapshot.baseline, baseline_run_id: snapshot.baseline_run_id,
    retained_inventory: snapshot.inventory.length, storage_bucket: BUCKET,
    return_address: getRegionConfig('toronto').returnAddressLines,
    postcard_generation: 'held', reason: 'Historical comparison and listing verification pending',
  };
  fs.writeFileSync(path.join(__dirname, '.gta-census', 'collection-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## GTA collection complete\n\n${summary.observed} listings observed; ${summary.inserted} first observations.\n\n` +
      `Initial baseline: ${summary.baseline}. Stored in private Supabase bucket: ${BUCKET}.\n\n` +
      `Return address confirmed. Postcard generation held pending historical comparison and listing verification.\n\n` +
      `Municipalities with no results: ${report.municipalities_with_zero_rows.join(', ') || 'none'}.\n`);
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { validateRows, mergeObservations, prepareStorage };
