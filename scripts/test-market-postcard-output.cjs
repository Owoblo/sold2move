#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Papa = require('papaparse');

function runLane(lane, records, events, baselineScopes = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `market-mail-${lane}-`));
  fs.writeFileSync(path.join(dir, lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json'), JSON.stringify(records));
  fs.writeFileSync(path.join(dir, 'lifecycle-summary.json'), JSON.stringify({ events, baseline_scopes: baselineScopes }));
  const result = spawnSync(process.execPath, [path.join(__dirname, 'market-postcard-output.cjs'), lane, dir],
    { encoding: 'utf8', env: { ...process.env, MARKET_MAIL_DRY_RUN: '1' } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const outputDir = path.join(dir, 'postcard-output');
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, 'summary.json')));
  const csv = fs.readdirSync(outputDir).find(name => name.includes('mail-eligible') && name.endsWith('.csv'));
  const rows = Papa.parse(fs.readFileSync(path.join(outputDir, csv), 'utf8'), { header: true, skipEmptyLines: true }).data;
  return { summary, rows };
}

const rental = {
  source: 'zillow', source_listing_id: 'r1', acquisition_scope: 'gta',
  street_address: '123 Main Street', unit_label: '804', city: 'Toronto', province: 'ON', postal_code: 'M5V 2T6',
  entity_type: 'unit', property_type: 'CONDO', description: 'Furnished unit available September 1.',
  listing_categories: ['rental', 'furnished'], occupancy_state: 'furnished', classification_confidence: 0.91,
  monthly_price: 2800, first_seen_at: new Date().toISOString(),
};
let result = runLane('rental', [rental], [{ event_type: 'just_listed', source: 'zillow', source_listing_id: 'r1' }]);
assert.equal(result.summary.mail_eligible, 1);
assert.equal(result.rows[0].addressstreet, '804-123 Main Street');

result = runLane('rental', [rental], [{ event_type: 'just_listed', source: 'zillow', source_listing_id: 'r1' }],
  [{ source: 'zillow', city: 'gta' }]);
assert.equal(result.summary.mail_eligible, 0, 'first regional baseline must never mail');

const commercial = {
  source: 'realtor_ca_commercial', source_listing_id: 'c1', acquisition_scope: 'gta',
  street_address: '500 King Street West', unit_label: '300', city: 'Toronto', province: 'ON', postal_code: 'M5V 1L9',
  listing_scope: 'unit', transaction_type: 'lease', relocation_candidate_type: 'outgoing_tenant',
  direct_relocation_candidate: true, relocation_probability: 88,
  current_occupant_name: 'Example Company', transition_evidence: [{ type: 'tenant_relocation', text: 'tenant relocating' }],
};
result = runLane('commercial', [commercial], [{ event_type: 'just_listed', source: 'realtor_ca_commercial', source_listing_id: 'c1' }]);
assert.equal(result.summary.mail_eligible, 1);

console.log('Market postcard output tests passed.');
