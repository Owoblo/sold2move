#!/usr/bin/env node
const assert = require('node:assert/strict');
const {
  canonicalKey,
  classifyDescription,
  isInProvince,
  normalizeRentCafe,
  normalizeRentSeeker,
  normalizeZillow,
  sourceFamily,
} = require('./rental-market-lib.cjs');
const { canonicalize, matchesRequestedCity, mergeZillowDetail } = require('./rental-pipeline.cjs');

const zillow = normalizeZillow({
  zpid: 123,
  addressStreet: '2136 Wyandotte Street West',
  addressCity: 'Windsor',
  addressState: 'ON',
  addressZipcode: 'N9B1J9',
  unformattedPrice: 1800,
});
const rentCafe = normalizeRentCafe({
  propertyId: 456,
  address: { street: '2136 WYANDOTTE STREET West Unit# 21', city: 'Windsor', state: 'ON', zip: 'N9B1J9' },
  priceMin: 1800,
  description: 'Fully furnished apartment near the University of Windsor, ideal for students.',
  photos: ['https://example.com/1.jpg'],
  onlineLeasingUrl: 'https://example.com/apply',
  floorplans: [{ beds: '2 bd', rentValue: 1800 }],
});

assert.equal(canonicalKey(zillow), canonicalKey(rentCafe));
assert.equal(isInProvince(zillow), true);
assert.equal(isInProvince({ ...zillow, province: 'MI' }), false);
assert.equal(sourceFamily('zillow'), sourceFamily('trulia'));
assert.equal(sourceFamily('zumper'), sourceFamily('padmapper'));

const classification = classifyDescription(rentCafe.description);
assert.deepEqual(classification.categories, ['rental', 'student_housing', 'furnished']);
assert.equal(classification.signals.length, 2);
assert.equal(matchesRequestedCity(zillow, 'windsor'), true);
assert.equal(matchesRequestedCity({ ...zillow, city: 'London North (North R)' }, 'London'), true);
assert.equal(matchesRequestedCity({ ...zillow, city: 'Detroit' }, 'Windsor'), false);

const properties = canonicalize([zillow, rentCafe]);
assert.equal(properties.length, 1);
assert.deepEqual(properties[0].source_families.sort(), ['yardi_rentcafe', 'zillow_trulia']);
assert.deepEqual(properties[0].listing_categories, ['rental', 'student_housing', 'furnished']);
assert.equal(properties[0].entity_type, 'building');
assert.equal(properties[0].floorplans.length, 1);
assert.deepEqual(properties[0].online_leasing_urls, ['https://example.com/apply']);

const enriched = mergeZillowDetail(zillow, {
  zpid: 123,
  description: 'Available near campus',
  attributionInfo: { agentName: 'Leasing Agent', brokerName: 'Example Realty' },
});
assert.equal(enriched.description, 'Available near campus');
assert.equal(enriched.contact_name, 'Leasing Agent');
assert.equal(enriched.detail_enriched, true);

const rentSeeker = normalizeRentSeeker({
  id: 262,
  objectID: '262',
  name: '700 King Street',
  url: 'https://example.com/262',
  price_low: 142500,
  prices_low: { 1: 142500, 2: 190000 },
  prices_high: { 1: 150000, 2: 210000 },
  company_name: 'Medallion Corporation',
  company_phone: '2267859985',
  image_url: 'https://example.com/image.jpg',
  _geoloc: { lat: '42.98', lng: '-81.22' },
}, 'London');
assert.equal(rentSeeker.monthly_price, 1425);
assert.equal(rentSeeker.floorplans.length, 2);
assert.equal(rentSeeker.contact_company, 'Medallion Corporation');

const addressVariants = canonicalize([
  normalizeZillow({
    zpid: 1,
    addressStreet: '700 King St.',
    addressCity: 'London',
    addressState: 'ON',
    addressZipcode: 'N5W2X3',
    latLong: { latitude: 42.9886, longitude: -81.2278 },
  }),
  normalizeRentCafe({
    propertyId: 2,
    address: { street: '700 King Street Unit 3', city: 'London', state: 'ON', zip: 'N5W 2X3' },
    latitude: 42.98861,
    longitude: -81.22781,
  }),
]);
assert.equal(addressVariants.length, 1);
assert.equal(addressVariants[0].source_record_ids.length, 2);

console.log('Rental market normalization tests passed.');
