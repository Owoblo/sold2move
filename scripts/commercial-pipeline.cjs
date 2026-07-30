#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const {
  canonicalizeCommercial,
  normalizeRealtorCommercial,
  parseSpacelistPage,
} = require('./commercial-market-lib.cjs');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');

const slugify = value => String(value).toLowerCase().normalize('NFKD')
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const REGION_ROOTS = {
  windsor: 'Windsor', chatham: 'Chatham-Kent', sarnia: 'Sarnia',
  london: 'London', woodstock: 'Woodstock', wkg: 'Kitchener-Waterloo-Cambridge-Guelph',
};
const CITIES = Object.freeze(Object.entries(REGION_ROOTS).flatMap(([region, root]) => {
  const names = [...new Set([root, ...REGION_CONFIG[region].cities])];
  return names.map(city => ({
    city, region, slug: city === 'Chatham-Kent' || city === 'Chatham Kent' ? 'chatham' : slugify(city),
  }));
}));
const REALTOR_DATASETS = Object.freeze([
  { city: 'Windsor', datasetId: 'hbBdkES1evmcFOSEC' },
  { city: 'Windsor', datasetId: 'sX51VIlV9ChygRKjH' },
  { city: 'London', datasetId: 'GwFjabf0haKzabXkm' },
  { city: 'London', datasetId: 'eoObr7Q2MCGN1ALtC' },
]);
const REALTOR_ACTOR = 'fatihtahta~realtor-canada-scraper-commercial';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Sold2Move market research contact@sold2move.ca' } }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function apifyRequest(url, method = 'GET', payload) {
  return new Promise((resolve, reject) => {
    const body = payload == null ? null : JSON.stringify(payload);
    const request = https.request(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    }, response => {
      let result = '';
      response.on('data', chunk => { result += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Apify HTTP ${response.statusCode}: ${result.slice(0, 500)}`));
          return;
        }
        try { resolve(JSON.parse(result)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.setTimeout(45 * 60 * 1000, () => request.destroy(new Error('Apify request timed out')));
    if (body) request.write(body);
    request.end();
  });
}

async function runRealtorCommercial(token, location, dealType) {
  const started = await apifyRequest(
    `https://api.apify.com/v2/acts/${REALTOR_ACTOR}/runs?token=${token}`,
    'POST', { location, deal_type: dealType, maximize_coverage: true, sort_option: 'date_desc' }
  );
  const runId = started.data.id;
  const datasetId = started.data.defaultDatasetId;
  let status = started.data.status;
  while (['READY', 'RUNNING'].includes(status)) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const run = await apifyRequest(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = run.data.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`REALTOR commercial actor ${runId} ended ${status}`);
  const rows = await apifyRequest(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=5000`
  );
  return { run_id: runId, dataset_id: datasetId, rows };
}

async function scrapeCity(city, slug, maxPages = 50) {
  const records = [];
  const seen = new Set();
  let url = `https://www.spacelist.ca/listings/on/${slug}`;
  let pages = 0;
  while (url && pages < maxPages && !seen.has(url)) {
    seen.add(url);
    const html = await fetchText(url);
    const parsed = parseSpacelistPage(html, city);
    records.push(...parsed.records);
    url = parsed.next;
    pages += 1;
    if (url) await new Promise(resolve => setTimeout(resolve, 250));
  }
  return {
    city,
    pages,
    records: [...new Map(records.map(record => [record.source_listing_id, record])).values()],
    truncated: Boolean(url && pages >= maxPages),
  };
}

function percent(records, predicate) {
  return Number((records.filter(predicate).length / Math.max(records.length, 1) * 100).toFixed(1));
}

async function run() {
  const outputRoot = path.join(__dirname, '.pipeline-commercial');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(outputRoot, runId);
  fs.mkdirSync(outputDir, { recursive: true });
  const cityResults = [];
  for (const input of CITIES) {
    try {
      const result = await scrapeCity(input.city, input.slug);
      result.records.forEach(record => {
        record.acquisition_scope = input.region;
        record.requested_region = input.region;
      });
      cityResults.push({ ...result, region: input.region, status: 'ok' });
    } catch (error) {
      cityResults.push({ city: input.city, region: input.region, pages: 0, records: [], status: 'error', error: error.message });
    }
  }
  const spacelistRecords = cityResults.flatMap(result => result.records);
  const realtorRecords = [];
  const realtorRuns = [];
  if (process.env.APIFY_TOKEN) {
    for (const [region, location] of Object.entries(REGION_ROOTS)) {
      for (const dealType of ['sale', 'lease']) {
        try {
          const result = await runRealtorCommercial(process.env.APIFY_TOKEN, `${location}, Ontario`, dealType);
          realtorRuns.push({ region, location, deal_type: dealType, status: 'ok',
            run_id: result.run_id, dataset_id: result.dataset_id, records: result.rows.length });
          realtorRecords.push(...result.rows.map(row => ({
            ...normalizeRealtorCommercial(row, location),
            acquisition_scope: region, requested_region: region,
          })));
        } catch (error) {
          realtorRuns.push({ region, location, deal_type: dealType, status: 'error', error: error.message, records: 0 });
        }
      }
    }
  } else {
    for (const input of REALTOR_DATASETS) {
      const rows = await fetchJson(`https://api.apify.com/v2/datasets/${input.datasetId}/items?clean=true&limit=1000`);
      realtorRecords.push(...rows.map(row => normalizeRealtorCommercial(row, input.city)));
    }
  }
  const records = [...new Map([...spacelistRecords, ...realtorRecords]
    .filter(record => record.address_key && record.province === 'ON')
    .map(record => [`${record.source}|${record.source_listing_id}`, record])).values()];
  const properties = canonicalizeCommercial(records);
  const byTransaction = {};
  const byAssetType = {};
  for (const record of records) {
    byTransaction[record.transaction_type] = (byTransaction[record.transaction_type] || 0) + 1;
    byAssetType[record.asset_type] = (byAssetType[record.asset_type] || 0) + 1;
  }
  const summary = {
    run_id: runId,
    lane: 'commercial',
    isolated_from_residential_and_postcards: true,
    sources: ['spacelist', 'realtor_ca_commercial'],
    source_freshness: {
      spacelist: 'live',
      realtor_ca_commercial: process.env.APIFY_TOKEN ? 'live_apify_actor' : 'stored_apify_dataset',
    },
    totals: {
      source_records: records.length,
      canonical_properties: properties.length,
      collapsed_same_property_spaces: records.length - properties.length,
    },
    by_transaction: byTransaction,
    by_asset_type: byAssetType,
    by_source_family: Object.fromEntries([...new Set(records.map(record => record.source_family))]
      .map(family => [family, records.filter(record => record.source_family === family).length])),
    overlap: {
      properties_with_multiple_source_families:
        properties.filter(property => property.source_families.length > 1).length,
    },
    completeness_percent: {
      coordinates: percent(records, record => record.latitude != null && record.longitude != null),
      photos: percent(records, record => record.photo_urls.length > 0),
      brokerage: percent(records, record => record.brokerage_name),
      size: percent(records, record => record.space_size_sqft_min != null),
      sale_price: percent(records.filter(record => record.transaction_type === 'sale'), record => record.asking_price != null),
      lease_rate: percent(records.filter(record => record.transaction_type === 'lease'), record => record.lease_rate != null),
    },
    cities: CITIES.map(input => ({
      city: input.city,
      region: input.region,
      status: cityResults.find(result => result.city === input.city)?.status || 'error',
      error: cityResults.find(result => result.city === input.city)?.error || null,
      spacelist_pages: cityResults.find(result => result.city === input.city)?.pages || 0,
      source_records: cityResults.find(result => result.city === input.city)?.records.length || 0,
      canonical_properties: new Set((cityResults.find(result =>
        result.city === input.city)?.records || []).map(record => record.address_key)).size,
      capped_sources: REALTOR_DATASETS.filter(dataset => dataset.city === input.city).length,
    })),
    regions: Object.entries(REGION_ROOTS).map(([region]) => ({
      region, label: REGION_CONFIG[region].label,
      requested_cities: REGION_CONFIG[region].cities.length,
      spacelist_records: spacelistRecords.filter(record => record.acquisition_scope === region).length,
      realtor_records: realtorRecords.filter(record => record.acquisition_scope === region).length,
      realtor_runs: realtorRuns.filter(run => run.region === region),
    })),
    realtor_runs: realtorRuns,
    coverage_warnings: [
      process.env.APIFY_TOKEN
        ? 'REALTOR.ca sale and lease acquisition runs live for every configured region.'
        : 'REALTOR.ca is using stored fallback datasets; those records cannot drive disappearance lifecycle.',
      'Only exact normalized-address and parent-property duplicates are collapsed; low-confidence matches remain separate.',
      'Commercial lease rate can legitimately be undisclosed/contact-for-pricing.',
    ],
  };
  fs.writeFileSync(path.join(outputDir, 'source-records.json'), `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'canonical-properties.json'), `${JSON.stringify(properties, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(outputRoot, 'latest-run.txt'), `${runId}\n`);
  console.log(JSON.stringify({ output_dir: outputDir, ...summary }, null, 2));
}

if (require.main === module) {
  run().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { run, scrapeCity };
