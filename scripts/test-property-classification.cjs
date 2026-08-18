#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  normalizeClassification,
  parseClassificationAnswer,
  getInteriorPhotoUrls,
} = require('./postcard-step3-furniture.cjs');

{
  const result = normalizeClassification({
    market_segment: 'rental',
    listing_categories: ['rental', 'student_housing'],
    occupancy_state: 'furnished',
    outreach_target: 'leasing_agent',
    property_signals: ['For Lease', 'for lease', ' furnished '],
    confidence: 1.7,
    reasons: ['Explicitly offered for lease'],
  });
  assert.equal(result.market_segment, 'rental');
  assert.deepEqual(result.listing_categories, ['rental', 'student_housing']);
  assert.equal(result.occupancy_state, 'furnished');
  assert.equal(result.outreach_target, 'leasing_agent');
  assert.deepEqual(result.property_signals, ['for lease', 'furnished']);
  assert.equal(result.confidence, 1);
}

{
  const result = normalizeClassification({
    market_segment: 'owner_occupied',
    occupancy_state: 'empty',
    outreach_target: 'homeowner',
    confidence: 0.1,
  }, { contenttype: 'LOT' });
  assert.equal(result.market_segment, 'land_lot');
  assert.deepEqual(result.listing_categories, ['land_lot']);
  assert.equal(result.occupancy_state, 'not_applicable');
  assert.equal(result.outreach_target, 'realtor');
  assert.equal(result.confidence, 0.99);
}

{
  const result = parseClassificationAnswer('```json\n{"market_segment":"student_housing","occupancy_state":"furnished","outreach_target":"landlord_property_manager","property_signals":["per-room lease","near campus"],"confidence":0.91,"reasons":["Description explicitly says student rental"]}\n```');
  assert.equal(result.market_segment, 'student_housing');
  assert.equal(result.outreach_target, 'landlord_property_manager');
  assert.equal(result.confidence, 0.91);
}

{
  const result = normalizeClassification({
    market_segment: 'definitely_a_flip',
    occupancy_state: 'vacant',
    outreach_target: 'owner',
    confidence: 'not-a-number',
  });
  assert.equal(result.market_segment, 'unknown');
  assert.equal(result.occupancy_state, 'unknown');
  assert.equal(result.outreach_target, 'unknown');
  assert.equal(result.confidence, 0.5);
}

{
  const photos = Array.from({ length: 12 }, (_, i) => ({ url: `https://example.com/${i}.jpg` }));
  assert.deepEqual(
    getInteriorPhotoUrls({ carouselphotos: photos }),
    photos.slice(4, 9).map(p => p.url)
  );
}

console.log('Property classification tests passed.');
