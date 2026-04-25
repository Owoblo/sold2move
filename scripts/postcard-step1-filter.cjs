#!/usr/bin/env node
/**
 * Step 1: Filter Listings
 *
 * Queries Supabase for Windsor-area listings matching criteria:
 * - City in Windsor-area list
 * - Status: sold or just_listed
 * - Not a LOT/land
 * - Above minimum price
 * - Within date range (lastseenat)
 *
 * Output: scripts/.pipeline/step1-filtered.json
 */

const https = require('https');
const {
  getSupabase,
  writePipelineFile,
  parseCliArgs,
  stepHeader,
  formatCanadianPostal,
  createRateLimiter,
} = require('./postcard-lib.cjs');

// OpenStreetMap Nominatim — free postal lookup, no API key, 1 req/sec policy.
// Used as a fallback when Apify/Zillow didn't return a postal and the address
// field doesn't contain one either. Filled at runtime, written back to Supabase
// so the next run gets it instantly without hitting Nominatim again.
function nominatimLookup(listing) {
  const street = (listing.addressstreet || '').trim();
  const city = (listing.city || listing.addresscity || '').trim();
  if (!street || !city) return Promise.resolve(null);

  const query = `${street}, ${city}, ${listing.addressstate || 'ON'}, Canada`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=ca&limit=1`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        // Nominatim usage policy requires a descriptive User-Agent
        'User-Agent': 'sold2move-postcard-pipeline/1.0 (postcards@sold2move.com)',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const result = Array.isArray(parsed) && parsed[0];
          const postcode = result && result.address && result.address.postcode;
          resolve(formatCanadianPostal(postcode) || null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10_000, () => { req.destroy(); resolve(null); });
  });
}

async function fillMissingPostalsFromNominatim(supabase, listings) {
  const missing = listings.filter(l => !l.addresszipcode);
  if (missing.length === 0) return { recovered: 0, stillMissing: 0 };

  console.log(`  Looking up ${missing.length} missing postal codes via OpenStreetMap (≈${missing.length}s)...`);
  const rateLimiter = createRateLimiter(1100); // honor Nominatim's 1 req/sec policy
  let recovered = 0;
  let stillMissing = 0;

  for (const listing of missing) {
    await rateLimiter();
    const postal = await nominatimLookup(listing);
    if (!postal) {
      stillMissing++;
      continue;
    }
    listing.addresszipcode = postal;
    recovered++;

    // Write back so the next run skips this lookup. Best-effort: a failed
    // update should not abort the pipeline.
    try {
      const { error } = await supabase
        .from('listings')
        .update({ addresszipcode: postal })
        .eq('zpid', listing.zpid);
      if (error) {
        console.warn(`    DB write-back failed for zpid ${listing.zpid}: ${error.message}`);
      }
    } catch (e) {
      console.warn(`    DB write-back failed for zpid ${listing.zpid}: ${e.message}`);
    }
  }

  return { recovered, stillMissing };
}

async function run(options) {
  stepHeader(1, 'Filter Listings');

  const opts = options || parseCliArgs();
  console.log(`  Date range: ${opts.from} to ${opts.to}`);
  console.log(`  Min price: $${opts.minPrice.toLocaleString()}`);
  console.log(`  Statuses: ${opts.statuses.join(', ')}`);
  console.log(`  Region: ${opts.region} (${opts.cities.length} cities)`);

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would query Supabase for matching listings.');
    return [];
  }

  const supabase = getSupabase();

  // Query in batches by city to avoid hitting row limits
  let allListings = [];

  for (const city of opts.cities) {
    const { data, error } = await supabase
      .from('listings')
      .select('zpid, region, status, price, unformattedprice, address, addressstreet, addresscity, addressstate, addresszipcode, city, beds, baths, area, imgsrc, detailurl, carouselphotos, contenttype, lastseenat, is_furnished, furniture_confidence, furniture_scan_date, latlong, photo_fetch_attempts, photos_last_attempted_at, furniture_needs_retry, just_listed_postcard_sent_at, last_postcard_sent_at, last_postcard_batch_id, sold_postcard_sent_at')
      .in('status', opts.statuses)
      .eq('region', opts.region)
      .eq('city', city)
      .eq('glitch_suspected', false)
      .gte('lastseenat', `${opts.from}T00:00:00Z`)
      .lte('lastseenat', `${opts.to}T23:59:59Z`)
      .gte('unformattedprice', opts.minPrice)
      .order('lastseenat', { ascending: false });

    if (error) {
      console.error(`  Error querying ${city}:`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      allListings = allListings.concat(data);
      console.log(`  ${city}: ${data.length} listings`);
    }
  }

  // Filter out lots/land
  const before = allListings.length;
  allListings = allListings.filter(l => {
    const ct = (l.contenttype || '').toUpperCase();
    return ct !== 'LOT' && ct !== 'LAND';
  });
  const lotsRemoved = before - allListings.length;
  if (lotsRemoved > 0) {
    console.log(`  Removed ${lotsRemoved} lots/land listings`);
  }

  // Filter out listings without a proper street address (must have a street number)
  allListings = allListings.filter(l => {
    const street = (l.addressstreet || '').trim();
    if (!street) return false;
    // Must start with a number (e.g. "1234 Oak St") — rejects things like "Corner Lot" or blank
    if (!/^\d/.test(street)) {
      console.log(`  Removed (no street number): zpid ${l.zpid} — "${street}"`);
      return false;
    }
    return true;
  });

  // Deduplicate by zpid (keep latest)
  const seen = new Map();
  for (const listing of allListings) {
    if (!seen.has(listing.zpid)) {
      seen.set(listing.zpid, listing);
    }
  }
  allListings = Array.from(seen.values());

  // Three-tier postal recovery, cheapest source first:
  //   1. The `address` field (e.g. "123 Oak St, Windsor, ON N9A 1B2")
  //   2. The Zillow `detailurl` slug
  //      (e.g. ".../556-Clover-St-Windsor-ON-N8P-1C6-2055636901_zpid")
  //   3. OpenStreetMap Nominatim (free, ~1 req/s, last resort)
  //
  // Anything we recover gets written back to Supabase so the next run skips
  // the work and downstream consumers (email flows, search) benefit too.
  let enrichedFromAddress = 0;
  let enrichedFromUrl = 0;
  const writeBack = []; // { zpid, postal } — flushed after recovery loop

  for (const listing of allListings) {
    const fromColumn = formatCanadianPostal(listing.addresszipcode);
    if (fromColumn) {
      listing.addresszipcode = fromColumn;
      continue;
    }
    const fromAddress = formatCanadianPostal(listing.address);
    if (fromAddress) {
      listing.addresszipcode = fromAddress;
      enrichedFromAddress++;
      writeBack.push({ zpid: listing.zpid, postal: fromAddress });
      continue;
    }
    const fromUrl = formatCanadianPostal(listing.detailurl);
    if (fromUrl) {
      listing.addresszipcode = fromUrl;
      enrichedFromUrl++;
      writeBack.push({ zpid: listing.zpid, postal: fromUrl });
      continue;
    }
    listing.addresszipcode = '';
  }

  if (enrichedFromAddress > 0) {
    console.log(`  Enriched ${enrichedFromAddress} postal codes from address field`);
  }
  if (enrichedFromUrl > 0) {
    console.log(`  Enriched ${enrichedFromUrl} postal codes from detailurl slug`);
  }

  // Persist cheap recoveries back to Supabase. Best-effort: log and continue
  // on failure so a transient DB hiccup doesn't kill the pipeline.
  if (writeBack.length > 0) {
    let written = 0;
    for (const { zpid, postal } of writeBack) {
      const { error } = await supabase
        .from('listings')
        .update({ addresszipcode: postal })
        .eq('zpid', zpid);
      if (error) {
        console.warn(`    DB write-back failed for zpid ${zpid}: ${error.message}`);
      } else {
        written++;
      }
    }
    console.log(`  Wrote ${written}/${writeBack.length} recovered postals back to Supabase`);
  }

  // Anything still missing a postal — look it up via OpenStreetMap Nominatim
  // (free, no API key) and persist the result back to Supabase.
  const { recovered, stillMissing } = await fillMissingPostalsFromNominatim(supabase, allListings);
  if (recovered > 0) {
    console.log(`  Recovered ${recovered} postal codes via OpenStreetMap (also written back to Supabase)`);
  }
  if (stillMissing > 0) {
    console.warn(`  WARNING: ${stillMissing} listings still have no postal code after all fallbacks — Canada Post sorting will be delayed for those`);
  }

  console.log(`\n  Total eligible listings: ${allListings.length}`);

  // Summary by status
  const statusCounts = {};
  allListings.forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });
  Object.entries(statusCounts).forEach(([s, c]) => {
    console.log(`    ${s}: ${c}`);
  });

  // Summary by city
  const cityCounts = {};
  allListings.forEach(l => {
    const c = l.city || l.addresscity || 'Unknown';
    cityCounts[c] = (cityCounts[c] || 0) + 1;
  });
  console.log('  By city:');
  Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([c, n]) => console.log(`    ${c}: ${n}`));

  writePipelineFile('step1-filtered.json', allListings);
  return allListings;
}

// Run standalone
if (require.main === module) {
  run().catch(err => {
    console.error('Step 1 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
