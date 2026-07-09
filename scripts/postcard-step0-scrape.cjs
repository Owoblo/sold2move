#!/usr/bin/env node
/**
 * Step 0: Scrape the FULL active inventory from Zillow via Apify
 *
 * For this Canada workflow, "sold" is inferred by disappearance:
 * - freshly scraped listings not seen before -> just_listed
 * - previously live listings missing from TWO consecutive full scrapes -> sold
 * - previously live listings still present -> active
 *
 * Disappearance-inference is only valid when the scrape covers the whole
 * active inventory, so there is NO days-on-Zillow filter, and region bounds
 * are grid-split into sub-searches to stay under Zillow's ~500/search cap.
 *
 * Guards:
 * - degraded-scrape gate: a scrape returning <50% of known-active listings
 *   freezes miss counters for the run (partial Apify results can't create
 *   phantom solds)
 * - --seed: first run for a new region stores everything as 'active' so
 *   onboarding never mass-mails a region's existing backlog
 *
 * Usage:
 *   node scripts/postcard-step0-scrape.cjs [--region <key>] [--seed] [--dry-run]
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  getSupabase,
  stepHeader,
  parseCliArgs,
  getRegionConfig,
  writePipelineFile,
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

// NOTE: no `doz` (days-on-Zillow) filter here — deliberately.
// Sold detection works by disappearance ("in DB but missing from scrape"),
// which is only valid if the scrape covers the ENTIRE active inventory.
// A doz window silently drops every listing older than the window, making
// perfectly-live listings look "missing" and generating phantom solds.
// FSBO listings are included: no agent involved, but the homeowner is
// still a prime moving prospect.
function buildZillowSearchUrl(bounds) {
  const state = {
    isMapVisible: true,
    isListVisible: true,
    mapBounds: bounds,
    filterState: {
      sort: { value: 'days' },
      isForSaleByAgent: { value: true },
      isForSaleByOwner: { value: true },
      isNewConstruction: { value: false },
      isForSaleForeclosure: { value: false },
      isComingSoon: { value: false },
      isAuction: { value: false },
    },
    pagination: {},
  };

  return 'https://www.zillow.com/homes/for_sale/?searchQueryState=' + encodeURIComponent(JSON.stringify(state));
}

// Zillow map searches cap out around ~500 results per query. A full-inventory
// scrape of a whole region can exceed that, so we split the region bounds into
// a grid of sub-searches and hand the actor one URL per cell (it dedupes).
// Regions can override the default 2×2 via `gridSplit: { rows, cols }` in
// postcard-region-config.cjs — size the grid so each cell stays under ~400
// active listings (see docs/ADDING_A_REGION.md).
function splitBoundsIntoGrid(bounds, gridRows, gridCols) {
  const rows = Math.max(1, gridRows || 2);
  const cols = Math.max(1, gridCols || 2);
  const latStep = (bounds.north - bounds.south) / rows;
  const lngStep = (bounds.east - bounds.west) / cols;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        south: bounds.south + r * latStep,
        north: bounds.south + (r + 1) * latStep,
        west: bounds.west + c * lngStep,
        east: bounds.west + (c + 1) * lngStep,
      });
    }
  }
  return cells;
}

async function runSearchScraper(token, searchUrls) {
  const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];
  const input = {
    searchUrls: urls.map(u => ({ url: u })),
    extractionMethod: 'PAGINATION_WITH_ZOOM_IN',
  };

  console.log(`  Starting Apify search run (${urls.length} grid cell${urls.length > 1 ? 's' : ''}, full active inventory)...`);

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

  // Hard cap on polling so a stuck actor can't hang the job until the
  // workflow-level timeout kills it without cleanup.
  const MAX_POLL_MS = 45 * 60 * 1000;
  const pollStart = Date.now();
  let status = 'RUNNING';
  while (status === 'RUNNING' || status === 'READY') {
    if (Date.now() - pollStart > MAX_POLL_MS) {
      await httpRequest(`https://api.apify.com/v2/actor-runs/${runId}/abort?token=${token}`, { method: 'POST' })
        .catch(() => {});
      throw new Error(`Apify run ${runId} exceeded ${MAX_POLL_MS / 60000} minutes — aborted`);
    }
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

  // A run can report SUCCEEDED while its dataset contains error objects
  // instead of listings (seen in the wild: credits exhausted / upstream
  // block). Strip them, and fail loudly if that's ALL we got.
  const errorItems = dataResp.data.filter(it =>
    it && typeof it === 'object' && 'error' in it && !it.zpid && !it.detailUrl && !it.address
  );
  if (errorItems.length > 0) {
    console.warn(`  WARNING: dataset contained ${errorItems.length} error item(s): ${JSON.stringify(errorItems[0]).slice(0, 200)}`);
    if (errorItems.length === dataResp.data.length) {
      throw new Error('Apify dataset contains only error items — treating scrape as failed');
    }
    dataResp.data = dataResp.data.filter(it => !errorItems.includes(it));
  }

  console.log(`  Got ${dataResp.data.length} current results`);

  // FIELD PROBE — logs agent/broker fields at top level and inside hdpData.
  // Safe to remove once realtor pipeline is built.
  if (dataResp.data.length > 0) {
    const sample = dataResp.data[0];
    console.log('  [FIELD PROBE] Top-level keys:', Object.keys(sample).sort().join(', '));

    // Top-level agent/broker fields
    const agentKeys = Object.keys(sample).filter(k =>
      /agent|broker|realtor|listing|attribution|contact|phone/i.test(k)
    );
    if (agentKeys.length > 0) {
      console.log('  [FIELD PROBE] Top-level agent keys + values:');
      agentKeys.forEach(k => console.log(`    ${k}:`, JSON.stringify(sample[k])));
    }

    // Dig into hdpData — agent info is often nested here
    if (sample.hdpData && typeof sample.hdpData === 'object') {
      console.log('  [FIELD PROBE] hdpData keys:', Object.keys(sample.hdpData).sort().join(', '));
      const hdpAgentKeys = Object.keys(sample.hdpData).filter(k =>
        /agent|broker|realtor|listing|attribution|contact|phone/i.test(k)
      );
      if (hdpAgentKeys.length > 0) {
        console.log('  [FIELD PROBE] hdpData agent keys + values:');
        hdpAgentKeys.forEach(k => console.log(`    hdpData.${k}:`, JSON.stringify(sample.hdpData[k])));
      }
      // Also check homeInfo inside hdpData
      const homeInfo = sample.hdpData.homeInfo;
      if (homeInfo && typeof homeInfo === 'object') {
        console.log('  [FIELD PROBE] hdpData.homeInfo keys:', Object.keys(homeInfo).sort().join(', '));
        const hiAgentKeys = Object.keys(homeInfo).filter(k =>
          /agent|broker|realtor|listing|attribution|contact|phone/i.test(k)
        );
        if (hiAgentKeys.length > 0) {
          console.log('  [FIELD PROBE] hdpData.homeInfo agent keys + values:');
          hiAgentKeys.forEach(k => console.log(`    homeInfo.${k}:`, JSON.stringify(homeInfo[k])));
        }
      }
    } else {
      console.log('  [FIELD PROBE] hdpData not present or not an object.');
    }
  }

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

function normalizeCityKey(city) {
  return (city || '').trim().toLowerCase();
}

function resolveRegionCity(rawCity, regionConfig) {
  const key = normalizeCityKey(rawCity);
  const direct = regionConfig.cities.find(c => normalizeCityKey(c) === key);
  if (direct) return direct;

  const aliases = regionConfig.cityAliases || {};
  const alias = Object.entries(aliases).find(([name]) => normalizeCityKey(name) === key);
  if (!alias) return null;

  const canonical = alias[1];
  return regionConfig.cities.find(c => normalizeCityKey(c) === normalizeCityKey(canonical)) || canonical;
}

function getRegionState(regionConfig) {
  return (regionConfig.state || regionConfig.province || 'ON').trim().toUpperCase();
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
  // Only drop listings with no zpid or no address at all — everything else goes to DB
  if (!addr.addressstreet) return null;

  const rawCity = (addr.addresscity || r.city || '').trim();
  const state = (addr.addressstate || 'ON').trim().toUpperCase();
  const targetState = getRegionState(regionConfig);
  if (state !== targetState) {
    if (!normalizeResult._outOfProvince) normalizeResult._outOfProvince = new Map();
    normalizeResult._outOfProvince.set(state, (normalizeResult._outOfProvince.get(state) || 0) + 1);
    return null;
  }

  const matchedCity = resolveRegionCity(rawCity, regionConfig) || rawCity || 'Unknown';
  if (!resolveRegionCity(rawCity, regionConfig)) {
    if (!normalizeResult._acceptedRegionCities) normalizeResult._acceptedRegionCities = new Set();
    normalizeResult._acceptedRegionCities.add(matchedCity);
  }
  if (rawCity && normalizeCityKey(rawCity) !== normalizeCityKey(matchedCity)) {
    if (!normalizeResult._aliasedCities) normalizeResult._aliasedCities = new Map();
    normalizeResult._aliasedCities.set(rawCity, matchedCity);
  }

  const rawPrice = r.price || r.listPrice || r.unformattedPrice || 0;
  const unformattedprice = typeof rawPrice === 'number'
    ? rawPrice
    : parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 0;
  const price = unformattedprice > 0
    ? `$${unformattedprice.toLocaleString()}`
    : (r.priceLabel || '');

  const contenttype = r.homeType || r.propertyType || r.contentType || 'SINGLE_FAMILY';

  const imgsrc = r.imgSrc || r.thumbnail || r.mainImage || null;
  const detailurl = r.detailUrl || r.url || null;

  // Capture listing description if Apify returns it
  const description = r.description || r.homeDescription || r.hdpData?.homeInfo?.description || null;
  const searchDaysRaw = r.daysOnZillow ?? r.timeOnZillow ?? r.hdpData?.homeInfo?.daysOnZillow;
  const searchDays = Number.isFinite(Number(searchDaysRaw)) ? Number(searchDaysRaw) : null;
  const searchTime = r.timeOnZillow || r.hdpData?.homeInfo?.timeOnZillow || null;

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
    address: `${addr.addressstreet}, ${matchedCity}, ${state} ${addr.addresszipcode}`.trim(),
    addressstreet: addr.addressstreet,
    addresscity: matchedCity,
    addressstate: state,
    addresszipcode: addr.addresszipcode || '',
    city: matchedCity,
    beds: r.beds || r.bedrooms || null,
    baths: r.baths || r.bathrooms || null,
    area: r.area || r.livingArea || r.sqft || null,
    imgsrc,
    detailurl,
    description,
    carouselphotos: carouselphotos && carouselphotos.length > 0 ? carouselphotos : null,
    contenttype,
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    lastseenat: nowIso,
    glitch_suspected: false,
    search_days_on_zillow: searchDays,
    search_time_on_zillow: searchTime,
  };
}

const LIVE_COLUMNS = 'zpid, region, status, address, city, addressstreet, addresscity, addressstate, addresszipcode, first_seen_at, last_seen_at, lastseenat, glitch_suspected, is_furnished, furniture_confidence, furniture_scan_date, furniture_scan_method, furniture_needs_retry, photo_fetch_attempts, photos_last_attempted_at, imgsrc, detailurl, search_days_on_zillow, search_time_on_zillow, detail_days_on_zillow, detail_time_on_zillow, zillow_date_posted, zillow_detail_checked_at, just_listed_postcard_sent_at, sold_postcard_sent_at, last_postcard_sent_at, last_postcard_batch_id, last_postcard_type_sent, postcard_send_count, missing_scrape_count';

function normalizeAddressKey(listing) {
  const street = (listing.addressstreet || '').toString();
  const postal = (listing.addresszipcode || '').toString();
  const city = (listing.city || listing.addresscity || '').toString();
  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const streetKey = clean(street);
  if (!streetKey) return '';
  const postalKey = clean(postal);
  return postalKey ? `${streetKey}|${postalKey}` : `${streetKey}|${clean(city)}`;
}

/**
 * Fetch existing rows for a specific set of zpids, REGARDLESS of region.
 * Region bounds overlap (e.g. London/Woodstock), so a listing scraped by this
 * region's run may already live in the DB under another region. Without this
 * lookup it would be treated as brand-new — re-inserted as just_listed with
 * its postcard history (send count, sent-at timestamps) wiped to null.
 */
async function fetchExistingByZpids(supabase, zpids) {
  const rows = [];
  const CHUNK = 200;
  for (let i = 0; i < zpids.length; i += CHUNK) {
    const chunk = zpids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('listings')
      .select(LIVE_COLUMNS)
      .in('zpid', chunk);
    if (error) {
      throw new Error(`Failed to fetch existing rows by zpid: ${error.message}`);
    }
    if (data?.length) rows.push(...data);
  }
  return rows;
}

async function fetchExistingRegionListings(supabase, regionConfig) {
  // Split into two queries per city, cheapest first:
  //   1. SLIM — `sold_archived` rows accumulate forever and are only checked
  //      for status (glitch detection at line 276). Pulling 24 columns
  //      including the heavy JSONB carouselphotos for thousands of these
  //      rows is what triggered Postgres statement_timeout on Ottawa.
  //   2. FULL — only live statuses need their lifecycle metadata
  //      (postcard timestamps, photo fetch state, etc.).
  //
  // Both calls use explicit .limit() so Supabase's default 1000-row cap
  // can't silently truncate as the table grows.
  let rows = [];
  for (const city of regionConfig.cities) {
    const archived = await supabase
      .from('listings')
      .select('zpid, status, region, addressstreet, addresszipcode, city, addresscity')
      .eq('region', regionConfig.key)
      .eq('city', city)
      .eq('status', 'sold_archived')
      .limit(50000);
    if (archived.error) {
      throw new Error(`Failed to fetch archived listings for ${city}: ${archived.error.message}`);
    }

    const live = await supabase
      .from('listings')
      .select(LIVE_COLUMNS)
      .eq('region', regionConfig.key)
      .eq('city', city)
      .in('status', ['active', 'just_listed', 'sold'])
      .limit(10000);
    if (live.error) {
      throw new Error(`Failed to fetch live listings for ${city}: ${live.error.message}`);
    }

    if (archived.data?.length) rows = rows.concat(archived.data);
    if (live.data?.length) rows = rows.concat(live.data);
  }

  // Also fetch any listings stored under cities not in our known list (e.g. "Essex County").
  // Without this, unknown-city listings would never appear in existingRows and would be
  // re-inserted as just_listed on every single run.
  const knownCities = regionConfig.cities;
  const unknownArchived = await supabase
    .from('listings')
    .select('zpid, status, region, addressstreet, addresszipcode, city, addresscity')
    .eq('region', regionConfig.key)
    .not('city', 'in', `(${knownCities.map(c => `"${c}"`).join(',')})`)
    .eq('status', 'sold_archived')
    .limit(50000);
  const unknownLive = await supabase
    .from('listings')
    .select(LIVE_COLUMNS)
    .eq('region', regionConfig.key)
    .not('city', 'in', `(${knownCities.map(c => `"${c}"`).join(',')})`)
    .in('status', ['active', 'just_listed', 'sold'])
    .limit(10000);
  if (unknownArchived.data?.length) rows = rows.concat(unknownArchived.data);
  if (unknownLive.data?.length) rows = rows.concat(unknownLive.data);

  return rows;
}

function buildLifecycleRows(scrapedRows, existingRows, regionConfig, nowIso, lifecycleOpts = {}) {
  // degraded: this scrape returned far fewer rows than we know to be active,
  //   so "missing from scrape" is meaningless — process what we saw, but do
  //   NOT increment anyone's miss counter.
  // seedMode: first run for a brand-new region — insert unseen listings as
  //   'active' (existing inventory) instead of 'just_listed', so onboarding
  //   a region doesn't mass-mail its entire backlog.
  const { degraded = false, seedMode = false } = lifecycleOpts;
  const existingByZpid = new Map(existingRows.map(row => [String(row.zpid), row]));
  const existingByAddress = new Map();
  for (const row of existingRows) {
    const key = normalizeAddressKey(row);
    if (!key) continue;
    const current = existingByAddress.get(key);
    const currentSent = (current?.postcard_send_count || 0) > 0 || current?.last_postcard_sent_at;
    const rowSent = (row.postcard_send_count || 0) > 0 || row.last_postcard_sent_at;
    if (!current || rowSent || !currentSent) existingByAddress.set(key, row);
  }
  const currentByZpid = new Map();
  const currentAddressKeys = new Set();
  const nextRows = [];
  let justListedCount = 0;
  let activeCount = 0;
  let soldCount = 0;
  let glitchCount = 0;
  let pendingMissCount = 0;
  let seededCount = 0;

  // Tier 2: a listing missing from one scrape is not enough evidence it's sold.
  // Wait until it's missing from this many CONSECUTIVE scrapes before flipping
  // to status='sold'. At our every-2-day cron, 2 misses ≈ 4-6 days — long
  // enough to filter Zillow API hiccups, pagination drift, and short delistings,
  // short enough that real sold listings still get caught while sellers are
  // packing.
  const REQUIRED_CONSECUTIVE_MISSES = 2;

  for (const scraped of scrapedRows) {
    if (currentByZpid.has(scraped.zpid)) continue;
    currentByZpid.set(scraped.zpid, scraped);
    const scrapedAddressKey = normalizeAddressKey(scraped);
    if (scrapedAddressKey) currentAddressKeys.add(scrapedAddressKey);
    const existing = existingByZpid.get(scraped.zpid);

    if (existing?.status === 'sold_archived') {
      glitchCount++;
      nextRows.push({
        ...scraped,
        region: existing.region || regionConfig.key,
        // If Zillow shows an archived-sold property as active again, route it
        // through the just-listed detail-freshness guard. Step 5 requires a
        // successful detail-page days-on-Zillow check before it can mail again.
        status: 'just_listed',
        first_seen_at: existing.first_seen_at || scraped.first_seen_at,
        last_seen_at: nowIso,
        glitch_suspected: false,
        lastseenat: nowIso,
        is_furnished: existing.is_furnished,
        furniture_confidence: existing.furniture_confidence,
        furniture_scan_date: existing.furniture_scan_date,
        furniture_scan_method: existing.furniture_scan_method,
        furniture_needs_retry: existing.furniture_needs_retry,
        photo_fetch_attempts: 0,
        photos_last_attempted_at: null,
        carouselphotos: scraped.carouselphotos || existing.carouselphotos || null,
        imgsrc: scraped.imgsrc || existing.imgsrc || null,
        detailurl: scraped.detailurl || existing.detailurl || null,
        search_days_on_zillow: scraped.search_days_on_zillow,
        search_time_on_zillow: scraped.search_time_on_zillow,
        detail_days_on_zillow: existing.detail_days_on_zillow,
        detail_time_on_zillow: existing.detail_time_on_zillow,
        zillow_date_posted: existing.zillow_date_posted,
        zillow_detail_checked_at: existing.zillow_detail_checked_at,
        just_listed_postcard_sent_at: existing.just_listed_postcard_sent_at,
        sold_postcard_sent_at: existing.sold_postcard_sent_at,
        last_postcard_sent_at: existing.last_postcard_sent_at,
        last_postcard_batch_id: existing.last_postcard_batch_id,
        last_postcard_type_sent: existing.last_postcard_type_sent,
        postcard_send_count: existing.postcard_send_count || 0,
        missing_scrape_count: 0,
        postcard_skip_reason: 'reappeared_after_sold_archive',
      });
      continue;
    }

    if (existing) {
      activeCount++;
      nextRows.push({
        ...scraped,
        // First-owner-wins: overlapping region bounds mean two regions can
        // scrape the same listing. Keep the region that first captured it so
        // the row doesn't flap between regions on alternating runs.
        region: existing.region || regionConfig.key,
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
        search_days_on_zillow: scraped.search_days_on_zillow,
        search_time_on_zillow: scraped.search_time_on_zillow,
        detail_days_on_zillow: existing.detail_days_on_zillow,
        detail_time_on_zillow: existing.detail_time_on_zillow,
        zillow_date_posted: existing.zillow_date_posted,
        zillow_detail_checked_at: existing.zillow_detail_checked_at,
        just_listed_postcard_sent_at: existing.just_listed_postcard_sent_at,
        sold_postcard_sent_at: existing.sold_postcard_sent_at,
        last_postcard_sent_at: existing.last_postcard_sent_at,
        last_postcard_batch_id: existing.last_postcard_batch_id,
        last_postcard_type_sent: existing.last_postcard_type_sent,
        postcard_send_count: existing.postcard_send_count || 0,
        missing_scrape_count: 0, // listing is back — reset the miss streak
        glitch_suspected: false,
      });
    } else if (seedMode) {
      // Seeding a new region: this is pre-existing inventory, not a fresh
      // listing. Store as 'active' so it never triggers a just_listed
      // postcard, but participates in sold-by-disappearance from now on.
      seededCount++;
      nextRows.push({
        ...scraped,
        status: 'active',
        photo_fetch_attempts: 0,
        photos_last_attempted_at: null,
        furniture_needs_retry: false,
        just_listed_postcard_sent_at: null,
        sold_postcard_sent_at: null,
        last_postcard_sent_at: null,
        last_postcard_batch_id: null,
        last_postcard_type_sent: null,
        postcard_send_count: 0,
        missing_scrape_count: 0,
      });
    } else {
      const addressMatch = existingByAddress.get(scrapedAddressKey);
      if (addressMatch) {
        activeCount++;
        nextRows.push({
          ...scraped,
          // New zpid at a known physical address is a relist or scraper identity
          // change, not a genuinely new market opportunity.
          region: addressMatch.region || regionConfig.key,
          status: 'active',
          photo_fetch_attempts: 0,
          photos_last_attempted_at: null,
          furniture_needs_retry: false,
          just_listed_postcard_sent_at: null,
          sold_postcard_sent_at: null,
          last_postcard_sent_at: null,
          last_postcard_batch_id: null,
          last_postcard_type_sent: null,
          postcard_send_count: 0,
          missing_scrape_count: 0,
          detail_days_on_zillow: addressMatch.detail_days_on_zillow,
          detail_time_on_zillow: addressMatch.detail_time_on_zillow,
          zillow_date_posted: addressMatch.zillow_date_posted,
          zillow_detail_checked_at: addressMatch.zillow_detail_checked_at,
          postcard_skip_reason: `known_address_relist: ${addressMatch.zpid}`,
        });
        continue;
      }
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
        postcard_send_count: 0,
        missing_scrape_count: 0,
      });
    }
  }

  // Disappearance pass — skipped entirely on degraded scrapes so a flaky
  // Apify run can't burn anyone's Tier-2 miss strikes.
  if (!degraded) {
    for (const existing of existingRows) {
      const zpid = String(existing.zpid);
      if (currentByZpid.has(zpid)) continue;
      const existingAddressKey = normalizeAddressKey(existing);
      if (existingAddressKey && currentAddressKeys.has(existingAddressKey)) continue;
      if (!['active', 'just_listed'].includes(existing.status)) continue;

      const newMissingCount = (existing.missing_scrape_count || 0) + 1;

      if (newMissingCount >= REQUIRED_CONSECUTIVE_MISSES) {
        // Confirmed missing across enough scrapes — flip to sold.
        soldCount++;
        nextRows.push({
          zpid,
          region: existing.region || regionConfig.key,
          status: 'sold',
          lastseenat: nowIso,
          missing_scrape_count: newMissingCount,
          postcard_send_count: existing.postcard_send_count || 0,
          glitch_suspected: false,
        });
      } else {
        // First (or sub-threshold) miss — bump the counter but don't flip status.
        // The row stays active/just_listed and is NOT eligible for a sold
        // postcard this run. We don't touch lastseenat — we didn't see it.
        pendingMissCount++;
        nextRows.push({
          zpid,
          region: existing.region || regionConfig.key,
          status: existing.status,
          missing_scrape_count: newMissingCount,
          postcard_send_count: existing.postcard_send_count || 0,
          glitch_suspected: false,
        });
      }
    }
  }

  return {
    nextRows,
    currentByZpid,
    summary: {
      justListedCount,
      activeCount,
      soldCount,
      glitchCount,
      pendingMissCount,
      seededCount,
    },
  };
}

function normalizeForUpsert(row) {
  const normalized = {
    ...row,
    postcard_send_count: row.postcard_send_count ?? 0,
    missing_scrape_count: row.missing_scrape_count ?? 0,
    glitch_suspected: row.glitch_suspected ?? false,
  };
  // Step 0 lifecycle lookups intentionally avoid the heavy carouselphotos JSONB
  // column for large regions like Ottawa. If this row does not have fresh photo
  // data from the current scrape, omit the column so Supabase preserves cached
  // photos instead of overwriting them with null.
  if (normalized.carouselphotos == null) {
    delete normalized.carouselphotos;
  }
  return normalized;
}

async function upsertListings(supabase, rows) {
  const BATCH = 50;  // Smaller batch size to avoid statement timeouts
  const MAX_RETRIES = 3;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(normalizeForUpsert);
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
      }
    }

    if (!success) {
      console.error(`  Falling back to row-by-row upsert for batch ${batchNum}...`);
      for (const row of batch) {
        const { error } = await supabase
          .from('listings')
          .upsert(row, { onConflict: 'zpid', ignoreDuplicates: false });
        if (error) {
          errors++;
          console.error(`    Row failed zpid ${row.zpid || '(missing)'}: ${error.message}`);
        } else {
          upserted++;
        }
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

  const grid = regionConfig.gridSplit || { rows: 2, cols: 2 };
  const gridCells = splitBoundsIntoGrid(regionConfig.bounds, grid.rows, grid.cols);
  const searchUrls = gridCells.map(cell => buildZillowSearchUrl(cell));
  console.log(`  Grid: ${grid.rows}×${grid.cols} = ${searchUrls.length} sub-searches (full inventory, no doz window)`);

  const seedMode = !!opts.seed;
  if (seedMode) {
    console.log('  SEED MODE: unseen listings will be stored as active (no just_listed postcards)');
  }

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would run:');
    searchUrls.forEach((u, i) => console.log(`    Cell ${i + 1}: ${u.slice(0, 100)}...`));
    return [];
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set in .env');

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  let liveResults = [];
  try {
    liveResults = await runSearchScraper(token, searchUrls);
  } catch (err) {
    throw new Error(`Live scrape failed; refusing to continue with stale DB data. Use --skip-scrape intentionally if you want that. ${err.message}`);
  }

  const liveRows = liveResults
    .map(r => normalizeResult(r, regionConfig, nowIso))
    .filter(Boolean);

  // Keep in-bound city labels even if they are not in our configured list.
  // Zillow often returns sublocalities ("East Harrow", "Colchester South")
  // that are valid service-area rows and should not be lost at scale.
  if (normalizeResult._acceptedRegionCities && normalizeResult._acceptedRegionCities.size > 0) {
    const targetState = getRegionState(regionConfig);
    const accepted = [...normalizeResult._acceptedRegionCities].sort();
    console.warn(`\n  Accepted ${accepted.length} unmapped ${targetState} city name(s) for ${regionConfig.key}:`);
    accepted.forEach(c => console.warn(`    "${c}"`));
    console.warn(`  → Non-${targetState} border spillover is still dropped before this step.`);
    normalizeResult._acceptedRegionCities.clear();
  }
  if (normalizeResult._aliasedCities && normalizeResult._aliasedCities.size > 0) {
    const aliases = [...normalizeResult._aliasedCities.entries()]
      .sort(([a], [b]) => a.localeCompare(b));
    console.log(`  Normalised ${aliases.length} Zillow city alias(es) for ${regionConfig.key}:`);
    aliases.forEach(([from, to]) => console.log(`    "${from}" → "${to}"`));
    normalizeResult._aliasedCities.clear();
  }
  if (normalizeResult._outOfProvince && normalizeResult._outOfProvince.size > 0) {
    const summary = [...normalizeResult._outOfProvince.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => `${state}: ${count}`)
      .join(', ');
    console.warn(`  Dropped out-of-province listings: ${summary}`);
    normalizeResult._outOfProvince.clear();
  }

  console.log(`\n  Normalised current listings: ${liveRows.length}`);

  if (liveRows.length === 0) {
    throw new Error('No current listings extracted from a completed scrape; refusing to continue with stale DB data.');
  }

  const regionRows = await fetchExistingRegionListings(supabase, regionConfig);
  console.log(`  Existing region records: ${regionRows.length}`);

  // Also look up scraped zpids across ALL regions — overlapping bounds mean
  // this scrape can include listings owned by a neighbouring region, and we
  // must recognize them (preserving their postcard history) rather than
  // re-inserting them as brand-new just_listed rows.
  const regionZpids = new Set(regionRows.map(r => String(r.zpid)));
  const crossRegionZpids = [...new Set(liveRows.map(r => String(r.zpid)))]
    .filter(z => !regionZpids.has(z));
  let existingRows = regionRows;
  if (crossRegionZpids.length > 0) {
    const crossRows = await fetchExistingByZpids(supabase, crossRegionZpids);
    if (crossRows.length > 0) {
      console.log(`  Found ${crossRows.length} scraped listing(s) already owned by another region — history preserved`);
      existingRows = regionRows.concat(crossRows);
    }
  }

  // Sanity gate: if this scrape returned far fewer listings than we know to
  // be currently active, treat it as degraded — a partial Apify result must
  // not increment miss counters (two degraded scrapes in a row would
  // otherwise mass-flip healthy listings to sold).
  const knownActive = existingRows.filter(r => ['active', 'just_listed'].includes(r.status)).length;
  const SANITY_MIN_KNOWN = 20;
  const SANITY_RATIO = 0.5;
  const degraded = knownActive >= SANITY_MIN_KNOWN && liveRows.length < knownActive * SANITY_RATIO;
  if (degraded) {
    console.warn(`  WARNING: DEGRADED SCRAPE — got ${liveRows.length} listings but ${knownActive} are known active (<${SANITY_RATIO * 100}%).`);
    console.warn('  Miss counters will NOT be incremented this run. Check Apify credits / actor health.');
  }

  const { nextRows, summary } = buildLifecycleRows(liveRows, existingRows, regionConfig, nowIso, { degraded, seedMode });
  console.log(`  Lifecycle summary: ${summary.justListedCount} just_listed, ${summary.activeCount} active, ${summary.soldCount} sold, ${summary.glitchCount} glitch, ${summary.pendingMissCount} pending_miss (not yet sold)${summary.seededCount ? `, ${summary.seededCount} seeded` : ''}${degraded ? ' [DEGRADED — misses frozen]' : ''}`);

  writePipelineFile('step0-current.json', liveRows.map(row => ({
    zpid: row.zpid,
    addressstreet: row.addressstreet,
    city: row.city || row.addresscity,
    addresszipcode: row.addresszipcode || '',
    search_days_on_zillow: row.search_days_on_zillow,
    search_time_on_zillow: row.search_time_on_zillow,
    seen_at: nowIso,
    batch_id: opts.batchId || null,
  })));

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

module.exports = { run, buildLifecycleRows, splitBoundsIntoGrid, normalizeAddressKey, normalizeResult, resolveRegionCity, buildZillowSearchUrl };
