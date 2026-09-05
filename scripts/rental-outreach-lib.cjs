const crypto = require('crypto');
const { addressKey } = require('./rental-market-lib.cjs');
const CLASSIFIER_VERSION = 'openai-rental-occupancy-v2';
function classificationFingerprint(row) {
  return crypto.createHash('sha256').update(JSON.stringify([row.description || '', row.photo_urls || [], row.unit_label || '', row.property_type || ''])).digest('hex');
}
function reusableClassification(row, cached, now = Date.now()) {
  const age = now - Date.parse(cached?.classified_at);
  return cached?.classification_method === CLASSIFIER_VERSION && cached.classification_fingerprint === classificationFingerprint(row)
    && Number.isFinite(age) && age >= 0 && age <= 30 * 86400000;
}
function mailingKey(row) {
  return [addressKey(row.street_address), String(row.unit_label || '').toUpperCase(), String(row.city || '').toUpperCase(), row.province].join('|');
}
function evaluateRental(row, eventType, now = Date.now()) {
  const reasons = [];
  const text = String(row.description || '').toLowerCase();
  const specific = Boolean(row.unit_label || row.single_home);
  const occupied = row.current_occupancy === 'occupied' && row.classification_confidence >= 0.8
    && row.classification_method === CLASSIFIER_VERSION && !row.classification_stale;
  const shared = /\b(?:roommate|shared accommodation|shared kitchen|room for rent|rent a room|per[- ]room|short[- ]term|vacation rental|airbnb)\b/.test(text);
  const fresh = row.acquisition_fresh === true && Number.isFinite(Date.parse(row.observed_at))
    && now - Date.parse(row.observed_at) >= 0 && now - Date.parse(row.observed_at) <= 8 * 86400000;
  const address = Boolean(row.street_address && /^\d+[A-Z]?\s/i.test(row.street_address) && row.city && row.province === 'ON'
    && /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\s?\d[ABCEGHJ-NPRSTVWXYZ]\d$/i.test(row.postal_code || ''));
  if (!specific) reasons.push('Specific unit or confirmed single-home address required');
  if (!occupied) reasons.push('Current occupant evidence with at least 80% confidence required');
  if (!['just_listed', 'relisted'].includes(eventType)) reasons.push('Not a new rental listing or reappearance');
  if (!fresh) reasons.push('Fresh acquisition required');
  if (!address) reasons.push('Complete Ontario mailing address required');
  if (shared) reasons.push('Shared-room or short-term inventory held for review');
  const score = (specific ? 20 : 0) + (occupied ? 40 : 0) + (fresh ? 10 : 0)
    + (['just_listed', 'relisted'].includes(eventType) ? 20 : 0) + (address ? 10 : 0);
  return { ...row, event_type: eventType, movement_score: score,
    recommended_action: reasons.length ? 'rental_review' : 'current_occupant_postcard',
    postcard_eligible: reasons.length === 0, hold_reasons: reasons,
    recipient_name: 'The Residents', mailing_key: mailingKey(row),
    mailing_street: row.unit_label ? `${row.street_address} Unit ${row.unit_label}` : row.street_address };
}
function buildRentalQueue(records, events, history = [], now = Date.now()) {
  const eventMap = new Map(events.map(e => [`${e.source}|${e.source_listing_id}`, e.event_type]));
  const mailed = new Set(history.map(r => r.mailing_key));
  const seen = new Set();
  return records.map(row => {
    const candidate = evaluateRental(row, eventMap.get(`${row.source}|${row.source_listing_id}`) || 'still_active', now);
    if (candidate.postcard_eligible && (mailed.has(candidate.mailing_key) || seen.has(candidate.mailing_key))) {
      candidate.postcard_eligible = false;
      candidate.recommended_action = 'rental_review';
      candidate.hold_reasons.push('Address/unit already in a rental batch');
    }
    if (candidate.postcard_eligible) seen.add(candidate.mailing_key);
    return candidate;
  });
}
module.exports = { CLASSIFIER_VERSION, classificationFingerprint, reusableClassification, evaluateRental, buildRentalQueue, mailingKey };
