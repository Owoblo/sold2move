#!/usr/bin/env node
/**
 * Step 3: Furniture Check
 *
 * Quick yes/no furniture detection using OpenAI Vision (gpt-4o).
 * - Skips first 4 photos (exterior), checks 1-2 interior photos
 * - Single API call per listing (sends 1-2 photos)
 * - Updates is_furnished + furniture_confidence in Supabase
 * - Skips listings already scanned
 *
 * Output: scripts/.pipeline/step3-furniture.json
 */

const {
  getSupabase,
  createRateLimiter,
  readPipelineFile,
  writePipelineFile,
  stepHeader,
  parseCliArgs,
} = require('./postcard-lib.cjs');

const OpenAI = require('openai');

const SKIP_EXTERIOR = 4;  // Skip first N photos (usually exterior)
const MAX_INTERIOR_PHOTOS = 5;
const MIN_PHOTOS_FOR_RETRY = 3; // Only retry if listing has this many photos or fewer (likely no interior uploaded yet)

/**
 * Check if a listing has interior photos available
 */
function getInteriorPhotoUrls(listing) {
  let photos = listing.carouselphotos;
  if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (e) { return []; } }
  if (!Array.isArray(photos) || photos.length === 0) return [];

  // If we don't have enough photos to confidently skip exteriors, use the available
  // photos rather than dropping the listing entirely.
  const interior = photos.length > SKIP_EXTERIOR
    ? photos.slice(SKIP_EXTERIOR, SKIP_EXTERIOR + MAX_INTERIOR_PHOTOS)
    : photos.slice(0, MAX_INTERIOR_PHOTOS);

  return interior.map(p => {
    if (typeof p === 'string') return p;
    return p?.url || p?.src || null;
  }).filter(url => url && !url.includes('maps.googleapis.com') && !url.includes('streetview'));
}

/**
 * Call OpenAI Vision to check if home is furnished
 */
async function checkFurnished(openai, photoUrls) {
  const imageContent = photoUrls.map(url => ({
    type: 'image_url',
    image_url: { url, detail: 'low' },
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Is this home furnished? Answer only YES or NO followed by your confidence level (HIGH, MEDIUM, or LOW). Example: "YES HIGH" or "NO MEDIUM"',
          },
          ...imageContent,
        ],
      },
    ],
  });

  const answer = (response.choices[0]?.message?.content || '').trim().toUpperCase();

  // If OpenAI couldn't determine (exterior-only photos, not enough info), treat as uncertain
  const isUncertain = !answer.startsWith('YES') && !answer.startsWith('NO');

  const isFurnished = answer.startsWith('YES');
  let confidence = 0.5;
  if (answer.includes('HIGH')) confidence = 0.9;
  else if (answer.includes('MEDIUM')) confidence = 0.7;
  else if (answer.includes('LOW')) confidence = 0.4;

  return { isFurnished, confidence, rawAnswer: answer, isUncertain };
}

async function run(options) {
  stepHeader(3, 'Furniture Check');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step2-photos.json');
  console.log(`  Loaded ${listings.length} listings from Step 2`);

  // Sold listings: skip furniture scan entirely.
  // Their furniture was checked when they were just_listed — we carry that result forward.
  // Running OpenAI on sold listings wastes credits (Zillow removes interior photos after sale).
  const soldListings = listings.filter(l => l.status === 'sold');
  const justListedListings = listings.filter(l => l.status !== 'sold');
  if (soldListings.length > 0) {
    console.log(`  Skipping furniture scan for ${soldListings.length} sold listings (result carried from just_listed phase)`);
  }

  // Separate just_listed: already scanned, has photos to scan, no photos
  // Listings flagged furniture_needs_retry=true get re-scanned even if previously scanned
  // (had exterior-only photos on first scan — may have new interior photos now)
  const alreadyScanned = justListedListings.filter(l =>
    l.furniture_scan_date != null && !l.furniture_needs_retry
  );
  const hasPhotos = justListedListings.filter(l =>
    (l.furniture_scan_date == null || l.furniture_needs_retry) &&
    getInteriorPhotoUrls(l).length > 0
  );
  const noPhotos = justListedListings.filter(l =>
    (l.furniture_scan_date == null || l.furniture_needs_retry) &&
    getInteriorPhotoUrls(l).length === 0
  );

  console.log(`  just_listed — already scanned: ${alreadyScanned.length}`);
  console.log(`  just_listed — ready to scan: ${hasPhotos.length}`);
  console.log(`  just_listed — no interior photos: ${noPhotos.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would scan ${hasPhotos.length} listings with OpenAI Vision.`);
    writePipelineFile('step3-furniture.json', listings);
    return listings;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('  WARNING: OPENAI_API_KEY not set - skipping furniture check');
    writePipelineFile('step3-furniture.json', listings);
    return listings;
  }

  if (hasPhotos.length === 0) {
    console.log('  No listings to scan.');
    writePipelineFile('step3-furniture.json', listings);
    return listings;
  }

  const openai = new OpenAI({ apiKey });
  const supabase = getSupabase();
  const rateLimiter = createRateLimiter(500); // 2 req/sec for OpenAI
  let scanned = 0;
  let furnished = 0;
  let failed = 0;

  console.log(`  Scanning ${hasPhotos.length} listings...`);

  for (const listing of hasPhotos) {
    await rateLimiter();
    const urls = getInteriorPhotoUrls(listing);

    // just_listed with only 1 total photo — skip scan, queue retry for next run
    let totalPhotos = listing.carouselphotos;
    if (typeof totalPhotos === 'string') { try { totalPhotos = JSON.parse(totalPhotos); } catch(e) {} }
    totalPhotos = Array.isArray(totalPhotos) ? totalPhotos.length : 0;

    if (listing.status === 'just_listed' && totalPhotos <= 1) {
      listing.furniture_needs_retry = true;
      listing.furniture_scan_date = null;
      listing.is_furnished = null;
      process.stdout.write(`  RETRY queued (just_listed, only ${totalPhotos} photo): zpid ${listing.zpid}\r`);
      await supabase.from('listings').update({
        furniture_needs_retry: true,
        furniture_scan_date: null,
        is_furnished: null,
      }).eq('zpid', listing.zpid);
      continue;
    }

    try {
      const result = await checkFurnished(openai, urls);

      // For just_listed with uncertain result AND very few photos → also hold for retry
      const needsRetry = listing.status === 'just_listed' &&
        (result.isUncertain || result.confidence <= 0.5) && totalPhotos <= MIN_PHOTOS_FOR_RETRY;

      if (needsRetry) {
        listing.furniture_needs_retry = true;
        listing.furniture_scan_date = null;
        listing.is_furnished = null;
        process.stdout.write(`  RETRY flagged (just_listed, low/uncertain conf): zpid ${listing.zpid} — ${result.rawAnswer}\r`);

        await supabase.from('listings').update({
          furniture_needs_retry: true,
          furniture_scan_date: null,
          is_furnished: null,
        }).eq('zpid', listing.zpid);
      } else if (result.isUncertain) {
        // Sold listing uncertain — stamp it, no retry (Zillow removes sold photos anyway)
        listing.furniture_needs_retry = false;
        listing.furniture_scan_date = new Date().toISOString();
        listing.is_furnished = null;
        process.stdout.write(`  UNCERTAIN (sold, no retry): zpid ${listing.zpid} — ${result.rawAnswer}\r`);

        await supabase.from('listings').update({
          furniture_needs_retry: false,
          furniture_scan_date: new Date().toISOString(),
          is_furnished: null,
        }).eq('zpid', listing.zpid);
      } else {
        // Clear retry flag — we got a definitive YES or NO
        listing.is_furnished = result.isFurnished;
        listing.furniture_confidence = result.confidence;
        listing.furniture_scan_date = new Date().toISOString();
        listing.furniture_needs_retry = false;

        // Update Supabase
        const { error } = await supabase
          .from('listings')
          .update({
            is_furnished: result.isFurnished,
            furniture_confidence: result.confidence,
            furniture_scan_date: new Date().toISOString(),
            furniture_scan_method: 'postcard-pipeline-v1',
            furniture_needs_retry: false,
          })
          .eq('zpid', listing.zpid);

        if (error) {
          console.error(`  DB update failed for zpid ${listing.zpid}:`, error.message);
        }

        scanned++;
        if (result.isFurnished) furnished++;
        process.stdout.write(`  Scanned ${scanned}/${hasPhotos.length} — ${result.rawAnswer} (zpid ${listing.zpid})\r`);
      }
    } catch (err) {
      console.error(`\n  Error scanning zpid ${listing.zpid}:`, err.message);
      failed++;
    }
  }

  console.log(`\n  Scanned: ${scanned}, Furnished: ${furnished}, Unfurnished: ${scanned - furnished}, Failed: ${failed}`);

  // Overall summary
  const totalFurnished = listings.filter(l => l.is_furnished === true).length;
  const totalUnfurnished = listings.filter(l => l.is_furnished === false).length;
  const totalUnknown = listings.filter(l => l.is_furnished == null).length;
  console.log(`  Overall: ${totalFurnished} furnished, ${totalUnfurnished} unfurnished, ${totalUnknown} unknown`);

  writePipelineFile('step3-furniture.json', listings);
  return listings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 3 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
