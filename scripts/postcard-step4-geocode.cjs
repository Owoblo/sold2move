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
  getSupabase,
  createRateLimiter,
  readPipelineFile,
  writePipelineFile,
  formatAddress,
  formatCanadianPostal,
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
 * Canonical street suffixes. Abbreviations normalize to the same street type,
 * but different types (Street vs Avenue) remain distinct.
 */
const STREET_SUFFIXES = new Map(Object.entries({
  street: 'street', st: 'street', avenue: 'avenue', ave: 'avenue',
  boulevard: 'boulevard', blvd: 'boulevard', drive: 'drive', dr: 'drive',
  road: 'road', rd: 'road', crescent: 'crescent', cres: 'crescent',
  court: 'court', ct: 'court', place: 'place', pl: 'place', lane: 'lane', ln: 'lane',
  way: 'way', circle: 'circle', cir: 'circle', terrace: 'terrace', terr: 'terrace',
  trail: 'trail', trl: 'trail', parkway: 'parkway', pkwy: 'parkway',
  close: 'close', grove: 'grove', glen: 'glen', heights: 'heights', hts: 'heights',
  ridge: 'ridge', row: 'row', run: 'run', square: 'square', sq: 'square',
  crossing: 'crossing', xing: 'crossing',
}));

/**
 * Strip the street number and type suffix to get just the core name.
 * "1054 Oak Street" -> "oak"
 * "235 Southwind Cres" -> "southwind"
 * "879 Michael Dr" -> "michael"
 */
function parseStreet(str) {
  let value = normalize(str).replace(/[.,]/g, ' ');
  const number = value.match(/^(\d+[a-z]?)(?:\s|$)/)?.[1] || '';
  value = value.replace(/^\d+[a-z]?(?:\s*-\s*\d+[a-z]?)?\s*/, '');
  value = value.replace(/\b(?:apt|apartment|unit|suite|ste)\s*#?\s*[a-z0-9-]+\b.*$/i, '');
  value = value.replace(/#\s*[a-z0-9-]+\b.*$/i, '');
  const words = value.split(/\s+/).filter(Boolean);
  const suffixKey = words.at(-1)?.replace(/\./g, '') || '';
  const suffix = STREET_SUFFIXES.get(suffixKey) || '';
  if (suffix) words.pop();
  return { number, core: words.join(' ').trim(), suffix };
}

function extractListingUnit(str) {
  const value = String(str || '');
  return value.match(/\b(?:apt|apartment|unit|suite|ste)\s*#?\s*([a-z0-9-]+)\b/i)?.[1]?.toLowerCase()
    || value.match(/#\s*([a-z0-9-]+)\b/i)?.[1]?.toLowerCase()
    || '';
}

/**
 * Free first-line deliverability gate. Zillow/MLS is the address authority;
 * this validates that its address can be rendered deterministically for Canada
 * Post without paying to re-geocode every normal listing.
 */
function verifyLocalAddress(listing) {
  const parsed = parseStreet(listing.addressstreet);
  const postal = formatCanadianPostal(listing.addresszipcode);
  const province = String(listing.addressstate || '').trim().toUpperCase();
  const city = String(listing.city || listing.addresscity || '').trim();
  const issues = [];

  if (!parsed.number) issues.push('missing street number');
  if (!parsed.core || parsed.core.length < 2) issues.push('missing street name');
  if (!postal) issues.push('missing or invalid Canadian postal code');
  if (!city) issues.push('missing city');
  if (!/^[A-Z]{2}$/.test(province)) issues.push('missing or invalid province');

  if (issues.length > 0) {
    return { verified: null, reason: `Local address validation held: ${issues.join('; ')}` };
  }
  return {
    verified: true,
    reason: 'Verified locally — numbered street and Canadian postal format confirmed',
    canonical: `${parsed.number} ${parsed.core}${parsed.suffix ? ` ${parsed.suffix}` : ''}, ${city}, ${province} ${postal}`,
    method: 'local_canonical_v1',
  };
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
  const parsedListing = parseStreet(listing.addressstreet);

  if (!geoStreetNum) {
    issues.push('Google did not return an exact street number');
  } else if (!parsedListing.number) {
    issues.push('Listing address has no parseable street number');
  } else if (geoStreetNum !== parsedListing.number) {
    issues.push(`Street number: listing has "${parsedListing.number}" but Google resolved to "${comp.street_number}"`);
  }

  // --- Street name and canonical suffix must agree ---
  const geoRoute = comp.route || '';
  if (geoRoute && listingStreet) {
    const parsedGeo = parseStreet(geoRoute);
    const listingCore = parsedListing.core;
    const geoCore = parsedGeo.core;

    if (listingCore && geoCore) {
      // Space-only variations are acceptable ("Bob Lo" vs "Boblo").
      const listingCompact = listingCore.replace(/\s/g, '');
      const geoCompact = geoCore.replace(/\s/g, '');
      const coreMatch = listingCore === geoCore || listingCompact === geoCompact;

      if (!coreMatch) {
        issues.push(`Street name: "${listing.addressstreet}" vs Google's "${geoRoute}"`);
      } else if (parsedListing.suffix && parsedGeo.suffix && parsedListing.suffix !== parsedGeo.suffix) {
        issues.push(`Street type: listing has "${parsedListing.suffix}" but Google resolved to "${parsedGeo.suffix}"`);
      }
    }
  } else {
    issues.push('Google did not return a street route');
  }

  // --- Unit/subpremise must be present and exact when Google supplies one ---
  const listingUnit = extractListingUnit(listing.addressstreet);
  const geoUnit = normalize(comp.subpremise || '');
  if (geoUnit && !listingUnit) {
    issues.push(`Google resolved unit "${comp.subpremise}" but listing has no unit`);
  } else if (geoUnit && listingUnit !== geoUnit) {
    issues.push(`Unit: listing has "${listingUnit}" but Google resolved to "${comp.subpremise}"`);
  } else if (listingUnit && !geoUnit) {
    warnings.push('Listing includes a unit but Google returned only the building-level address');
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

  // Free local validation handles the normal path. Only unresolved exceptions
  // are eligible for the optional paid Google check.
  const alreadyVerified = listings.filter(l => l._geocode_verified === true);
  const needVerification = listings.filter(l => l._geocode_verified !== true);

  for (const listing of needVerification) {
    const local = verifyLocalAddress(listing);
    listing._geocode_verified = local.verified;
    listing._geocode_reason = local.reason;
    listing._geocode_method = local.method || 'local_canonical_v1';
    if (local.canonical) listing._canonical_mailing_address = local.canonical;
  }
  const googleCandidates = listings.filter(l => l._geocode_verified !== true);

  console.log(`  Already verified: ${alreadyVerified.length}`);
  console.log(`  Verified locally: ${needVerification.length - googleCandidates.length}`);
  console.log(`  Local exceptions held: ${googleCandidates.length}`);

  if (opts.dryRun) {
    console.log(`\n  [DRY RUN] Would hold ${googleCandidates.length} local exception(s).`);
    writePipelineFile('step4-verified.json', listings);
    return listings;
  }

  const googleMode = String(process.env.GOOGLE_GEOCODING_MODE || 'off').toLowerCase();
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (googleMode !== 'exceptions' || !apiKey || googleCandidates.length === 0) {
    if (googleCandidates.length > 0) {
      console.log(`  Google exception verification is ${googleMode === 'exceptions' ? 'unavailable' : 'disabled'}; held ${googleCandidates.length} exception(s) at zero API cost.`);
    } else {
      console.log('  No paid Google lookups needed.');
    }
    writePipelineFile('step4-verified.json', listings);
    return listings;
  }

  const rateLimiter = createRateLimiter(100); // 10 req/sec
  let verified = 0;
  let failed = 0;
  let mismatched = 0;

  console.log(`  Paid Google exception lookup: ${googleCandidates.length} address(es)...`);

  for (const listing of googleCandidates) {
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
        listing._geocode_method = 'google_exception_v1';

        if (match.verified) {
          verified++;
        } else {
          mismatched++;
        }
      } else if (response.status === 'REQUEST_DENIED') {
        listing._geocode_verified = null;
        listing._geocode_reason = 'Geocoding unavailable: API key denied — held';
        failed++;
      } else {
        listing._geocode_verified = false;
        listing._geocode_reason = `Geocoding failed: ${response.status}`;
        failed++;
      }

      const total = verified + mismatched + failed;
      process.stdout.write(`  Processed ${total}/${googleCandidates.length} (${verified} verified, ${mismatched} mismatched, ${failed} failed)\r`);
    } catch (err) {
      listing._geocode_verified = null;
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

    // Persist skip reason to Supabase so it's queryable
    const supabase = getSupabase();
    const zpids = badAddresses.map(l => l.zpid);
    for (let i = 0; i < zpids.length; i += 200) {
      const batch = badAddresses.slice(i, i + 200);
      for (const l of batch) {
        const reason = `geocode_mismatch: ${(l._geocode_reason || '').slice(0, 200)}`;
        await supabase.from('listings')
          .update({ postcard_skip_reason: reason })
          .eq('zpid', l.zpid);
      }
    }
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

module.exports = { run, verifyMatch, verifyLocalAddress, parseStreet, extractListingUnit };
