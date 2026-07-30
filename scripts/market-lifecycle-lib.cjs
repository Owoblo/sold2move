const crypto = require('node:crypto');

function recordKey(record) {
  return `${record.source}|${record.source_listing_id}`;
}

function scopeKey(source, city) {
  return `${source}|${String(city || '').toLowerCase()}`;
}

function classifyRemoval(lane, record) {
  if (lane === 'rental') return 'leased_or_withdrawn';
  const types = record.transaction_types || [record.transaction_type];
  if (types.includes('sale') && types.includes('lease')) return 'sold_leased_or_withdrawn';
  if (types.includes('sale')) return 'sold_or_withdrawn';
  if (types.includes('lease')) return 'leased_or_withdrawn';
  return 'off_market_unknown';
}

function diffInventory({ lane, current, previous, successfulScopes, missingThreshold = 2 }) {
  const now = new Map(current.map(row => [recordKey(row), row]));
  const before = new Map(previous.map(row => [recordKey(row), row]));
  const scopes = new Set(successfulScopes.map(scope => scopeKey(scope.source, scope.city)));
  const events = [];
  const missingUpdates = [];

  for (const [key, row] of now) {
    const old = before.get(key);
    events.push({
      event_id: crypto.createHash('sha256').update(`${lane}|${key}|${old ? 'seen' : 'new'}`).digest('hex'),
      event_type: old ? 'still_active' : 'just_listed',
      source: row.source,
      source_listing_id: row.source_listing_id,
      city: row.city,
      record: row,
    });
  }

  for (const [key, row] of before) {
    if (now.has(key) || !row.active) continue;
    if (!scopes.has(scopeKey(row.source, row.city))) continue;
    const missingRunCount = Number(row.missing_run_count || 0) + 1;
    const terminal = missingRunCount >= missingThreshold;
    missingUpdates.push({ ...row, missing_run_count: missingRunCount, terminal });
    events.push({
      event_id: crypto.createHash('sha256').update(`${lane}|${key}|missing|${missingRunCount}`).digest('hex'),
      event_type: terminal ? classifyRemoval(lane, row) : 'missing_confirmation',
      source: row.source,
      source_listing_id: row.source_listing_id,
      city: row.city,
      record: row,
    });
  }

  return {
    events,
    missingUpdates,
    summary: events.reduce((counts, event) => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
      return counts;
    }, {}),
  };
}

module.exports = { classifyRemoval, diffInventory, recordKey, scopeKey };
