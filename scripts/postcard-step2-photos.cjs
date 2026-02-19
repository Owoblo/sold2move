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

const RAPIDAPI_HOST = 'us-real-estate-data.p.rapidapi.com';
const MAX_BATCH = 50;

/**
 * Fetch property details from RapidAPI US Real Estate Data
 */
function fetchPropertyDetail(zpid, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RAPIDAPI_HOST,
      path: `/property?zpid=${zpid}`,
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response for zpid ${zpid}: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching zpid ${zpid}`));
    });
    req.end();
  });
}

/**
 * Extract photo URLs from API response.
 * Response has:
 *   - responsivePhotos: [{url: "..."}]  (simple, good for furniture check)
 *   - originalPhotos: [{caption, mixedSources: {jpeg: [{url, width}]}}]  (multiple sizes)
 */
function extractPhotos(apiResponse) {
  // Prefer responsivePhotos (simple {url} objects)
  if (Array.isArray(apiResponse?.responsivePhotos) && apiResponse.responsivePhotos.length > 0) {
    return apiResponse.responsivePhotos
      .map(p => ({ url: p.url || p }))
      .filter(p => p.url);
  }

  // Fallback to originalPhotos (extract largest jpeg)
  if (Array.isArray(apiResponse?.originalPhotos) && apiResponse.originalPhotos.length > 0) {
    return apiResponse.originalPhotos
      .map(p => {
        const jpegs = p?.mixedSources?.jpeg;
        if (Array.isArray(jpegs) && jpegs.length > 0) {
          // Pick the largest available
          const sorted = [...jpegs].sort((a, b) => (b.width || 0) - (a.width || 0));
          return { url: sorted[0].url };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
}

async function run(options) {
  stepHeader(2, 'Fetch Photos');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step1-filtered.json');
  console.log(`  Loaded ${listings.length} listings from Step 1`);

  // Separate listings needing photos vs already cached
  const needPhotos = listings.filter(l => !l.carouselphotos || l.carouselphotos.length === 0);
  const havePhotos = listings.filter(l => l.carouselphotos && l.carouselphotos.length > 0);

  console.log(`  Already have photos: ${havePhotos.length}`);
  console.log(`  Need photos: ${needPhotos.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would fetch photos for ${Math.min(needPhotos.length, MAX_BATCH)} listings.`);
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log('  WARNING: RAPIDAPI_KEY not set in .env - skipping photo fetch');
    console.log('  Proceeding with existing cached photos only.');
    writePipelineFile('step2-photos.json', listings);
    return listings;
  }

  const supabase = getSupabase();
  const rateLimiter = createRateLimiter(1000); // 1 req/sec
  const batch = needPhotos.slice(0, MAX_BATCH);
  let fetched = 0;
  let failed = 0;

  console.log(`  Fetching photos for ${batch.length} listings (max ${MAX_BATCH})...`);

  for (const listing of batch) {
    await rateLimiter();
    try {
      const response = await fetchPropertyDetail(listing.zpid, apiKey);
      const photos = extractPhotos(response);

      if (photos.length > 0) {
        listing.carouselphotos = photos;

        // Update Supabase for caching
        const { error } = await supabase
          .from('listings')
          .update({ carouselphotos: photos })
          .eq('zpid', listing.zpid);

        if (error) {
          console.error(`  Failed to cache photos for zpid ${listing.zpid}:`, error.message);
        }

        fetched++;
        process.stdout.write(`  Fetched ${fetched}/${batch.length} (${photos.length} photos for zpid ${listing.zpid})\r`);
      } else {
        console.log(`  No photos found for zpid ${listing.zpid}`);
        failed++;
      }
    } catch (err) {
      console.error(`  Error fetching zpid ${listing.zpid}:`, err.message);
      failed++;
    }
  }

  console.log(`\n  Photos fetched: ${fetched}, Failed: ${failed}`);
  console.log(`  Total listings with photos: ${listings.filter(l => l.carouselphotos && l.carouselphotos.length > 0).length}/${listings.length}`);

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
