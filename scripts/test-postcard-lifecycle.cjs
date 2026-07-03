#!/usr/bin/env node

const assert = require('assert/strict');
const {
  buildLifecycleRows,
  normalizeAddressKey,
} = require('./postcard-step0-scrape.cjs');
const {
  applyOutputFilters,
} = require('./postcard-step5-output.cjs');

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
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 1 })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now);
  assert.equal(nextRows.length, 1);
  assert.equal(nextRows[0].status, 'sold');
  assert.equal(nextRows[0].missing_scrape_count, 2);
  assert.equal(summary.soldCount, 1);
}

function testDegradedScrapeDoesNotBurnMiss() {
  const existing = [listing({ zpid: '100', status: 'active', missing_scrape_count: 1 })];
  const { nextRows, summary } = buildLifecycleRows([], existing, region, now, { degraded: true });
  assert.equal(nextRows.length, 0);
  assert.equal(summary.soldCount, 0);
  assert.equal(summary.pendingMissCount, 0);
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

const tests = [
  testSeedModeStoresUnseenAsActive,
  testNewZpidAtKnownAddressIsNotJustListed,
  testMissingTwiceBecomesSold,
  testDegradedScrapeDoesNotBurnMiss,
  testAddressKeyFallsBackToCityWhenPostalMissing,
  testUnscannedJustListedBlockedByDefault,
  testIncludeUnscannedIsExplicitOverride,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}

console.log(`\n${tests.length} postcard lifecycle tests passed`);
