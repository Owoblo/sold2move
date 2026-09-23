// Exact IDs first; normalized street + municipality recognizes changed IDs.
// These are observation changes, never automatic sold/just-listed claims.
function addressKey(row) {
  const street = String(row.street || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const city = String(row.municipality || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return street && city ? `${street}|${city}` : null;
}
function compareInventories(previous, current) {
  const previousIds = new Set(previous.map(r => String(r.zpid)));
  const currentIds = new Set(current.map(r => String(r.zpid)));
  const previousAddresses = new Set(previous.map(addressKey).filter(Boolean));
  const currentAddresses = new Set(current.map(addressKey).filter(Boolean));
  return {
    same_listing_id: previous.filter(r => currentIds.has(String(r.zpid))).length,
    changed_id_same_address: previous.filter(r => !currentIds.has(String(r.zpid)) && currentAddresses.has(addressKey(r))),
    new_candidates: current.filter(r => !previousIds.has(String(r.zpid)) && !previousAddresses.has(addressKey(r))),
    sold_or_delisted_candidates: previous.filter(r => !currentIds.has(String(r.zpid)) && !currentAddresses.has(addressKey(r))),
  };
}
module.exports = { compareInventories };
