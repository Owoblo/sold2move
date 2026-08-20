#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Papa = require('papaparse');
const https = require('node:https');
const { rentalPlaybook, commercialPlaybook } = require('./market-intelligence-playbooks.cjs');
const { addressKey } = require('./rental-market-lib.cjs');

const lane = process.argv[2];
const runDir = process.argv[3];
if (!['rental', 'commercial'].includes(lane) || !runDir) {
  throw new Error('Usage: market-postcard-output.cjs rental|commercial RUN_DIR');
}

const inventoryFile = lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json';
const records = JSON.parse(fs.readFileSync(path.join(runDir, inventoryFile), 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(runDir, 'lifecycle-summary.json'), 'utf8'));
const outputDir = path.join(runDir, 'postcard-output');
fs.mkdirSync(outputDir, { recursive: true });

const key = row => `${row.source}|${row.source_listing_id}`;
const newEvents = new Set((lifecycle.events || []).filter(event => event.event_type === 'just_listed').map(key));
const baselineScopes = new Set((lifecycle.baseline_scopes || []).map(scope => `${scope.source}|${scope.city}`));
const validPostal = value => /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(String(value || '').trim());
const numberedStreet = value => /^\s*\d/.test(String(value || ''));
const sourceScope = row => `${row.source}|${row.acquisition_scope || row.requested_region || row.city}`;
const standaloneTypes = new Set(['SINGLE_FAMILY', 'TOWNHOUSE', 'SEMI_DETACHED', 'DETACHED', 'HOUSE']);
const sqlText = value => `'${String(value ?? '').replaceAll("'", "''")}'`;

function query(sql) {
  const project = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!project || !token) {
    if (process.env.MARKET_MAIL_DRY_RUN === '1') return Promise.resolve([]);
    return Promise.reject(new Error('Supabase management credentials are required for persistent mail suppression'));
  }
  const body = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: 'api.supabase.com', path: `/v1/projects/${project}/database/query`, method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, response => {
      let result = '';
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => response.statusCode >= 200 && response.statusCode < 300
        ? resolve(result ? JSON.parse(result) : [])
        : reject(new Error(`Supabase ${response.statusCode}: ${result.slice(0, 500)}`)));
    });
    request.on('error', reject);
    request.end(body);
  });
}

function rentalEligibility(row) {
  if (!numberedStreet(row.street_address)) return 'no_street_number';
  if (!validPostal(row.postal_code)) return 'invalid_or_missing_postal';
  const text = String(row.description || '').toLowerCase();
  if (/\b(?:room|roommate|shared accommodation|bedroom for rent|sublet)\b/.test(text)) return 'room_shared_or_sublet';
  const specific = Boolean(row.unit_label) || standaloneTypes.has(String(row.property_type || '').toUpperCase());
  if (!specific) return 'unit_or_standalone_home_not_proven';
  if (!['furnished', 'partially_furnished'].includes(row.occupancy_state)) return 'turnover_occupancy_not_proven';
  if (Number(row.classification_confidence || 0) < 0.7) return 'classification_confidence_below_0_70';
  const decision = rentalPlaybook(row);
  if (decision.movement_score < 70) return `movement_score_${decision.movement_score}_below_70`;
  return null;
}

function commercialEligibility(row) {
  if (!numberedStreet(row.street_address)) return 'no_street_number';
  if (!validPostal(row.postal_code)) return 'invalid_or_missing_postal';
  if (row.relocation_candidate_type !== 'outgoing_tenant') return 'not_outgoing_tenant';
  if (!row.direct_relocation_candidate) return 'commercial_hard_gate_failed';
  if (row.listing_scope !== 'unit' || !row.unit_label) return 'specific_unit_not_proven';
  if (Number(row.relocation_probability || 0) < 70) return 'relocation_probability_below_70';
  const decision = commercialPlaybook(row);
  if (decision.movement_score < 70) return `movement_score_${decision.movement_score}_below_70`;
  return null;
}

async function main() {
const rejected = [];
const candidates = [];
for (const row of records) {
  const reason = lane === 'rental' ? rentalEligibility(row) : commercialEligibility(row);
  if (reason) rejected.push({ source: row.source, source_listing_id: row.source_listing_id, reason });
  else candidates.push(row);
}

const unique = new Map();
for (const row of candidates) {
  const identity = [addressKey(row.street_address), String(row.unit_label || '').toUpperCase(),
    String(row.postal_code || '').replace(/\s/g, '').toUpperCase()].join('|');
  if (!unique.has(identity)) unique.set(identity, row);
}
const eventType = lane === 'rental' ? 'rental_turnover' : 'commercial_move_out';
const entityKey = row => [addressKey(row.street_address), String(row.unit_label || '').toUpperCase(),
  String(row.postal_code || '').replace(/\s/g, '').toUpperCase()].join('|');
const history = await query(`SELECT entity_key FROM market_mail_items
  WHERE lane=${sqlText(lane)} AND event_type=${sqlText(eventType)}
    AND status IN ('generated','mailed');`);
const suppressedKeys = new Set(history.map(row => row.entity_key));
const historySuppressed = [];
const eligible = [...unique.values()].filter(row => {
  if (!suppressedKeys.has(entityKey(row))) return true;
  historySuppressed.push({ source: row.source, source_listing_id: row.source_listing_id, reason: 'address_unit_event_already_generated_or_mailed' });
  return false;
}).sort((a, b) =>
  Number((b.relocation_probability || b.classification_confidence) || 0) -
  Number((a.relocation_probability || a.classification_confidence) || 0));
rejected.push(...historySuppressed);

const csvRows = eligible.map(row => ({
  zpid: `${lane}-${row.source}-${row.source_listing_id}`,
  status: lane === 'rental' ? 'rental_turnover' : 'commercial_move_out',
  recipient_type: lane === 'rental' ? 'CURRENT RESIDENT' : 'BUSINESS OCCUPANT',
  addressstreet: row.unit_label ? `${row.unit_label}-${row.street_address}` : row.street_address,
  city: row.city,
  addressstate: row.province || 'ON',
  addresszipcode: row.postal_code,
  movement_score: lane === 'rental' ? rentalPlaybook(row).movement_score : commercialPlaybook(row).movement_score,
  confidence: lane === 'rental' ? row.classification_confidence : row.relocation_probability,
  source: row.source,
  source_listing_id: row.source_listing_id,
  source_url: row.source_url,
}));
const stamp = new Date().toISOString().slice(0, 10);
const csvPath = path.join(outputDir, `${lane}-mail-eligible-${stamp}.csv`);
fs.writeFileSync(csvPath, Papa.unparse(csvRows, { newline: '\n' }) + '\n');
fs.writeFileSync(path.join(outputDir, `${lane}-mail-held-${stamp}.json`), JSON.stringify(rejected, null, 2) + '\n');

let pdfPath = null;
if (csvRows.length) {
  pdfPath = path.join(outputDir, `${lane}-mail-eligible-${stamp}.pdf`);
  const generated = spawnSync(process.execPath, [path.join(__dirname, 'generate-postcards-pdf.cjs'), csvPath,
    '--name', lane === 'rental' ? 'Current Resident' : 'Business Occupant', '--output', pdfPath], { stdio: 'inherit' });
  if (generated.status !== 0) throw new Error(`${lane} PDF generation failed`);
}

if (eligible.length && process.env.MARKET_MAIL_DRY_RUN !== '1') {
  const batchId = process.env.MARKET_MAIL_BATCH_ID || `${lane}-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`;
  const rowsSql = eligible.map(row => `(${sqlText(batchId)},${sqlText(lane)},${sqlText(entityKey(row))},${sqlText(eventType)},
    ${sqlText(row.source)},${sqlText(row.source_listing_id)},${sqlText(JSON.stringify({ street_address: row.street_address,
      unit_label: row.unit_label || null, city: row.city, province: row.province || 'ON', postal_code: row.postal_code }))}::jsonb)`).join(',');
  await query(`BEGIN;
    INSERT INTO market_mail_batches(batch_id,lane,status,record_count)
      VALUES (${sqlText(batchId)},${sqlText(lane)},'generated',${eligible.length})
      ON CONFLICT (batch_id) DO UPDATE SET record_count=EXCLUDED.record_count;
    INSERT INTO market_mail_items(batch_id,lane,entity_key,event_type,source,source_listing_id,address_snapshot)
      VALUES ${rowsSql} ON CONFLICT (batch_id,entity_key,event_type) DO NOTHING;
    COMMIT;`);
}

const professional = records.filter(row => lane === 'rental'
  ? Boolean(row.contact_company || row.contact_name || row.contact_phone)
  : Boolean(row.brokerage_name || row.agent_name || row.agent_phone));
fs.writeFileSync(path.join(outputDir, `${lane}-professional-opportunities-${stamp}.csv`), Papa.unparse(professional, { newline: '\n' }) + '\n');
const summary = { lane, inventory_records: records.length, new_events: newEvents.size,
  baseline_scopes: [...baselineScopes], eligible_before_address_dedupe: candidates.length,
  duplicate_addresses_removed: candidates.length - unique.size, historical_address_events_suppressed: historySuppressed.length,
  capped: false, mail_eligible: eligible.length, held: rejected.length, professional_opportunities: professional.length,
  csv: csvPath, pdf: pdfPath };
fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { commercialEligibility, rentalEligibility };
