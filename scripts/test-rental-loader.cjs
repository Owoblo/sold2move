// Exercise the actual loader SQL against temporary copies of the live schema when --database is requested.
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
const { execFileSync } = require('child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rental-loader-test-'));
const row = { source: 'zillow', source_family: 'zillow_trulia', source_listing_id: 'loader-fixture',
  acquisition_scope: 'windsor', acquisition_fresh: true, unit_label: '4', entity_type: 'unit', single_home: false,
  street_address: '123 Test Street', mailing_street: '123 Test Street Unit 4', city: 'Windsor', province: 'ON', postal_code: 'N9A 1A1',
  photo_urls: [], monthly_price: 2000, raw_payload: { fixture: true } };
const property = { ...row, canonical_address: '123 Test Street, Windsor, ON', address_key: '123TESTST',
  source_families: ['zillow_trulia'], listing_categories: ['rental'], property_signals: [], source_record_ids: ['zillow:loader-fixture'] };
for (const [name, value] of Object.entries({ 'normalized-source-records.json': [row], 'canonical-properties.json': [property],
  'summary.json': { acquisitions: [{ source: 'zillow', requested_city: 'Windsor', requested_region: 'windsor', raw_records: 1, fresh: true, complete: true, status: 'succeeded' }], rejection_reasons: {} } })) fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
const capture = path.join(dir, 'sql.json');
const loader = path.join(__dirname, 'load-rental-snapshot.cjs');
const dbFile = path.join(__dirname, 'market-db.cjs');
const code = `const fs=require('fs'); require(${JSON.stringify(dbFile)}).query=async(sql)=>{if(sql.startsWith('BEGIN;')) fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify(sql)); return []}; process.argv=['node',${JSON.stringify(loader)},'rental-sql-fixture']; require(${JSON.stringify(loader)});`;
execFileSync(process.execPath, ['-e', code], { env: { ...process.env, RENTAL_RUN_DIR: dir, SUPABASE_PROJECT_REF: 'test', SUPABASE_ACCESS_TOKEN: 'test' }, stdio: 'pipe' });
const sql = JSON.parse(fs.readFileSync(capture));
assert(sql.includes('unit_label = EXCLUDED.unit_label'));
assert(sql.includes('INSERT INTO rental_pipeline_runs'));
assert(sql.startsWith('BEGIN;') && sql.trim().endsWith('COMMIT;'));
if (process.argv.includes('--database')) {
  const tables = ['rental_properties', 'rental_source_records', 'rental_units', 'rental_source_runs', 'rental_pipeline_runs'];
  const temporary = tables.map(t => `CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING ALL) ON COMMIT DROP;`).join('\n');
  const testSQL = `BEGIN; ${temporary}\n${sql.replace(/^BEGIN;/, '').replace(/COMMIT;\s*$/, '')}
    DO $$ BEGIN
      IF (SELECT count(*) FROM rental_source_records WHERE unit_label='4' AND raw_payload->>'fixture'='true') <> 1 THEN RAISE EXCEPTION 'Rental unit persistence failed'; END IF;
      IF (SELECT count(*) FROM rental_pipeline_runs) <> 1 THEN RAISE EXCEPTION 'Rental replay marker missing'; END IF;
    END $$; ROLLBACK;`;
  require('./market-db.cjs').query(testSQL).then(() => console.log('Rental loader passed against temporary live-schema tables; transaction rolled back.')).catch(e => { console.error(e.message); process.exitCode = 1; });
} else console.log('Rental loader transaction and unit-persistence SQL checks passed.');
