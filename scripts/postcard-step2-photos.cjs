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

async function fetchPhotosViaApify(listings, token) {
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
    propertyStatus: 'RECENTLY_SOLD',
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
    if (zpid) byZpid.set(String(zpid), extractPhotosFromApify(result));
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
    if ((l.photo_fetch_attempts || 0) >= 3) return false;
    // If we previously attempted and got nothing, only retry if scraper updated listing since
    if (l.photos_last_attempted_at && l.lastseenat) {
      const attempted = new Date(l.photos_last_attempted_at).getTime();
      const lastSeen = new Date(l.lastseenat).getTime();
      if (lastSeen <= attempted) return false;
    }
    return true;
  });
  const havePhotos = justListedListings.filter(l =>
    getPhotoCount(l) >= MIN_PHOTO_COUNT && !l.furniture_needs_retry
  );

  console.log(`  just_listed — already have photos: ${havePhotos.length}`);
  console.log(`  just_listed — need photos: ${needPhotos.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would fetch photos for ${needPhotos.length} listings.`);
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    console.log('  WARNING: APIFY_TOKEN not set - skipping photo fetch');
    console.log('  Proceeding with existing cached photos only.');
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const supabase = getSupabase();
  const APIFY_CHUNK = 100; // Max listings per Apify actor run
  let fetched = 0;
  let failed = 0;

  console.log(`  Fetching photos for ALL ${needPhotos.length} listings (${Math.ceil(needPhotos.length / APIFY_CHUNK)} Apify runs)...`);

  // Process all listings in chunks so no listing is skipped
  const allApifyResults = new Map();
  for (let i = 0; i < needPhotos.length; i += APIFY_CHUNK) {
    const chunk = needPhotos.slice(i, i + APIFY_CHUNK);
    const chunkNum = Math.floor(i / APIFY_CHUNK) + 1;
    const totalChunks = Math.ceil(needPhotos.length / APIFY_CHUNK);
    console.log(`\n  Apify chunk ${chunkNum}/${totalChunks} (${chunk.length} listings)...`);
    try {
      const chunkResults = await fetchPhotosViaApify(chunk, apifyToken);
      for (const [zpid, photos] of chunkResults) {
        allApifyResults.set(zpid, photos);
      }
    } catch (err) {
      console.error(`  Apify chunk ${chunkNum} failed: ${err.message} — continuing with next chunk`);
    }
  }

  for (const listing of needPhotos) {
    let photos = allApifyResults.get(String(listing.zpid)) || [];

    if (photos.length > 0) {
      listing.carouselphotos = photos;

      const { error } = await supabase
        .from('listings')
        .update({ carouselphotos: photos })
        .eq('zpid', listing.zpid);

      if (error) {
        console.error(`  Failed to cache photos for zpid ${listing.zpid}:`, error.message);
      }

      fetched++;
      process.stdout.write(`  Saved ${fetched}/${needPhotos.length} (${photos.length} photos for zpid ${listing.zpid})\r`);
    } else {
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
  console.log(`  Total listings with photos: ${listings.filter(l => getPhotoCount(l) > 0).length}/${listings.length}`);

  writePipelineFile('step2-photos.json', listings);
  return listings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 2 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
