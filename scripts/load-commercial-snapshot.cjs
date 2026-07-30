#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const project = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!project || !token) throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');
const root = path.join(__dirname, '.pipeline-commercial');
const runId = process.argv[2] || fs.readFileSync(path.join(root, 'latest-run.txt'), 'utf8').trim();
const runDir = path.join(root, runId);
const properties = [...new Map(JSON.parse(
  fs.readFileSync(path.join(runDir, 'canonical-properties.json'), 'utf8')
).map(item => [`${item.address_key}|${item.city}|${item.province}`, item])).values()];
const records = [...new Map(JSON.parse(
  fs.readFileSync(path.join(runDir, 'source-records.json'), 'utf8')
).map(item => [`${item.source}|${item.source_listing_id}`, item])).values()];
const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf8'));
const { diffInventory } = require('./market-lifecycle-lib.cjs');

function query(sql) {
  const body = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${project}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, response => {
      let result = '';
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${result.slice(0, 1000)}`));
        } else resolve(result ? JSON.parse(result) : null);
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}
const literal = value => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
const chunks = (values, size = 75) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size));

async function loadProperties() {
  for (const batch of chunks(properties)) {
    await query(`
      INSERT INTO commercial_properties (
        canonical_address, address_key, street_address, city, province,
        postal_code, latitude, longitude, asset_types,
        first_seen_at, last_seen_at, active
      )
      SELECT x.canonical_address, x.address_key, x.street_address, x.city,
        x.province, x.postal_code, x.latitude, x.longitude,
        ARRAY(SELECT jsonb_array_elements_text(x.asset_types)), now(), now(), true
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        canonical_address text, address_key text, street_address text, city text,
        province text, latitude double precision, longitude double precision,
        asset_types jsonb, postal_code text
      )
      ON CONFLICT (address_key, city, province, country_code) DO UPDATE SET
        canonical_address = EXCLUDED.canonical_address,
        postal_code = COALESCE(EXCLUDED.postal_code, commercial_properties.postal_code),
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        asset_types = EXCLUDED.asset_types, last_seen_at = now(),
        active = true, updated_at = now();
    `);
  }
}

async function loadRecordsAndSpaces() {
  for (const batch of chunks(records, 50)) {
    await query(`
      INSERT INTO commercial_source_records (
        commercial_property_id, source, source_family, source_listing_id,
        source_url, transaction_types, asset_types, title, asking_price,
        lease_rate, lease_rate_unit, space_size_sqft_min, space_size_sqft_max,
        brokerage_name, agent_name, agent_phone, photo_urls,
        first_seen_at, last_seen_at, active
      )
      SELECT p.id, x.source, x.source_family, x.source_listing_id, x.source_url,
        ARRAY[x.transaction_type], ARRAY[x.asset_type], x.title, x.asking_price,
        x.lease_rate, x.lease_rate_unit, x.space_size_sqft_min,
        x.space_size_sqft_max, x.brokerage_name, x.agent_name, x.agent_phone,
        ARRAY(SELECT jsonb_array_elements_text(x.photo_urls)), now(), now(), true
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        source text, source_family text, source_listing_id text, source_url text,
        transaction_type text, asset_type text, title text, address_key text,
        city text, province text, asking_price numeric, lease_rate numeric,
        lease_rate_unit text, space_size_sqft_min numeric,
        space_size_sqft_max numeric, brokerage_name text, agent_name text,
        agent_phone text, photo_urls jsonb
      )
      JOIN commercial_properties p ON p.address_key = x.address_key
        AND p.city = x.city AND p.province = x.province AND p.country_code = 'CA'
      ON CONFLICT (source, source_listing_id) DO UPDATE SET
        commercial_property_id = EXCLUDED.commercial_property_id,
        transaction_types = EXCLUDED.transaction_types,
        asset_types = EXCLUDED.asset_types, title = EXCLUDED.title,
        asking_price = EXCLUDED.asking_price, lease_rate = EXCLUDED.lease_rate,
        brokerage_name = EXCLUDED.brokerage_name, photo_urls = EXCLUDED.photo_urls,
        agent_name = EXCLUDED.agent_name, agent_phone = EXCLUDED.agent_phone,
        last_seen_at = now(), active = true, missing_run_count = 0,
        lifecycle_status = 'active';

      INSERT INTO commercial_spaces (
        commercial_property_id, source_record_id, source, source_listing_id,
        transaction_type, asset_type, available_sqft_min, available_sqft_max,
        asking_price, lease_rate, lease_rate_unit, availability_status,
        first_seen_at, last_seen_at
      )
      SELECT sr.commercial_property_id, sr.id, x.source, x.source_listing_id,
        x.transaction_type, x.asset_type, x.space_size_sqft_min,
        x.space_size_sqft_max, x.asking_price, x.lease_rate, x.lease_rate_unit,
        'available', now(), now()
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        source text, source_listing_id text, transaction_type text,
        asset_type text, space_size_sqft_min numeric, space_size_sqft_max numeric,
        asking_price numeric, lease_rate numeric, lease_rate_unit text
      )
      JOIN commercial_source_records sr ON sr.source = x.source
        AND sr.source_listing_id = x.source_listing_id
      ON CONFLICT (source, source_listing_id) DO UPDATE SET
        commercial_property_id = EXCLUDED.commercial_property_id,
        source_record_id = EXCLUDED.source_record_id,
        transaction_type = EXCLUDED.transaction_type,
        asset_type = EXCLUDED.asset_type,
        available_sqft_min = EXCLUDED.available_sqft_min,
        available_sqft_max = EXCLUDED.available_sqft_max,
        asking_price = EXCLUDED.asking_price, lease_rate = EXCLUDED.lease_rate,
        lease_rate_unit = EXCLUDED.lease_rate_unit,
        availability_status = 'available', last_seen_at = now();
    `);
  }
}

async function applyLifecycle(previous) {
  const successfulScopes = [
    ...summary.cities.filter(item => item.status === 'ok' && item.spacelist_pages > 0)
      .map(item => ({ source: 'spacelist', city: item.city })),
  ];
  const lifecycle = diffInventory({
    lane: 'commercial', current: records, previous, successfulScopes,
  });
  for (const batch of chunks(lifecycle.missingUpdates, 75)) {
    const updates = batch.map(item => ({
      ...item,
      outcome: item.transaction_types?.includes('sale')
        ? 'sold_or_withdrawn' : 'leased_or_withdrawn',
    }));
    await query(`
      UPDATE commercial_source_records r SET
        missing_run_count = x.missing_run_count,
        active = NOT x.terminal,
        lifecycle_status = CASE WHEN x.terminal THEN x.outcome
          ELSE 'missing_confirmation' END
      FROM jsonb_to_recordset(${literal(updates)}) AS x(
        source text, source_listing_id text, missing_run_count integer,
        terminal boolean, outcome text
      )
      WHERE r.source = x.source AND r.source_listing_id = x.source_listing_id;
    `);
  }
  const reportable = lifecycle.events.filter(event => event.event_type !== 'still_active');
  fs.writeFileSync(path.join(runDir, 'lifecycle-summary.json'),
    `${JSON.stringify({ summary: lifecycle.summary, events: reportable }, null, 2)}\n`);
}

(async () => {
  const previous = await query(`
    SELECT r.source, r.source_listing_id, p.city, r.transaction_types,
      r.active, r.missing_run_count
    FROM commercial_source_records r
    LEFT JOIN commercial_properties p ON p.id = r.commercial_property_id;
  `);
  await loadProperties();
  await loadRecordsAndSpaces();
  await applyLifecycle(previous || []);
  const counts = await query(`
    SELECT
      (SELECT count(*) FROM commercial_properties WHERE active) AS properties,
      (SELECT count(*) FROM commercial_source_records WHERE active) AS source_records,
      (SELECT count(*) FROM commercial_spaces WHERE availability_status = 'available') AS spaces;
  `);
  console.log(JSON.stringify({ runId, loaded: true, counts }, null, 2));
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
