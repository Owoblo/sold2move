#!/usr/bin/env node
const assert = require('node:assert/strict');
const {
  canonicalizeCommercial,
  normalizeRealtorCommercial,
  parseSpacelistPage,
} = require('./commercial-market-lib.cjs');

const html = `
<div id="cluster-map" data-data='{"features":[{"geometry":{"coordinates":[-81.2,42.9]},"properties":{"id":123}}]}'></div>
<div class="listing-result">
  <meta itemprop="url" value="https://www.spacelist.ca/listings/123/on/london/for-lease/industrial/unit_2-100_king_street">
  <meta itemprop="name" value="Unit 2 - 100 King Street, London, ON">
  <div class="about for-lease"><div>5,000 ft²</div><div class="heavy-font">Industrial</div></div>
  <div class="display-price">$15.50/sf/yr</div>
  <div class="truncated-text" title="Example Brokerage">Example Brokerage</div>
  <img itemprop="image" src="https://example.com/a.jpg">
</div>`;
const parsed = parseSpacelistPage(html, 'London').records[0];
assert.equal(parsed.source_listing_id, '123');
assert.equal(parsed.transaction_type, 'lease');
assert.equal(parsed.asset_type, 'industrial');
assert.equal(parsed.lease_rate, 15.5);
assert.equal(parsed.space_size_sqft_min, 5000);
assert.equal(parsed.latitude, 42.9);

const properties = canonicalizeCommercial([parsed, { ...parsed, source_listing_id: '124', transaction_type: 'sale' }]);
assert.equal(properties.length, 1);
assert.deepEqual(properties[0].transaction_types.sort(), ['lease', 'sale']);
console.log('Commercial market tests passed.');

const realtor = normalizeRealtorCommercial({
  record_id: '999',
  entity: { title: 'UNIT 2 - 100 KING STREET, London, Ontario N5W1A1', category: 'Industrial' },
  listing: { deal_type: 'sale' },
  pricing: { price: 2000000, price_text: '$2,000,000' },
  location: {
    address: 'UNIT 2 - 100 KING STREET, London, Ontario N5W1A1',
    postal_code: 'N5W1A1',
    coordinates: { latitude: 42.9, longitude: -81.2 },
  },
  relationships: { agent: { name: 'Agent', phones: [{ type: 'Telephone', number: '519-555-0000' }] } },
}, 'London');
assert.equal(realtor.street_address, '100 KING STREET');
assert.equal(realtor.city, 'London');
assert.equal(realtor.asset_type, 'industrial');
assert.equal(realtor.asking_price, 2000000);
