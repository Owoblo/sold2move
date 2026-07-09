#!/usr/bin/env node

const assert = require('assert/strict');
const {
  buildLifecycleRows,
  normalizeAddressKey,
  normalizeResult,
  resolveRegionCity,
  buildZillowSearchUrl,
} = require('./postcard-step0-scrape.cjs');
const {
  applyOutputFilters,
  applyJustListedFreshnessGuard,
} = require('./postcard-step5-output.cjs');
const {
  filterJustListedSeenInCurrentScrape,
} = require('./postcard-step1-filter.cjs');

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

function testMissingTwiceBecomesSold() {
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 1, postcard_send_count: null })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now);
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'sold');
  assert.equal(nextRows[0].missing_scrape_count, 2);
  assert.equal(nextRows[0].postcard_send_count, 0);
  assert.equal(summary.soldCount, 1);
}

function testDegradedScrapeDoesNotBurnMiss() {
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 1 })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now, { degraded: true });
  assert.equal(nextRows.length, 0);
  assert.equal(summary.soldCount, 0);
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
  testMissingTwiceBecomesSold,
  testDegradedScrapeDoesNotBurnMiss,
  testSoldArchivedReappearanceRoutesToVerifiedJustListed,
  testAddressKeyFallsBackToCityWhenPostalMissing,
  testUnscannedJustListedBlockedByDefault,
  testIncludeUnscannedIsExplicitOverride,
  testDetailFreshnessBlocksStaleJustListed,
  testDetailFreshnessAuditsButKeepsFiveToThirtyDays,
  testDetailFreshnessDoesNotBlockSoldRows,
  testReappearedAfterSoldNeedsDetailFreshness,
  testJustListedMustBeSeenInCurrentScrape,
  testSkipScrapeAllowsExistingJustListedRows,
  testNormalizeResultKeepsConfiguredOntarioCity,
  testNormalizeResultDropsBorderSpillover,
  testNormalizeResultUsesConfiguredStateBoundary,
  testNormalizeResultKeepsUnmappedOntarioCity,
  testResolveRegionCityUsesAliasWhenConfigured,
  testSearchUrlSortsByNewestWithoutDaysFilter,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}

console.log(`\n${tests.length} postcard lifecycle tests passed`);
