#!/usr/bin/env node

const assert = require('assert/strict');
const {
  buildLifecycleRows,
  normalizeAddressKey,
  normalizeResult,
  normalizeForUpsert,
  resolveRegionCity,
  buildZillowSearchUrl,
} = require('./postcard-step0-scrape.cjs');
const {
  applyOutputFilters,
  applyJustListedFreshnessGuard,
  normalizeAddressKey: normalizeOutputAddressKey,
  partitionSoldVerification,
  filterAddressDuplicates,
  normalizeZillowStatus,
} = require('./postcard-step5-output.cjs');
const {
  filterJustListedSeenInCurrentScrape,
  mergeListingsByZpid,
  selectQualityRecovery,
} = require('./postcard-step1-filter.cjs');
const {
  needsDetailFreshness,
} = require('./postcard-step2-photos.cjs');
const {
  classificationHealthFailure,
} = require('./postcard-step3-furniture.cjs');
const {
  verifyMatch,
  verifyLocalAddress,
} = require('./postcard-step4-geocode.cjs');

const region = { key: 'windsor', cities: ['Windsor'] };
const now = '2026-07-03T12:00:00.000Z';

function listing(overrides = {}) {
  return {
    zpid: overrides.zpid || '1',
    region: overrides.region || 'windsor',
    status: overrides.status || 'active',
    addressstreet: overrides.addressstreet || '123 Main St',
    addresscity: overrides.addresscity || 'Windsor',
    city: overrides.city || 'Windsor',
    addressstate: overrides.addressstate || 'ON',
    addresszipcode: overrides.addresszipcode || 'N9A 1A1',
    lastseenat: overrides.lastseenat || now,
    missing_scrape_count: overrides.missing_scrape_count || 0,
    postcard_send_count: overrides.postcard_send_count || 0,
    carouselphotos: overrides.carouselphotos,
    is_furnished: overrides.is_furnished,
    furniture_scan_date: overrides.furniture_scan_date,
    market_segment: overrides.market_segment || 'owner_occupied',
    listing_categories: overrides.listing_categories || ['ordinary_resale'],
    outreach_target: overrides.outreach_target || 'homeowner',
    property_classified_at: overrides.property_classified_at || now,
    _geocode_verified: overrides._geocode_verified ?? true,
    just_listed_postcard_sent_at: overrides.just_listed_postcard_sent_at,
    sold_postcard_sent_at: overrides.sold_postcard_sent_at,
    last_postcard_sent_at: overrides.last_postcard_sent_at,
    ...overrides,
  };
}

function testSeedModeStoresUnseenAsActive() {
  const scraped = [listing({ zpid: '100' })];
  const { nextRows, summary } = buildLifecycleRows(scraped, [], region, now, { seedMode: true });
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'active');
  assert.equal(summary.seededCount, 1);
  assert.equal(summary.justListedCount, 0);
}

function testNewZpidAtKnownAddressIsNotJustListed() {
  const existing = [listing({ zpid: '100', status: 'active' })];
  const scraped = [listing({ zpid: '200' })];
  const { nextRows, summary } = buildLifecycleRows(scraped, existing, region, now);
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].zpid, '200');
  assert.equal(nextRows[0].status, 'active');
  assert.equal(nextRows[0].postcard_skip_reason, 'known_address_relist: 100');
  assert.equal(summary.justListedCount, 0);
  assert.equal(summary.activeCount, 1);
}

function testUnmailedJustListedSurvivesNextScrape() {
  const existing = [listing({ zpid: '100', status: 'just_listed', just_listed_postcard_sent_at: null })];
  const scraped = [listing({ zpid: '100' })];
  const { nextRows } = buildLifecycleRows(scraped, existing, region, now);
  assert.equal(nextRows[0].status, 'just_listed');
}

function testMailedJustListedBecomesActiveOnNextScrape() {
  const existing = [listing({ zpid: '100', status: 'just_listed', just_listed_postcard_sent_at: now })];
  const scraped = [listing({ zpid: '100' })];
  const { nextRows } = buildLifecycleRows(scraped, existing, region, now);
  assert.equal(nextRows[0].status, 'active');
}

function testClassifierHealthGateStopsCollapsedRun() {
  assert.match(classificationHealthFailure(144, 0, 144), /144\/144/);
  assert.equal(classificationHealthFailure(10, 9, 1), null);
  assert.equal(classificationHealthFailure(4, 0, 4), null);
}

function testFirstDisappearanceBecomesSold() {
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 0, postcard_send_count: null })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now);
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'sold');
  assert.equal(nextRows[0].missing_scrape_count, 1);
  assert.equal(nextRows[0].postcard_send_count, 0);
  assert.equal(summary.soldCount, 1);
}

function testDegradedScrapeStillMarksSold() {
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 1 })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now, { degraded: true });
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'sold');
  assert.equal(summary.soldCount, 1);
  assert.equal(summary.pendingMissCount, 0);
}

function testSoldArchivedReappearanceRoutesToVerifiedJustListed() {
  const existing = [listing({
    zpid: '100',
    status: 'sold_archived',
    just_listed_postcard_sent_at: '2026-06-19T16:34:52.307Z',
    sold_postcard_sent_at: '2026-07-05T15:17:04.150Z',
    last_postcard_sent_at: '2026-07-05T15:17:04.150Z',
    postcard_send_count: 2,
    is_furnished: true,
  })];
  const scraped = [listing({ zpid: '100', status: 'active', unformattedprice: 499900 })];
  const { nextRows, summary } = buildLifecycleRows(scraped, existing, region, now);
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'just_listed');
  assert.equal(nextRows[0].glitch_suspected, false);
  assert.equal(nextRows[0].postcard_skip_reason, 'reappeared_after_sold_archive');
  assert.equal(nextRows[0].postcard_send_count, 2);
  assert.equal(nextRows[0].sold_postcard_sent_at, '2026-07-05T15:17:04.150Z');
  assert.equal(summary.glitchCount, 1);
}

function testAddressKeyFallsBackToCityWhenPostalMissing() {
  const a = listing({ addresszipcode: '', city: 'Windsor' });
  const b = listing({ addressstreet: '123 MAIN ST.', addresszipcode: '', city: 'windsor' });
  assert.equal(normalizeAddressKey(a), normalizeAddressKey(b));
}

function testAddressKeyCanonicalizesStreetSuffixFormatting() {
  const a = listing({ addressstreet: '123 Main St.', addresszipcode: 'N9A 1A1' });
  const b = listing({ addressstreet: '123 MAIN STREET', addresszipcode: 'N9A1A1' });
  assert.equal(normalizeOutputAddressKey(a), normalizeOutputAddressKey(b));
}

function testUnscannedJustListedBlockedByDefault() {
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: null,
    furniture_scan_date: null,
    carouselphotos: [{ url: 'a' }, { url: 'b' }],
  })];
  const { finalListings, rejected } = applyOutputFilters(rows, { includeUnscanned: false });
  assert.equal(finalListings.length, 0);
  assert.equal(rejected[0].reason, 'unscanned_furniture');
}

function testIncludeUnscannedIsExplicitOverride() {
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: null,
    furniture_scan_date: null,
    carouselphotos: [{ url: 'a' }, { url: 'b' }],
  })];
  const { finalListings, rejected } = applyOutputFilters(rows, { includeUnscanned: true });
  assert.equal(finalListings.length, 1);
  assert.equal(rejected.length, 0);
}

function testActiveRecoveryNeverEntersPostcardOutput() {
  const rows = [listing({
    zpid: '100',
    status: 'active',
    is_furnished: true,
    property_classified_at: now,
  })];
  const { finalListings, rejected } = applyOutputFilters(rows, {});
  assert.equal(finalListings.length, 0);
  assert.equal(rejected[0].reason, 'active_quality_recovery_only');
}

function testQualityRecoveryMergeDeduplicatesSelectedRows() {
  const selected = listing({ zpid: '100', status: 'just_listed' });
  const recoveryDuplicate = listing({ zpid: '100', status: 'active' });
  const recoveryOnly = listing({ zpid: '200', status: 'active' });
  const merged = mergeListingsByZpid([selected], [recoveryDuplicate, recoveryOnly]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(row => row.zpid === '100').status, 'just_listed');
}

function testQualityRecoveryIsCappedNewestFirst() {
  const rows = [
    listing({ zpid: '100', lastseenat: '2026-08-01T00:00:00Z' }),
    listing({ zpid: '200', lastseenat: '2026-08-03T00:00:00Z' }),
    listing({ zpid: '300', lastseenat: '2026-08-02T00:00:00Z' }),
  ];
  assert.deepEqual(selectQualityRecovery(rows, 2).map(row => row.zpid), ['200', '300']);
}

function testLegacyClassificationNullsAreSafeForUpsert() {
  const normalized = normalizeForUpsert(listing({
    listing_categories: null,
    property_signals: null,
    classification_reasons: null,
  }));
  assert.deepEqual(normalized.listing_categories, []);
  assert.deepEqual(normalized.property_signals, []);
  assert.deepEqual(normalized.classification_reasons, []);
}

function testRentalNeverEntersHomeownerPostcardOutput() {
  const rows = [listing({
    zpid: '300',
    status: 'just_listed',
    is_furnished: true,
    market_segment: 'rental',
    listing_categories: ['rental'],
    outreach_target: 'landlord_property_manager',
  })];
  const { finalListings, rejected } = applyOutputFilters(rows, {});
  assert.equal(finalListings.length, 0);
  assert.match(rejected[0].reason, /^non_homeowner_/);
}

function testUnknownClassificationIsHeld() {
  const rows = [listing({
    zpid: '301',
    status: 'just_listed',
    is_furnished: true,
    market_segment: 'unknown',
    listing_categories: [],
    outreach_target: 'unknown',
  })];
  const { finalListings, rejected } = applyOutputFilters(rows, {});
  assert.equal(finalListings.length, 0);
  assert.equal(rejected[0].reason, 'non_homeowner_target: unknown');
}

function googleResult(streetNumber, route, extraComponents = []) {
  return {
    address_components: [
      { long_name: streetNumber, short_name: streetNumber, types: ['street_number'] },
      { long_name: route, short_name: route, types: ['route'] },
      ...extraComponents,
    ],
    geometry: { location_type: 'ROOFTOP' },
  };
}

function testGeocodeStreetNumberIsExact() {
  const result = verifyMatch(listing({ addressstreet: '12 Main Street' }), googleResult('123', 'Main Street'));
  assert.equal(result.verified, false);
  assert.match(result.reason, /Street number/);
}

function testGeocodeStreetTypeMustMatch() {
  const result = verifyMatch(listing({ addressstreet: '100 Oak Street' }), googleResult('100', 'Oak Avenue'));
  assert.equal(result.verified, false);
  assert.match(result.reason, /Street type/);
}

function testGeocodeSubstringStreetDoesNotMatch() {
  const result = verifyMatch(listing({ addressstreet: '100 King Street' }), googleResult('100', 'Kingston Street'));
  assert.equal(result.verified, false);
  assert.match(result.reason, /Street name/);
}

function testGeocodeMissingUnitIsHeld() {
  const result = verifyMatch(listing({ addressstreet: '500 King Street' }), googleResult('500', 'King Street', [
    { long_name: '12', short_name: '12', types: ['subpremise'] },
  ]));
  assert.equal(result.verified, false);
  assert.match(result.reason, /no unit/);
}

function testNullGeocodeNeverEntersOutput() {
  const { finalListings, rejected } = applyOutputFilters([
    listing({ status: 'just_listed', is_furnished: true, _geocode_verified: null }),
  ], {});
  assert.equal(finalListings.length, 0);
  assert.match(rejected[0].reason, /^geocode_unavailable_hold/);
}

function testCleanCanadianAddressPassesWithoutGoogle() {
  const result = verifyLocalAddress(listing({
    addressstreet: '3567 Howard Avenue',
    addresszipcode: 'N9E 3N6',
    addressstate: 'ON',
    city: 'Windsor',
  }));
  assert.equal(result.verified, true);
  assert.equal(result.method, 'local_canonical_v1');
}

function testMalformedLocalAddressIsHeld() {
  const result = verifyLocalAddress(listing({ addressstreet: 'Howard Avenue', addresszipcode: '' }));
  assert.equal(result.verified, null);
  assert.match(result.reason, /missing street number/);
}

function testSoldVerificationUnavailableIsHeld() {
  const sold = listing({ zpid: '400', status: 'sold', detailurl: 'https://example.test/400' });
  const result = partitionSoldVerification([sold], new Map());
  assert.equal(result.kept.length, 0);
  assert.equal(result.held.length, 1);
}

function testSoldVerificationRequiresNonActiveStatus() {
  const sold = listing({ zpid: '401', status: 'sold', detailurl: 'https://example.test/401' });
  const active = partitionSoldVerification([sold], new Map([['401', 'FOR_SALE']]));
  assert.equal(active.pulled.length, 1);
  const confirmed = partitionSoldVerification([sold], new Map([['401', 'SOLD']]));
  assert.equal(confirmed.kept.length, 1);
}

function testSoldVerificationAcceptsOffMarketAfterTwoScrapeDisappearance() {
  const sold = listing({ zpid: '402', status: 'sold', detailurl: 'https://example.test/402' });
  const result = partitionSoldVerification([sold], new Map([['402', 'OFF_MARKET']]));
  assert.equal(result.kept.length, 1);
  assert.equal(result.held.length, 0);
}

function testSoldVerificationHoldsUnknownStatus() {
  const sold = listing({ zpid: '403', status: 'sold', detailurl: 'https://example.test/403' });
  const result = partitionSoldVerification([sold], new Map([['403', 'UNKNOWN']]));
  assert.equal(result.kept.length, 0);
  assert.equal(result.held.length, 1);
  assert.equal(result.held[0].reason, 'sold_verification_unconfirmed_status: UNKNOWN');
}

function testCurrentApifyDetailStatusesNormalize() {
  assert.equal(normalizeZillowStatus('offMarket'), 'OFF_MARKET');
  assert.equal(normalizeZillowStatus('recentlySold'), 'RECENTLY_SOLD');
  assert.equal(normalizeZillowStatus('forSale'), 'FOR_SALE');
}

async function testSameBatchAddressDuplicateIsHeld() {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        or() { return this; },
        order() { return this; },
        range() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  };
  const candidates = [
    listing({ zpid: '501', status: 'just_listed', addressstreet: '123 Main St.' }),
    listing({ zpid: '502', status: 'just_listed', addressstreet: '123 Main Street' }),
  ];
  const result = await filterAddressDuplicates(supabase, 'windsor', candidates);
  assert.equal(result.kept.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'address_already_sent_just_listed (relist)');
}

async function testAddressHistoryRetriesStillRejectPriorMail() {
  let calls = 0;
  const supabase = { from() { return {
    select() { return this; }, eq() { return this; }, or() { return this; }, order() { return this; },
    range(from, to) {
      assert.equal(to - from + 1, 250);
      calls++;
      return Promise.resolve(calls === 1
        ? { error: { message: 'statement timeout' }, data: null }
        : { error: null, data: [{ zpid: 'old', addressstreet: '123 Main St', addresszipcode: 'N8X 1A1', sold_postcard_sent_at: now }] });
    },
  }; } };
  const result = await filterAddressDuplicates(supabase, 'windsor', [listing({ zpid: 'new', status: 'sold', addressstreet: '123 Main St', addresszipcode: 'N8X 1A1' })]);
  assert.equal(calls, 2);
  assert.equal(result.kept.length, 0);
  assert.equal(result.rejected[0].reason, 'address_already_sent_sold (relist)');
}

async function testAddressHistoryRepeatedFailureHoldsBatch() {
  let calls = 0;
  const supabase = { from() { return {
    select() { return this; }, eq() { return this; }, or() { return this; }, order() { return this; },
    range() { calls++; return Promise.resolve({ data: null, error: { message: 'statement timeout' } }); },
  }; } };
  const result = await filterAddressDuplicates(supabase, 'windsor', [listing({ zpid: 'new', status: 'sold' })]);
  assert.equal(calls, 3);
  assert.equal(result.kept.length, 0);
  assert.equal(result.rejected[0].reason, 'address_duplicate_guard_unavailable_hold');
}

function testDetailFreshnessBlocksStaleJustListed() {
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: true,
    detail_days_on_zillow: 31,
  })];
  const filtered = applyOutputFilters(rows, { includeUnscanned: false });
  const { kept, rejected, audit } = applyJustListedFreshnessGuard(filtered.finalListings);
  assert.equal(kept.length, 0);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'stale_detail_days_on_zillow: 31');
  assert.equal(audit.length, 1);
  assert.equal(audit[0]._freshness_action, 'blocked_over_30_days');
}

function testCachedDetailFreshnessAgesForward() {
  const checkedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: true,
    detail_days_on_zillow: 29,
    zillow_detail_checked_at: checkedAt,
  })];
  const filtered = applyOutputFilters(rows, { includeUnscanned: false });
  const { kept, rejected, audit } = applyJustListedFreshnessGuard(filtered.finalListings);
  assert.equal(kept.length, 0);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'stale_detail_days_on_zillow: 31');
  assert.equal(audit.length, 1);
}

function testDetailFreshnessAuditsButKeepsFiveToThirtyDays() {
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: true,
    detail_days_on_zillow: 14,
  })];
  const filtered = applyOutputFilters(rows, { includeUnscanned: false });
  const { kept, rejected, audit } = applyJustListedFreshnessGuard(filtered.finalListings);
  assert.equal(kept.length, 1);
  assert.equal(rejected.length, 0);
  assert.equal(audit.length, 1);
  assert.equal(kept[0]._freshness_audit, true);
  assert.equal(audit[0]._freshness_action, 'sent_review_5_30_days');
}

function testDetailFreshnessDoesNotBlockSoldRows() {
  const rows = [listing({
    zpid: '100',
    status: 'sold',
    is_furnished: true,
    detail_days_on_zillow: 124,
  })];
  const filtered = applyOutputFilters(rows, { includeUnscanned: false });
  const { kept, rejected, audit } = applyJustListedFreshnessGuard(filtered.finalListings);
  assert.equal(kept.length, 1);
  assert.equal(rejected.length, 0);
  assert.equal(audit.length, 0);
}

function testNormalDetailFreshnessCacheLastsSevenDays() {
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(needsDetailFreshness(listing({
    status: 'just_listed',
    detail_days_on_zillow: 1,
    zillow_detail_checked_at: sixDaysAgo,
  })), false);
  assert.equal(needsDetailFreshness(listing({
    status: 'just_listed',
    detail_days_on_zillow: 1,
    zillow_detail_checked_at: eightDaysAgo,
  })), true);
}

function testReappearedAfterSoldNeedsDetailFreshness() {
  const rows = [listing({
    zpid: '100',
    status: 'just_listed',
    is_furnished: true,
    detail_days_on_zillow: null,
    postcard_skip_reason: 'reappeared_after_sold_archive',
  })];
  const filtered = applyOutputFilters(rows, { includeUnscanned: false });
  const { kept, rejected, audit } = applyJustListedFreshnessGuard(filtered.finalListings);
  assert.equal(kept.length, 0);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'reappeared_missing_detail_days_on_zillow');
  assert.equal(audit.length, 1);
  assert.equal(audit[0]._freshness_action, 'blocked_reappeared_missing_detail_days');
}

function testJustListedMustBeSeenInCurrentScrape() {
  const rows = [
    listing({ zpid: '100', status: 'just_listed' }),
    listing({ zpid: '200', status: 'just_listed' }),
    listing({ zpid: '300', status: 'sold' }),
  ];
  const { listings, rejected } = filterJustListedSeenInCurrentScrape(rows, [{ zpid: '100' }]);
  assert.deepEqual(listings.map(l => l.zpid), ['100', '300']);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].zpid, '200');
  assert.equal(rejected[0].reason, 'just_listed_not_seen_in_current_scrape');
}

function testSkipScrapeAllowsExistingJustListedRows() {
  const rows = [listing({ zpid: '100', status: 'just_listed' })];
  const { listings, rejected } = filterJustListedSeenInCurrentScrape(rows, [], { skipScrape: true });
  assert.equal(listings.length, 1);
  assert.equal(rejected.length, 0);
}

function testNormalizeResultKeepsConfiguredOntarioCity() {
  const row = normalizeResult({
    zpid: '100',
    streetAddress: '123 Main St',
    city: 'Windsor',
    state: 'ON',
    price: '$499,000',
  }, region, now);
  assert.equal(row.city, 'Windsor');
  assert.equal(row.addressstate, 'ON');
}

function testNormalizeResultSupportsCurrentApifyListingSchema() {
  const result = normalizeResult({
    zpid: 123456,
    listingAddress: {
      street: '442 Grandview Ave',
      city: 'Wilmot',
      state: 'ON',
      zipCode: 'N3A1L6',
    },
    listingPrice: { amount: 599900, currency: 'CAD', formatted: 'C$599,900' },
    propertyUrl: 'https://www.zillow.com/homedetails/123456_zpid/',
    mainImage: { url: 'https://photos.example/main.jpg' },
    listingPhotos: [{ url: 'https://photos.example/one.jpg' }],
    homeType: 'SINGLE_FAMILY',
  }, { key: 'wkg', state: 'ON', cities: ['Wilmot'], cityAliases: {} }, now);
  assert.equal(result.zpid, '123456');
  assert.equal(result.addressstreet, '442 Grandview Ave');
  assert.equal(result.addresszipcode, 'N3A1L6');
  assert.equal(result.unformattedprice, 599900);
  assert.equal(result.detailurl, 'https://www.zillow.com/homedetails/123456_zpid/');
  assert.equal(result.imgsrc, 'https://photos.example/main.jpg');
  assert.equal(result.carouselphotos.length, 1);
}

function testNormalizeResultDropsBorderSpillover() {
  const row = normalizeResult({
    zpid: '100',
    streetAddress: '36 Longfellow St',
    city: 'Detroit',
    state: 'MI',
    price: '$650,000',
  }, region, now);
  assert.equal(row, null);
}

function testNormalizeResultUsesConfiguredStateBoundary() {
  const michiganRegion = { key: 'detroit', state: 'MI', cities: ['Detroit'] };
  const row = normalizeResult({
    zpid: '100',
    streetAddress: '36 Longfellow St',
    city: 'Detroit',
    state: 'MI',
    price: '$650,000',
  }, michiganRegion, now);
  assert.equal(row.city, 'Detroit');
  assert.equal(row.addressstate, 'MI');
}

function testNormalizeResultKeepsUnmappedOntarioCity() {
  const row = normalizeResult({
    zpid: '100',
    streetAddress: '123 County Rd',
    city: 'Essex County',
    state: 'ON',
    price: '$650,000',
  }, region, now);
  assert.equal(row.city, 'Essex County');
  assert.equal(row.addressstate, 'ON');
}

function testResolveRegionCityUsesAliasWhenConfigured() {
  const aliasRegion = {
    key: 'windsor',
    cities: ['Harrow'],
    cityAliases: { 'East Harrow': 'Harrow' },
  };
  assert.equal(resolveRegionCity('East Harrow', aliasRegion), 'Harrow');
}

function testSearchUrlSortsByNewestWithoutDaysFilter() {
  const url = buildZillowSearchUrl({ west: -83, east: -82, south: 42, north: 43 });
  const rawState = decodeURIComponent(url.split('searchQueryState=')[1]);
  const state = JSON.parse(rawState);
  assert.equal(state.filterState.sort.value, 'days');
  assert.equal(state.filterState.doz, undefined);
}

const tests = [
  testSeedModeStoresUnseenAsActive,
  testNewZpidAtKnownAddressIsNotJustListed,
  testUnmailedJustListedSurvivesNextScrape,
  testMailedJustListedBecomesActiveOnNextScrape,
  testClassifierHealthGateStopsCollapsedRun,
  testFirstDisappearanceBecomesSold,
  testDegradedScrapeStillMarksSold,
  testSoldArchivedReappearanceRoutesToVerifiedJustListed,
  testAddressKeyFallsBackToCityWhenPostalMissing,
  testAddressKeyCanonicalizesStreetSuffixFormatting,
  testUnscannedJustListedBlockedByDefault,
  testIncludeUnscannedIsExplicitOverride,
  testActiveRecoveryNeverEntersPostcardOutput,
  testQualityRecoveryMergeDeduplicatesSelectedRows,
  testQualityRecoveryIsCappedNewestFirst,
  testLegacyClassificationNullsAreSafeForUpsert,
  testRentalNeverEntersHomeownerPostcardOutput,
  testUnknownClassificationIsHeld,
  testGeocodeStreetNumberIsExact,
  testGeocodeStreetTypeMustMatch,
  testGeocodeSubstringStreetDoesNotMatch,
  testGeocodeMissingUnitIsHeld,
  testNullGeocodeNeverEntersOutput,
  testCleanCanadianAddressPassesWithoutGoogle,
  testMalformedLocalAddressIsHeld,
  testSoldVerificationUnavailableIsHeld,
  testSoldVerificationRequiresNonActiveStatus,
  testSoldVerificationAcceptsOffMarketAfterTwoScrapeDisappearance,
  testSoldVerificationHoldsUnknownStatus,
  testCurrentApifyDetailStatusesNormalize,
  testSameBatchAddressDuplicateIsHeld,
  testAddressHistoryRetriesStillRejectPriorMail,
  testAddressHistoryRepeatedFailureHoldsBatch,
  testDetailFreshnessBlocksStaleJustListed,
  testCachedDetailFreshnessAgesForward,
  testDetailFreshnessAuditsButKeepsFiveToThirtyDays,
  testDetailFreshnessDoesNotBlockSoldRows,
  testNormalDetailFreshnessCacheLastsSevenDays,
  testReappearedAfterSoldNeedsDetailFreshness,
  testJustListedMustBeSeenInCurrentScrape,
  testSkipScrapeAllowsExistingJustListedRows,
  testNormalizeResultKeepsConfiguredOntarioCity,
  testNormalizeResultSupportsCurrentApifyListingSchema,
  testNormalizeResultDropsBorderSpillover,
  testNormalizeResultUsesConfiguredStateBoundary,
  testNormalizeResultKeepsUnmappedOntarioCity,
  testResolveRegionCityUsesAliasWhenConfigured,
  testSearchUrlSortsByNewestWithoutDaysFilter,
];

(async () => {
  for (const test of tests) {
    await test();
    console.log(`✓ ${test.name}`);
  }
  console.log(`\n${tests.length} postcard lifecycle tests passed`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
