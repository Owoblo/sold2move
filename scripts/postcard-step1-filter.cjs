#!/usr/bin/env node
/**
 * Step 1: Filter Listings
 *
 * Queries Supabase for Windsor-area listings matching criteria:
 * - City in Windsor-area list
 * - Status: sold or just_listed
 * - All property types (postcard eligibility is decided after classification)
 * - Above the configured minimum price
 * - Within date range (lastseenat)
 *
 * Output: scripts/.pipeline/step1-filtered.json
 */

const https = require('https');
const {
  getSupabase,
  readPipelineFile,
  writePipelineFile,
  parseCliArgs,
  stepHeader,
  formatCanadianPostal,
  createRateLimiter,
} = require('./postcard-lib.cjs');

const LISTING_SELECT = 'zpid, region, status, price, unformattedprice, address, addressstreet, addresscity, addressstate, addresszipcode, city, beds, baths, area, imgsrc, detailurl, description, carouselphotos, contenttype, lastseenat, is_furnished, furniture_confidence, furniture_scan_date, latlong, photo_fetch_attempts, photos_last_attempted_at, furniture_needs_retry, search_days_on_zillow, search_time_on_zillow, detail_days_on_zillow, detail_time_on_zillow, zillow_date_posted, zillow_detail_checked_at, just_listed_postcard_sent_at, last_postcard_sent_at, last_postcard_batch_id, sold_postcard_sent_at, postcard_send_count, missing_scrape_count, postcard_skip_reason, market_segment, listing_categories, occupancy_state, outreach_target, property_signals, classification_confidence, classification_reasons, property_classified_at, property_classification_method, listing_representatives, listing_agent_names, listing_mls_id, listing_attribution_source, listing_attribution_captured_at';

function mergeListingsByZpid(...groups) {
  const merged = new Map();
  for (const row of groups.flat()) {
    if (row?.zpid != null && !merged.has(String(row.zpid))) merged.set(String(row.zpid), row);
  }
  return [...merged.values()];
}

function selectQualityRecovery(listings, limit = 100) {
  const deduped = mergeListingsByZpid(listings);
  deduped.sort((a, b) => String(b.lastseenat || '').localeCompare(String(a.lastseenat || '')));
  return deduped.slice(0, Math.max(0, limit));
}

async function fetchAllPages(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

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

function filterJustListedSeenInCurrentScrape(listings, currentScrapeRows, opts = {}) {
  if (opts.skipScrape) {
    return { listings, rejected: [] };
  }

  const seenZpids = new Set((currentScrapeRows || []).map(row => String(row.zpid)));
  const kept = [];
  const rejected = [];

  for (const listing of listings) {
    if (listing.status !== 'just_listed' || seenZpids.has(String(listing.zpid))) {
      kept.push(listing);
      continue;
    }
    rejected.push({ zpid: listing.zpid, reason: 'just_listed_not_seen_in_current_scrape' });
  }

  return { listings: kept, rejected };
}

async function run(options) {
  stepHeader(1, 'Filter Listings');

  const opts = options || parseCliArgs();
  console.log(`  Date range: ${opts.from} to ${opts.to}`);
  console.log(`  Min price: $${opts.minPrice.toLocaleString()}`);
  console.log(`  Statuses: ${opts.statuses.join(', ')}`);
  console.log(`  Region: ${opts.region} (${opts.cities.length} cities)`);
  const targetState = (opts.state || opts.province || 'ON').trim().toUpperCase();
  console.log(`  State/province boundary: ${targetState}`);

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] Would query Supabase for matching listings.');
    return [];
  }

  const supabase = getSupabase();

  // Query in batches by city to avoid hitting row limits
  let allListings = [];

  for (const city of opts.cities) {
    const { data, error } = await fetchAllPages(() => supabase
      .from('listings')
      .select(LISTING_SELECT)
      .in('status', opts.statuses)
      .eq('region', opts.region)
      .eq('city', city)
      .eq('glitch_suspected', false)
      .gte('lastseenat', `${opts.from}T00:00:00Z`)
      .lte('lastseenat', `${opts.to}T23:59:59Z`)
      .order('lastseenat', { ascending: false }));

    if (error) {
      console.error(`  Error querying ${city}:`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      allListings = allListings.concat(data);
      console.log(`  ${city}: ${data.length} listings`);
    }
  }

  // Recovery lane: classify active inventory while Zillow still exposes its
  // photos. Step 5 blocks these rows from postcard output, so seeded/backlog
  // inventory is enriched without being misrepresented as newly listed.
  let recoveryListings = [];
  for (const city of opts.cities) {
    const { data, error } = await fetchAllPages(() => supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('region', opts.region)
      .eq('city', city)
      .eq('glitch_suspected', false)
      .or('property_classified_at.is.null,furniture_needs_retry.eq.true')
      .order('lastseenat', { ascending: false }));

    if (error) {
      console.error(`  Error querying active quality recovery for ${city}:`, error.message);
    } else if (data?.length) {
      recoveryListings = recoveryListings.concat(data);
    }
  }
  const knownCities = opts.cities.map(c => `"${c}"`).join(',');
  const { data: unmappedRecoveryRows, error: unmappedRecoveryError } = await fetchAllPages(() => supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .eq('region', opts.region)
    .not('city', 'in', `(${knownCities})`)
    .eq('addressstate', targetState)
    .eq('glitch_suspected', false)
    .or('property_classified_at.is.null,furniture_needs_retry.eq.true')
    .order('lastseenat', { ascending: false }));
  if (unmappedRecoveryError) {
    console.error(`  Error querying unmapped active quality recovery:`, unmappedRecoveryError.message);
  } else if (unmappedRecoveryRows.length > 0) {
    recoveryListings = recoveryListings.concat(unmappedRecoveryRows);
  }

  // Background enrichment must never crowd actual just-listed/sold candidates
  // out of the workflow timeout. Process a small, newest-first recovery slice
  // each run; campaign candidates above remain complete and uncapped.
  const recoveryLimit = Math.max(0, Number.parseInt(process.env.POSTCARD_QUALITY_RECOVERY_LIMIT || '100', 10) || 0);
  const selectedRecovery = selectQualityRecovery(recoveryListings, recoveryLimit);
  if (recoveryListings.length > 0) {
    console.log(`  Active quality recovery: selected ${selectedRecovery.length}/${recoveryListings.length} unclassified/retry listing(s)`);
    allListings = mergeListingsByZpid(allListings, selectedRecovery);
  }

  const { data: unmappedCityRows, error: unmappedCityError } = await fetchAllPages(() => supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('status', opts.statuses)
    .eq('region', opts.region)
    .not('city', 'in', `(${knownCities})`)
    .eq('addressstate', targetState)
    .eq('glitch_suspected', false)
    .gte('lastseenat', `${opts.from}T00:00:00Z`)
    .lte('lastseenat', `${opts.to}T23:59:59Z`)
    .order('lastseenat', { ascending: false }));

  if (unmappedCityError) {
    console.error(`  Error querying unmapped ${targetState} city labels:`, unmappedCityError.message);
  } else if (unmappedCityRows && unmappedCityRows.length > 0) {
    allListings = allListings.concat(unmappedCityRows);
    const labels = [...new Set(unmappedCityRows.map(l => l.city || l.addresscity || 'Unknown'))].sort();
    console.log(`  Unmapped ${targetState} city labels: ${unmappedCityRows.length} listings (${labels.join(', ')})`);
  }

  // Filter out sub-minimum-price listings — write skip reason so they're not silently lost
  const belowPrice = allListings.filter(l => l.unformattedprice > 0 && l.unformattedprice < opts.minPrice);
  allListings = allListings.filter(l => l.unformattedprice === 0 || l.unformattedprice >= opts.minPrice);
  if (belowPrice.length > 0) {
    console.log(`  Removed ${belowPrice.length} listings below $${opts.minPrice.toLocaleString()} price threshold`);
    belowPrice.forEach(l => console.log(`    zpid ${l.zpid} — ${l.addressstreet}, ${l.city} — $${(l.unformattedprice || 0).toLocaleString()}`));
    const zpids = belowPrice.map(l => l.zpid);
    for (let i = 0; i < zpids.length; i += 200) {
      await supabase.from('listings')
        .update({ postcard_skip_reason: `below_min_price: $${opts.minPrice.toLocaleString()}` })
        .in('zpid', zpids.slice(i, i + 200));
    }
  }

  // Lots/land intentionally continue through photo/description classification.
  // Step 5 keeps them out of homeowner postcard output and records the correct
  // business-development outreach target.

  // Addressless/new-development listings continue through classification.
  // Step 5 still requires a numbered street address for physical postcards.

  // Deduplicate by zpid (keep latest)
  const seen = new Map();
  for (const listing of allListings) {
    if (!seen.has(listing.zpid)) {
      seen.set(listing.zpid, listing);
    }
  }
  allListings = Array.from(seen.values());

  let currentScrapeRows = null;
  if (!opts.skipScrape) {
    try {
      currentScrapeRows = readPipelineFile('step0-current.json');
    } catch (e) {
      throw new Error(`Current scrape marker missing; refusing to mail stale just_listed rows. ${e.message}`);
    }
  }

  const currentSeenFilter = filterJustListedSeenInCurrentScrape(allListings, currentScrapeRows, opts);
  allListings = currentSeenFilter.listings;
  if (currentSeenFilter.rejected.length > 0) {
    console.log(`  Removed ${currentSeenFilter.rejected.length} stale just_listed listings not seen in current full scrape`);
    const zpids = currentSeenFilter.rejected.map(r => r.zpid);
    for (let i = 0; i < zpids.length; i += 200) {
      await supabase.from('listings')
        .update({ postcard_skip_reason: 'just_listed_not_seen_in_current_scrape' })
        .in('zpid', zpids.slice(i, i + 200));
    }
  }

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

module.exports = { run, filterJustListedSeenInCurrentScrape, mergeListingsByZpid, selectQualityRecovery };
