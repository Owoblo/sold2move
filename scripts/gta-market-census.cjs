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

// Bounds are deliberately municipality-sized instead of one giant GTA box.
// This reduces border spillover and keeps every Zillow search below its
// approximate 500-result cap. Large urban markets use a denser grid.
const MUNICIPALITIES = [
  { name: 'Toronto', region: 'Toronto', bounds: [-79.64, -79.12, 43.58, 43.86], grid: [4, 5] },
  { name: 'Brampton', region: 'Peel', bounds: [-80.00, -79.63, 43.62, 43.85], grid: [2, 3] },
  { name: 'Caledon', region: 'Peel', bounds: [-80.15, -79.67, 43.82, 44.10], grid: [2, 2], aliases: ['Bolton', 'Caledon East', 'Palgrave', 'Inglewood', 'Cheltenham', 'Alton', 'Mono Mills'] },
  { name: 'Mississauga', region: 'Peel', bounds: [-79.81, -79.54, 43.47, 43.73], grid: [3, 3] },
  { name: 'Burlington', region: 'Halton', bounds: [-79.94, -79.69, 43.29, 43.48], grid: [2, 2] },
  { name: 'Halton Hills', region: 'Halton', bounds: [-80.12, -79.82, 43.54, 43.78], grid: [2, 2], aliases: ['Georgetown', 'Acton', 'Limehouse', 'Glen Williams'] },
  { name: 'Milton', region: 'Halton', bounds: [-80.03, -79.68, 43.39, 43.66], grid: [2, 2], aliases: ['Campbellville', 'Moffat', 'Nassagaweya'] },
  { name: 'Oakville', region: 'Halton', bounds: [-79.78, -79.59, 43.38, 43.55], grid: [2, 2] },
  { name: 'Aurora', region: 'York', bounds: [-79.52, -79.39, 43.96, 44.03] },
  { name: 'East Gwillimbury', region: 'York', bounds: [-79.57, -79.31, 44.03, 44.22], aliases: ['Holland Landing', 'Sharon', 'Mount Albert', 'Queensville'] },
  { name: 'Georgina', region: 'York', bounds: [-79.56, -79.17, 44.16, 44.39], grid: [2, 2], aliases: ['Keswick', 'Sutton', 'Jacksons Point', 'Pefferlaw', 'Udora'] },
  { name: 'King', region: 'York', bounds: [-79.78, -79.49, 43.88, 44.13], grid: [2, 2], aliases: ['King City', 'Nobleton', 'Schomberg', 'Kettleby'] },
  { name: 'Markham', region: 'York', bounds: [-79.43, -79.20, 43.79, 43.96], grid: [2, 2], aliases: ['Unionville', 'Thornhill'] },
  { name: 'Newmarket', region: 'York', bounds: [-79.52, -79.40, 44.02, 44.10] },
  { name: 'Richmond Hill', region: 'York', bounds: [-79.48, -79.35, 43.83, 44.00] },
  { name: 'Vaughan', region: 'York', bounds: [-79.65, -79.43, 43.76, 43.92], grid: [2, 2], aliases: ['Woodbridge', 'Maple', 'Concord', 'Kleinburg', 'Thornhill'] },
  { name: 'Whitchurch-Stouffville', region: 'York', bounds: [-79.39, -79.18, 43.92, 44.12], aliases: ['Stouffville', 'Ballantrae', 'Gormley'] },
  { name: 'Ajax', region: 'Durham', bounds: [-79.08, -78.97, 43.80, 43.90] },
  { name: 'Brock', region: 'Durham', bounds: [-79.21, -78.71, 44.16, 44.50], grid: [2, 2], aliases: ['Beaverton', 'Cannington', 'Sunderland'] },
  { name: 'Clarington', region: 'Durham', bounds: [-78.89, -78.45, 43.82, 44.15], grid: [2, 3], aliases: ['Bowmanville', 'Courtice', 'Newcastle', 'Orono', 'Newtonville'] },
  { name: 'Oshawa', region: 'Durham', bounds: [-78.95, -78.78, 43.84, 44.03], grid: [2, 2] },
  { name: 'Pickering', region: 'Durham', bounds: [-79.16, -78.97, 43.79, 44.02], grid: [2, 2] },
  { name: 'Scugog', region: 'Durham', bounds: [-79.11, -78.70, 44.03, 44.29], grid: [2, 2], aliases: ['Port Perry', 'Blackstock', 'Greenbank'] },
  { name: 'Uxbridge', region: 'Durham', bounds: [-79.36, -79.05, 44.00, 44.28], grid: [2, 2], aliases: ['Goodwood', 'Zephyr'] },
  { name: 'Whitby', region: 'Durham', bounds: [-79.00, -78.86, 43.84, 44.00], grid: [2, 2], aliases: ['Brooklin'] },
  { name: 'Hamilton', region: 'Hamilton', bounds: [-80.25, -79.62, 43.10, 43.40], grid: [3, 5], aliases: ['Ancaster', 'Dundas', 'Flamborough', 'Stoney Creek', 'Waterdown', 'Binbrook', 'Glanbrook'] },
];

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
  for (const name of ['responsivePhotos', 'originalPhotos', 'photos', 'images', 'big']) {
    if (Array.isArray(item[name])) return item[name].length;
  }
  return field(item, 'imgSrc', 'thumbnail', 'mainImage') ? 1 : 0;
}

function normalize(item) {
  const address = addressOf(item);
  const rawCity = String(address.city || field(item, 'city') || '').trim();
  const owners = labelOwners.get(key(rawCity)) || [];
  const zpid = String(field(item, 'zpid', 'id') || (field(item, 'detailUrl', 'url') || '').match(/(\d+)_zpid/)?.[1] || '');
  const rawPrice = field(item, 'unformattedPrice', 'price', 'listPrice');
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
    detail_url: field(item, 'detailUrl', 'url'),
    image_url: field(item, 'imgSrc', 'thumbnail', 'mainImage'),
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

async function main() {
  if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN is required');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const urls = [];
  for (const municipality of MUNICIPALITIES) {
    const [west, east, south, north] = municipality.bounds;
    const [rows, cols] = municipality.grid || [1, 1];
    const cells = splitBoundsIntoGrid({ west, east, south, north }, rows, cols);
    for (const cell of cells) urls.push(buildZillowSearchUrl(cell));
  }
  console.log(`GTA census: ${MUNICIPALITIES.length} municipalities, ${urls.length} search cells`);

  const raw = await runSearchScraper(process.env.APIFY_TOKEN, urls);
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
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
