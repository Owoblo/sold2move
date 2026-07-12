#!/usr/bin/env node
/**
 * Step 2: Fetch Photos
 *
 * For each listing without carouselphotos, calls RapidAPI Zillow V2
 * property detail endpoint to fetch interior/carousel photos.
 *
 * - Rate limit: 1 request/second
 * - Batch of 50 max per run
 * - Skips listings that already have cached photos
 * - Updates carouselphotos in Supabase for reuse
 *
 * Output: scripts/.pipeline/step2-photos.json
 */

const https = require('https');
const {
  getSupabase,
  createRateLimiter,
  readPipelineFile,
  writePipelineFile,
  stepHeader,
  parseCliArgs,
} = require('./postcard-lib.cjs');

const MAX_BATCH = Infinity; // No cap — fetch photos for every listing that needs them
const MIN_PHOTO_COUNT = 2;
const APIFY_ACTOR = 'maxcopell~zillow-detail-scraper';
const DETAIL_FRESHNESS_MAX_AGE_HOURS = Number.parseInt(process.env.DETAIL_FRESHNESS_MAX_AGE_HOURS || '168', 10);
const REAPPEARED_DETAIL_MAX_AGE_HOURS = Number.parseInt(process.env.REAPPEARED_DETAIL_MAX_AGE_HOURS || '24', 10);

function getPhotoCount(listing) {
  let photos = listing.carouselphotos;
  if (typeof photos === 'string') {
    try {
      photos = JSON.parse(photos);
    } catch (e) {
      return 0;
    }
  }
  return Array.isArray(photos) ? photos.length : 0;
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const body = options.body || null;
    const parsedUrl = new URL(url);

    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(600000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildZillowUrl(listing) {
  const street = (listing.addressstreet || '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
  const city = (listing.city || listing.addresscity || '').trim().replace(/\s+/g, '-');
  const state = listing.addressstate || 'ON';
  return `https://www.zillow.com/homedetails/${street}-${city}-${state}/${listing.zpid}_zpid/`;
}


function isValidPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Reject Street View and any non-MLS photo sources
  if (url.includes('maps.googleapis.com')) return false;
  if (url.includes('streetview')) return false;
  return true;
}

function extractPhotosFromApify(result) {
  if (Array.isArray(result.responsivePhotos) && result.responsivePhotos.length > 0) {
    return result.responsivePhotos.map(p => ({ url: p.url || p })).filter(p => isValidPhotoUrl(p.url));
  }
  if (Array.isArray(result.originalPhotos) && result.originalPhotos.length > 0) {
    return result.originalPhotos.map(p => {
      const jpegs = p?.mixedSources?.jpeg;
      if (Array.isArray(jpegs) && jpegs.length > 0) {
        const sorted = [...jpegs].sort((a, b) => (b.width || 0) - (a.width || 0));
        return { url: sorted[0].url };
      }
      return null;
    }).filter(p => p && isValidPhotoUrl(p.url));
  }
  if (Array.isArray(result.photos) && result.photos.length > 0) {
    return result.photos.map(p => {
      if (typeof p === 'string') return { url: p };
      if (p?.url) return { url: p.url };
      if (p?.href) return { url: p.href };
      const jpegs = p?.mixedSources?.jpeg;
      if (Array.isArray(jpegs) && jpegs.length > 0) {
        const sorted = [...jpegs].sort((a, b) => (b.width || 0) - (a.width || 0));
        return { url: sorted[0].url };
      }
      return null;
    }).filter(p => p && isValidPhotoUrl(p.url));
  }
  if (Array.isArray(result.images) && result.images.length > 0) {
    return result.images.map(p => ({ url: typeof p === 'string' ? p : (p.url || p.href || p.src) })).filter(p => isValidPhotoUrl(p.url));
  }
  if (Array.isArray(result.big) && result.big.length > 0) {
    return result.big.map(p => ({ url: typeof p === 'string' ? p : (p.url || p) })).filter(p => isValidPhotoUrl(p.url));
  }
  return [];
}

function extractDetailFreshness(result) {
  const rawDays = result.daysOnZillow ?? result.hdpData?.homeInfo?.daysOnZillow ?? null;
  const days = Number.isFinite(Number(rawDays)) ? Number(rawDays) : null;
  return {
    detail_days_on_zillow: days,
    detail_time_on_zillow: result.timeOnZillow || result.hdpData?.homeInfo?.timeOnZillow || null,
    zillow_date_posted: result.datePostedString || result.hdpData?.homeInfo?.datePostedString || null,
    zillow_detail_checked_at: new Date().toISOString(),
  };
}

function needsDetailFreshness(listing) {
  if (listing.status === 'sold') return false;
  const isReappearedAfterSold = listing.postcard_skip_reason === 'reappeared_after_sold_archive';
  if (listing.detail_days_on_zillow == null) return true;
  if (!listing.zillow_detail_checked_at) return true;
  const checkedAt = new Date(listing.zillow_detail_checked_at).getTime();
  if (!Number.isFinite(checkedAt)) return true;
  const ageHours = (Date.now() - checkedAt) / (1000 * 60 * 60);
  const maxAgeHours = isReappearedAfterSold ? REAPPEARED_DETAIL_MAX_AGE_HOURS : DETAIL_FRESHNESS_MAX_AGE_HOURS;
  return ageHours > maxAgeHours;
}

function hasCachedDetailFreshness(listing) {
  return listing.status !== 'sold' &&
    listing.detail_days_on_zillow != null &&
    listing.zillow_detail_checked_at &&
    !needsDetailFreshness(listing);
}

async function fetchDetailsViaApify(listings, token) {
  const addresses = listings.map(listing => {
    const street = listing.addressstreet || '';
    const city = listing.city || listing.addresscity || '';
    const state = listing.addressstate || 'ON';
    const zip = listing.addresszipcode || '';
    return `${street}, ${city}, ${state} ${zip}`.trim();
  }).filter(address => address.length > 5);

  const input = {
    startUrls: listings.map(listing => ({ url: buildZillowUrl(listing) })),
    addresses,
    extractBuildingUnits: 'disabled',
  };

  const startResp = await httpRequest(`https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${token}`, {
    method: 'POST',
    body: input,
  });

  if (startResp.status !== 200 && startResp.status !== 201) {
    throw new Error(`Apify run start failed: ${JSON.stringify(startResp.data).slice(0, 300)}`);
  }

  const runId = startResp.data.data.id;
  const datasetId = startResp.data.data.defaultDatasetId;
  let status = 'RUNNING';

  while (status === 'RUNNING' || status === 'READY') {
    await sleep(10000);
    const statusResp = await httpRequest(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = statusResp?.data?.data?.status;
    process.stdout.write(`  Apify status: ${status}\r`);
  }
  process.stdout.write('\n');

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run finished with status ${status}`);
  }

  const dataResp = await httpRequest(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`);
  if (!Array.isArray(dataResp.data)) {
    throw new Error('Apify returned a non-array dataset payload');
  }

  // Field probe — log full detail scraper shape on first result to discover agent fields.
  // Safe to remove once realtor pipeline is built.
  if (dataResp.data.length > 0) {
    const sample = dataResp.data[0];
    console.log('[FIELD PROBE] Detail scraper top-level keys:', Object.keys(sample).join(', '));
    const agentKeys = Object.entries(sample).filter(([k]) => /agent|broker|realtor|attribution|contact|phone|email/i.test(k));
    console.log('[FIELD PROBE] Top-level agent keys + values:');
    agentKeys.forEach(([k, v]) => console.log(`  ${k}:`, JSON.stringify(v)));
    if (sample.attributionInfo) {
      console.log('[FIELD PROBE] attributionInfo:', JSON.stringify(sample.attributionInfo, null, 2));
    }
    if (sample.hdpData?.attributionInfo) {
      console.log('[FIELD PROBE] hdpData.attributionInfo:', JSON.stringify(sample.hdpData.attributionInfo, null, 2));
    }
    if (sample.realtorInfo) {
      console.log('[FIELD PROBE] realtorInfo:', JSON.stringify(sample.realtorInfo, null, 2));
    }
  }

  const byZpid = new Map();
  for (const result of dataResp.data) {
    let zpid = result.zpid || result.id;
    if (!zpid && result.url) {
      const m = result.url.match(/(\d+)_zpid/);
      if (m) zpid = m[1];
    }
    if (!zpid && result.detailUrl) {
      const m = result.detailUrl.match(/(\d+)_zpid/);
      if (m) zpid = m[1];
    }
    if (zpid) {
      byZpid.set(String(zpid), {
        photos: extractPhotosFromApify(result),
        freshness: extractDetailFreshness(result),
      });
    }
  }

  return byZpid;
}

async function run(options) {
  stepHeader(2, 'Fetch Photos');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step1-filtered.json');
  console.log(`  Loaded ${listings.length} listings from Step 1`);

  // Separate listings needing a fresh photo lookup vs already having enough cached photos.
  // Also re-fetch photos for listings flagged furniture_needs_retry — they may have new
  // interior photos uploaded since the last scan (e.g. realtor added photos next day).
  // Skip listings where we already tried and got 0 photos, unless the scraper has
  // updated the listing since (lastseenat > photos_last_attempted_at).
  // Sold listings: Zillow removes photos after sale and we already scanned them
  // when they were just_listed. Skip photo fetch entirely — save Apify credits.
  const soldListings = listings.filter(l => l.status === 'sold');
  const justListedListings = listings.filter(l => l.status !== 'sold');
  if (soldListings.length > 0) {
    console.log(`  Skipping photo fetch for ${soldListings.length} sold listings (already processed as just_listed)`);
  }

  const needPhotos = justListedListings.filter(l => {
    if (getPhotoCount(l) >= MIN_PHOTO_COUNT && !l.furniture_needs_retry) return false;
    // After 3 attempts, wait 7 days before retrying — avoids permanent bans from
    // temporary Apify failures while still protecting against endlessly retrying
    // listings that will never have photos.
    if ((l.photo_fetch_attempts || 0) >= 3) {
      if (!l.photos_last_attempted_at) return false;
      const daysSinceAttempt = (Date.now() - new Date(l.photos_last_attempted_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAttempt < 7) return false;
      // 7+ days have passed — reset counter and try again
      l.photo_fetch_attempts = 0;
    }
    // If we previously attempted and got nothing, only retry if scraper updated listing since
    if (l.photos_last_attempted_at && l.lastseenat) {
      const attempted = new Date(l.photos_last_attempted_at).getTime();
      const lastSeen = new Date(l.lastseenat).getTime();
      if (lastSeen <= attempted && (l.photo_fetch_attempts || 0) < 3) return false;
    }
    return true;
  });
  const needFreshness = justListedListings.filter(needsDetailFreshness);
  const cachedFreshness = justListedListings.filter(hasCachedDetailFreshness);
  const reappearedNeedFreshness = needFreshness.filter(l => l.postcard_skip_reason === 'reappeared_after_sold_archive');
  const normalNeedFreshness = needFreshness.length - reappearedNeedFreshness.length;
  const detailCandidatesByZpid = new Map();
  for (const listing of needPhotos.concat(needFreshness)) {
    detailCandidatesByZpid.set(String(listing.zpid), listing);
  }
  const detailCandidates = [...detailCandidatesByZpid.values()].slice(0, MAX_BATCH);
  const havePhotos = justListedListings.filter(l =>
    getPhotoCount(l) >= MIN_PHOTO_COUNT && !l.furniture_needs_retry
  );

  console.log(`  just_listed — already have photos: ${havePhotos.length}`);
  console.log(`  just_listed — need photos: ${needPhotos.length}`);
  console.log(`  just_listed — detail freshness cache usable: ${cachedFreshness.length} (${DETAIL_FRESHNESS_MAX_AGE_HOURS}h normal cache, ${REAPPEARED_DETAIL_MAX_AGE_HOURS}h reappeared cache)`);
  console.log(`  just_listed — need detail freshness: ${needFreshness.length} (${normalNeedFreshness} normal, ${reappearedNeedFreshness.length} reappeared relist)`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would fetch detail pages for ${detailCandidates.length} listings.`);
    writePipelineFile('step2-detail-summary.json', {
      generated_at: new Date().toISOString(),
      cache_max_age_hours: DETAIL_FRESHNESS_MAX_AGE_HOURS,
      reappeared_cache_max_age_hours: REAPPEARED_DETAIL_MAX_AGE_HOURS,
      just_listed_candidates: justListedListings.length,
      cached_detail_freshness: cachedFreshness.length,
      need_detail_freshness: needFreshness.length,
      need_detail_freshness_normal: normalNeedFreshness,
      need_detail_freshness_reappeared: reappearedNeedFreshness.length,
      detail_candidates: detailCandidates.length,
      detail_actor_runs: 0,
      detail_freshness_updated: 0,
      photo_sets_fetched: 0,
      failed_photo_fetches: 0,
    });
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    console.log('  WARNING: APIFY_TOKEN not set - skipping photo fetch');
    console.log('  Proceeding with existing cached photos only.');
    writePipelineFile('step2-detail-summary.json', {
      generated_at: new Date().toISOString(),
      cache_max_age_hours: DETAIL_FRESHNESS_MAX_AGE_HOURS,
      reappeared_cache_max_age_hours: REAPPEARED_DETAIL_MAX_AGE_HOURS,
      just_listed_candidates: justListedListings.length,
      cached_detail_freshness: cachedFreshness.length,
      need_detail_freshness: needFreshness.length,
      need_detail_freshness_normal: normalNeedFreshness,
      need_detail_freshness_reappeared: reappearedNeedFreshness.length,
      detail_candidates: 0,
      detail_actor_runs: 0,
      detail_freshness_updated: 0,
      photo_sets_fetched: 0,
      failed_photo_fetches: 0,
      skipped_reason: 'missing_apify_token',
    });
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const supabase = getSupabase();
  const APIFY_CHUNK = 100; // Max listings per Apify actor run
  let fetched = 0;
  let freshnessUpdated = 0;
  let failed = 0;
  let apifyRuns = 0;

  console.log(`  Fetching detail pages for ${detailCandidates.length} listing(s) (${Math.ceil(detailCandidates.length / APIFY_CHUNK)} Apify runs)...`);

  // Process all listings in chunks so no listing is skipped
  const allApifyResults = new Map();
  for (let i = 0; i < detailCandidates.length; i += APIFY_CHUNK) {
    const chunk = detailCandidates.slice(i, i + APIFY_CHUNK);
    const chunkNum = Math.floor(i / APIFY_CHUNK) + 1;
    const totalChunks = Math.ceil(detailCandidates.length / APIFY_CHUNK);
    console.log(`\n  Apify chunk ${chunkNum}/${totalChunks} (${chunk.length} listings)...`);
    try {
      apifyRuns++;
      const chunkResults = await fetchDetailsViaApify(chunk, apifyToken);
      for (const [zpid, detail] of chunkResults) {
        allApifyResults.set(zpid, detail);
      }
    } catch (err) {
      console.error(`  Apify chunk ${chunkNum} failed: ${err.message} — continuing with next chunk`);
    }
  }

  const needPhotosByZpid = new Set(needPhotos.map(l => String(l.zpid)));
  for (const listing of detailCandidates) {
    const result = allApifyResults.get(String(listing.zpid));
    const photos = result?.photos || [];
    const freshness = result?.freshness || null;
    const update = {};

    if (freshness) {
      Object.assign(listing, freshness);
      Object.assign(update, freshness);
      freshnessUpdated++;
    }

    if (photos.length > 0) {
      listing.carouselphotos = photos;
      update.carouselphotos = photos;
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from('listings').update(update).eq('zpid', listing.zpid);
      if (error) {
        console.error(`  Failed to cache detail data for zpid ${listing.zpid}:`, error.message);
      }
    }

    if (photos.length > 0) {
      fetched++;
      process.stdout.write(`  Saved ${fetched}/${needPhotos.length} photo set(s), ${freshnessUpdated} freshness row(s)\r`);
    } else if (needPhotosByZpid.has(String(listing.zpid))) {
      // Stamp attempt time and increment counter — skip until scraper updates listing
      const newAttempts = (listing.photo_fetch_attempts || 0) + 1;
      const now = new Date().toISOString();
      listing.photo_fetch_attempts = newAttempts;
      listing.photos_last_attempted_at = now;
      await supabase.from('listings').update({
        photo_fetch_attempts: newAttempts,
        photos_last_attempted_at: now,
        furniture_needs_retry: newAttempts < 3,
      }).eq('zpid', listing.zpid);
      if (newAttempts >= 3) {
        console.log(`  zpid ${listing.zpid} — no photos after 3 attempts, permanently excluded`);
      }
      failed++;
    }
  }

  console.log(`\n  Photos fetched: ${fetched}, Failed: ${failed}`);
  console.log(`  Detail freshness updated: ${freshnessUpdated}/${detailCandidates.length}`);
  console.log(`  Detail freshness reused from cache: ${cachedFreshness.length}`);
  console.log(`  Apify detail actor runs: ${apifyRuns}`);
  console.log(`  Total listings with photos: ${listings.filter(l => getPhotoCount(l) > 0).length}/${listings.length}`);

  writePipelineFile('step2-detail-summary.json', {
    generated_at: new Date().toISOString(),
    cache_max_age_hours: DETAIL_FRESHNESS_MAX_AGE_HOURS,
    reappeared_cache_max_age_hours: REAPPEARED_DETAIL_MAX_AGE_HOURS,
    just_listed_candidates: justListedListings.length,
    cached_detail_freshness: cachedFreshness.length,
    need_detail_freshness: needFreshness.length,
    need_detail_freshness_normal: normalNeedFreshness,
    need_detail_freshness_reappeared: reappearedNeedFreshness.length,
    detail_candidates: detailCandidates.length,
    detail_actor_runs: apifyRuns,
    detail_freshness_updated: freshnessUpdated,
    photo_sets_fetched: fetched,
    failed_photo_fetches: failed,
  });

  writePipelineFile('step2-photos.json', listings);
  return listings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 2 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run, extractDetailFreshness, needsDetailFreshness };
