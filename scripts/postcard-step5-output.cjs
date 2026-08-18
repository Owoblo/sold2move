#!/usr/bin/env node
/**
 * Step 5: Generate Output
 *
 * - Filters to verified addresses + furnished homes
 * - --include-unscanned flag includes homes without furniture scan
 * - Generates filtered CSV
 * - Generates print-ready PDF postcards (same approach as generate-postcards-pdf.cjs)
 *
 * Output: Windsor_Postcards_YYYY-MM-DD.csv + .pdf in project root
 */

const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const {
  getSupabase,
  readPipelineFile,
  writePipelineFile,
  stepHeader,
  parseCliArgs,
  getRegionConfig,
  formatCanadianPostal,
  formatRecipientDeliveryLine,
} = require('./postcard-lib.cjs');
const { generatePremiumEnvelopes } = require('./generate-premium-envelopes.cjs');
const { parseStreet, extractListingUnit } = require('./postcard-step4-geocode.cjs');

const NON_HOMEOWNER_SEGMENTS = new Set([
  'investor_flip', 'student_housing', 'rental', 'new_construction', 'land_lot',
]);
const NON_HOMEOWNER_CATEGORIES = new Set([
  'investor_flip', 'student_housing', 'rental', 'new_construction', 'land_lot',
]);

function homeownerAudienceEligibility(listing) {
  const categories = Array.isArray(listing.listing_categories) ? listing.listing_categories : [];
  const blockedCategory = categories.find(value => NON_HOMEOWNER_CATEGORIES.has(value));
  if (blockedCategory) return { eligible: false, reason: `non_homeowner_category: ${blockedCategory}` };
  if (NON_HOMEOWNER_SEGMENTS.has(listing.market_segment)) {
    return { eligible: false, reason: `non_homeowner_segment: ${listing.market_segment}` };
  }
  if (listing.outreach_target && listing.outreach_target !== 'homeowner') {
    return { eligible: false, reason: `non_homeowner_target: ${listing.outreach_target}` };
  }

  const classified = Boolean(listing.property_classified_at);
  const ordinaryResale = listing.market_segment === 'owner_occupied' || categories.includes('ordinary_resale');
  if (classified && listing.outreach_target === 'homeowner' && ordinaryResale) {
    return { eligible: true, reason: null };
  }

  // Preserve already-established sold follow-up campaigns. These rows passed
  // the historical just-listed homeowner filter before structured routing was
  // introduced; all new/unmailed records must pass the structured classifier.
  if (listing.status === 'sold' && listing.just_listed_postcard_sent_at) {
    return { eligible: true, reason: 'legacy_just_listed_homeowner_signal' };
  }
  return { eligible: false, reason: classified ? 'homeowner_classification_uncertain' : 'homeowner_classification_missing' };
}

/**
 * Apply final filters to determine which listings get postcards.
 * Returns { finalListings, rejected } where rejected is an array of
 * { zpid, reason } objects for all excluded listings.
 */
function applyOutputFilters(listings, opts) {
  opts = opts || {};
  let filtered = [...listings];
  const rejected = []; // { zpid, reason }

  // Active inventory can enter the pipeline only for quality recovery. It
  // should be enriched now, while photos exist, but never mailed as though it
  // were newly listed or sold.
  {
    const next = [];
    for (const l of filtered) {
      if (l.status === 'active') rejected.push({ zpid: l.zpid, reason: 'active_quality_recovery_only' });
      else next.push(l);
    }
    filtered = next;
  }

  // The expensive classification must participate in the mailing decision.
  // Routes intended for realtors, builders, landlords, or leasing agents are
  // retained in Supabase for their own campaigns but cannot enter this batch.
  {
    const next = [];
    for (const l of filtered) {
      const decision = homeownerAudienceEligibility(l);
      if (decision.eligible) next.push(l);
      else rejected.push({ zpid: l.zpid, reason: decision.reason });
    }
    filtered = next;
  }

  // Lots/land now pass through the classifier so they remain visible market
  // intelligence, but preserve the existing rule that they never enter the
  // homeowner postcard batch.
  {
    const next = [];
    for (const l of filtered) {
      const contentType = String(l.contenttype || '').toUpperCase();
      if (l.market_segment === 'land_lot' || contentType === 'LOT' || contentType === 'LAND') {
        rejected.push({ zpid: l.zpid, reason: 'lot_or_land' });
      } else {
        next.push(l);
      }
    }
    const removed = filtered.length - next.length;
    if (removed > 0) console.log(`  Removed ${removed} lots/land from postcard output (classification retained)`);
    filtered = next;
  }

  // Preserve the existing physical-mail requirement while allowing these rows
  // to be classified first for realtor/builder/leasing outreach.
  {
    const next = [];
    for (const l of filtered) {
      const street = String(l.addressstreet || '').trim();
      if (!street || !/^\d/.test(street)) {
        rejected.push({ zpid: l.zpid, reason: 'no_street_number' });
      } else {
        next.push(l);
      }
    }
    filtered = next;
  }

  // ─── Tier 1: hard cap on total postcards per address ─────────────────────
  // No matter how the status flaps (e.g. just_listed → sold → just_listed → sold
  // because of Zillow API hiccups), no zpid ever receives more than MAX_SENDS
  // postcards lifetime. This is the last line of defence against over-mailing,
  // independent of the upstream "is it really sold?" question that Tier 2 (in
  // step0) handles.
  const MAX_SENDS = 2;
  {
    const next = [];
    for (const l of filtered) {
      const count = l.postcard_send_count || 0;
      if (count >= MAX_SENDS) {
        rejected.push({ zpid: l.zpid, reason: `max_sends_reached: ${count}/${MAX_SENDS}` });
      } else {
        next.push(l);
      }
    }
    const removed = filtered.length - next.length;
    if (removed > 0) console.log(`  Removed ${removed} listings at the ${MAX_SENDS}-send cap`);
    filtered = next;
  }

  // Physical mail is fail-closed: true sends, false rejects, null/unavailable
  // holds. Missing credentials and transient geocoder failures cannot silently
  // authorize postage.
  {
    const next = [];
    for (const l of filtered) {
      if (l._geocode_verified === true) next.push(l);
      else if (l._geocode_verified === false) {
        rejected.push({ zpid: l.zpid, reason: `geocode_mismatch: ${(l._geocode_reason || '').slice(0, 200)}` });
      } else {
        rejected.push({ zpid: l.zpid, reason: `geocode_unavailable_hold: ${(l._geocode_reason || 'not verified').slice(0, 200)}` });
      }
    }
    const removedGeo = filtered.length - next.length;
    if (removedGeo > 0) console.log(`  Held ${removedGeo} listings without positive address verification`);
    filtered = next;
  }

  // Furniture filter — status-aware:
  //
  // SOLD listings — use the just_listed postcard tag as the quality signal:
  //   ✗ sold_postcard_sent_at IS NOT NULL → already sent, never send again
  //   ✓ just_listed_postcard_sent_at IS NOT NULL → passed furniture check as just_listed → include
  //   ✓ no history at all + is_furnished = true → pre-pipeline sold with scan data → include
  //   ✗ no history at all + is_furnished ≠ true → no quality signal, skip
  //   ✗ was processed as just_listed but failed our filter → skip sold too
  //   No photo scanning needed — Zillow removes photos after sale, waste of API credits.
  //
  // JUST_LISTED listings — full furniture check:
  //   ✓ confirmed furnished (is_furnished = true)
  //   ✓ uncertain but has interior photos (benefit of the doubt)
  //   ✗ confirmed unfurnished
  //   ✗ no photos at all (can't verify)
  const next = [];
  for (const l of filtered) {
    if (l.status === 'sold') {
      if (l.sold_postcard_sent_at) {
        rejected.push({ zpid: l.zpid, reason: 'sold_postcard_already_sent' });
        continue;
      }
      if (l.just_listed_postcard_sent_at) { next.push(l); continue; }
      if (!l.last_postcard_sent_at) {
        if (l.is_furnished === true) { next.push(l); continue; }
        rejected.push({ zpid: l.zpid, reason: 'sold_no_quality_signal' });
        continue;
      }
      rejected.push({ zpid: l.zpid, reason: 'sold_failed_just_listed_filter' });
      continue;
    }

    // just_listed: full furniture filter. Unknown/unscanned rows are held by
    // default; --include-unscanned is an explicit override for emergency runs.
    if (l.is_furnished === true) { next.push(l); continue; }
    if (l.is_furnished === false) { rejected.push({ zpid: l.zpid, reason: 'unfurnished' }); continue; }

    const photoCount = (() => {
      let p = l.carouselphotos;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) { return 0; } }
      return Array.isArray(p) ? p.length : 0;
    })();

    if (opts.includeUnscanned && photoCount >= 2) {
      next.push(l);
    } else if (photoCount >= 2) {
      rejected.push({ zpid: l.zpid, reason: 'unscanned_furniture' });
    } else {
      rejected.push({ zpid: l.zpid, reason: 'no_photos_to_verify' });
    }
  }

  const removedFurn = filtered.length - next.length;
  if (removedFurn > 0) console.log(`  Removed ${removedFurn} listings (failed furniture filter, unscanned, or previously filtered just_listed)`);
  filtered = next;

  return { finalListings: filtered, rejected };
}

/**
 * Normalize a listing's address into a stable key for cross-zpid deduplication.
 * Combines street + postal, uppercased, punctuation stripped, whitespace collapsed.
 * Two listings at the same physical address produce the same key even if they
 * have different zpids (e.g. a relist) or slightly different formatting.
 */
function normalizeAddressKey(listing) {
  const street = (listing.addressstreet || '').toString();
  const postal = (listing.addresszipcode || '').toString();
  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parsed = parseStreet(street);
  const unit = extractListingUnit(street) || 'NONE';
  const canonicalStreet = parsed.number && parsed.core
    ? `${parsed.number}|${parsed.core}|${parsed.suffix || 'UNKNOWN'}`
    : street;
  return `${clean(canonicalStreet)}|UNIT:${clean(unit)}|${clean(postal)}`;
}

/**
 * Address-level duplicate guard — prevents re-sending to the same physical
 * address across DIFFERENT zpids (the relist bug).
 *
 * A property that gets taken off market and relisted receives a brand-new
 * zpid from Zillow, so the zpid-keyed checks (just_listed_postcard_sent_at,
 * glitch detection) don't catch it. This guard closes that gap by checking
 * whether any listing at the same street+postal has already received a
 * postcard of the same type — regardless of zpid, for the lifetime of the DB.
 *
 * Rule: an address gets at most ONE just_listed postcard and at most ONE
 * sold postcard, ever. Returns { kept, rejected }.
 *
 * Purely subtractive: it can only remove a listing from the send batch,
 * never add one, so it cannot break the existing 2-postcard lifecycle.
 */
async function filterAddressDuplicates(supabase, region, finalListings) {
  const kept = [];
  const rejected = [];

  if (!finalListings.some(l => (l.addressstreet || '').trim())) {
    return { kept: finalListings, rejected };
  }

  // Pull all prior sends in the region, then compare canonical in memory.
  // Scoping the SQL lookup by the current raw street string prevented variants
  // such as "Main St." and "Main Street" from ever reaching normalization.
  const sentByAddress = new Map(); // normKey -> { jl: bool, sold: bool, zpids: Set }
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('listings')
      .select('zpid, addressstreet, addresszipcode, just_listed_postcard_sent_at, sold_postcard_sent_at')
      .eq('region', region)
      .or('just_listed_postcard_sent_at.not.is.null,sold_postcard_sent_at.not.is.null')
      .order('zpid', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn(`  Address-dup lookup failed: ${error.message} — holding batch`);
      return {
        kept: [],
        rejected: finalListings.map(l => ({ zpid: l.zpid, reason: 'address_duplicate_guard_unavailable_hold' })),
      };
    }
    for (const row of data || []) {
      const key = normalizeAddressKey(row);
      const entry = sentByAddress.get(key) || { jl: false, sold: false, zpids: new Set() };
      if (row.just_listed_postcard_sent_at) entry.jl = true;
      if (row.sold_postcard_sent_at) entry.sold = true;
      entry.zpids.add(String(row.zpid));
      sentByAddress.set(key, entry);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  for (const listing of finalListings) {
    const key = normalizeAddressKey(listing);
    const prior = sentByAddress.get(key);

    if (prior) {
      const fromOtherZpid = [...prior.zpids].some(z => z !== String(listing.zpid));
      if (listing.status === 'just_listed' && prior.jl && fromOtherZpid) {
        rejected.push({ zpid: listing.zpid, reason: 'address_already_sent_just_listed (relist)' });
        continue;
      }
      if (listing.status === 'sold' && prior.sold && fromOtherZpid) {
        rejected.push({ zpid: listing.zpid, reason: 'address_already_sent_sold (relist)' });
        continue;
      }
    }
    kept.push(listing);
  }

  return { kept, rejected };
}

// ─── Sold-candidate verification ────────────────────────────────────────────
// Disappearance from the scrape is a strong signal but can't distinguish
// "sold" from "delisted/expired". Before spending print+postage on a sold
// postcard, check each candidate's own Zillow detail page: if it still says
// FOR_SALE / PENDING, the listing is alive — pull it from the batch and put
// it back to active in the DB.
//
// FAIL-CLOSED: a sold postcard requires a positive non-active detail status.
// Missing credentials, timeouts, empty datasets, and unrecognized results are
// held for the next run rather than treated as proof of sale.
const DETAIL_ACTOR = process.env.ZILLOW_DETAIL_ACTOR || 'maxcopell~zillow-detail-scraper';
const VERIFY_CHUNK_SIZE = Number.parseInt(process.env.SOLD_VERIFY_CHUNK_SIZE || '25', 10);
const VERIFY_TIMEOUT_MINUTES = Number.parseInt(process.env.SOLD_VERIFY_TIMEOUT_MINUTES || '4', 10);
const STILL_ON_MARKET = new Set(['FOR_SALE', 'PENDING', 'COMING_SOON', 'ACTIVE', 'FOR_RENT']);
const JUST_LISTED_FRESHNESS_AUDIT_MIN_DAYS = 5;
const JUST_LISTED_FRESHNESS_BLOCK_AFTER_DAYS = 30;

function apifyHttp(url, options = {}) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function extractZpidFromResult(r) {
  if (r?.zpid) return String(r.zpid);
  for (const u of [r?.url, r?.detailUrl, r?.hdpUrl]) {
    const m = typeof u === 'string' && u.match(/(\d+)_zpid/);
    if (m) return m[1];
  }
  return null;
}

function normalizeDaysOnZillow(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function effectiveDetailDaysOnZillow(listing) {
  const days = normalizeDaysOnZillow(listing.detail_days_on_zillow);
  if (days == null || days < 0) return days;
  if (!listing.zillow_detail_checked_at) return days;

  const checkedAt = new Date(listing.zillow_detail_checked_at).getTime();
  if (!Number.isFinite(checkedAt)) return days;
  const elapsedDays = Math.max(0, Math.floor((Date.now() - checkedAt) / (1000 * 60 * 60 * 24)));
  return days + elapsedDays;
}

function applyJustListedFreshnessGuard(listings) {
  const kept = [];
  const rejected = [];
  const audit = [];

  for (const listing of listings) {
    if (listing.status !== 'just_listed') {
      kept.push(listing);
      continue;
    }

    const isReappearedAfterSold = listing.postcard_skip_reason === 'reappeared_after_sold_archive';
    const days = effectiveDetailDaysOnZillow(listing);
    if (days == null || days < 0) {
      if (isReappearedAfterSold) {
        rejected.push({ zpid: listing.zpid, reason: 'reappeared_missing_detail_days_on_zillow' });
        audit.push({ ...listing, _freshness_action: 'blocked_reappeared_missing_detail_days', _freshness_days: '' });
        continue;
      }
      kept.push(listing);
      continue;
    }

    if (days > JUST_LISTED_FRESHNESS_BLOCK_AFTER_DAYS) {
      rejected.push({ zpid: listing.zpid, reason: `stale_detail_days_on_zillow: ${days}` });
      audit.push({ ...listing, _freshness_action: 'blocked_over_30_days', _freshness_days: days });
      continue;
    }

    if (days >= JUST_LISTED_FRESHNESS_AUDIT_MIN_DAYS) {
      listing._freshness_audit = true;
      listing._freshness_days = days;
      audit.push({ ...listing, _freshness_action: 'sent_review_5_30_days', _freshness_days: days });
    }
    kept.push(listing);
  }

  return { kept, rejected, audit };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items || []) {
    const key = keyFn(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function partitionSoldVerification(listings, statusByZpid) {
  const kept = [];
  const pulled = [];
  const held = [];
  for (const listing of listings) {
    if (listing.status !== 'sold') {
      kept.push(listing);
      continue;
    }
    const verifiedStatus = statusByZpid.get(String(listing.zpid));
    if (verifiedStatus && STILL_ON_MARKET.has(verifiedStatus)) {
      pulled.push({ listing, verifiedStatus });
    } else if (!verifiedStatus) {
      held.push({ listing, reason: listing.detailurl ? 'sold_verification_unavailable: no_status' : 'sold_verification_unavailable: no_detail_url' });
    } else {
      kept.push(listing);
    }
  }
  return { kept, pulled, held };
}

async function verifySoldCandidates(supabase, finalListings) {
  const token = process.env.APIFY_TOKEN;
  const candidates = finalListings.filter(l => l.status === 'sold');
  if (candidates.length === 0) return { kept: finalListings, pulled: [], held: [] };
  if (!token) {
    console.warn('  Sold verification unavailable: APIFY_TOKEN not set — holding sold candidates');
    return {
      kept: finalListings.filter(l => l.status !== 'sold'),
      pulled: [],
      held: candidates.map(listing => ({ listing, reason: 'sold_verification_unavailable: missing_apify_token' })),
    };
  }

  const verifiable = candidates.filter(l => l.detailurl);
  console.log(`  Verifying ${verifiable.length}/${candidates.length} sold candidate(s) against their Zillow detail pages in chunks of ${VERIFY_CHUNK_SIZE}...`);

  const statusByZpid = new Map();
  let verifiedCount = 0;
  for (let i = 0; i < verifiable.length; i += VERIFY_CHUNK_SIZE) {
    const chunk = verifiable.slice(i, i + VERIFY_CHUNK_SIZE);
    const chunkNum = Math.floor(i / VERIFY_CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(verifiable.length / VERIFY_CHUNK_SIZE);
    console.log(`    Sold verification chunk ${chunkNum}/${totalChunks} (${chunk.length} candidate(s))...`);

    try {
      const start = await apifyHttp(
        `https://api.apify.com/v2/acts/${DETAIL_ACTOR}/runs?token=${token}`,
        { method: 'POST', body: { startUrls: chunk.map(l => ({ url: l.detailurl })) } }
      );
      if (start.status !== 200 && start.status !== 201) {
        throw new Error(`start failed (${start.status}): ${JSON.stringify(start.data).slice(0, 200)}`);
      }
      const runId = start.data.data.id;
      const datasetId = start.data.data.defaultDatasetId;

      const deadline = Date.now() + VERIFY_TIMEOUT_MINUTES * 60 * 1000;
      let status = 'RUNNING';
      while (status === 'RUNNING' || status === 'READY') {
        if (Date.now() > deadline) {
          await apifyHttp(`https://api.apify.com/v2/actor-runs/${runId}/abort?token=${token}`, { method: 'POST' }).catch(() => {});
          throw new Error(`verification run exceeded ${VERIFY_TIMEOUT_MINUTES} minutes`);
        }
        await new Promise(r => setTimeout(r, 10000));
        const s = await apifyHttp(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        status = s?.data?.data?.status;
      }
      if (status !== 'SUCCEEDED') throw new Error(`verification run ended ${status}`);

      const items = await apifyHttp(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`);
      if (!Array.isArray(items.data)) throw new Error('verification dataset not an array');

      for (const r of items.data) {
        const zpid = extractZpidFromResult(r);
        const homeStatus = (r?.homeStatus || r?.hdpData?.homeInfo?.homeStatus || r?.status || '').toUpperCase();
        if (zpid && homeStatus) statusByZpid.set(zpid, homeStatus);
      }
      verifiedCount += chunk.length;
    } catch (err) {
      console.warn(`    Sold verification chunk ${chunkNum}/${totalChunks} failed (${err.message}) — holding that chunk`);
    }
  }

  const { kept, pulled, held } = partitionSoldVerification(finalListings, statusByZpid);

  for (const { listing, verifiedStatus } of pulled) {
    console.log(`    PULLED zpid ${listing.zpid} — Zillow says ${verifiedStatus}, not sold (${listing.addressstreet}, ${listing.city})`);
    await supabase
      .from('listings')
      .update({
        status: 'active',
        missing_scrape_count: 0,
        postcard_skip_reason: `sold_verification_still_on_market: ${verifiedStatus}`,
      })
      .eq('zpid', listing.zpid);
  }

  if (pulled.length > 0) {
    console.log(`  Sold verification pulled ${pulled.length}/${verifiedCount} verified candidate(s) back to active`);
  }
  if (held.length > 0) console.log(`  Sold verification held ${held.length} candidate(s) without positive evidence`);
  return { kept, pulled, held };
}

/**
 * Generate CSV file
 */
function generateCSV(listings, outputPath) {
  const csvData = listings.map(l => ({
    zpid: l.zpid,
    status: l.status,
    addressstreet: l.addressstreet,
    city: l.city || l.addresscity,
    addressstate: l.addressstate || 'ON',
    addresszipcode: formatCanadianPostal(l.addresszipcode),
    price: l.price,
    beds: l.beds,
    baths: l.baths,
    area: l.area,
    is_furnished: l.is_furnished != null ? (l.is_furnished ? 'Yes' : 'No') : 'Unknown',
    furniture_confidence: l.furniture_confidence != null ? l.furniture_confidence.toFixed(2) : '',
    search_days_on_zillow: l.search_days_on_zillow ?? '',
    detail_days_on_zillow: l.detail_days_on_zillow ?? '',
    detail_time_on_zillow: l.detail_time_on_zillow || '',
    zillow_date_posted: l.zillow_date_posted || '',
    listing_agents: Array.isArray(l.listing_agent_names)
      ? l.listing_agent_names.join('; ')
      : '',
    listing_mls_id: l.listing_mls_id || '',
    listing_attribution_captured_at: l.listing_attribution_captured_at || '',
    address_verified: l._geocode_verified != null ? (l._geocode_verified ? 'Yes' : 'No') : 'Not checked',
    lastseenat: l.lastseenat,
  }));

  const csv = Papa.unparse(csvData);
  fs.writeFileSync(outputPath, csv);
  console.log(`  CSV: ${path.basename(outputPath)} (${listings.length} records)`);
}

/** Generate the approved premium A7 envelope artwork for each mailing row. */
async function generatePDF(listings, outputPath, opts) {
  await generatePremiumEnvelopes({
    records: listings,
    recipientName: 'The Residents',
    logoPath: path.join(__dirname, 'assets', 'brand-svg', 'SaturnStarMovers_Wordmark_DeepNavy_NoDescriptor.png'),
    brandTreatment: 'lockup',
    addressTreatment: 'editorial',
    editorialSide: 'right',
    includeBack: false,
    includeFrontReturn: true,
    usePaperStock: true,
    region: opts.region || 'windsor',
    outputPath,
  });
  console.log(`  PDF: ${path.basename(outputPath)} (${listings.length} premium envelopes)`);
}

async function run(options) {
  stepHeader(5, 'Generate Output');

  const opts = options || parseCliArgs();

  // Production output must consume this batch's Step 4 artifact. Falling back
  // to a prior/partial stage can bypass classification or address controls.
  const listings = readPipelineFile('step4-verified.json');
  console.log(`  Loaded ${listings.length} listings from step4-verified.json`);

  // Apply filters
  let { finalListings, rejected } = applyOutputFilters(listings, opts);
  const initialRejected = [...rejected];

  const freshness = applyJustListedFreshnessGuard(finalListings);
  finalListings = freshness.kept;
  rejected = rejected.concat(freshness.rejected);
  const freshnessRejected = freshness.rejected;
  if (freshness.rejected.length > 0) {
    console.log(`  Detail freshness guard removed ${freshness.rejected.length} stale just_listed listing(s) over ${JUST_LISTED_FRESHNESS_BLOCK_AFTER_DAYS} days`);
  }
  if (freshness.audit.length > 0) {
    console.log(`  Detail freshness audit flagged ${freshness.audit.length} just_listed listing(s) at ${JUST_LISTED_FRESHNESS_AUDIT_MIN_DAYS}+ days`);
  }
  // Write this before the slower sold-verification step. Large regions can
  // time out during verification; the freshness audit should survive anyway.
  writePipelineFile('step5-freshness-audit.json', freshness.audit);

  // Address-level duplicate guard — block relists (new zpid, same address)
  // from getting a second postcard of the same type. Skipped in dry runs.
  if (!opts.dryRun && finalListings.length > 0) {
    const supabase = getSupabase();
    const region = opts.region || 'windsor';
    const { kept, rejected: addrRejected } = await filterAddressDuplicates(supabase, region, finalListings);
    if (addrRejected.length > 0) {
      console.log(`  Address-dup guard removed ${addrRejected.length} relist duplicate(s):`);
      addrRejected.forEach(r => console.log(`    zpid ${r.zpid} — ${r.reason}`));
    }
    finalListings = kept;
    rejected = rejected.concat(addrRejected);
  }
  const addressRejected = rejected.slice(initialRejected.length + freshnessRejected.length);

  // Verify sold candidates against their live Zillow pages. Still-active rows
  // return to active; unavailable evidence is held for a later run.
  let soldPulled = [];
  let soldHeld = [];
  if (!opts.dryRun && finalListings.some(l => l.status === 'sold')) {
    const supabase = getSupabase();
    const { kept, pulled, held } = await verifySoldCandidates(supabase, finalListings);
    finalListings = kept;
    soldPulled = pulled;
    soldHeld = held;
    rejected = rejected.concat(held.map(({ listing, reason }) => ({ zpid: listing.zpid, reason })));
  }

  writePipelineFile('step5-final.json', finalListings);

  const listingByZpid = new Map(listings.map(l => [String(l.zpid), l]));
  let detailCostSummary = null;
  try {
    detailCostSummary = readPipelineFile('step2-detail-summary.json');
  } catch (e) {
    detailCostSummary = null;
  }
  const reappearedInput = listings.filter(l => l.postcard_skip_reason === 'reappeared_after_sold_archive');
  const finalZpids = new Set(finalListings.map(l => String(l.zpid)));
  const reappearedSent = reappearedInput.filter(l => finalZpids.has(String(l.zpid)));
  const reappearedRejected = rejected.filter(r => {
    const listing = listingByZpid.get(String(r.zpid));
    return listing?.postcard_skip_reason === 'reappeared_after_sold_archive';
  });
  const healthSummary = {
    generated_at: new Date().toISOString(),
    region: opts.region || 'windsor',
    batch_id: opts.batchId || null,
    input_count: listings.length,
    final_count: finalListings.length,
    final_by_status: countBy(finalListings, l => l.status),
    rejected_count: rejected.length,
    rejected_by_reason: countBy(rejected, r => r.reason),
    freshness: {
      audit_count: freshness.audit.length,
      audit_by_action: countBy(freshness.audit, r => r._freshness_action),
      rejected_count: freshnessRejected.length,
    },
    detail_cost_control: detailCostSummary,
    address_duplicate_guard: {
      rejected_count: addressRejected.length,
      rejected_by_reason: countBy(addressRejected, r => r.reason),
    },
    sold_verification: {
      candidates_before_verification: finalListings.filter(l => l.status === 'sold').length + soldPulled.length + soldHeld.length,
      pulled_back_count: soldPulled.length,
      pulled_back: soldPulled.map(({ listing, verifiedStatus }) => ({
        zpid: listing.zpid,
        address: listing.address || listing.addressstreet,
        city: listing.city || listing.addresscity,
        verified_status: verifiedStatus,
      })),
      held_count: soldHeld.length,
      held: soldHeld.map(({ listing, reason }) => ({
        zpid: listing.zpid,
        address: listing.address || listing.addressstreet,
        city: listing.city || listing.addresscity,
        reason,
      })),
    },
    reappeared_after_sold_archive: {
      candidates: reappearedInput.length,
      sent: reappearedSent.length,
      blocked_or_filtered: reappearedRejected.length,
      blocked_by_reason: countBy(reappearedRejected, r => r.reason),
    },
  };
  writePipelineFile('step5-health-summary.json', healthSummary);

  // Persist skip reasons to Supabase (best-effort)
  if (rejected.length > 0 && !opts.dryRun) {
    const supabase = getSupabase();
    for (let i = 0; i < rejected.length; i += 200) {
      const batch = rejected.slice(i, i + 200);
      for (const { zpid, reason } of batch) {
        await supabase.from('listings')
          .update({ postcard_skip_reason: reason })
          .eq('zpid', zpid);
      }
    }
    console.log(`  Wrote postcard_skip_reason for ${rejected.length} excluded listings`);
  }

  console.log(`\n  Final postcard count: ${finalListings.length}`);

  if (finalListings.length === 0) {
    console.log('  No new listings since last run. Nothing to generate.');
    return [];
  }

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would generate CSV + PDF for these listings.');
    return finalListings;
  }

  const region = opts.region || 'windsor';
  const regionConfig = getRegionConfig(region);
  const regionLabel = regionConfig.outputPrefix;
  const artifactId = String(opts.batchId || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14))
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const csvPath = path.join(projectRoot, `${regionLabel}_Postcards_${artifactId}.csv`);
  const pdfPath = path.join(projectRoot, `${regionLabel}_Postcards_${artifactId}.pdf`);

  generateCSV(finalListings, csvPath);
  await generatePDF(finalListings, pdfPath, opts);

  // Summary
  const statusCounts = {};
  finalListings.forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  console.log('\n  === Output Summary ===');
  console.log(`  Total postcards: ${finalListings.length}`);
  console.log(`  Batch ID: ${opts.batchId || 'n/a'}`);
  Object.entries(statusCounts).forEach(([s, c]) => console.log(`    ${s}: ${c}`));
  console.log(`  CSV: ${csvPath}`);
  console.log(`  PDF: ${pdfPath}`);

  return finalListings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 5 failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  run,
  applyOutputFilters,
  homeownerAudienceEligibility,
  partitionSoldVerification,
  normalizeAddressKey,
  applyJustListedFreshnessGuard,
  generatePDF,
};
