const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, MUNICIPALITIES } = require('./gta-market-census.cjs');
const { validateRows, mergeObservations, prepareStorage } = require('./gta-collection.cjs');
const listing = (city, state = 'ON', id = 123) => normalize({ zpid: id, address: { city, state } });

test('current actor address, price, photo and URL fields are preserved', () => {
  const row = normalize({ zpid: '123', listingAddress: {
    street: '1 Test Street', city: 'Caledon', state: 'ON', zipCode: 'L7E2L6',
  }, listingPrice: { amount: 799000 }, propertyUrl: 'https://example.com/123_zpid/',
  photoCount: 12, mainImage: { url: 'https://example.com/image.jpg' }, bedrooms: 3, bathrooms: 2 });
  assert.equal(row.municipality, 'Caledon');
  assert.equal(row.street, '1 Test Street');
  assert.equal(row.postal_code, 'L7E2L6');
  assert.equal(row.price, 799000);
  assert.equal(row.photo_count, 12);
  assert.equal(row.beds, 3);
  assert.equal(row.detail_url, 'https://example.com/123_zpid/');
  assert.equal(row.image_url, 'https://example.com/image.jpg');
});

test('Toronto boroughs and GTA communities map to their municipalities', () => {
  for (const [city, owner] of [['York', 'Toronto'], ['Scarborough', 'Toronto'],
    ['Georgetown', 'Halton Hills'], ['Bowmanville', 'Clarington'], ['King City', 'King']]) {
    assert.equal(listing(city).municipality, owner);
  }
  assert.equal(MUNICIPALITIES.length, 26);
});
test('ambiguous Thornhill and unrecognized labels cannot enter inventory', () => {
  assert.equal(listing('Thornhill').municipality, '');
  assert.throws(() => validateRows([listing('Thornhill')]));
  assert.throws(() => validateRows([listing('Windsor')]));
});
test('empty, non-Ontario, missing-ID and duplicate inventories are rejected', () => {
  assert.throws(() => validateRows([]));
  assert.throws(() => validateRows([listing('Toronto', 'NY')]));
  assert.throws(() => validateRows([listing('Toronto', 'ON', '')]));
  assert.throws(() => validateRows([listing('Toronto'), listing('Toronto')]));
  assert.equal(validateRows([listing('Toronto'), listing('Milton', 'ON', 456)]).length, 2);
});

test('initial inventory is seeded; repeats preserve baseline and first-seen dates', () => {
  const first = mergeObservations(null, [listing('Toronto'), listing('Milton', 'ON', 456)], 'first', '2026-09-23T00:00:00Z');
  const second = mergeObservations(first, [listing('Toronto'), listing('Ajax', 'ON', 789)], 'second', '2026-09-30T00:00:00Z');
  assert.equal(first.baseline, true);
  assert.equal(second.baseline, false);
  assert.equal(second.baseline_run_id, 'first');
  assert.equal(second.inserted, 1);
  assert.equal(second.inventory.length, 3); // Missing Milton retained, never marked sold.
  assert.equal(second.inventory[0].first_seen_at, first.collected_at);
  assert.equal(second.inventory[0].last_seen_at, second.collected_at);
  assert.equal(second.inventory[0].baseline, true);
  assert.equal(second.inventory[1].last_seen_at, first.collected_at);
  assert.equal(second.inventory[2].baseline, false);
  assert.throws(() => mergeObservations(second, [listing('Toronto')], 'older', first.collected_at));
  assert.throws(() => mergeObservations({}, [listing('Toronto')], 'bad', first.collected_at));
});

test('public or unreadable storage cannot silently reset the baseline', async () => {
  await assert.rejects(prepareStorage({ storage: { getBucket: async () => ({ data: { public: true } }) } }), /private/);
  await assert.rejects(prepareStorage({ storage: {
    getBucket: async () => ({ data: { public: false } }),
    from: () => ({ list: async () => ({ error: { message: 'unavailable' } }) }),
  } }), /Cannot inspect/);
});
