#!/usr/bin/env node
const assert = require('node:assert/strict');
const {
  extractListingAttribution,
  cleanRepresentativeName,
} = require('./postcard-step2-photos.cjs');

assert.equal(cleanRepresentativeName('Goran Todorovic, Broker Of Record'), 'Goran Todorovic');
assert.equal(cleanRepresentativeName("Sharon O'hearn, Sales Person"), "Sharon O'hearn");

const primaryOnly = extractListingAttribution({
  attributionInfo: {
    agentName: "Sharon O'hearn, Sales Person",
    agentPhoneNumber: '519-555-0100',
    brokerName: 'Example Realty',
    mlsId: '26017866',
  },
});
assert.deepEqual(primaryOnly.listing_agent_names, ["Sharon O'hearn"]);
assert.equal(primaryOnly.listing_representatives[0].role, 'listing_agent');
assert.equal(primaryOnly.listing_mls_id, '26017866');

const multiple = extractListingAttribution({
  attributionInfo: { agentName: 'Primary Rep, Realtor®', mlsId: 123 },
  coListingAgents: [
    { name: 'Second Rep, Salesperson', phone: '519-555-0101' },
    { name: 'Third Rep' },
  ],
});
assert.deepEqual(multiple.listing_agent_names, ['Primary Rep', 'Second Rep', 'Third Rep']);
assert.deepEqual(
  multiple.listing_representatives.map(rep => rep.role),
  ['listing_agent', 'co_listing_agent', 'co_listing_agent']
);

const deduped = extractListingAttribution({
  attributionInfo: { agentName: 'Same Person' },
  listingAgent: { name: 'same person' },
});
assert.equal(deduped.listing_representatives.length, 1);

console.log('listing attribution tests passed');
