const assert = require('assert');
const { cleanUrl, deterministicValidation, extractCitedUrls } = require('./listing-attribution-openai.cjs');

assert.strictEqual(cleanUrl('[https://example.com/a?utm_source=chatgpt.com](https://example.com/a?utm_source=chatgpt.com)'), 'https://example.com/a');
const verified = deterministicValidation({
  discovered_mls_number: '26017917',
  listing_representatives: [
    { name: 'Robert Schussler, REALTOR®', role: 'listing_agent', brokerage: 'Royal LePage', phone: null },
    { name: 'Robert Schussler', role: 'co_listing_agent', brokerage: null, phone: null },
  ],
  sources: [
    { url: 'https://www.realtor.ca/a?utm_source=chatgpt.com', publisher: 'REALTOR.ca', evidence: 'exact', address_match: true, mls_match: true },
    { url: 'https://www.zillow.com/b', publisher: 'Zillow', evidence: 'exact', address_match: true, mls_match: true },
  ],
  conflicts: [],
});
assert.strictEqual(verified.status, 'verified');
assert.strictEqual(verified.confidence, 100);
assert.deepStrictEqual(verified.listing_representatives.map(rep => rep.name), ['Robert Schussler']);
const weak = deterministicValidation({
  listing_representatives: [{ name: 'Someone', role: 'listing_agent', brokerage: null, phone: null }],
  sources: [{ url: 'https://example.com', publisher: 'Example', evidence: 'maybe', address_match: false, mls_match: false }],
  conflicts: [],
});
assert.strictEqual(weak.status, 'unresolved');
assert.strictEqual(weak.accepted, false);
assert.deepStrictEqual(extractCitedUrls({ output: [{ type: 'message', content: [{ annotations: [
  { type: 'url_citation', url: 'https://example.com/a?utm_source=chatgpt.com' },
  { type: 'url_citation', url_citation: { url: 'https://example.com/b' } },
] }] }] }), ['https://example.com/a', 'https://example.com/b']);
console.log('OpenAI listing attribution tests passed');
