#!/usr/bin/env node
// Read-only database comparison: never changes a listing status or sends mail.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { MUNICIPALITIES } = require('./gta-coverage.cjs');
const key = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const names = new Set(MUNICIPALITIES.flatMap(m => [m.name, ...(m.aliases || [])]).map(key));
const fields = ['id', 'zpid', 'status', 'statustype', 'statustext', 'region', 'city', 'lastcity', 'addresscity',
  'addressstreet', 'addressstate', 'addresszipcode', 'street_address', 'postal_code', 'municipality',
  'first_seen_at', 'last_seen_at', 'lastseenat', 'firstseenat', 'created_at', 'updated_at', 'date_sold',
  'sold_date', 'sold_at', 'listed_at', 'detailurl', 'verification_status', 'verification_confidence'];
const out = path.join(__dirname, '..', 'reports', 'gta-history');
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const cityOf = r => r.city || r.addresscity || r.lastcity || r.municipality;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const url = process.env.VITE_SUPABASE_URL;
  const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !token) throw new Error('Database service credentials are required');
  const db = createClient(url, token, { auth: { persistSession: false } });
  const downloaded = await db.storage.from('gta-inventory').download('latest.json');
  if (downloaded.error) throw downloaded.error;
  const current = JSON.parse(await downloaded.data.text());
  const currentRows = current.inventory.filter(r => r.last_seen_at === current.collected_at);
  const currentIds = new Set(currentRows.map(r => String(r.zpid)));
  const tables = new Set(['listings', 'current_listings', 'just_listed', 'sold_listings']);
  const schemaResponse = await fetch(`${url}/rest/v1/`, { headers: { apikey: token, Authorization: `Bearer ${token}` } });
  if (schemaResponse.ok) {
    const schema = await schemaResponse.json();
    for (const table of Object.keys(schema.paths || {}).map(p => p.slice(1))) {
      if (/gta/.test(table) && !table.includes('/')) tables.add(table);
    }
  }
  const report = { generated_at: new Date().toISOString(), current_observed_at: current.collected_at,
    current_count: currentRows.length, tables: {}, historical_records: 0 };
  const historical = [];
  for (const table of tables) {
    const sample = await db.from(table).select('*').limit(1);
    if (sample.error) { report.tables[table] = { error: sample.error.message }; continue; }
    if (!sample.data.length) { report.tables[table] = { count: 0 }; continue; }
    const available = Object.keys(sample.data[0]);
    const selected = fields.filter(f => available.includes(f));
    const order = available.includes('id') ? 'id' : available.includes('zpid') ? 'zpid' : null;
    if (!order || !selected.length) { report.tables[table] = { columns: available, skipped: 'No supported listing key' }; continue; }
    const rows = [];
    let scanned = 0;
    for (let offset = 0; ; offset += 1000) {
      const page = await db.from(table).select(selected.join(',')).order(order).range(offset, offset + 999);
      if (page.error) throw new Error(`${table}: ${page.error.message}`);
      scanned += page.data.length;
      for (const row of page.data) {
        const cityMatches = [row.city, row.addresscity, row.lastcity, row.municipality].some(c => names.has(key(c)));
        if (cityMatches && (!row.addressstate || row.addressstate.toUpperCase() === 'ON')) rows.push({ ...row, source_table: table });
      }
      if (page.data.length < 1000) break;
    }
    const dates = rows.flatMap(r => [r.first_seen_at, r.firstseenat, r.lastseenat, r.last_seen_at, r.created_at])
      .filter(v => v && Number.isFinite(Date.parse(v))).sort();
    report.tables[table] = { scanned, gta_rows: rows.length, earliest_observation: dates[0] || null,
      latest_observation: dates.at(-1) || null, statuses: rows.reduce((a, r) => {
        const status = r.status || r.statustype || '(unset)'; a[status] = (a[status] || 0) + 1; return a;
      }, {}) };
    historical.push(...rows);
    save(`${table}.json`, rows);
  }
  const byId = new Map();
  for (const row of historical) {
    if (!row.zpid) continue;
    const id = String(row.zpid);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(row);
  }
  const stillPresent = [...byId.keys()].filter(id => currentIds.has(id));
  const missing = [...byId.keys()].filter(id => !currentIds.has(id));
  const newlyObserved = currentRows.filter(row => !byId.has(String(row.zpid)));
  report.historical_records = historical.length;
  report.historical_unique_zpids = byId.size;
  report.still_present = stillPresent.length;
  report.absent_from_current = missing.length;
  report.current_not_in_database_history = newlyObserved.length;
  report.interpretation = 'Absence is a sold/delisted candidate, not proof of sale. New-to-history is not a verified listing date. Historical tables may contain different observation dates and partial coverage.';
  save('missing-candidates.json', missing.map(zpid => ({ zpid, history: byId.get(zpid) })));
  save('new-candidates.json', newlyObserved);
  save('summary.json', report);
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
