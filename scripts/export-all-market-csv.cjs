#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'idbyrtwdeeruiutoukct';
const OUTPUT_DIR = path.join(__dirname, '..', 'reports', 'market-exports');
const REGION_LABELS = {
  windsor: 'Windsor / Essex County',
  chatham: 'Chatham-Kent',
  sarnia: 'Sarnia / Lambton County',
  london: 'London / Middlesex',
  woodstock: 'Woodstock / Oxford County',
  wkg: 'Kitchener / Waterloo / Cambridge / Guelph',
};

function getServiceKey() {
  const output = execFileSync('npx', [
    'supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const keys = JSON.parse(output).keys || [];
  const service = keys.find(item => item.name === 'service_role') ||
    keys.find(item => item.type === 'secret');
  const value = service?.api_key || service?.key;
  if (!value) throw new Error('Supabase service key was not returned');
  return value;
}

async function fetchAll(table, select, key) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`https://${PROJECT_REF}.supabase.co/rest/v1/${table}`);
    url.searchParams.set('select', select);
    url.searchParams.set('order', 'first_seen_at.asc');
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        Prefer: 'count=exact',
      },
    });
    if (!response.ok) throw new Error(`${table} export failed ${response.status}: ${(await response.text()).slice(0, 500)}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function inventoryBucket(row) {
  if (!row.active) return row.lifecycle_status || 'off_market';
  const ageMs = Date.now() - new Date(row.first_seen_at).getTime();
  if (Number.isFinite(ageMs) && ageMs <= 36 * 60 * 60 * 1000) return 'just_listed';
  if (row.lifecycle_status === 'missing_confirmation') return 'missing_confirmation';
  return 'active';
}

function csvValue(value) {
  const normalized = Array.isArray(value)
    ? value.join(' | ')
    : value && typeof value === 'object' ? JSON.stringify(value) : value ?? '';
  return `"${String(normalized).replaceAll('"', '""')}"`;
}

function writeCsv(filename, columns, rows) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = [
    columns.map(([label]) => csvValue(label)).join(','),
    ...rows.map(row => columns.map(([, getter]) => csvValue(getter(row))).join(',')),
  ].join('\n');
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, `${output}\n`);
  return outputPath;
}

(async () => {
  const key = getServiceKey();
  const rentalRows = await fetchAll('rental_source_records', [
    'id', 'rental_property_id', 'source', 'source_family', 'source_listing_id',
    'source_url', 'source_address', 'monthly_price', 'bedrooms', 'bathrooms',
    'contact_name', 'contact_company', 'contact_phone', 'online_leasing_url',
    'units_available', 'occupancy_state', 'classification_confidence',
    'classification_evidence', 'classification_method', 'acquisition_scope',
    'lifecycle_status', 'missing_run_count', 'active', 'first_seen_at', 'last_seen_at',
    'rental_properties(street_address,city,province,postal_code,canonical_address,listing_categories,property_signals)',
  ].join(','), key);
  const commercialRows = await fetchAll('commercial_source_records', [
    'id', 'commercial_property_id', 'source', 'source_family', 'source_listing_id',
    'source_url', 'transaction_types', 'asset_types', 'title', 'asking_price',
    'lease_rate', 'lease_rate_unit', 'space_size_sqft_min', 'space_size_sqft_max',
    'brokerage_name', 'agent_name', 'agent_phone', 'agent_email',
    'listing_scope', 'unit_label', 'current_occupant_name', 'occupant_confidence',
    'availability_date', 'transition_evidence', 'relocation_probability',
    'direct_relocation_candidate', 'relocation_reasons', 'outreach_status',
    'occupancy_state', 'classification_confidence', 'classification_evidence',
    'classification_method', 'acquisition_scope', 'lifecycle_status',
    'missing_run_count', 'active', 'first_seen_at', 'last_seen_at',
    'commercial_properties(street_address,city,province,postal_code,canonical_address)',
  ].join(','), key);

  const rentalColumns = [
    ['Inventory Bucket', inventoryBucket],
    ['Lifecycle Status', row => row.lifecycle_status],
    ['Active', row => row.active],
    ['Region', row => REGION_LABELS[row.acquisition_scope] || row.acquisition_scope],
    ['City', row => row.rental_properties?.city],
    ['Address', row => row.rental_properties?.canonical_address || row.source_address],
    ['Source', row => row.source],
    ['Source Listing ID', row => row.source_listing_id],
    ['Monthly Rent', row => row.monthly_price],
    ['Bedrooms', row => row.bedrooms],
    ['Bathrooms', row => row.bathrooms],
    ['Occupancy / Furnishing', row => row.occupancy_state],
    ['AI Confidence', row => row.classification_confidence],
    ['AI Evidence', row => row.classification_evidence],
    ['Contact', row => row.contact_name],
    ['Company', row => row.contact_company],
    ['Phone', row => row.contact_phone],
    ['Categories', row => row.rental_properties?.listing_categories],
    ['Property Signals', row => row.rental_properties?.property_signals],
    ['Missing Run Count', row => row.missing_run_count],
    ['First Seen', row => row.first_seen_at],
    ['Last Seen', row => row.last_seen_at],
    ['Listing URL', row => row.source_url],
    ['Canonical Property ID', row => row.rental_property_id],
    ['Source Record ID', row => row.id],
  ];
  const commercialColumns = [
    ['Inventory Bucket', inventoryBucket],
    ['Lifecycle Status', row => row.lifecycle_status],
    ['Active', row => row.active],
    ['Region', row => REGION_LABELS[row.acquisition_scope] || row.acquisition_scope],
    ['City', row => row.commercial_properties?.city],
    ['Address', row => row.commercial_properties?.canonical_address],
    ['Source', row => row.source],
    ['Source Listing ID', row => row.source_listing_id],
    ['Transaction Types', row => row.transaction_types],
    ['Asset Types', row => row.asset_types],
    ['Title', row => row.title],
    ['Listing Scope', row => row.listing_scope],
    ['Unit', row => row.unit_label],
    ['Current Occupant', row => row.current_occupant_name],
    ['Occupant Confidence', row => row.occupant_confidence],
    ['Availability Date', row => row.availability_date],
    ['Transition Evidence', row => row.transition_evidence],
    ['Relocation Probability', row => row.relocation_probability],
    ['Direct Relocation Candidate', row => row.direct_relocation_candidate],
    ['Outreach Status', row => row.outreach_status],
    ['Relocation Reasons', row => row.relocation_reasons],
    ['Asking Price', row => row.asking_price],
    ['Lease Rate', row => row.lease_rate],
    ['Lease Rate Unit', row => row.lease_rate_unit],
    ['Size Min Sq Ft', row => row.space_size_sqft_min],
    ['Size Max Sq Ft', row => row.space_size_sqft_max],
    ['Occupancy / Fit-out', row => row.occupancy_state],
    ['AI Confidence', row => row.classification_confidence],
    ['AI Evidence', row => row.classification_evidence],
    ['Agent', row => row.agent_name],
    ['Phone', row => row.agent_phone],
    ['Email', row => row.agent_email],
    ['Brokerage', row => row.brokerage_name],
    ['Missing Run Count', row => row.missing_run_count],
    ['First Seen', row => row.first_seen_at],
    ['Last Seen', row => row.last_seen_at],
    ['Listing URL', row => row.source_url],
    ['Canonical Property ID', row => row.commercial_property_id],
    ['Source Record ID', row => row.id],
  ];

  const rentalPath = writeCsv('rentals-all-regions-all-statuses.csv', rentalColumns, rentalRows);
  const commercialPath = writeCsv('commercial-all-regions-all-statuses.csv', commercialColumns, commercialRows);
  console.log(JSON.stringify({
    rental: { path: rentalPath, rows: rentalRows.length,
      buckets: Object.groupBy(rentalRows, inventoryBucket) },
    commercial: { path: commercialPath, rows: commercialRows.length,
      buckets: Object.groupBy(commercialRows, inventoryBucket) },
  }, (keyName, value) => keyName === 'buckets' && value
    ? Object.fromEntries(Object.entries(value).map(([bucket, items]) => [bucket, items.length]))
    : value, 2));
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
