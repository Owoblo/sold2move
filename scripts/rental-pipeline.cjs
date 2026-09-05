#!/usr/bin/env node

/**
 * Separate rental-market snapshot pipeline.
 *
 * This intentionally does not import postcard lifecycle code or write to the
 * listings table. It produces rental-only raw, normalized, canonical, source,
 * rejected, and summary artifacts under scripts/.pipeline-rentals/.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const {
  addressKey,
  canonicalKey,
  classifyDescription,
  isInProvince,
  normalizeRentCafe,
  normalizeRentSeeker,
  normalizeZillow,
} = require('./rental-market-lib.cjs');
const { runSearchScraper } = require('./postcard-step0-scrape.cjs');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');

const MARKET_REGION_KEYS = Object.freeze(['windsor', 'chatham', 'sarnia', 'london', 'woodstock', 'wkg']);
const REGION_ROOTS = Object.freeze({
  windsor: 'Windsor', chatham: 'Chatham-Kent', sarnia: 'Sarnia',
  london: 'London', woodstock: 'Woodstock', wkg: 'Kitchener',
});
const LIVE_REGION_DATASETS = MARKET_REGION_KEYS.flatMap(region => {
  const config = REGION_CONFIG[region];
  const common = {
    city: REGION_ROOTS[region], region, region_label: config.label,
    bounds: config.bounds, gridSplit: config.gridSplit,
    allowed_cities: config.cities,
  };
  return [{ source: 'zillow', ...common }, { source: 'rentseeker', ...common }];
});
const DEFAULT_DATASETS = Object.freeze([...LIVE_REGION_DATASETS]);
const DEFAULT_ENRICHMENTS = Object.freeze([]);

function parseArgs(argv) {
  const options = {
    outputDir: path.join(__dirname, '.pipeline-rentals'),
    province: 'ON',
    datasets: [...DEFAULT_DATASETS],
    enrichments: [...DEFAULT_ENRICHMENTS],
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--output-dir') options.outputDir = path.resolve(argv[++i]);
    else if (argv[i] === '--province') options.province = argv[++i].toUpperCase();
    else if (argv[i] === '--datasets-file') {
      options.datasets = JSON.parse(fs.readFileSync(path.resolve(argv[++i]), 'utf8'));
    } else if (argv[i] === '--no-enrichments') {
      options.enrichments = [];
    }
  }
  return options;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

function postJson(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'POST', headers }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
        }
      });
    });
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}

async function fetchDataset(datasetId) {
  const base = `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`;
  return fetchJson(`${base}?format=json&clean=true&limit=10000`);
}

async function fetchRentSeeker(bounds, request = postJson) {
  const hits = [];
  for (let page = 0; page < 100; page++) {
  const response = await request(
    'https://8HVK5I2WD9-dsn.algolia.net/1/indexes/rentseeker_prod_properties/query',
    {
      'X-Algolia-Application-Id': '8HVK5I2WD9',
      'X-Algolia-API-Key': '68a749c1cd4aff1ca2c87a160617bd61',
      'Content-Type': 'application/json',
    },
    {
      query: '',
      hitsPerPage: 1000,
      page,
      insideBoundingBox: [[bounds.south, bounds.west, bounds.north, bounds.east]],
    }
  );
  if (!Array.isArray(response.hits) || !Number.isInteger(response.nbPages)) throw new Error('RentSeeker pagination metadata missing');
  hits.push(...response.hits);
  if (page + 1 >= response.nbPages) {
    if (Number.isFinite(response.nbHits) && hits.length < response.nbHits) throw new Error('RentSeeker results truncated');
    return [...new Map(hits.map(row => [row.objectID || row.id, row])).values()];
  }
  }
  throw new Error('RentSeeker pagination exceeded 100 pages');
}

function buildZillowRentalUrl(bounds) {
  const state = {
    isMapVisible: true,
    isListVisible: true,
    mapBounds: bounds,
    filterState: {
      sort: { value: 'days' },
      isForRent: { value: true },
      isForSaleByAgent: { value: false },
      isForSaleByOwner: { value: false },
      isNewConstruction: { value: false },
      isComingSoon: { value: false },
      isAuction: { value: false },
      isForSaleForeclosure: { value: false },
    },
    pagination: {},
  };
  return `https://www.zillow.com/homes/for_rent/?searchQueryState=${encodeURIComponent(JSON.stringify(state))}`;
}

function splitBoundsIntoGrid(bounds, gridSplit = {}) {
  const rows = Math.max(1, gridSplit.rows || 2);
  const cols = Math.max(1, gridSplit.cols || 2);
  const latStep = (bounds.north - bounds.south) / rows;
  const lngStep = (bounds.east - bounds.west) / cols;
  return Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      south: bounds.south + row * latStep, north: bounds.south + (row + 1) * latStep,
      west: bounds.west + col * lngStep, east: bounds.west + (col + 1) * lngStep,
    };
  });
}

function normalizeRow(source, row, input) {
  if (source === 'zillow') return normalizeZillow(row);
  if (source === 'rentcafe') return normalizeRentCafe(row);
  if (source === 'rentseeker') return normalizeRentSeeker(row, input.city);
  throw new Error(`Unsupported rental source: ${source}`);
}

function matchesRequestedCity(record, requestedCity) {
  const city = record.city.toLocaleLowerCase();
  const requested = requestedCity.toLocaleLowerCase();
  return city === requested || city.startsWith(`${requested} `);
}

function insideBounds(record, bounds) {
  const lat = Number(record.latitude);
  const lng = Number(record.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function matchesAcquisitionScope(record, input) {
  if (input.bounds && insideBounds(record, input.bounds)) return true;
  const city = String(record.city || '').toLocaleLowerCase();
  return [input.city, ...(input.allowed_cities || [])].some(value => {
    const expected = String(value).toLocaleLowerCase();
    return city === expected || city.startsWith(`${expected} `);
  });
}

function completeness(records, field) {
  if (!records.length) return 0;
  return Number((records.filter(record => {
    const value = record[field];
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
  }).length / records.length * 100).toFixed(1));
}

function canonicalize(records) {
  const properties = new Map();
  for (const record of records) {
    const exactKey = canonicalKey(record);
    const existingKey = findCanonicalMatch(record, properties);
    const key = existingKey || exactKey;
    if (!properties.has(key)) {
      properties.set(key, {
        canonical_key: key,
        canonical_address: [record.street_address, record.city, record.province, record.postal_code]
          .filter(Boolean).join(', '),
        address_key: record.address_key,
        street_address: record.street_address,
        city: record.city,
        province: record.province,
        postal_code: record.postal_code,
        entity_type: record.entity_type || 'property',
        latitude: record.latitude ?? null,
        longitude: record.longitude ?? null,
        listing_categories: ['rental'],
        property_signals: [],
        source_families: [],
        source_record_ids: [],
        prices: [],
        floorplans: [],
        units_available: null,
        online_leasing_urls: [],
      });
    }
    const property = properties.get(key);
    if (record.entity_type === 'building') property.entity_type = 'building';
    const classification = classifyDescription(record.description);
    property.listing_categories = [...new Set([
      ...property.listing_categories,
      ...(record.listing_categories || []),
      ...classification.categories,
    ])];
    property.property_signals = [...new Set([...property.property_signals, ...classification.signals])];
    property.source_families = [...new Set([...property.source_families, record.source_family])];
    property.source_record_ids.push(`${record.source}:${record.source_listing_id}`);
    if (record.monthly_price != null) property.prices.push(record.monthly_price);
    property.floorplans.push(...(record.floorplans || []).map(plan => ({
      ...plan,
      source: record.source,
      source_listing_id: record.source_listing_id,
    })));
    if (record.units_available != null) {
      property.units_available = Math.max(property.units_available || 0, record.units_available);
    }
    if (record.online_leasing_url) property.online_leasing_urls.push(record.online_leasing_url);
  }
  return [...properties.values()];
}

function houseNumber(street) {
  return String(street || '').match(/^\s*(\d+[A-Z]?)/i)?.[1]?.toUpperCase() || '';
}

function distanceMetres(a, b) {
  if (![a.latitude, a.longitude, b.latitude, b.longitude].every(Number.isFinite)) return Infinity;
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function findCanonicalMatch(record, properties) {
  const exactKey = canonicalKey(record);
  if (properties.has(exactKey)) return exactKey;
  const number = houseNumber(record.street_address);
  const postal = String(record.postal_code || '').replace(/\s/g, '').toUpperCase();
  for (const [key, property] of properties) {
    if (property.city.toUpperCase() !== record.city.toUpperCase() ||
        property.province !== record.province) continue;
    const propertyNumber = houseNumber(property.street_address);
    const propertyPostal = String(property.postal_code || '').replace(/\s/g, '').toUpperCase();
    if (number && number === propertyNumber && postal && postal === propertyPostal) return key;
    if (number && number === propertyNumber && distanceMetres(record, property) <= 75) return key;
  }
  return null;
}

function detailId(row) {
  return String(row.zpid || row.id || row.providerListingId || '').trim();
}

function detailAddressKey(row) {
  const address = row.address || {};
  const street = row.streetAddress || address.streetAddress || row.addressStreet;
  const city = row.city || address.city || row.addressCity;
  const province = row.state || address.state || row.addressState;
  if (!street || !city || !province) return '';
  return `${addressKey(street)}|${String(city).toUpperCase()}|${String(province).toUpperCase()}`;
}

function recordAddressLookupKey(record) {
  return `${record.address_key}|${record.city.toUpperCase()}|${record.province}`;
}

function mergeZillowDetail(record, detail) {
  if (!detail) return record;
  const photos = detail.photos || detail.listingPhotos || [];
  const detailPhotoUrls = photos.map(photo => {
    if (typeof photo === 'string') return photo;
    return photo.url || photo.mixedSources?.jpeg?.[0]?.url || photo.mixedSources?.webp?.[0]?.url;
  }).filter(Boolean);
  return {
    ...record,
    description: record.description || detail.description || detail.homeDescription,
    monthly_price: record.monthly_price,
    photo_urls: record.photo_urls?.length ? record.photo_urls : detailPhotoUrls,
    contact_name: detail.attributionInfo?.agentName || detail.listing_agent?.name || record.contact_name,
    contact_company: detail.attributionInfo?.brokerName || detail.brokerageName ||
      detail.listing_agent?.office || record.contact_company,
    contact_phone: detail.attributionInfo?.agentPhoneNumber || detail.listing_agent?.phone ||
      record.contact_phone,
    detail_enriched: true,
  };
}

function metricsFor(records) {
  const canonical = canonicalize(records);
  return {
    source_records: records.length,
    canonical_properties: canonical.length,
    price_percent: completeness(records, 'monthly_price'),
    description_percent: completeness(records, 'description'),
    photos_percent: completeness(records, 'photo_urls'),
    coordinates_percent: Number((records.filter(record =>
      record.latitude != null && record.longitude != null).length / Math.max(records.length, 1) * 100).toFixed(1)),
    contact_name_percent: completeness(records, 'contact_name'),
    contact_company_percent: completeness(records, 'contact_company'),
  };
}

function sourceMetrics(records, canonical) {
  const families = new Map();
  for (const record of records) {
    if (!families.has(record.source_family)) families.set(record.source_family, new Set());
    families.get(record.source_family).add(canonicalKey(record));
  }
  return [...families.entries()].map(([sourceFamily, keys]) => ({
    source_family: sourceFamily,
    source_records: records.filter(record => record.source_family === sourceFamily).length,
    canonical_properties: keys.size,
    multi_source_properties: canonical.filter(property =>
      property.source_families.length > 1 && property.source_families.includes(sourceFamily)).length,
  }));
}

function writeJson(outputDir, filename, value) {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

async function run(options, dependencies = {}) {
  const readDataset = dependencies.fetchDataset || fetchDataset;
  const readRentSeeker = dependencies.fetchRentSeeker || fetchRentSeeker;
  const search = dependencies.runSearchScraper || runSearchScraper;
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(options.outputDir, runId);
  fs.mkdirSync(outputDir, { recursive: true });

  const raw = [];
  const normalized = [];
  const rejected = [];
  const acquisitions = [];
  const enrichmentIndexes = {};
  const enrichmentCounts = {};

  for (const input of options.enrichments) {
    const age = Date.now() - Date.parse(input.observedAt);
    if (!Number.isFinite(age) || age < 0 || age > 7 * 86400000) continue;
    let rows;
    try { rows = await readDataset(input.datasetId); } catch { continue; }
    if (!enrichmentIndexes[input.source]) enrichmentIndexes[input.source] = new Map();
    enrichmentCounts[input.source] = (enrichmentCounts[input.source] || 0) + rows.length;
    for (const row of rows) {
      const id = detailId(row);
      const address = detailAddressKey(row);
      if (id) enrichmentIndexes[input.source].set(`id:${id}`, row);
      if (address) enrichmentIndexes[input.source].set(`address:${address}`, row);
    }
  }

  for (const input of options.datasets) {
    const canRefreshZillow = input.source === 'zillow' && process.env.APIFY_TOKEN && input.bounds;
    require('./postcard-cost-report.cjs').startTracking(`rental-${input.region || input.city}`, `rental-${runId}-${input.source}-${input.region || input.city}`);
    let rows;
    try {
    rows = input.source === 'rentseeker'
      ? await readRentSeeker(input.bounds)
      : canRefreshZillow
        ? await search(process.env.APIFY_TOKEN,
          splitBoundsIntoGrid(input.bounds, input.gridSplit).map(buildZillowRentalUrl))
        : await readDataset(input.datasetId);
    } catch (error) {
      acquisitions.push({source: input.source, requested_city: input.city, requested_region: input.region, raw_records: 0, fresh: false, complete: false, status: 'failed', error: 'Source acquisition failed; inspect workflow logs'});
      console.warn(`Rental source failed: ${input.source}/${input.region || input.city}`);
      continue;
    }
    acquisitions.push({
      source: input.source,
      requested_city: input.city,
      requested_region: input.region || null,
      region_label: input.region_label || input.city,
      dataset_id: input.datasetId || null,
      raw_records: rows.length,
      complete: true,
      status: 'succeeded',
      fresh: input.source === 'rentseeker' || Boolean(canRefreshZillow),
    });
    raw.push(...rows.map(payload => ({ source: input.source, requested_city: input.city, payload })));
    for (const row of rows) {
      let record = normalizeRow(input.source, row, input);
      if (input.source === 'zillow') {
        const index = enrichmentIndexes.zillow;
        const detail = index?.get(`id:${record.source_listing_id}`);
        record = mergeZillowDetail(record, detail);
      }
      record.acquisition_fresh = input.source === 'rentseeker' || Boolean(canRefreshZillow);
      record.observed_at = new Date().toISOString();
      record.requested_city = input.city;
      record.requested_region = input.region || input.city.toLocaleLowerCase();
      record.acquisition_scope = input.region || input.city.toLocaleLowerCase();
      if (!record.source_listing_id || !record.address_key) {
        rejected.push({ reason: 'missing_identity_or_address', record });
      } else if (!isInProvince(record, options.province)) {
        rejected.push({ reason: 'wrong_province', record });
      } else if (!matchesAcquisitionScope(record, input)) {
        rejected.push({ reason: 'unexpected_city', record });
      } else {
        record.source_city = record.city;
        normalized.push(record);
      }
    }
  }

  const unique = [...new Map(normalized.map(row => [`${row.source}|${row.source_listing_id}`, row])).values()];
  normalized.splice(0, normalized.length, ...unique);
  const canonical = canonicalize(normalized);
  const categories = {};
  for (const property of canonical) {
    for (const category of property.listing_categories) {
      categories[category] = (categories[category] || 0) + 1;
    }
  }
  const rejectReasons = {};
  for (const reject of rejected) rejectReasons[reject.reason] = (rejectReasons[reject.reason] || 0) + 1;

  const summary = {
    run_id: runId,
    lane: 'rentals',
    isolated_from_postcard_lifecycle: true,
    province: options.province,
    acquisitions,
    totals: {
      raw_records: raw.length,
      accepted_source_records: normalized.length,
      rejected_records: rejected.length,
      canonical_properties: canonical.length,
      cross_family_properties: canonical.filter(property => property.source_families.length > 1).length,
    },
    completeness_percent: {
      price: completeness(normalized, 'monthly_price'),
      description: completeness(normalized, 'description'),
      photos: completeness(normalized, 'photo_urls'),
      coordinates: Number((normalized.filter(record =>
        record.latitude != null && record.longitude != null).length / Math.max(normalized.length, 1) * 100).toFixed(1)),
      postal_code: completeness(normalized, 'postal_code'),
      contact_company: completeness(normalized, 'contact_company'),
      contact_phone: completeness(normalized, 'contact_phone'),
      online_leasing_url: completeness(normalized, 'online_leasing_url'),
    },
    categories,
    rejection_reasons: rejectReasons,
    source_families: sourceMetrics(normalized, canonical),
    structure: {
      building_records: normalized.filter(record => record.entity_type === 'building').length,
      floorplans: canonical.reduce((total, property) => total + property.floorplans.length, 0),
      properties_with_available_unit_count: canonical.filter(property => property.units_available != null).length,
      properties_with_online_leasing: canonical.filter(property => property.online_leasing_urls.length > 0).length,
    },
    deduplication: {
      collapsed_source_records: normalized.length - canonical.length,
      canonical_properties_with_multiple_records:
        canonical.filter(property => property.source_record_ids.length > 1).length,
      canonical_properties_with_multiple_source_families:
        canonical.filter(property => property.source_families.length > 1).length,
    },
    cities: MARKET_REGION_KEYS.flatMap(region => REGION_CONFIG[region].cities.map(city => {
      const cityLower = city.toLocaleLowerCase();
      const cityRecords = normalized.filter(record => {
        const actual = String(record.source_city || record.city).toLocaleLowerCase();
        return actual === cityLower || actual.startsWith(`${cityLower} `);
      });
      const acquisitionsForRegion = acquisitions.filter(item => item.requested_region === region);
      return {
        city, region, region_label: REGION_CONFIG[region].label,
        status: acquisitionsForRegion.some(item => item.fresh && item.raw_records > 0) ? 'covered' : 'failed_or_empty',
        source_records: cityRecords.length,
        ...metricsFor(cityRecords),
      };
    })),
    regions: MARKET_REGION_KEYS.map(region => ({
      region, label: REGION_CONFIG[region].label,
      requested_cities: REGION_CONFIG[region].cities.length,
      source_records: normalized.filter(record => record.acquisition_scope === region).length,
      acquisitions: acquisitions.filter(item => item.requested_region === region),
    })),
    enrichments: Object.entries(enrichmentIndexes).map(([source, index]) => ({
      source,
      records_available: enrichmentCounts[source],
      records_matched: normalized.filter(record => record.source === source && record.detail_enriched).length,
    })),
  };

  writeJson(outputDir, 'raw-source-records.json', raw);
  writeJson(outputDir, 'normalized-source-records.json', normalized);
  writeJson(outputDir, 'canonical-properties.json', canonical);
  writeJson(outputDir, 'duplicate-groups.json',
    canonical.filter(property => property.source_record_ids.length > 1));
  writeJson(outputDir, 'rejected-records.json', rejected);
  writeJson(outputDir, 'summary.json', summary);
  fs.writeFileSync(path.join(options.outputDir, 'latest-run.txt'), `${runId}\n`);
  if (!acquisitions.some(a => a.fresh && a.complete)) throw new Error('No fresh rental source completed; inventory persistence blocked');
  console.log(JSON.stringify({ output_dir: outputDir, ...summary }, null, 2));
  return summary;
}

if (require.main === module) {
  run(parseArgs(process.argv.slice(2))).catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  canonicalize,
  completeness,
  distanceMetres,
  findCanonicalMatch,
  matchesRequestedCity,
  mergeZillowDetail,
  metricsFor,
  normalizeRow,
  fetchRentSeeker,
  parseArgs,
  run,
};
