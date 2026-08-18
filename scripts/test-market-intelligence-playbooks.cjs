#!/usr/bin/env node

const assert = require('node:assert/strict');
const { residentialPlaybook, rentalPlaybook, commercialPlaybook } = require('./market-intelligence-playbooks.cjs');

const residential = residentialPlaybook({
  zpid: 1, addressstreet: '123 Main Street', city: 'Windsor', addressstate: 'ON', addresszipcode: 'N9A 1A1',
  status: 'sold', market_segment: 'owner_occupied', listing_categories: ['ordinary_resale'],
  occupancy_state: 'furnished', is_furnished: true, outreach_target: 'homeowner', zillow_date_posted: '2026-08-01',
});
assert.equal(residential.recommended_action, 'homeowner_direct_mail');
assert.ok(residential.movement_score >= 70);

const rental = rentalPlaybook({
  source_listing_id: 'r1', street_address: '10 King Street Unit 2', city: 'Windsor', province: 'ON',
  entity_type: 'unit', unit_label: '2', monthly_price: 2400,
  description: 'Tenant occupied furnished unit available September 1.', first_seen_at: new Date().toISOString(),
});
assert.equal(rental.recommended_action, 'rental_turnover_review');
assert.ok(rental.movement_score >= 70);

const commercialSale = commercialPlaybook({
  source_listing_id: 'c1', street_address: '500 Ouellette Avenue', city: 'Windsor', province: 'ON',
  transaction_type: 'sale', listing_scope: 'whole_building', relocation_probability: 20,
});
assert.equal(commercialSale.recommended_action, 'market_intelligence_only');

const commercialLease = commercialPlaybook({
  source_listing_id: 'c2', street_address: '500 Ouellette Avenue', city: 'Windsor', province: 'ON',
  transaction_type: 'lease', listing_scope: 'unit', current_occupant_name: 'Example Co',
  transition_evidence: [{ type: 'lease_expiry' }], relocation_probability: 85,
  relocation_reasons: ['specific unit', 'lease expiry'],
});
assert.equal(commercialLease.recommended_action, 'commercial_relocation_review');

console.log('Market intelligence playbook tests passed.');
