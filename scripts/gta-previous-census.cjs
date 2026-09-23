#!/usr/bin/env node
// Recover a known, complete earlier GTA run without starting or billing a scrape.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { MUNICIPALITIES, normalize } = require('./gta-market-census.cjs');
const { splitBoundsIntoGrid, buildZillowSearchUrl } = require('./postcard-step0-scrape.cjs');
const out = path.join(__dirname, '..', 'reports', 'gta-history');
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } });
  const scans = await db.from('listing_inventory_scans').select('*').limit(50);
  save('inventory-scan-metadata.json', scans.error ? { error: scans.error.message } : scans.data);
  const snapshot = await db.storage.from('gta-inventory').download('latest.json');
  if (snapshot.error) throw snapshot.error;
  const current = JSON.parse(await snapshot.data.text());
  const expected = new Set(MUNICIPALITIES.flatMap(m => {
    const [west, east, south, north] = m.bounds;
    const [rows, cols] = m.grid || [1, 1];
    return splitBoundsIntoGrid({ west, east, south, north }, rows, cols).map(buildZillowSearchUrl);
  }));
  async function api(route) {
    const response = await fetch(`https://api.apify.com/v2/${route}`, {
      headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
    });
    if (!response.ok) throw new Error(`Apify history request failed (${response.status})`);
    return response.json();
  }
  const candidates = [];
  let selected = null;
  for (let offset = 0; offset < 500 && !selected; offset += 100) {
    const response = await api(`acts/maxcopell~zillow-scraper/runs?status=SUCCEEDED&desc=1&limit=100&offset=${offset}`);
    const runs = response.data.items;
    for (const run of runs) {
      const started = Date.parse(run.startedAt || run.createdAt);
      if (started >= Date.parse(current.collected_at) - 24 * 60 * 60 * 1000) continue;
      if (started < Date.parse('2026-07-01')) continue;
      let input;
      try { input = await api(`key-value-stores/${run.defaultKeyValueStoreId}/records/INPUT`); }
      catch { continue; }
      const urls = (input.searchUrls || []).map(u => typeof u === 'string' ? u : u.url);
      const matching = urls.filter(u => expected.has(u)).length;
      if (urls.length >= 80) candidates.push({ id: run.id, started_at: run.startedAt, search_cells: urls.length, matching_cells: matching });
      if (urls.length === expected.size && new Set(urls).size === expected.size && matching === expected.size) {
        selected = run; break;
      }
    }
    if (runs.length < 100) break;
  }
  save('earlier-census-search.json', { candidates, selected_run: selected?.id || null });
  console.log(JSON.stringify({ candidates, selected_run: selected?.id || null }, null, 2));
  if (!selected) return;
  const raw = await api(`datasets/${selected.defaultDatasetId}/items?format=json`);
  if (!Array.isArray(raw) || !raw.length) throw new Error('Earlier GTA dataset is empty');
  const rows = [...new Map(raw.map(normalize).filter(r => r.zpid && r.state === 'ON' && r.municipality)
    .map(r => [String(r.zpid), r])).values()];
  if (!rows.length) throw new Error('Earlier GTA dataset has no recognized listings');
  const history = { source_run_id: selected.id, observed_at: selected.startedAt, search_cells: expected.size, rows };
  const historicalIds = new Set(rows.map(r => String(r.zpid)));
  const currentRows = current.inventory.filter(r => r.last_seen_at === current.collected_at).map(r => r.data);
  const currentIds = new Set(currentRows.map(r => String(r.zpid)));
  const key = r => `${String(r.street || '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${r.municipality}`;
  const currentAddresses = new Set(currentRows.filter(r => r.street).map(key));
  const historicalAddresses = new Set(rows.filter(r => r.street).map(key));
  const missing = rows.filter(r => !currentIds.has(String(r.zpid)) && !currentAddresses.has(key(r)));
  const newlyObserved = currentRows.filter(r => !historicalIds.has(String(r.zpid)) && !historicalAddresses.has(key(r)));
  const summary = { previous_run_id: selected.id, previous_observed_at: selected.startedAt,
    current_observed_at: current.collected_at, previous_count: rows.length, current_count: currentRows.length,
    same_listing_id: rows.filter(r => currentIds.has(String(r.zpid))).length,
    missing_id_but_same_address_active: rows.filter(r => !currentIds.has(String(r.zpid)) && currentAddresses.has(key(r))).length,
    new_to_snapshot_candidates: newlyObserved.length, sold_or_delisted_candidates: missing.length,
    note: 'Candidates require listing-date or sold-status verification; disappearance is not proof of sale.' };
  save('full-census-comparison.json', summary);
  save('full-census-missing-candidates.json', missing);
  save('full-census-new-candidates.json', newlyObserved);
  save('earlier-full-census.json', history);
  const stored = await db.storage.from('gta-inventory').upload(`history/${selected.id}.json`,
    Buffer.from(JSON.stringify(history)), { upsert: true, contentType: 'application/json' });
  if (stored.error) throw stored.error;
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
