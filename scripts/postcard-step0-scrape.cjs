#!/usr/bin/env node
/**
 * Step 0: Scrape fresh listings from Zillow via Apify
 *
 * For this Canada workflow, "sold" is inferred by disappearance:
 * - freshly scraped listings not seen before -> just_listed
 * - previously live listings missing from the fresh scrape -> sold
 * - previously live listings still present -> active
 *
 * Usage:
 *   node scripts/postcard-step0-scrape.cjs [--region windsor|wkg|london|ottawa] [--dry-run]
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  getSupabase,
  stepHeader,
  parseCliArgs,
  getRegionConfig,
} = require('./postcard-lib.cjs');

const SEARCH_ACTOR = 'maxcopell~zillow-scraper';

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const body = options.body || null;
    const u = new URL(url);
    const reqOpts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    };
    const req = https.request(reqOpts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildZillowSearchUrl(bounds) {
  const state = {
    isMapVisible: true,
    isListVisible: true,
    mapBounds: bounds,
    filterState: {
      isForSaleByAgent: { value: true },
      isForSaleByOwner: { value: false },
      isNewConstruction: { value: false },
      isForSaleForeclosure: { value: false },
      isComingSoon: { value: false },
      isAuction: { value: false },
      doz: { value: '7' },
    },
    pagination: {},
  };

  return 'https://www.zillow.com/homes/for_sale/?searchQueryState=' + encodeURIComponent(JSON.stringify(state));
}

async function runSearchScraper(token, searchUrl) {
  const input = {
    searchUrls: [{ url: searchUrl }],
    extractionMethod: 'PAGINATION',
  };

  console.log('  Starting Apify search run (current live listings)...');

  const startResp = await httpRequest(
    `https://api.apify.com/v2/acts/${SEARCH_ACTOR}/runs?token=${token}`,
    { method: 'POST', body: input }
  );

  if (startResp.status !== 200 && startResp.status !== 201) {
    throw new Error(`Apify start failed (${startResp.status}): ${JSON.stringify(startResp.data).slice(0, 300)}`);
  }

  const runId = startResp.data.data.id;
  const datasetId = startResp.data.data.defaultDatasetId;
  console.log(`  Run ID: ${runId}`);

  let status = 'RUNNING';
  while (status === 'RUNNING' || status === 'READY') {
    await sleep(10000);
    const s = await httpRequest(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = s?.data?.data?.status;
    process.stdout.write(`  Apify: ${status}\r`);
  }
  process.stdout.write('\n');

  if (status !== 'SUCCEEDED') {
    const logResp = await httpRequest(`https://api.apify.com/v2/actor-runs/${runId}/log?token=${token}`);
    const log = (typeof logResp.data === 'string' ? logResp.data : JSON.stringify(logResp.data))
      .split('\n').slice(-10).join('\n');
    throw new Error(`Apify run ${status}.\nLast log:\n${log}`);
  }

  const dataResp = await httpRequest(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`
  );

  if (!Array.isArray(dataResp.data)) {
    throw new Error('Apify returned unexpected payload: ' + JSON.stringify(dataResp.data).slice(0, 200));
  }

  console.log(`  Got ${dataResp.data.length} current results`);
  return dataResp.data;
}

function extractAddress(r) {
  if (r.streetAddress || r.addressStreet) {
    return {
      addressstreet: r.streetAddress || r.addressStreet || '',
      addresscity: r.city || r.addressCity || '',
      addressstate: r.state || r.addressState || 'ON',
      addresszipcode: r.zipcode || r.postalCode || '',
    };
  }
  if (r.address && typeof r.address === 'object') {
    const a = r.address;
    return {
      addressstreet: a.streetAddress || a.street || '',
      addresscity: a.city || '',
      addressstate: a.state || 'ON',
      addresszipcode: a.zipcode || a.postalCode || '',
    };
  }
  if (typeof r.address === 'string') {
    const parts = r.address.split(',').map(p => p.trim());
    return {
      addressstreet: parts[0] || '',
      addresscity: parts[1] || '',
      addressstate: parts[2] ? parts[2].split(' ')[0] : 'ON',
      addresszipcode: parts[2] ? parts[2].split(' ').slice(1).join(' ') : '',
    };
  }
  return { addressstreet: '', addresscity: '', addressstate: 'ON', addresszipcode: '' };
}

function normalizeResult(r, regionConfig, nowIso) {
  let zpid = r.zpid || r.id;
  if (!zpid && r.url) {
    const m = r.url.match(/(\d+)_zpid/);
    if (m) zpid = m[1];
  }
  if (!zpid && r.detailUrl) {
    const m = r.detailUrl.match(/(\d+)_zpid/);
    if (m) zpid = m[1];
  }
  if (!zpid) return null;

  const addr = extractAddress(r);
  if (!addr.addressstreet || !/^\d/.test(addr.addressstreet.trim())) return null;

  const rawCity = addr.addresscity || r.city || '';
  const matchedCity = regionConfig.cities.find(c => c.toLowerCase() === rawCity.toLowerCase());
  if (!matchedCity) return null;

  const rawPrice = r.price || r.listPrice || r.unformattedPrice || 0;
  const unformattedprice = typeof rawPrice === 'number'
    ? rawPrice
    : parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 0;
  const price = unformattedprice > 0
    ? `$${unformattedprice.toLocaleString()}`
    : (r.priceLabel || '');

  const contenttype = r.homeType || r.propertyType || r.contentType || 'SINGLE_FAMILY';
  const ct = contenttype.toUpperCase();
  if (ct === 'LOT' || ct === 'LAND') return null;

  const imgsrc = r.imgSrc || r.thumbnail || r.mainImage || null;
  const detailurl = r.detailUrl || r.url || null;

  let carouselphotos = null;
  const photoArrays = [r.responsivePhotos, r.originalPhotos, r.photos, r.images, r.big];
  for (const arr of photoArrays) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const extracted = arr.map(p => {
      if (typeof p === 'string') return { url: p };
      if (p?.url) return { url: p.url };
      const jpegs = p?.mixedSources?.jpeg;
      if (Array.isArray(jpegs) && jpegs.length > 0) {
        return { url: jpegs.sort((a, b) => (b.width || 0) - (a.width || 0))[0].url };
      }
      return null;
    }).filter(Boolean);
    if (extracted.length > 0) {
      carouselphotos = extracted;
      break;
    }
  }

  return {
    zpid: String(zpid),
    region: regionConfig.key,
    price,
    unformattedprice,
    address: `${addr.addressstreet}, ${matchedCity}, ${addr.addressstate} ${addr.addresszipcode}`.trim(),
    addressstreet: addr.addressstreet,
    addresscity: matchedCity,
    addressstate: addr.addressstate || 'ON',
    addresszipcode: addr.addresszipcode || '',
    city: matchedCity,
    beds: r.beds || r.bedrooms || null,
    baths: r.baths || r.bathrooms || null,
    area: r.area || r.livingArea || r.sqft || null,
    imgsrc,
    detailurl,
    carouselphotos: carouselphotos && carouselphotos.length > 0 ? carouselphotos : null,
    contenttype,
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    lastseenat: nowIso,
    glitch_suspected: false,
  };
}

async function fetchExistingRegionListings(supabase, regionConfig) {
  let rows = [];
  for (const city of regionConfig.cities) {
    const { data, error } = await supabase
      .from('listings')
      .select('zpid, region, status, city, addressstreet, first_seen_at, last_seen_at, lastseenat, glitch_suspected, is_furnished, furniture_confidence, furniture_scan_date, furniture_scan_method, furniture_needs_retry, photo_fetch_attempts, photos_last_attempted_at, carouselphotos, imgsrc, detailurl, just_listed_postcard_sent_at, sold_postcard_sent_at, last_postcard_sent_at, last_postcard_batch_id, last_postcard_type_sent')
      .eq('region', regionConfig.key)
      .eq('city', city)
      .in('status', ['active', 'just_listed', 'sold_archived', 'sold']);

    if (error) {
      throw new Error(`Failed to fetch existing listings for ${city}: ${error.message}`);
    }

    if (data?.length) {
      rows = rows.concat(data);
    }
  }

  return rows;
}

function buildLifecycleRows(scrapedRows, existingRows, regionConfig, nowIso) {
  const existingByZpid = new Map(existingRows.map(row => [String(row.zpid), row]));
  const currentByZpid = new Map();
  const nextRows = [];
  let justListedCount = 0;
  let activeCount = 0;
  let soldCount = 0;
  let glitchCount = 0;

  for (const scraped of scrapedRows) {
    if (currentByZpid.has(scraped.zpid)) continue;
    currentByZpid.set(scraped.zpid, scraped);
    const existing = existingByZpid.get(scraped.zpid);

    if (existing?.status === 'sold_archived') {
      glitchCount++;
      nextRows.push({
        zpid: scraped.zpid,
        region: regionConfig.key,
        status: 'sold_archived',
        glitch_suspected: true,
        lastseenat: nowIso,
      });
      continue;
    }

    if (existing) {
      activeCount++;
      nextRows.push({
        ...scraped,
        status: 'active',
        first_seen_at: existing.first_seen_at || scraped.first_seen_at,
        last_seen_at: nowIso,
        lastseenat: nowIso,
        is_furnished: existing.is_furnished,
        furniture_confidence: existing.furniture_confidence,
        furniture_scan_date: existing.furniture_scan_date,
        furniture_scan_method: existing.furniture_scan_method,
        furniture_needs_retry: existing.furniture_needs_retry,
        photo_fetch_attempts: existing.photo_fetch_attempts || 0,
        photos_last_attempted_at: existing.photos_last_attempted_at,
        carouselphotos: scraped.carouselphotos || existing.carouselphotos || null,
        imgsrc: scraped.imgsrc || existing.imgsrc || null,
        detailurl: scraped.detailurl || existing.detailurl || null,
        just_listed_postcard_sent_at: existing.just_listed_postcard_sent_at,
        sold_postcard_sent_at: existing.sold_postcard_sent_at,
        last_postcard_sent_at: existing.last_postcard_sent_at,
        last_postcard_batch_id: existing.last_postcard_batch_id,
        last_postcard_type_sent: existing.last_postcard_type_sent,
        glitch_suspected: false,
      });
    } else {
      justListedCount++;
      nextRows.push({
        ...scraped,
        status: 'just_listed',
        photo_fetch_attempts: 0,
        photos_last_attempted_at: null,
        furniture_needs_retry: false,
        just_listed_postcard_sent_at: null,
        sold_postcard_sent_at: null,
        last_postcard_sent_at: null,
        last_postcard_batch_id: null,
        last_postcard_type_sent: null,
      });
    }
  }

  for (const existing of existingRows) {
    const zpid = String(existing.zpid);
    if (currentByZpid.has(zpid)) continue;
    if (!['active', 'just_listed'].includes(existing.status)) continue;

    soldCount++;
    nextRows.push({
      zpid,
      region: regionConfig.key,
      status: 'sold',
      lastseenat: nowIso,
      glitch_suspected: false,
    });
  }

  return {
    nextRows,
    currentByZpid,
    summary: {
      justListedCount,
      activeCount,
      soldCount,
      glitchCount,
    },
  };
}

async function upsertListings(supabase, rows) {
  const BATCH = 50;  // Smaller batch size to avoid statement timeouts
  const MAX_RETRIES = 3;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { error } = await supabase
        .from('listings')
        .upsert(batch, { onConflict: 'zpid', ignoreDuplicates: false });

      if (!error) {
        upserted += batch.length;
        success = true;
        break;
      }

      if (attempt < MAX_RETRIES) {
        const delay = attempt * 3000; // 3s, 6s backoff
        console.error(`  Upsert batch ${batchNum} failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message} — retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`  Upsert batch ${batchNum} failed after ${MAX_RETRIES} attempts: ${error.message}`);
        errors += batch.length;
      }
    }

    process.stdout.write(`  Upserted ${Math.min(i + BATCH, rows.length)}/${rows.length}${success ? '' : ' (some errors)'}\r`);
  }
  process.stdout.write('\n');
  return { upserted, errors };
}

async function run(options) {
  stepHeader(0, 'Scrape Fresh Listings via Apify');

  const opts = options || parseCliArgs();
  const regionConfig = getRegionConfig(opts.region);
  if (!regionConfig.bounds) {
    throw new Error(`No bounding box configured for region: ${regionConfig.key}`);
  }

  console.log(`  Region: ${regionConfig.key}`);
  console.log(`  Bounds: W:${regionConfig.bounds.west}, E:${regionConfig.bounds.east}, S:${regionConfig.bounds.south}, N:${regionConfig.bounds.north}`);
  console.log(`  City filter: ${regionConfig.cities.length} cities`);

  const searchUrl = buildZillowSearchUrl(regionConfig.bounds);

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would run:');
    console.log('    Live URL:', searchUrl.slice(0, 120) + '...');
    return [];
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set in .env');

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  let liveResults = [];
  try {
    liveResults = await runSearchScraper(token, searchUrl);
  } catch (err) {
    console.error(`  Live scrape failed: ${err.message}`);
  }

  const liveRows = liveResults
    .map(r => normalizeResult(r, regionConfig, nowIso))
    .filter(Boolean)
    .filter(r => r.unformattedprice === 0 || r.unformattedprice >= (opts.minPrice || 300000));

  console.log(`\n  Normalised current listings: ${liveRows.length}`);

  if (liveRows.length === 0) {
    console.log('\n  WARNING: No current listings extracted. Pipeline will continue with existing DB data only.');
    return [];
  }

  const existingRows = await fetchExistingRegionListings(supabase, regionConfig);
  console.log(`  Existing region records: ${existingRows.length}`);

  const { nextRows, summary } = buildLifecycleRows(liveRows, existingRows, regionConfig, nowIso);
  console.log(`  Lifecycle summary: ${summary.justListedCount} just_listed, ${summary.activeCount} active, ${summary.soldCount} sold, ${summary.glitchCount} glitch`);

  console.log('\n  Upserting to Supabase...');
  const { upserted, errors } = await upsertListings(supabase, nextRows);
  console.log(`  Done: ${upserted} upserted, ${errors} errors`);

  return nextRows;
}

if (require.main === module) {
  run().catch(err => {
    console.error('\nStep 0 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
