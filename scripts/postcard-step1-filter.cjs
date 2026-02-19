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
  WINDSOR_CITIES,
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
  console.log(`  Cities: ${WINDSOR_CITIES.join(', ')}`);

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would query Supabase for matching listings.');
    return [];
  }

  const supabase = getSupabase();

  // Query in batches by city to avoid hitting row limits
  let allListings = [];

  for (const city of WINDSOR_CITIES) {
    const { data, error } = await supabase
      .from('listings')
      .select('zpid, status, price, unformattedprice, address, addressstreet, addresscity, addressstate, addresszipcode, city, beds, baths, area, imgsrc, detailurl, carouselphotos, contenttype, lastseenat, is_furnished, furniture_confidence, furniture_scan_date, latlong')
      .in('status', opts.statuses)
      .eq('city', city)
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

  // Filter out listings without a street address
  allListings = allListings.filter(l => l.addressstreet && l.addressstreet.trim());

  // Deduplicate by zpid (keep latest)
  const seen = new Map();
  for (const listing of allListings) {
    if (!seen.has(listing.zpid)) {
      seen.set(listing.zpid, listing);
    }
  }
  allListings = Array.from(seen.values());

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
