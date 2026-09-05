const { reusableClassification } = require('./rental-outreach-lib.cjs');
const key = row => `${row.source}|${row.source_listing_id}`;
function targets(rows, events) {
  const fresh = new Set(events.filter(e => ['just_listed','relisted'].includes(e.event_type)).map(key));
  return rows.filter(r => r.acquisition_fresh && (r.unit_label || r.single_home) && fresh.has(key(r)));
}
function reusableForObservation(row, cached) {
  // A reappearance invalidates evidence from before this observation, not work already completed during it.
  return reusableClassification(row, cached) && Date.parse(cached.classified_at) >= Date.parse(row.observed_at);
}
function roundRobin(rows) {
  const groups = new Map();
  for (const row of rows) { const region = row.acquisition_scope || 'unknown'; if (!groups.has(region)) groups.set(region, []); groups.get(region).push(row); }
  const ordered = [];
  for (let i = 0; ordered.length < rows.length; i++) for (const group of groups.values()) if (group[i]) ordered.push(group[i]);
  return ordered;
}
module.exports = { key, targets, reusableForObservation, roundRobin };
