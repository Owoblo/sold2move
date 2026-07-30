#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const project = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!project || !token) throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');

const pipelineRoot = path.join(__dirname, '.pipeline-rentals');
const runId = process.argv[2] || fs.readFileSync(path.join(pipelineRoot, 'latest-run.txt'), 'utf8').trim();
const runDir = path.join(pipelineRoot, runId);
const properties = JSON.parse(fs.readFileSync(path.join(runDir, 'canonical-properties.json'), 'utf8'));
const records = JSON.parse(fs.readFileSync(path.join(runDir, 'normalized-source-records.json'), 'utf8'));
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
          return;
        }
        resolve(result ? JSON.parse(result) : null);
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

function literal(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function chunks(values, size = 100) {
  const result = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

async function loadProperties() {
  const rows = properties.map(property => ({
    canonical_address: property.canonical_address,
    address_key: property.address_key,
    street_address: property.street_address,
    city: property.city,
    province: property.province,
    postal_code: property.postal_code,
    latitude: property.latitude,
    longitude: property.longitude,
    entity_type: property.entity_type,
    listing_categories: property.listing_categories,
    property_signals: property.property_signals,
  }));
  for (const batch of chunks(rows)) {
    await query(`
      INSERT INTO rental_properties (
        canonical_address, address_key, street_address, city, province,
        postal_code, latitude, longitude, entity_type, listing_categories,
        property_signals, first_seen_at, last_seen_at, active
      )
      SELECT x.canonical_address, x.address_key, x.street_address, x.city,
        x.province, x.postal_code, x.latitude, x.longitude,
        COALESCE(x.entity_type, 'property'),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.listing_categories, '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.property_signals, '[]'::jsonb))),
        now(), now(), true
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        canonical_address text, address_key text, street_address text, city text,
        province text, postal_code text, latitude double precision,
        longitude double precision, entity_type text,
        listing_categories jsonb, property_signals jsonb
      )
      ON CONFLICT (address_key, city, province, country_code) DO UPDATE SET
        canonical_address = EXCLUDED.canonical_address,
        street_address = EXCLUDED.street_address,
        postal_code = COALESCE(EXCLUDED.postal_code, rental_properties.postal_code),
        latitude = COALESCE(EXCLUDED.latitude, rental_properties.latitude),
        longitude = COALESCE(EXCLUDED.longitude, rental_properties.longitude),
        entity_type = EXCLUDED.entity_type,
        listing_categories = EXCLUDED.listing_categories,
        property_signals = EXCLUDED.property_signals,
        last_seen_at = now(), active = true, updated_at = now();
    `);
  }
}

async function loadSourceRecords() {
  const propertyBySourceRecord = new Map();
  for (const property of properties) {
    for (const id of property.source_record_ids) propertyBySourceRecord.set(id, property);
  }
  const rows = records.map(record => {
    const property = propertyBySourceRecord.get(`${record.source}:${record.source_listing_id}`);
    if (!property) throw new Error(`No canonical property for ${record.source}:${record.source_listing_id}`);
    return {
      property_address_key: property.address_key,
      property_city: property.city,
      property_province: property.province,
      source: record.source,
      source_family: record.source_family,
      source_listing_id: record.source_listing_id,
      source_url: record.source_url,
      source_address: [record.street_address, record.city, record.province, record.postal_code].filter(Boolean).join(', '),
      monthly_price: record.monthly_price,
      description: record.description,
      photo_urls: record.photo_urls,
      contact_name: record.contact_name,
      contact_company: record.contact_company,
      contact_phone: record.contact_phone,
      online_leasing_url: record.online_leasing_url,
      units_available: record.units_available,
    };
  });
  for (const batch of chunks(rows, 60)) {
    await query(`
      INSERT INTO rental_source_records (
        rental_property_id, source, source_family, source_listing_id, source_url,
        source_address, monthly_price, description, photo_urls, contact_name,
        contact_company, contact_phone, first_seen_at, last_seen_at, active
        , online_leasing_url, units_available
      )
      SELECT p.id, x.source, x.source_family, x.source_listing_id, x.source_url,
        x.source_address, x.monthly_price, x.description,
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(x.photo_urls, '[]'::jsonb))),
        x.contact_name, x.contact_company, x.contact_phone, now(), now(), true,
        x.online_leasing_url, x.units_available
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        property_address_key text, property_city text, property_province text,
        source text, source_family text, source_listing_id text, source_url text,
        source_address text, monthly_price numeric, description text,
        photo_urls jsonb, contact_name text, contact_company text, contact_phone text,
        online_leasing_url text, units_available integer
      )
      JOIN rental_properties p
        ON p.address_key = x.property_address_key
       AND p.city = x.property_city
       AND p.province = x.property_province
       AND p.country_code = 'CA'
      ON CONFLICT (source, source_listing_id) DO UPDATE SET
        rental_property_id = EXCLUDED.rental_property_id,
        source_family = EXCLUDED.source_family,
        source_url = EXCLUDED.source_url,
        source_address = EXCLUDED.source_address,
        monthly_price = EXCLUDED.monthly_price,
        description = EXCLUDED.description,
        photo_urls = EXCLUDED.photo_urls,
        contact_name = EXCLUDED.contact_name,
        contact_company = EXCLUDED.contact_company,
        contact_phone = EXCLUDED.contact_phone,
        online_leasing_url = EXCLUDED.online_leasing_url,
        units_available = EXCLUDED.units_available,
        last_seen_at = now(), active = true, missing_run_count = 0,
        lifecycle_status = 'active';
    `);
  }
}

async function loadUnits() {
  const rows = [];
  for (const property of properties) {
    for (const floorplan of property.floorplans || []) {
      rows.push({
        property_address_key: property.address_key,
        property_city: property.city,
        property_province: property.province,
        source: floorplan.source,
        source_listing_id: floorplan.source_listing_id,
        floorplan_name: floorplan.floorplan_name,
        bedrooms_label: floorplan.bedrooms_label,
        monthly_price_min: floorplan.monthly_price_min,
        monthly_price_max: floorplan.monthly_price_max,
        raw_payload: floorplan.raw_payload || {},
      });
    }
  }
  for (const batch of chunks(rows)) {
    await query(`
      INSERT INTO rental_units (
        rental_property_id, source_record_id, source, source_listing_id,
        floorplan_name, monthly_price_min, monthly_price_max,
        availability_status, first_seen_at, last_seen_at, raw_payload
      )
      SELECT p.id, sr.id, x.source, x.source_listing_id, x.floorplan_name,
        x.monthly_price_min, x.monthly_price_max, 'available', now(), now(),
        COALESCE(x.raw_payload, '{}'::jsonb)
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        property_address_key text, property_city text, property_province text,
        source text, source_listing_id text, floorplan_name text,
        bedrooms_label text, monthly_price_min numeric, monthly_price_max numeric,
        raw_payload jsonb
      )
      JOIN rental_properties p
        ON p.address_key = x.property_address_key
       AND p.city = x.property_city
       AND p.province = x.property_province
       AND p.country_code = 'CA'
      LEFT JOIN rental_source_records sr
        ON sr.source = x.source AND sr.source_listing_id = x.source_listing_id
      ON CONFLICT (
        rental_property_id,
        (COALESCE(source, '')),
        (COALESCE(source_listing_id, '')),
        (COALESCE(floorplan_name, '')),
        (COALESCE(unit_label, ''))
      ) DO UPDATE SET
        source_record_id = EXCLUDED.source_record_id,
        monthly_price_min = EXCLUDED.monthly_price_min,
        monthly_price_max = EXCLUDED.monthly_price_max,
        availability_status = 'available',
        last_seen_at = now(),
        raw_payload = EXCLUDED.raw_payload;
    `);
  }
}

async function loadRuns() {
  const rows = summary.acquisitions.map(acquisition => ({
    source: acquisition.source,
    source_family: records.find(record => record.source === acquisition.source)?.source_family || acquisition.source,
    city: acquisition.requested_city,
    records_seen: acquisition.raw_records,
    canonical_properties_seen: properties.filter(property =>
      property.city === acquisition.requested_city &&
      property.source_families.includes(
        records.find(record => record.source === acquisition.source)?.source_family
      )).length,
    rejected_geography: summary.rejection_reasons.wrong_province || 0,
  }));
  await query(`
    INSERT INTO rental_source_runs (
      source, source_family, city, province, started_at, completed_at, status,
      records_seen, canonical_properties_seen, rejected_geography, diagnostics
    )
    SELECT x.source, x.source_family, x.city, 'ON', now(), now(), 'succeeded',
      x.records_seen, x.canonical_properties_seen, x.rejected_geography,
      jsonb_build_object('snapshot_run_id', ${literal(runId)})
    FROM jsonb_to_recordset(${literal(rows)}) AS x(
      source text, source_family text, city text, records_seen integer,
      canonical_properties_seen integer, rejected_geography integer
    );
  `);
}

async function applyLifecycle(previous) {
  const successfulScopes = summary.acquisitions
    .filter(item => item.fresh && item.raw_records > 0)
    .map(item => ({ source: item.source, city: item.requested_city }));
  const lifecycle = diffInventory({
    lane: 'rental', current: records, previous, successfulScopes,
  });
  for (const batch of chunks(lifecycle.missingUpdates, 100)) {
    await query(`
      UPDATE rental_source_records r SET
        missing_run_count = x.missing_run_count,
        active = NOT x.terminal,
        lifecycle_status = CASE WHEN x.terminal THEN 'leased_or_withdrawn'
          ELSE 'missing_confirmation' END
      FROM jsonb_to_recordset(${literal(batch)}) AS x(
        source text, source_listing_id text, missing_run_count integer, terminal boolean
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
    SELECT r.source, r.source_listing_id, r.source_url, r.monthly_price,
      r.bedrooms, r.bathrooms, r.photo_urls, r.contact_name, r.contact_phone,
      r.contact_company, r.occupancy_state, r.classification_confidence,
      r.classification_evidence, r.classification_method, r.classified_at,
      p.street_address, p.city, p.province, p.postal_code,
      p.listing_categories, p.property_signals, r.active, r.missing_run_count
    FROM rental_source_records r
    LEFT JOIN rental_properties p ON p.id = r.rental_property_id;
  `);
  await loadProperties();
  await loadSourceRecords();
  await loadUnits();
  await loadRuns();
  await applyLifecycle(previous || []);
  const counts = await query(`
    SELECT
      (SELECT count(*) FROM rental_properties WHERE active) AS active_properties,
      (SELECT count(*) FROM rental_source_records WHERE active) AS active_source_records,
      (SELECT count(*) FROM rental_units WHERE availability_status = 'available') AS available_floorplans,
      (SELECT count(*) FROM rental_source_runs) AS source_runs;
  `);
  console.log(JSON.stringify({ runId, loaded: true, counts }, null, 2));
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
