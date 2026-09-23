const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, MUNICIPALITIES } = require('./gta-market-census.cjs');
const { validateRows } = require('./gta-collection.cjs');
const listing = (city, state = 'ON', id = 123) => normalize({ zpid: id, address: { city, state } });

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
