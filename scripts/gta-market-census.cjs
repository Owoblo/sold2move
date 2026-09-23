#!/usr/bin/env node

/**
 * Read-only GTA active-listing census.
 *
 * Uses the same Apify Zillow search actor as the postcard pipeline, but never
 * connects to Supabase and never changes listing lifecycle state. The output
 * is designed to answer two questions before a market is activated:
 *   1. How much active inventory can the source see?
 *   2. How complete and geographically trustworthy is that inventory?
 */

const fs = require('fs');
const path = require('path');
const {
  buildZillowSearchUrl,
  runSearchScraper,
  splitBoundsIntoGrid,
} = require('./postcard-step0-scrape.cjs');

const OUT_DIR = path.join(__dirname, '.gta-census');
const SEARCH_ACTOR = 'maxcopell~zillow-scraper';

// Bounds are deliberately municipality-sized instead of one giant GTA box.
// This reduces border spillover and keeps every Zillow search below its
// approximate 500-result cap. Large urban markets use a denser grid.
const { MUNICIPALITIES } = require('./gta-coverage.cjs');

function key(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const labelOwners = new Map();
for (const municipality of MUNICIPALITIES) {
  for (const label of [municipality.name, ...(municipality.aliases || [])]) {
    const k = key(label);
    const owners = labelOwners.get(k) || [];
    owners.push(municipality.name);
    labelOwners.set(k, owners);
  }
}

function addressOf(item) {
  if (item.listingAddress && typeof item.listingAddress === 'object') {
    const a = item.listingAddress;
    return { streetAddress: a.street, city: a.city, state: a.state, zipcode: a.zipCode };
  }
  if (item.address && typeof item.address === 'object') return item.address;
  const home = item.hdpData?.homeInfo || {};
  if (typeof item.address === 'string') {
    const parts = item.address.split(',').map(part => part.trim());
    return { streetAddress: parts[0], city: parts[1], state: parts[2]?.split(/\s+/)[0], zipcode: parts[2]?.split(/\s+/).slice(1).join(' ') };
  }
  return {
    streetAddress: item.streetAddress || home.streetAddress,
    city: item.city || home.city,
    state: item.state || home.state,
    zipcode: item.zipcode || item.postalCode || home.zipcode,
  };
}

function field(item, ...names) {
  const home = item.hdpData?.homeInfo || {};
  for (const name of names) {
    if (item[name] !== undefined && item[name] !== null && item[name] !== '') return item[name];
    if (home[name] !== undefined && home[name] !== null && home[name] !== '') return home[name];
  }
  return null;
}

function photoCount(item) {
  if (Number.isFinite(item.photoCount)) return item.photoCount;
  for (const name of ['listingPhotos', 'responsivePhotos', 'originalPhotos', 'photos', 'images', 'big']) {
    if (Array.isArray(item[name])) return item[name].length;
  }
  return field(item, 'imgSrc', 'thumbnail', 'mainImage') ? 1 : 0;
}

function normalize(item) {
  const address = addressOf(item);
  const rawCity = String(address.city || field(item, 'city') || '').trim();
  const owners = labelOwners.get(key(rawCity)) || [];
  const zpid = String(field(item, 'zpid', 'id') || (field(item, 'propertyUrl', 'detailUrl', 'url') || '').match(/(\d+)_zpid/)?.[1] || '');
  const rawPrice = item.listingPrice?.amount ?? field(item, 'unformattedPrice', 'price', 'listPrice', 'listingPrice');
  const price = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice || '').replace(/[^0-9.]/g, '')) || null;
  const state = String(address.state || 'ON').toUpperCase();
  return {
    zpid,
    municipality: owners.length === 1 ? owners[0] : '',
    municipality_candidates: owners.join('|'),
    raw_city: rawCity,
    street: String(address.streetAddress || '').trim(),
    state,
    postal_code: String(address.zipcode || '').trim().toUpperCase(),
    price,
    beds: field(item, 'beds', 'bedrooms'),
    baths: field(item, 'baths', 'bathrooms'),
    area: field(item, 'area', 'livingArea', 'sqft'),
    property_type: field(item, 'homeType', 'propertyType', 'contentType'),
    days_on_zillow: field(item, 'daysOnZillow', 'timeOnZillow'),
    detail_url: field(item, 'propertyUrl', 'detailUrl', 'url'),
    image_url: item.mainImage?.url || field(item, 'imgSrc', 'thumbnail', 'mainImage'),
    photo_count: photoCount(item),
    description: field(item, 'description', 'homeDescription'),
  };
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function completeness(rows, name) {
  if (!rows.length) return 0;
  return Math.round(1000 * rows.filter(row => present(row[name])).length / rows.length) / 10;
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(file, rows) {
  const columns = Object.keys(rows[0] || { zpid: '' });
  fs.writeFileSync(file, [columns.join(','), ...rows.map(row => columns.map(column => csvValue(row[column])).join(','))].join('\n'));
}

async function recoverLatestSuccessfulDataset(token) {
  const after = new Date(process.env.RECOVER_AFTER || Date.now() - 24 * 60 * 60 * 1000);
  const runsUrl = `https://api.apify.com/v2/acts/${SEARCH_ACTOR}/runs?token=${encodeURIComponent(token)}&status=SUCCEEDED&desc=1&limit=20`;
  const runsResponse = await fetch(runsUrl);
  if (!runsResponse.ok) throw new Error(`Could not list Apify runs (${runsResponse.status})`);
  const runs = (await runsResponse.json())?.data?.items || [];
  const run = runs.find(candidate =>
    new Date(candidate.startedAt || candidate.createdAt) >= after &&
    candidate.defaultDatasetId
  );
  if (!run) throw new Error(`No successful Apify search run found after ${after.toISOString()}`);
  console.log(`Recovering successful Apify run ${run.id} started ${run.startedAt || run.createdAt}`);
  const datasetUrl = `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${encodeURIComponent(token)}&format=json`;
  const datasetResponse = await fetch(datasetUrl);
  if (!datasetResponse.ok) throw new Error(`Could not download Apify dataset (${datasetResponse.status})`);
  const rows = await datasetResponse.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Recovered Apify dataset is empty');
  return rows;
}

async function main() {
  if (!process.env.APIFY_TOKEN && !process.env.GTA_RECOVER_RAW_FILE) throw new Error('APIFY_TOKEN is required');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const urls = [];
  for (const municipality of MUNICIPALITIES) {
    const [west, east, south, north] = municipality.bounds;
    const [rows, cols] = municipality.grid || [1, 1];
    const cells = splitBoundsIntoGrid({ west, east, south, north }, rows, cols);
    for (const cell of cells) urls.push(buildZillowSearchUrl(cell));
  }
  console.log(`GTA census: ${MUNICIPALITIES.length} municipalities, ${urls.length} search cells`);

  let raw;
  if (process.env.GTA_RECOVER_RAW_FILE) {
    raw = JSON.parse(fs.readFileSync(process.env.GTA_RECOVER_RAW_FILE, 'utf8'));
    const expected = new Set(urls);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    if (!Array.isArray(raw) || !raw.length || raw.some(row =>
      !expected.has(row.sourceSearchUrl) || !(Date.parse(row.scrapedAt) >= cutoff))) {
      throw new Error('Recovery requires a GTA dataset from these search cells, scraped within 24 hours');
    }
    console.log(`Reusing ${raw.length} preserved GTA observations; no new Apify run`);
  } else {
    raw = process.env.RECOVER_LATEST === 'true'
      ? await recoverLatestSuccessfulDataset(process.env.APIFY_TOKEN)
      : await runSearchScraper(process.env.APIFY_TOKEN, urls);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'raw.json'), JSON.stringify(raw, null, 2));

  const normalizedAll = raw.map(normalize);
  const byZpid = new Map();
  const noZpid = [];
  for (const row of normalizedAll) {
    if (!row.zpid) noZpid.push(row);
    else if (!byZpid.has(row.zpid)) byZpid.set(row.zpid, row);
  }
  const unique = [...byZpid.values()];
  const gta = unique.filter(row => row.state === 'ON' && row.municipality);
  const unmapped = unique.filter(row => row.state === 'ON' && !row.municipality);
  const outOfProvince = unique.filter(row => row.state !== 'ON');
  const fields = ['street', 'raw_city', 'postal_code', 'price', 'beds', 'baths', 'area', 'property_type', 'days_on_zillow', 'detail_url', 'image_url', 'description'];

  const municipalities = MUNICIPALITIES.map(municipality => {
    const rows = gta.filter(row => row.municipality === municipality.name);
    return {
      municipality: municipality.name,
      region: municipality.region,
      listings: rows.length,
      ...Object.fromEntries(fields.map(name => [`${name}_pct`, completeness(rows, name)])),
      with_photos_pct: rows.length ? Math.round(1000 * rows.filter(row => row.photo_count > 0).length / rows.length) / 10 : 0,
      plausible_sale_price_pct: rows.length ? Math.round(1000 * rows.filter(row => row.price >= 10000 && row.price <= 100000000).length / rows.length) / 10 : 0,
      usable_days_on_zillow_pct: rows.length ? Math.round(1000 * rows.filter(row => Number(row.days_on_zillow) >= 0).length / rows.length) / 10 : 0,
    };
  });

  const groupedUnknown = unmapped.reduce((groups, row) => {
    const label = row.raw_city || '(blank)';
    if (!groups[label]) groups[label] = [];
    groups[label].push(row);
    return groups;
  }, {});
  const unknownLabels = Object.entries(groupedUnknown)
    .map(([raw_city, rows]) => ({ raw_city, listings: rows.length }))
    .sort((a, b) => b.listings - a.listings || a.raw_city.localeCompare(b.raw_city));
  const report = {
    generated_at: new Date().toISOString(),
    source: 'Apify maxcopell/zillow-scraper; Zillow active for-sale map inventory',
    search_cells: urls.length,
    raw_rows: raw.length,
    unique_zpids: unique.length,
    duplicate_rows: normalizedAll.length - unique.length - noZpid.length,
    missing_zpid_rows: noZpid.length,
    accepted_gta_rows: gta.length,
    unmapped_ontario_rows: unmapped.length,
    out_of_province_rows: outOfProvince.length,
    municipalities_with_zero_rows: municipalities.filter(row => row.listings === 0).map(row => row.municipality),
    overall_completeness_pct: Object.fromEntries(fields.map(name => [name, completeness(gta, name)])),
    quality_gates: {
      plausible_sale_price_rows: gta.filter(row => row.price >= 10000 && row.price <= 100000000).length,
      implausible_sale_price_rows: gta.filter(row => !(row.price >= 10000 && row.price <= 100000000)).length,
      usable_days_on_zillow_rows: gta.filter(row => Number(row.days_on_zillow) >= 0).length,
      note: 'Presence is not validity: Zillow commonly emits -1 for unknown days and low rental-like or price-on-request values in its Canadian for-sale feed.',
    },
    municipalities,
    unknown_city_labels: unknownLabels,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  writeCsv(path.join(OUT_DIR, 'listings.csv'), gta);
  writeCsv(path.join(OUT_DIR, 'municipality-quality.csv'), municipalities);
  writeCsv(path.join(OUT_DIR, 'unmapped-city-labels.csv'), unknownLabels);

  const markdown = [
    '# GTA active-listing census',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `- Raw rows: ${report.raw_rows.toLocaleString()}`,
    `- Unique Zillow IDs: ${report.unique_zpids.toLocaleString()}`,
    `- Accepted GTA listings: ${report.accepted_gta_rows.toLocaleString()}`,
    `- Duplicate rows removed: ${report.duplicate_rows.toLocaleString()}`,
    `- Unmapped Ontario spillover: ${report.unmapped_ontario_rows.toLocaleString()}`,
    `- Out-of-province spillover: ${report.out_of_province_rows.toLocaleString()}`,
    '',
    '| Region | Municipality | Listings | Postal | Price | Beds | Baths | Area | Image | Description |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...municipalities.map(row => `| ${row.region} | ${row.municipality} | ${row.listings.toLocaleString()} | ${row.postal_code_pct}% | ${row.price_pct}% | ${row.beds_pct}% | ${row.baths_pct}% | ${row.area_pct}% | ${row.image_url_pct}% | ${row.description_pct}% |`),
    '',
    '## Important interpretation',
    '',
    'This is a first-run active inventory census, not a sold-listing result. A later complete census is required before disappearance can be treated as a potential sale.',
    '',
    'Unmapped city labels are retained separately for boundary/alias review and are not counted as GTA inventory.',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown);
  console.log(markdown);
  return { rows: gta, report };
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = { MUNICIPALITIES, normalize, recoverLatestSuccessfulDataset, main };
