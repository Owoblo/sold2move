#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const Papa = require('papaparse');
const {
  canonicalizeCommercial,
  classifyCommercialRelocation,
  normalizeRealtorCommercial,
  parseSpacelistDetail,
  parseSpacelistPage,
} = require('./commercial-market-lib.cjs');
const { REGION_CONFIG } = require('./postcard-region-config.cjs');

const slugify = value => String(value).toLowerCase().normalize('NFKD')
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const REGION_ROOTS = {
  windsor: 'Windsor', chatham: 'Chatham-Kent', sarnia: 'Sarnia',
  london: 'London', woodstock: 'Woodstock', wkg: 'Kitchener',
};
const SERVICE_CITIES = Object.freeze(Object.entries(REGION_CONFIG).flatMap(([region, config]) =>
  (REGION_ROOTS[region] ? [...new Set(config.cities)] : []).map(city => ({ city, region }))));
const SPACELIST_INPUTS = Object.freeze([
  ['windsor', 'Windsor'], ['windsor', 'Amherstburg'], ['windsor', 'Kingsville'],
  ['chatham', 'Chatham'], ['chatham', 'Thamesville'],
  ['sarnia', 'Sarnia'], ['sarnia', 'Petrolia'],
  ['london', 'London'], ['london', 'Ilderton'], ['london', 'Strathroy'],
  ['woodstock','Woodstock'], ['wkg','Kitchener'], ['wkg','Waterloo'], ['wkg','Cambridge'], ['wkg','Guelph'],
].map(([region, city]) => ({ city, region, slug: slugify(city) })));
const REALTOR_SUPPLEMENTAL_MARKETS = Object.freeze({
  windsor: ['LaSalle', 'Tecumseh', 'Amherstburg', 'Lakeshore', 'Leamington', 'Kingsville', 'Essex'],
  chatham: [],
  sarnia: ['Point Edward', 'Petrolia', 'St. Clair', 'Plympton-Wyoming', 'Lambton Shores', 'Warwick', 'Brooke-Alvinston'],
  london: ['St. Thomas', 'Strathroy-Caradoc', 'Middlesex Centre', 'Thames Centre', 'Aylmer', 'Central Elgin', 'South Huron', 'North Middlesex'],
  woodstock: ['Ingersoll', 'Tillsonburg', 'Norwich', 'Zorra', 'East Zorra-Tavistock', 'South-West Oxford'],
  wkg: ['Waterloo', 'Cambridge', 'Guelph', 'Woolwich', 'Wilmot', 'Wellesley', 'North Dumfries', 'Centre Wellington', 'Puslinch', 'Guelph-Eramosa', 'Wellington North', 'Mapleton', 'Minto', 'Stratford', 'Brantford', 'Brant', 'North Perth', 'Perth East'],
});
const REALTOR_SEARCH_PLAN = Object.freeze([
  ...Object.entries(REGION_ROOTS).flatMap(([region, location]) =>
    ['lease'].map(dealType => ({ region, location, deal_type: dealType, scope_level: 'broad_region' }))),
  ...Object.entries(REALTOR_SUPPLEMENTAL_MARKETS).flatMap(([region, markets]) => markets.map(location => ({
    region, location, deal_type: 'lease', scope_level: 'municipality_gap_fill',
  }))),
]);
const REALTOR_DATASETS = Object.freeze([
  { city: 'Windsor', datasetId: 'hbBdkES1evmcFOSEC' },
  { city: 'Windsor', datasetId: 'sX51VIlV9ChygRKjH' },
  { city: 'London', datasetId: 'GwFjabf0haKzabXkm' },
  { city: 'London', datasetId: 'eoObr7Q2MCGN1ALtC' },
]);
const REALTOR_ACTOR = 'fatihtahta~realtor-canada-scraper-commercial';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Sold2Move market research contact@sold2move.ca' } }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    }).on('error', reject);
    request.setTimeout(30000, () => request.destroy(new Error('Commercial source page timed out')));
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

async function runRealtorCommercial(token, location, dealType, region, snapshot) {
  const costs = require('./postcard-cost-report.cjs');
  const context = {region:`commercial-${region}`,file:costs.startTracking(`commercial-${region}`,`commercial-${snapshot}-${slugify(location)}-${dealType}`)};
  const input = { location: `${location}, Ontario`, deal_type: dealType, maximize_coverage: true, sort_option: 'date_desc' };
  if (dealType === 'sold') input.sold_within_days = '30';
  const reused = location === 'Windsor' && dealType === 'lease' && process.env.COMMERCIAL_PILOT_RUN_ID;
  const started = reused ? await apifyRequest(`https://api.apify.com/v2/actor-runs/${reused}?token=${token}`) : await apifyRequest(
    `https://api.apify.com/v2/acts/${REALTOR_ACTOR}/runs?token=${token}`,
    'POST', input
  );
  costs.recordRun(started.data, 'inventory', context);
  const runId = started.data.id;
  const datasetId = started.data.defaultDatasetId;
  let status = started.data.status;
  const deadline = Date.now() + 45 * 60000;
  while (['READY', 'RUNNING'].includes(status)) {
    if (Date.now() > deadline) {
      await apifyRequest(`https://api.apify.com/v2/actor-runs/${runId}/abort?token=${token}`, 'POST', {});
      throw new Error(`Commercial search ${runId} timed out and was aborted`);
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
    const run = await apifyRequest(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = run.data.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`REALTOR commercial actor ${runId} ended ${status}`);
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await apifyRequest(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=1000&offset=${offset}`);
    if (!Array.isArray(page)) throw new Error('Commercial dataset is not an array');
    rows.push(...page); if (page.length < 1000) break;
  }

  return { run_id: runId, dataset_id: datasetId, rows };
}

async function mapWithConcurrency(values, concurrency, worker) {
  const output = new Array(values.length);
  let cursor = 0;
  async function consume() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, consume));
  return output;
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

async function enrichSpacelistUnitDetails(records) {
  const results = [];
  for (const record of records) {
    if (record.transaction_type !== 'lease' || record.description) {
      results.push(record);
      continue;
    }
    try {
      const detail = parseSpacelistDetail(await fetchText(record.source_url));
      results.push({ ...record, description: detail.description, photo_urls: detail.photo_urls.length ? detail.photo_urls : record.photo_urls, postal_code: detail.postal_code || record.postal_code, detail_enrichment_status: detail.description ? 'enriched' : 'no_evidence_text' });
    } catch (error) {
      results.push({ ...record, detail_enrichment_status: 'error', detail_enrichment_error: error.message });
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return results;
}

function percent(records, predicate) {
  return Number((records.filter(predicate).length / Math.max(records.length, 1) * 100).toFixed(1));
}

async function run() {
  const outputRoot = path.join(__dirname, '.pipeline-commercial');
  const recovering = process.env.COMMERCIAL_RECOVER_INVENTORY === 'true';
  const runId = recovering ? fs.readFileSync(path.join(outputRoot, 'latest-run.txt'), 'utf8').trim() : new Date().toISOString().replace(/[:.]/g, '-');
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error('Invalid commercial snapshot ID');
  const outputDir = path.join(outputRoot, runId);
  if (recovering && fs.existsSync(path.join(outputDir, 'lifecycle-summary.json'))) throw new Error('Inventory already imported; resume screening instead of changing the saved acquisition');
  const observedAt = new Date(runId.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z')).toISOString();
  if (Date.now() - Date.parse(observedAt) > 8 * 86400000) throw new Error('Saved inventory is too old for recovery');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'latest-run.txt'), `${runId}\n`);
  const cityResults = [];
  for (const input of SPACELIST_INPUTS) {
    try {
      const checkpointFile = path.join(outputDir, `spacelist-${input.slug}.json`);
      const result = recovering && fs.existsSync(checkpointFile) ? JSON.parse(fs.readFileSync(checkpointFile)) : await scrapeCity(input.city, input.slug);
      if (!result.truncated) fs.writeFileSync(checkpointFile, JSON.stringify(result));
      result.records.forEach(record => {
        record.acquisition_scope = input.region;
        record.requested_region = input.region;
      });
      cityResults.push({ ...result, region: input.region, status: result.truncated ? 'partial' : 'ok' });
      console.log(`Commercial Spacelist ${input.city}: ${result.records.length} records${result.truncated ? ' (partial)' : ''}`);
    } catch (error) {
      cityResults.push({ city: input.city, region: input.region, pages: 0, records: [], status: 'error', error: error.message });
    }
  }
  const detailEnrichmentEnabled = process.env.COMMERCIAL_DETAIL_ENRICHMENT !== '0';
  const spacelistBaseRecords = cityResults.flatMap(result => result.records);
  const spacelistRecords = detailEnrichmentEnabled
    ? await enrichSpacelistUnitDetails(spacelistBaseRecords)
    : spacelistBaseRecords;
  const realtorRecords = [];
  const realtorSoldRecords = [];
  const realtorRuns = [];
  if (process.env.APIFY_TOKEN) {
    const results = await mapWithConcurrency(REALTOR_SEARCH_PLAN, 3, async search => {
      try {
        const savedFile = path.join(outputDir, `search-${slugify(search.location)}-${search.deal_type}.json`);
        if (recovering && fs.existsSync(savedFile)) { const saved = JSON.parse(fs.readFileSync(savedFile)); if (saved.status === 'ok' && Array.isArray(saved.rows)) return saved; }
        const result = await runRealtorCommercial(process.env.APIFY_TOKEN, search.location, search.deal_type, search.region, runId);
        const checkpoint = { ...search, status: 'ok', run_id: result.run_id, dataset_id: result.dataset_id, records: result.rows.length, rows: result.rows };
        fs.writeFileSync(path.join(outputDir, `search-${slugify(search.location)}-${search.deal_type}.json`), JSON.stringify(checkpoint));
        console.log(`Commercial REALTOR ${search.location}: ${result.rows.length} records`);
        return checkpoint;
      } catch (error) {
        return { ...search, status: 'error', error: error.message, records: 0, rows: [] };
      }
    });
    for (const result of results) {
      const { rows, ...ledger } = result;
      realtorRuns.push(ledger);
      const normalized = rows.map(row => ({
        ...normalizeRealtorCommercial(row, result.location),
        acquisition_scope: result.region, requested_region: result.region,
        realtor_search_location: result.location,
        realtor_search_scope: result.scope_level,
        discovered_by: [`${result.location}|${result.deal_type}`],
      }));
      if (result.deal_type === 'sold') realtorSoldRecords.push(...normalized);
      else realtorRecords.push(...normalized);
    }
  } else { throw new Error('APIFY_TOKEN required; stale commercial datasets are not a live scrape'); }

  const recordMap = new Map();
  for (const record of [...spacelistRecords, ...realtorRecords]
    .filter(record => record.address_key && record.province === 'ON' && record.transaction_type === 'lease')) {
    const id = `${record.source}|${record.source_listing_id}`;
    const previous = recordMap.get(id);
    const merged = previous ? {
      ...previous, ...record,
      discovered_by: [...new Set([...(previous.discovered_by || []), ...(record.discovered_by || [])])],
    } : record;
    recordMap.set(id, { ...merged, acquisition_fresh: true, observed_at: observedAt, ...classifyCommercialRelocation(merged) });
  }
  const records = [...recordMap.values()];
  const properties = canonicalizeCommercial(records);
  const relocationCandidates = records.filter(record => record.direct_relocation_candidate)
    .sort((a, b) => b.relocation_probability - a.relocation_probability);
  const relocationReviewQueue = records.filter(record =>
    record.listing_scope === 'unit' && (record.relocation_probability >= 40 || record.transition_evidence.length > 0)
  ).sort((a, b) => b.relocation_probability - a.relocation_probability);
  const byTransaction = {};
  const byAssetType = {};
  for (const record of records) {
    byTransaction[record.transaction_type] = (byTransaction[record.transaction_type] || 0) + 1;
    byAssetType[record.asset_type] = (byAssetType[record.asset_type] || 0) + 1;
  }
  const summary = {
    run_id: runId,
    lane: 'commercial',
    isolated_from_residential: true,
    sources: ['spacelist', 'realtor_ca_commercial'],
    source_freshness: {
      spacelist: 'live',
      realtor_ca_commercial: process.env.APIFY_TOKEN ? 'live_apify_actor' : 'stored_apify_dataset',
    },
    totals: {
      source_records: records.length,
      canonical_properties: properties.length,
      collapsed_same_property_spaces: records.length - properties.length,
      direct_relocation_candidates: relocationCandidates.length,
      market_intelligence_only: records.length - relocationCandidates.length,
      recent_sold_reference_records: realtorSoldRecords.length,
    },
    relocation_engine: {
      outreach_threshold: 70,
      hard_gate: ['specific_unit', 'identified_current_occupant', 'explicit_transition_or_availability_evidence'],
      by_scope: Object.fromEntries([...new Set(records.map(record => record.listing_scope))]
        .map(scope => [scope, records.filter(record => record.listing_scope === scope).length])),
      named_occupants: records.filter(record => record.current_occupant_name).length,
      transition_evidence_found: records.filter(record => record.transition_evidence.length > 0).length,
      candidates: relocationCandidates.length,
      human_review_queue: relocationReviewQueue.length,
      detail_pages_enriched: records.filter(record => record.detail_enrichment_status === 'enriched').length,
      detail_pages_without_evidence_text: records.filter(record => record.detail_enrichment_status === 'no_evidence_text').length,
      detail_enrichment_enabled: detailEnrichmentEnabled,
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
    cities: SERVICE_CITIES.map(input => ({
      city: input.city,
      region: input.region,
      spacelist_attempted: SPACELIST_INPUTS.some(item => item.city === input.city && item.region === input.region),
      status: cityResults.find(result => result.city === input.city)?.status || 'regional_search_only_not_individually_verified',
      error: cityResults.find(result => result.city === input.city)?.error || null,
      spacelist_pages: cityResults.find(result => result.city === input.city)?.pages || 0,
      source_records: records.filter(r => r.city?.toLowerCase() === input.city.toLowerCase()).length,
      canonical_properties: new Set((cityResults.find(result =>
        result.city === input.city)?.records || []).map(record => record.address_key)).size,
      capped_sources: REALTOR_DATASETS.filter(dataset => dataset.city === input.city).length,
      realtor_targeted: REALTOR_SEARCH_PLAN.some(search => search.region === input.region && search.location === input.city),
      realtor_runs: realtorRuns.filter(run => run.region === input.region && run.location === input.city)
        .map(run => ({ deal_type: run.deal_type, scope_level: run.scope_level, status: run.status, records: run.records, error: run.error || null })),
    })),
    regions: Object.entries(REGION_ROOTS).map(([region]) => ({
      region, label: REGION_CONFIG[region].label,
      requested_cities: REGION_CONFIG[region].cities.length,
      realtor_searches_planned: REALTOR_SEARCH_PLAN.filter(search => search.region === region).length,
      realtor_searches_succeeded: realtorRuns.filter(run => run.region === region && run.status === 'ok').length,
      spacelist_records: spacelistRecords.filter(record => record.acquisition_scope === region).length,
      realtor_records: realtorRecords.filter(record => record.acquisition_scope === region).length,
      realtor_recent_sold_records: realtorSoldRecords.filter(record => record.acquisition_scope === region).length,
      realtor_runs: realtorRuns.filter(run => run.region === region),
    })),
    realtor_runs: realtorRuns,
    coverage_warnings: [
      process.env.APIFY_TOKEN
        ? 'REALTOR.ca lease acquisition is attempted for every configured region; see success/error counts.'
        : 'REALTOR.ca is using stored fallback datasets; those records cannot drive disappearance lifecycle.',
      'Only exact normalized-address and parent-property duplicates are collapsed; low-confidence matches remain separate.',
      'Commercial lease rate can legitimately be undisclosed/contact-for-pricing.',
      'Direct relocation scoring runs after photo analysis and requires a unit-specific lease plus credible visual or textual transition evidence.',
      'REALTOR.ca searches target leases across six regions and supplemental municipalities. A regional search does not verify every requested community.',
      'Spacelist is secondary and limited to verified working markets to avoid invalid-path and rate-limit cascades.',
    ],
  };
  fs.writeFileSync(path.join(outputDir, 'source-records.json'), `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'canonical-properties.json'), `${JSON.stringify(properties, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'realtor-recent-sold-records.json'), `${JSON.stringify(realtorSoldRecords, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'relocation-candidates.json'), `${JSON.stringify(relocationCandidates, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'relocation-review-queue.json'), `${JSON.stringify(relocationReviewQueue, null, 2)}\n`);
  const reviewCsv = relocationReviewQueue.map(record => ({
    source: record.source,
    source_listing_id: record.source_listing_id,
    listing_url: record.source_url,
    listing_scope: record.listing_scope,
    unit_label: record.unit_label,
    street_address: record.street_address,
    city: record.city,
    asset_type: record.asset_type,
    transaction_type: record.transaction_type,
    square_feet: record.space_size_sqft_min,
    current_occupant: record.current_occupant_name,
    availability_date: record.availability_date,
    transition_evidence: record.transition_evidence.map(item => item.text).join(' | '),
    relocation_probability: record.relocation_probability,
    outreach_status: record.outreach_status,
    observed_current_business: '',
    occupant_present_at_unit: '',
    transition_confirmed: '',
    unit_matches_listing: '',
    review_notes: '',
  }));
  fs.writeFileSync(path.join(outputDir, 'relocation-review-queue.csv'), Papa.unparse(reviewCsv, { newline: '\n' }));
  fs.writeFileSync(path.join(outputDir, 'relocation-candidates.csv'), Papa.unparse(
    reviewCsv.filter((_, index) => relocationReviewQueue[index].direct_relocation_candidate),
    { newline: '\n' },
  ));
  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  try { await require('./pipeline-assessment.cjs').run('commercial', outputDir); }
  catch (error) { fs.writeFileSync(path.join(outputDir, 'assessment-error.json'), JSON.stringify({ error: error.message })); console.error(error.message); }
  fs.writeFileSync(path.join(outputRoot, 'latest-run.txt'), `${runId}\n`);
  const failures = realtorRuns.filter(r=>r.status!=='ok').length;
  console.log(JSON.stringify({output_dir:outputDir,totals:summary.totals,failed_realtor_searches:failures}));
  if (failures) throw new Error(`${failures} commercial searches failed; saved partial inventory requires recovery before mailing.`);
}

if (require.main === module) {
  run().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  REALTOR_SEARCH_PLAN,
  SERVICE_CITIES,
  SPACELIST_INPUTS,
  mapWithConcurrency,
  run,
  scrapeCity,
};
