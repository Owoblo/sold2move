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
const MAX_INTERIOR_PHOTOS = 2;

/**
 * Check if a listing has interior photos available
 */
function getInteriorPhotoUrls(listing) {
  const photos = listing.carouselphotos;
  if (!Array.isArray(photos) || photos.length === 0) return [];

  // Skip first N (exterior), take up to MAX_INTERIOR_PHOTOS
  const interior = photos.slice(SKIP_EXTERIOR, SKIP_EXTERIOR + MAX_INTERIOR_PHOTOS);

  return interior.map(p => {
    if (typeof p === 'string') return p;
    return p?.url || p?.src || null;
  }).filter(Boolean);
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

  // Parse response
  const isFurnished = answer.startsWith('YES');
  let confidence = 0.5;
  if (answer.includes('HIGH')) confidence = 0.9;
  else if (answer.includes('MEDIUM')) confidence = 0.7;
  else if (answer.includes('LOW')) confidence = 0.4;

  return { isFurnished, confidence, rawAnswer: answer };
}

async function run(options) {
  stepHeader(3, 'Furniture Check');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step2-photos.json');
  console.log(`  Loaded ${listings.length} listings from Step 2`);

  // Separate: already scanned, has photos to scan, no photos
  const alreadyScanned = listings.filter(l => l.furniture_scan_date != null);
  const hasPhotos = listings.filter(l =>
    l.furniture_scan_date == null && getInteriorPhotoUrls(l).length > 0
  );
  const noPhotos = listings.filter(l =>
    l.furniture_scan_date == null && getInteriorPhotoUrls(l).length === 0
  );

  console.log(`  Already scanned: ${alreadyScanned.length}`);
  console.log(`  Ready to scan: ${hasPhotos.length}`);
  console.log(`  No interior photos: ${noPhotos.length}`);

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

    try {
      const result = await checkFurnished(openai, urls);

      listing.is_furnished = result.isFurnished;
      listing.furniture_confidence = result.confidence;
      listing.furniture_scan_date = new Date().toISOString();

      // Update Supabase
      const { error } = await supabase
        .from('listings')
        .update({
          is_furnished: result.isFurnished,
          furniture_confidence: result.confidence,
          furniture_scan_date: new Date().toISOString(),
          furniture_scan_method: 'postcard-pipeline-v1',
        })
        .eq('zpid', listing.zpid);

      if (error) {
        console.error(`  DB update failed for zpid ${listing.zpid}:`, error.message);
      }

      scanned++;
      if (result.isFurnished) furnished++;
      process.stdout.write(`  Scanned ${scanned}/${hasPhotos.length} — ${result.rawAnswer} (zpid ${listing.zpid})\r`);
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
