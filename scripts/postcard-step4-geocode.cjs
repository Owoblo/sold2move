#!/usr/bin/env node
/**
 * Step 4: Address Verification via Google Geocoding API
 *
 * - Geocodes each listing's full address
 * - Verifies returned address matches (street number, street name, city, postal code)
 * - Flags mismatches for manual review
 * - Rate limit: 10 requests/second
 *
 * Output: scripts/.pipeline/step4-verified.json
 */

const https = require('https');
const {
  createRateLimiter,
  readPipelineFile,
  writePipelineFile,
  formatAddress,
  stepHeader,
  parseCliArgs,
} = require('./postcard-lib.cjs');

/**
 * Call Google Geocoding API
 */
function geocodeAddress(address, apiKey) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse geocoding response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Normalize a string for comparison (lowercase, trim, remove extra spaces)
 */
function normalize(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * All known street type suffixes (full + abbreviated).
 * Used to strip the suffix so we compare just the core name.
 * e.g. "Oak Street" and "Oak Avenue" both become "oak"
 */
const STREET_SUFFIXES = [
  'street', 'st', 'avenue', 'ave', 'boulevard', 'blvd', 'drive', 'dr',
  'road', 'rd', 'crescent', 'cres', 'court', 'ct', 'place', 'pl',
  'lane', 'ln', 'way', 'circle', 'cir', 'terrace', 'terr', 'trail',
  'trl', 'parkway', 'pkwy', 'close', 'grove', 'glen', 'heights', 'hts',
  'ridge', 'row', 'run', 'square', 'sq', 'crossing', 'xing',
];

/**
 * Strip the street number and type suffix to get just the core name.
 * "1054 Oak Street" -> "oak"
 * "235 Southwind Cres" -> "southwind"
 * "879 Michael Dr" -> "michael"
 */
function coreStreetName(str) {
  let s = normalize(str);
  // Strip leading number + optional unit letter/dash
  s = s.replace(/^\d+[\s\-]*[a-z]?\s*/, '');
  // Strip unit info like "#215-301"
  s = s.replace(/#[\d\-]+/g, '');
  // Strip suffixes
  const words = s.split(/\s+/).filter(Boolean);
  const filtered = words.filter(w => !STREET_SUFFIXES.includes(w.replace(/\./g, '')));
  return filtered.join(' ').trim();
}

/**
 * Extract address components from Google response
 */
function extractComponents(result) {
  const components = {};
  for (const comp of (result.address_components || [])) {
    for (const type of comp.types) {
      components[type] = comp.long_name;
      components[`${type}_short`] = comp.short_name;
    }
  }
  return components;
}

/**
 * Verify a geocoding result - focused on mail deliverability:
 *
 * FAIL conditions (mail won't arrive):
 *   1. Google can't find the address at all (ZERO_RESULTS)
 *   2. Street number doesn't match (wrong house)
 *   3. Street name doesn't match (wrong street entirely)
 *   4. Looks like an apartment/unit without a unit number
 *
 * OK / don't care:
 *   - City name differences (Comber vs Lakeshore, Tecumseh vs Windsor) - Canada Post knows
 *   - Postal code differences - as long as street is right, mail gets there
 */
function verifyMatch(listing, geocodeResult) {
  if (!geocodeResult || !geocodeResult.address_components) {
    return { verified: false, reason: 'Google could not find this address' };
  }

  const comp = extractComponents(geocodeResult);
  const issues = [];
  const warnings = [];

  // --- CRITICAL: Street number must match ---
  const listingStreet = normalize(listing.addressstreet);
  const geoStreetNum = normalize(comp.street_number || '');

  if (!geoStreetNum) {
    // Google didn't return a street number - could be a partial/approximate match
    if (geocodeResult.geometry?.location_type === 'APPROXIMATE') {
      issues.push(`Address not found precisely — Google returned approximate location only`);
    }
  } else if (listingStreet) {
    // Extract leading number(s) from listing address (e.g. "215-B" -> "215", "1487" -> "1487")
    const listingNumMatch = listingStreet.match(/^(\d+)/);
    const listingNum = listingNumMatch ? listingNumMatch[1] : '';

    if (listingNum && geoStreetNum !== listingNum && !geoStreetNum.startsWith(listingNum)) {
      issues.push(`Street number: listing has "${listingNum}" but Google resolved to "${comp.street_number}"`);
    }
  }

  // --- Street name: compare core name, ignore suffix (St vs Ave doesn't matter) ---
  const geoRoute = comp.route || '';
  if (geoRoute && listingStreet) {
    const listingCore = coreStreetName(listing.addressstreet);
    const geoCore = coreStreetName(geoRoute);

    if (listingCore && geoCore) {
      // Also compare with spaces stripped (handles "Bob Lo" vs "Boblo", "River View" vs "Riverview")
      const listingCompact = listingCore.replace(/\s/g, '');
      const geoCompact = geoCore.replace(/\s/g, '');
      const coreMatch = listingCore === geoCore
        || listingCompact === geoCompact
        || listingCore.includes(geoCore) || geoCore.includes(listingCore)
        || listingCompact.includes(geoCompact) || geoCompact.includes(listingCompact);

      if (!coreMatch) {
        // Completely different street name - this is a real problem
        issues.push(`Street name: "${listing.addressstreet}" vs Google's "${geoRoute}"`);
      } else if (listingCore === geoCore) {
        // Same core name but maybe different suffix (St vs Ave) - just a warning
        const listingSuffix = normalize(listing.addressstreet).replace(/^\d+[\s\-]*[a-z]?\s*/, '').replace(listingCore, '').trim();
        const geoSuffix = normalize(geoRoute).replace(geoCore, '').trim();
        if (listingSuffix && geoSuffix && listingSuffix !== geoSuffix) {
          warnings.push(`Street type differs: "${listing.addressstreet}" vs "${geoRoute}" (same street, mail will arrive)`);
        }
      }
    }
  }

  // --- WARNING: Apartment/unit detection ---
  const hasUnit = /\b(apt|unit|suite|ste|#)\b/i.test(listing.addressstreet)
    || /\d+[\s-]+\d+$/.test(listing.addressstreet.trim());
  if (hasUnit) {
    warnings.push('Has unit/apartment number — verify it can receive mail');
  }

  // --- INFO only: city/postal (not used for pass/fail) ---
  const listingCity = listing.city || listing.addresscity || '';
  const geoCity = comp.locality || comp.sublocality || '';
  if (geoCity && listingCity && normalize(geoCity) !== normalize(listingCity)) {
    warnings.push(`City differs: "${listingCity}" vs Google's "${geoCity}" (OK for Canada Post)`);
  }

  if (issues.length === 0) {
    const reason = warnings.length > 0
      ? `Verified — ${warnings.join('; ')}`
      : 'Verified — street address confirmed';
    return { verified: true, reason, warnings };
  }

  return { verified: false, reason: issues.join('; '), warnings };
}

async function run(options) {
  stepHeader(4, 'Address Verification (Geocoding)');

  const opts = options || parseCliArgs();
  const listings = readPipelineFile('step3-furniture.json');
  console.log(`  Loaded ${listings.length} listings from Step 3`);

  // Check for already-verified listings (from previous runs)
  const alreadyVerified = listings.filter(l => l._geocode_verified != null);
  const needVerification = listings.filter(l => l._geocode_verified == null);

  console.log(`  Already verified: ${alreadyVerified.length}`);
  console.log(`  Need verification: ${needVerification.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would geocode ${needVerification.length} addresses.`);
    writePipelineFile('step4-verified.json', listings);
    return listings;
  }

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.log('  WARNING: GOOGLE_GEOCODING_API_KEY not set - skipping geocoding');
    console.log('  All listings will be marked as unverified.');
    for (const listing of needVerification) {
      listing._geocode_verified = null;
      listing._geocode_reason = 'Skipped - no API key';
    }
    writePipelineFile('step4-verified.json', listings);
    return listings;
  }

  const rateLimiter = createRateLimiter(100); // 10 req/sec
  let verified = 0;
  let failed = 0;
  let mismatched = 0;

  console.log(`  Geocoding ${needVerification.length} addresses...`);

  for (const listing of needVerification) {
    await rateLimiter();
    const fullAddress = formatAddress(listing);

    try {
      const response = await geocodeAddress(fullAddress, apiKey);

      if (response.status === 'OK' && response.results && response.results.length > 0) {
        const result = response.results[0];
        const match = verifyMatch(listing, result);

        listing._geocode_verified = match.verified;
        listing._geocode_reason = match.reason;
        listing._geocode_warnings = match.warnings || [];
        listing._geocode_formatted = result.formatted_address;
        listing._geocode_location = result.geometry?.location;
        listing._geocode_location_type = result.geometry?.location_type;

        if (match.verified) {
          verified++;
        } else {
          mismatched++;
        }
      } else {
        listing._geocode_verified = false;
        listing._geocode_reason = `Geocoding failed: ${response.status}`;
        failed++;
      }

      const total = verified + mismatched + failed;
      process.stdout.write(`  Processed ${total}/${needVerification.length} (${verified} verified, ${mismatched} mismatched, ${failed} failed)\r`);
    } catch (err) {
      listing._geocode_verified = false;
      listing._geocode_reason = `Error: ${err.message}`;
      failed++;
    }
  }

  console.log(`\n  Results: ${verified} verified, ${mismatched} bad address, ${failed} failed`);

  // Show bad addresses (real issues - street doesn't exist)
  const badAddresses = listings.filter(l => l._geocode_verified === false && l._geocode_reason && !l._geocode_reason.startsWith('Skipped'));
  if (badAddresses.length > 0) {
    console.log('\n  Bad addresses (will be excluded):');
    badAddresses.forEach(l => {
      console.log(`    zpid ${l.zpid}: ${l.addressstreet}, ${l.city}`);
      console.log(`      Issue: ${l._geocode_reason}`);
      if (l._geocode_formatted) console.log(`      Google says: ${l._geocode_formatted}`);
    });
  }

  // Show warnings (verified but worth noting)
  const withWarnings = listings.filter(l => l._geocode_verified === true && l._geocode_warnings && l._geocode_warnings.length > 0);
  if (withWarnings.length > 0) {
    console.log(`\n  Warnings (still included, ${withWarnings.length} total):`);
    withWarnings.slice(0, 5).forEach(l => {
      console.log(`    zpid ${l.zpid}: ${l.addressstreet} — ${l._geocode_warnings.join('; ')}`);
    });
    if (withWarnings.length > 5) {
      console.log(`    ... and ${withWarnings.length - 5} more`);
    }
  }

  writePipelineFile('step4-verified.json', listings);
  return listings;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Step 4 failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
