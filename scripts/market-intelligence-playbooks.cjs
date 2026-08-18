const { addressKey } = require('./rental-market-lib.cjs');

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function decision(lane, record, score, reasons, action, eventType) {
  const street = record.street_address || record.addressstreet || '';
  const city = record.city || record.addresscity || '';
  const province = record.province || record.addressstate || 'ON';
  return {
    lane,
    entity_key: [addressKey(street), String(city).toUpperCase(), String(province).toUpperCase()].join('|'),
    source_listing_id: String(record.source_listing_id || record.zpid || record.id || ''),
    event_type: eventType,
    movement_score: clamp(score),
    recommended_action: action,
    score_reasons: reasons,
  };
}

function residentialPlaybook(record) {
  let score = 0;
  const reasons = [];
  const categories = Array.isArray(record.listing_categories) ? record.listing_categories : [];
  const ordinary = record.market_segment === 'owner_occupied' || categories.includes('ordinary_resale');
  if (ordinary) { score += 20; reasons.push('ordinary residential resale'); }
  if (record.is_furnished === true || ['furnished', 'partially_furnished'].includes(record.occupancy_state)) {
    score += 20; reasons.push('occupied/furnished evidence');
  }
  if (record.status === 'sold' || record.status === 'sold_archived') {
    score += 30; reasons.push('sold/off-market transition');
  } else if (record.status === 'just_listed') {
    score += 20; reasons.push('new listing event');
  }
  if (record._geocode_verified === true || record.addresszipcode) { score += 10; reasons.push('strong mailing address'); }
  if (record.zillow_date_posted || record.detail_days_on_zillow != null) { score += 10; reasons.push('listing timing available'); }
  if (categories.some(value => ['rental', 'student_housing', 'investor_flip', 'new_construction'].includes(value))) {
    score -= 40; reasons.push('non-homeowner-use evidence');
  }
  if (record.outreach_target && record.outreach_target !== 'homeowner') {
    score -= 40; reasons.push(`professional target: ${record.outreach_target}`);
  }
  const finalScore = clamp(score);
  const action = finalScore >= 70 && ordinary && record.outreach_target === 'homeowner'
    ? 'homeowner_direct_mail'
    : record.listing_representatives?.length ? 'realtor_relationship_intelligence' : 'market_intelligence_only';
  return decision('residential_resale', record, finalScore, reasons, action,
    record.status === 'sold' || record.status === 'sold_archived' ? 'residential_off_market' : 'residential_listed');
}

function rentalPlaybook(record, now = new Date()) {
  let score = 0;
  const reasons = [];
  const text = String(record.description || '').toLowerCase();
  const unitSpecific = record.entity_type === 'unit' || Boolean(record.unit_label || record.unit_number);
  if (unitSpecific) { score += 20; reasons.push('specific rental unit'); }
  if (/\b(?:available|occupancy|possession)\b/.test(text)) { score += 20; reasons.push('availability timing stated'); }
  if (/\b(?:occupied|tenant occupied|current tenant)\b/.test(text)) { score += 20; reasons.push('current occupancy evidence'); }
  if (/\b(?:furnished|partially furnished|partly furnished)\b/.test(text) || record.listing_categories?.includes?.('furnished')) {
    score += 20; reasons.push('furnished turnover evidence');
  }
  if (record.first_seen_at) {
    const ageDays = (now.getTime() - new Date(record.first_seen_at).getTime()) / 86400000;
    if (Number.isFinite(ageDays) && ageDays <= 7) { score += 10; reasons.push('new rental listing'); }
  }
  if (record.monthly_price) { score += 10; reasons.push('priced rental inventory'); }
  if (/\b(?:room|roommate|shared accommodation|sublet)\b/.test(text)) { score -= 30; reasons.push('room/shared rental'); }
  if ((record.observation_count || 1) >= 3) { score -= 15; reasons.push('recycled listing'); }
  if (record.entity_type === 'building' && !unitSpecific) { score -= 20; reasons.push('building-level inventory without unit'); }
  const finalScore = clamp(score);
  const action = finalScore >= 70 && unitSpecific ? 'rental_turnover_review'
    : record.contact_company ? 'property_manager_relationship_intelligence' : 'market_intelligence_only';
  return decision('rental', record, finalScore, reasons, action, 'rental_availability');
}

function commercialPlaybook(record) {
  const score = clamp(record.relocation_probability || 0);
  const hardGate = record.listing_scope === 'unit' && Boolean(record.current_occupant_name) &&
    Array.isArray(record.transition_evidence) && record.transition_evidence.length > 0;
  const action = score >= 70 && hardGate ? 'commercial_relocation_review'
    : record.brokerage || record.contact_company ? 'commercial_broker_relationship_intelligence' : 'market_intelligence_only';
  return decision('commercial', record, score, record.relocation_reasons || [], action,
    record.transaction_type === 'lease' ? 'commercial_space_available' : 'commercial_asset_market_event');
}

function evaluateOpportunity(lane, record) {
  if (lane === 'residential_resale') return residentialPlaybook(record);
  if (lane === 'rental') return rentalPlaybook(record);
  if (lane === 'commercial') return commercialPlaybook(record);
  throw new Error(`Unknown market playbook: ${lane}`);
}

module.exports = { evaluateOpportunity, residentialPlaybook, rentalPlaybook, commercialPlaybook };
