#!/usr/bin/env node
const assert = require('node:assert/strict');
const {
  canonicalizeCommercial,
  classifyCommercialRelocation,
  normalizeRealtorCommercial,
  parseSpacelistPage,
  parseSpacelistDetail,
  splitCommercialAddress,
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
assert.equal(parsed.unit_label, '2');
assert.equal(parsed.street_address, '100 King Street');

assert.equal(parseSpacelistDetail(`
  <meta property="og:description" content="Generic office space for lease in London on Spacelist.">
  <div itemprop="description">Currently occupied by Acme Dental. Available October 1 because the tenant is relocating.</div>
`).description, 'Currently occupied by Acme Dental. Available October 1 because the tenant is relocating.');

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
assert.equal(realtor.unit_label, '2');

assert.deepEqual(splitCommercialAddress('Unit 108 - 977 Wellington Road'), {
  unit_label: '108', street_address: '977 Wellington Road',
});
assert.deepEqual(splitCommercialAddress('305 - 378 Ouellette Avenue'), {
  unit_label: '305', street_address: '378 Ouellette Avenue',
});

const strong = classifyCommercialRelocation({
  title: 'Unit 108 - 977 Wellington Road, London, ON',
  description: 'Currently occupied by Acme Dental. Available October 1. Current tenant is relocating.',
  street_address: '977 Wellington Road', unit_label: '108',
  transaction_type: 'lease', asset_type: 'office', space_size_sqft_min: 6416,
}, new Date('2026-08-15T00:00:00Z'));
assert.equal(strong.listing_scope, 'unit');
assert.equal(strong.current_occupant_name, 'Acme Dental');
assert.equal(strong.availability_date, '2026-10-01');
assert.equal(strong.direct_relocation_candidate, true);
assert.ok(strong.relocation_probability >= 70);

const genericUnit = classifyCommercialRelocation({
  title: 'Unit 108 - 977 Wellington Road', description: 'Available immediately.',
  street_address: '977 Wellington Road', unit_label: '108',
  transaction_type: 'lease', asset_type: 'office', space_size_sqft_min: 6416,
});
assert.equal(genericUnit.direct_relocation_candidate, false);
assert.equal(genericUnit.outreach_status, 'market_intelligence_only');
assert.ok(genericUnit.relocation_probability <= 55);

const shoppingCentreSale = classifyCommercialRelocation({
  title: 'Regional shopping centre for sale',
  description: '100,000 square foot fully occupied investment property.',
  street_address: '100 Main Street', transaction_type: 'sale',
  asset_type: 'retail', space_size_sqft_min: 100000,
});
assert.equal(shoppingCentreSale.direct_relocation_candidate, false);
assert.ok(shoppingCentreSale.relocation_probability <= 20);

const neighbouringUnit = classifyCommercialRelocation({
  title: 'Unit 108 - 977 Wellington Road',
  description: 'Unit 108 is available November 1.',
  street_address: '977 Wellington Road', unit_label: '108',
  transaction_type: 'lease', asset_type: 'retail', space_size_sqft_min: 6416,
});
assert.equal(neighbouringUnit.direct_relocation_candidate, false);
assert.equal(neighbouringUnit.current_occupant_name, null);

console.log('Commercial relocation engine tests passed.');
