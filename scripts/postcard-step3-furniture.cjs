#!/usr/bin/env node
/**
 * Step 3: Property & Outreach Classification
 *
 * Structured classification using listing description, metadata, and photos.
 * Keeps the legacy furniture fields populated for postcard compatibility while
 * also identifying rentals, student housing, flips, new construction, lots,
 * occupancy state, and the most appropriate outreach target.
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

function getClassificationPhotoUrls(listing) {
  let photos = listing.carouselphotos;
  if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (e) { return []; } }
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const urls = photos.map(p => typeof p === 'string' ? p : (p?.url || p?.src || null))
    .filter(url => url && !url.includes('maps.googleapis.com') && !url.includes('streetview'));
  // Exterior/context images help identify lots and construction; later images
  // are more useful for occupancy. Sample both instead of assuming photo order.
  const indexes = [0, 1, 4, 5, 7, 9].filter(i => i < urls.length);
  return [...new Set(indexes.map(i => urls[i]))];
}

/**
 * Call OpenAI Vision to check if home is furnished
 */
const MARKET_SEGMENTS = new Set([
  'owner_occupied', 'investor_flip', 'student_housing', 'rental',
  'new_construction', 'land_lot', 'unknown',
]);
const LISTING_CATEGORIES = new Set([
  'ordinary_resale', 'investor_flip', 'student_housing', 'rental',
  'new_construction', 'land_lot',
]);
const OCCUPANCY_STATES = new Set([
  'furnished', 'partially_furnished', 'empty', 'construction',
  'not_applicable', 'unknown',
]);
const OUTREACH_TARGETS = new Set([
  'homeowner', 'realtor', 'builder_developer', 'landlord_property_manager',
  'leasing_agent', 'unknown',
]);

function boundedConfidence(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
}

function normalizeClassification(raw, listing = {}) {
  const contentType = String(listing.contenttype || '').toUpperCase();
  const isLand = contentType === 'LOT' || contentType === 'LAND';
  const signals = Array.isArray(raw?.property_signals)
    ? [...new Set(raw.property_signals.map(v => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 12)
    : [];
  const reasons = Array.isArray(raw?.reasons)
    ? raw.reasons.map(v => String(v).trim()).filter(Boolean).slice(0, 6)
    : [];
  const categories = Array.isArray(raw?.listing_categories)
    ? [...new Set(raw.listing_categories.map(v => String(v).trim().toLowerCase())
      .filter(v => LISTING_CATEGORIES.has(v)))]
    : [];

  if (isLand) {
    return {
      market_segment: 'land_lot',
      listing_categories: [...new Set(['land_lot', ...categories])],
      occupancy_state: 'not_applicable',
      outreach_target: 'realtor',
      property_signals: [...new Set(['land_lot', ...signals])],
      confidence: Math.max(0.99, boundedConfidence(raw?.confidence)),
      reasons: reasons.length ? reasons : [`Zillow property type is ${contentType}`],
    };
  }

  const marketSegment = MARKET_SEGMENTS.has(raw?.market_segment) ? raw.market_segment : 'unknown';
  if (marketSegment !== 'unknown') {
    const category = marketSegment === 'owner_occupied' ? 'ordinary_resale' : marketSegment;
    if (LISTING_CATEGORIES.has(category) && !categories.includes(category)) categories.push(category);
  }
  return {
    market_segment: marketSegment,
    listing_categories: categories,
    occupancy_state: OCCUPANCY_STATES.has(raw?.occupancy_state) ? raw.occupancy_state : 'unknown',
    outreach_target: OUTREACH_TARGETS.has(raw?.outreach_target) ? raw.outreach_target : 'unknown',
    property_signals: signals,
    confidence: boundedConfidence(raw?.confidence),
    reasons,
  };
}

function parseClassificationAnswer(answer, listing) {
  const cleaned = String(answer || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Classifier returned invalid JSON: ${cleaned.slice(0, 180)}`);
  }
  return normalizeClassification(parsed, listing);
}

function countValues(listings, field, isArray = false) {
  const counts = {};
  for (const listing of listings) {
    const values = isArray ? listing[field] : [listing[field] || 'unclassified'];
    for (const value of (Array.isArray(values) ? values : [])) {
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return counts;
}

function writeClassificationOutputs(listings) {
  writePipelineFile('step3-furniture.json', listings);
  writePipelineFile('step3-classification-summary.json', {
    generated_at: new Date().toISOString(),
    total: listings.length,
    classified: listings.filter(l => l.property_classified_at).length,
    market_segments: countValues(listings, 'market_segment'),
    listing_categories: countValues(listings, 'listing_categories', true),
    occupancy_states: countValues(listings, 'occupancy_state'),
    outreach_targets: countValues(listings, 'outreach_target'),
  });
}

function classificationHealthFailure(readyCount, scanned, failed) {
  if (readyCount < 5 || failed < 5) return null;
  const attempted = scanned + failed;
  const failureRate = attempted > 0 ? failed / attempted : 0;
  if (failureRate < 0.8) return null;
  return `Classifier health gate: ${failed}/${attempted} attempted classifications failed (${(failureRate * 100).toFixed(1)}%)`;
}

async function classifyProperty(openai, listing, photoUrls) {
  const contentType = String(listing.contenttype || '').toUpperCase();
  if (contentType === 'LOT' || contentType === 'LAND') {
    return normalizeClassification({}, listing);
  }
  const imageContent = photoUrls.map(url => ({
    type: 'image_url',
    image_url: { url, detail: 'low' },
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You classify Canadian real-estate listings for outreach routing. Be conservative:
- Do not call a property a flip merely because it is renovated or staged. Require multiple flip/investor signals.
- Do not call it student housing from bedroom count alone. Require explicit rental/student/campus/per-room evidence or strong visual plus textual evidence.
- Distinguish furnished, partially_furnished, empty, construction, not_applicable, and unknown.
- Rental includes an offered-for-lease dwelling. Student housing is the more specific segment when supported.
- New construction requires explicit new-build/pre-construction/builder evidence or clear unfinished construction.
- owner_occupied means an ordinary resale with no stronger specialist segment; it does not assert legal occupancy.
- listing_categories is multi-label. Include every supported category independently; e.g. student_housing plus rental, whether furnished or empty.
- If evidence conflicts or is weak, use unknown and lower confidence.
Return JSON only with market_segment (the primary label), listing_categories (array), occupancy_state, outreach_target, property_signals (array), confidence (0-1), and reasons (short evidence array).
Allowed market_segment: owner_occupied, investor_flip, student_housing, rental, new_construction, land_lot, unknown.
Allowed listing_categories: ordinary_resale, investor_flip, student_housing, rental, new_construction, land_lot.
Allowed outreach_target: homeowner, realtor, builder_developer, landlord_property_manager, leasing_agent, unknown.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              description: listing.description || '',
              property_type: listing.contenttype || '',
              price: listing.unformattedprice || listing.price || null,
              beds: listing.beds || null,
              baths: listing.baths || null,
              square_feet: listing.area || null,
              city: listing.city || listing.addresscity || '',
              instruction: 'Classify using only evidence present in this metadata and the attached listing photos.',
            }),
          },
          ...imageContent,
        ],
      },
    ],
  });

  return parseClassificationAnswer(response.choices[0]?.message?.content, listing);
}

async function run(options) {
  stepHeader(3, 'Property & Outreach Classification');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step2-photos.json');
  console.log(`  Loaded ${listings.length} listings from Step 2`);

  // A description can classify a rental/lot/new build even when photos are not
  // available. Existing furniture-only rows are reprocessed once to populate
  // the new structured fields.
  const alreadyScanned = listings.filter(l =>
    l.property_classified_at != null && !l.furniture_needs_retry
  );
  const readyToClassify = listings.filter(l =>
    (l.property_classified_at == null || l.furniture_needs_retry) &&
    (getClassificationPhotoUrls(l).length > 0 || String(l.description || '').trim() ||
      ['LOT', 'LAND'].includes(String(l.contenttype || '').toUpperCase()))
  );
  const noEvidence = listings.filter(l =>
    (l.property_classified_at == null || l.furniture_needs_retry) &&
    !readyToClassify.includes(l)
  );

  console.log(`  Already classified: ${alreadyScanned.length}`);
  console.log(`  Ready to classify: ${readyToClassify.length}`);
  console.log(`  No description/photos: ${noEvidence.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would classify ${readyToClassify.length} listings.`);
    writeClassificationOutputs(listings);
    return listings;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('  WARNING: OPENAI_API_KEY not set - skipping furniture check');
    writeClassificationOutputs(listings);
    return listings;
  }

  if (readyToClassify.length === 0) {
    console.log('  No listings to scan.');
    writeClassificationOutputs(listings);
    return listings;
  }

  const openai = new OpenAI({ apiKey });
  const supabase = getSupabase();
  const rateLimiter = createRateLimiter(500); // 2 req/sec for OpenAI
  let scanned = 0;
  let furnishedCount = 0;
  let failed = 0;

  console.log(`  Classifying ${readyToClassify.length} listings...`);

  for (const listing of readyToClassify) {
    await rateLimiter();
    const urls = getClassificationPhotoUrls(listing);

    // just_listed with only 1 total photo — skip scan, queue retry for next run
    let totalPhotos = listing.carouselphotos;
    if (typeof totalPhotos === 'string') { try { totalPhotos = JSON.parse(totalPhotos); } catch(e) {} }
    totalPhotos = Array.isArray(totalPhotos) ? totalPhotos.length : 0;

    const hasDescription = Boolean(String(listing.description || '').trim());
    const deterministicType = ['LOT', 'LAND'].includes(String(listing.contenttype || '').toUpperCase());
    if (listing.status === 'just_listed' && totalPhotos <= 1 && !hasDescription && !deterministicType) {
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
      const result = await classifyProperty(openai, listing, urls);

      // For just_listed with uncertain result AND very few photos → also hold for retry
      const needsRetry = listing.status === 'just_listed' &&
        result.market_segment === 'unknown' && result.confidence <= 0.5 &&
        totalPhotos <= MIN_PHOTOS_FOR_RETRY && !String(listing.description || '').trim();

      if (needsRetry) {
        listing.furniture_needs_retry = true;
        listing.furniture_scan_date = null;
        listing.is_furnished = null;
        process.stdout.write(`  RETRY flagged (insufficient evidence): zpid ${listing.zpid}\r`);

        await supabase.from('listings').update({
          furniture_needs_retry: true,
          furniture_scan_date: null,
          is_furnished: null,
        }).eq('zpid', listing.zpid);
      } else {
        const classifiedAt = new Date().toISOString();
        const isFurnished = ['furnished', 'partially_furnished'].includes(result.occupancy_state)
          ? true
          : ['empty', 'construction', 'not_applicable'].includes(result.occupancy_state)
            ? false
            : (listing.is_furnished ?? null);
        listing.is_furnished = isFurnished;
        listing.furniture_confidence = result.confidence;
        listing.furniture_scan_date = classifiedAt;
        listing.furniture_needs_retry = false;
        listing.market_segment = result.market_segment;
        listing.listing_categories = result.listing_categories;
        listing.occupancy_state = result.occupancy_state;
        listing.outreach_target = result.outreach_target;
        listing.property_signals = result.property_signals;
        listing.classification_confidence = result.confidence;
        listing.classification_reasons = result.reasons;
        listing.property_classified_at = classifiedAt;
        listing.property_classification_method = 'postcard-multimodal-v2';

        const { error } = await supabase
          .from('listings')
          .update({
            is_furnished: isFurnished,
            furniture_confidence: result.confidence,
            furniture_scan_date: classifiedAt,
            furniture_scan_method: 'postcard-multimodal-v2',
            furniture_needs_retry: false,
            market_segment: result.market_segment,
            listing_categories: result.listing_categories,
            occupancy_state: result.occupancy_state,
            outreach_target: result.outreach_target,
            property_signals: result.property_signals,
            classification_confidence: result.confidence,
            classification_reasons: result.reasons,
            property_classified_at: classifiedAt,
            property_classification_method: 'postcard-multimodal-v2',
          })
          .eq('zpid', listing.zpid);

        if (error) {
          console.error(`  DB update failed for zpid ${listing.zpid}:`, error.message);
        }

        scanned++;
        if (listing.is_furnished) furnishedCount++;
        process.stdout.write(`  Classified ${scanned}/${readyToClassify.length} — ${result.market_segment}/${result.occupancy_state} (zpid ${listing.zpid})\r`);
      }
    } catch (err) {
      console.error(`\n  Error scanning zpid ${listing.zpid}:`, err.message);
      failed++;
    }
  }

  console.log(`\n  Scanned: ${scanned}, Furnished: ${furnishedCount}, Unfurnished: ${scanned - furnishedCount}, Failed: ${failed}`);

  // Overall summary
  const totalFurnished = listings.filter(l => l.is_furnished === true).length;
  const totalUnfurnished = listings.filter(l => l.is_furnished === false).length;
  const totalUnknown = listings.filter(l => l.is_furnished == null).length;
  console.log(`  Overall: ${totalFurnished} furnished, ${totalUnfurnished} unfurnished, ${totalUnknown} unknown`);

  writeClassificationOutputs(listings);
  const healthFailure = classificationHealthFailure(readyToClassify.length, scanned, failed);
  if (healthFailure) throw new Error(healthFailure);
  return listings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 3 failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  run,
  normalizeClassification,
  parseClassificationAnswer,
  getInteriorPhotoUrls,
  getClassificationPhotoUrls,
  countValues,
  classificationHealthFailure,
};
