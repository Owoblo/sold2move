// Exercise the actual loader SQL against temporary copies of the live schema when --database is requested.
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
const { execFileSync } = require('child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commercial-loader-test-'));
const row = { source: 'realtor_ca_commercial', source_family: 'realtor', source_listing_id: 'loader-fixture',
  acquisition_scope: 'windsor', acquisition_fresh: true, unit_label: '4', entity_type: 'unit', single_home: false,
  street_address: '123 Test Street', mailing_street: '123 Test Street Unit 4', city: 'Windsor', province: 'ON', postal_code: 'N9A 1A1',
  photo_urls: [], transaction_type: 'lease', asset_type: 'office', listing_scope: 'unit', occupant_confidence: 0, relocation_probability: 0, direct_relocation_candidate: false, relocation_reasons: [], transition_evidence: [], outreach_status: 'market_intelligence_only', address_key: '123TESTST' };
const property = { ...row, canonical_address: '123 Test Street, Windsor, ON', address_key: '123TESTST',
  asset_types: ['office'], source_families: ['realtor'], listing_categories: ['commercial'], property_signals: [], source_record_ids: ['zillow:loader-fixture'] };
for (const [name, value] of Object.entries({ 'source-records.json': [row], 'canonical-properties.json': [property],
  'summary.json': { acquisitions: [{ source: 'zillow', requested_city: 'Windsor', requested_region: 'windsor', raw_records: 1, fresh: true, complete: true, status: 'succeeded' }], rejection_reasons: {} } })) fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
const capture = path.join(dir, 'sql.json');
const loader = path.join(__dirname, 'load-commercial-snapshot.cjs');
const dbFile = path.join(__dirname, 'market-db.cjs');
const code = `const fs=require('fs'); require(${JSON.stringify(dbFile)}).query=async()=>[]; require(${JSON.stringify(path.join(__dirname, 'rental-import.cjs'))}).executeTransaction=async(statements)=>fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify('BEGIN;'+statements.join('\\n')+'COMMIT;')); process.argv=['node',${JSON.stringify(loader)},'commercial-sql-fixture']; require(${JSON.stringify(loader)});`;
execFileSync(process.execPath, ['-e', code], { env: { ...process.env, COMMERCIAL_RUN_DIR: dir, SUPABASE_PROJECT_REF: 'test', SUPABASE_ACCESS_TOKEN: 'test' }, stdio: 'pipe' });
const sql = JSON.parse(fs.readFileSync(capture));
assert(sql.includes('unit_label = EXCLUDED.unit_label'));
assert(sql.includes('INSERT INTO commercial_pipeline_runs'));
assert(sql.startsWith('BEGIN;') && sql.trim().endsWith('COMMIT;'));
if (process.argv.includes('--database')) {
  const tables = ['commercial_properties', 'commercial_source_records', 'commercial_spaces', 'commercial_pipeline_runs'];
  const temporary = tables.map(t => `CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING ALL) ON COMMIT DROP;`).join('\n');
  const testSQL = `BEGIN; ${temporary}\n${sql.replace(/^BEGIN;/, '').replace(/COMMIT;\s*$/, '')}
    DO $$ BEGIN
      IF (SELECT count(*) FROM commercial_source_records WHERE unit_label='4') <> 1 THEN RAISE EXCEPTION 'Commercial unit persistence failed'; END IF;
      IF (SELECT count(*) FROM commercial_pipeline_runs) <> 1 THEN RAISE EXCEPTION 'Commercial replay marker missing'; END IF;
    END $$; ROLLBACK;`;
  require('./rental-import.cjs').executeTransaction([testSQL.replace(/^BEGIN;/, '').replace(/ROLLBACK;\s*$/, '')], {table:'commercial_import_chunks'}).then(async () => {
    console.log('Commercial chunked loader passed against temporary live-schema tables; temporary records removed at commit.');
  }).catch(e=>{console.error(e.message);process.exitCode=1;});
} else console.log('Commercial loader transaction SQL checks passed.');
