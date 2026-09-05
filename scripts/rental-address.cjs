const { unitIdentity } = require('./rental-market-lib.cjs');
const floorLabel = text => ({main:'MAIN',upper:'UPPER',lower:'LOWER',basement:'BSMT',bsmt:'BSMT',ground:'GROUND'})[text.toLowerCase()];
function resolveRentalAddress(row) {
  const identity = unitIdentity(row.street_address, row.unit_label);
  let unit = identity.unit_label, evidence = unit ? 'Source address/unit field' : null;
  const description = String(row.description || '');
  // Match the advertised unit, not ordinary room locations such as "main floor kitchen".
  const mentions = [...description.matchAll(/\b(main|upper|lower|basement|bsmt|ground)[ -]*(?:(?:floor|level)[ -]*)?(?:unit|suite|apartment)\b/gi)];
  const first = mentions.filter(m=>m.index < 500 && !/\b(?:with|includes?|including|plus|and|separate)\s+(?:a\s+)?$/i.test(description.slice(Math.max(0,m.index-30),m.index)));
  let labels = [...new Set(first.map(m=>floorLabel(m[1])))];
  if (labels.length === 2 && labels.includes('LOWER') && labels.includes('BSMT')) labels = [floorLabel(first[0][1])];
  if (!labels.length && /\bmain[ -]floor (?:bungalow|home|house)\b/i.test(description.slice(0,300)) && /\bbasement\s+(?:is\s+)?(?:not included|rented separately)/i.test(description)) { labels = ['MAIN']; first.push(['main-floor home; basement rented separately']); }
  if (!unit && labels.length === 1) { unit = labels[0]; evidence = `Listing description: ${first[0][0]}`; }
  const unresolved = !unit && (labels.length > 1 || /\b(?:basement|lower (?:level|unit))\s+(?:is\s+)?(?:not included|excluded|rented separately|separately (?:rented|tenanted))\b/i.test(description));
  return { ...row, ...identity, unit_label: unit || null,
    mailing_street: unit ? `${identity.street_address} Unit ${unit}` : identity.street_address,
    single_home: unit || unresolved ? false : row.single_home,
    unit_address_unresolved: unresolved, address_evidence: evidence };
}
module.exports = { resolveRentalAddress };
