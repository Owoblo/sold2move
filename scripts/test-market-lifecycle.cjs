const assert = require('node:assert/strict');
const { diffInventory } = require('./market-lifecycle-lib.cjs');

const oldSale = { source: 'realtor', source_listing_id: '1', city: 'Windsor', active: true, transaction_types: ['sale'] };
const oldRent = { source: 'zillow', source_listing_id: '2', city: 'London', active: true, missing_run_count: 1 };
const fresh = { source: 'zillow', source_listing_id: '3', city: 'London' };

const commercial = diffInventory({
  lane: 'commercial', current: [], previous: [oldSale],
  successfulScopes: [{ source: 'realtor', city: 'Windsor' }],
});
assert.equal(commercial.events[0].event_type, 'missing_confirmation');

const rental = diffInventory({
  lane: 'rental', current: [fresh], previous: [oldRent],
  successfulScopes: [{ source: 'zillow', city: 'London' }],
});
assert.equal(rental.summary.just_listed, 1);
assert.equal(rental.summary.leased_or_withdrawn, 1);

const failedScope = diffInventory({
  lane: 'rental', current: [], previous: [oldRent], successfulScopes: [],
});
assert.equal(failedScope.events.length, 0);

const scopedOld = { ...oldRent, acquisition_scope: 'wkg' };
const scoped = diffInventory({
  lane: 'rental', current: [], previous: [scopedOld],
  successfulScopes: [{ source: 'zillow', city: 'wkg' }],
});
assert.equal(scoped.events[0].event_type, 'leased_or_withdrawn');
console.log('Market lifecycle tests passed.');
