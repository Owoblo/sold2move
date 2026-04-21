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

const {
  getSupabase,
  writePipelineFile,
  parseCliArgs,
  stepHeader,
} = require('./postcard-lib.cjs');

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

  // Fill missing postal codes from the address field (e.g. "123 Oak St, Windsor, ON N9A 1B2")
  const CANADIAN_POSTAL_RE = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i;
  let postalEnriched = 0;
  for (const listing of allListings) {
    if (!listing.addresszipcode && listing.address) {
      const match = listing.address.match(CANADIAN_POSTAL_RE);
      if (match) {
        listing.addresszipcode = match[1].toUpperCase().replace(/\s/g, '');
        postalEnriched++;
      }
    }
  }
  if (postalEnriched > 0) {
    console.log(`  Enriched ${postalEnriched} postal codes from address field`);
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
