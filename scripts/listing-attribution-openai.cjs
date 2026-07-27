const OpenAI = require('openai');

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['input_id_type', 'normalized_address', 'discovered_mls_number', 'listing_representatives', 'sources', 'conflicts'],
  properties: {
    input_id_type: { type: 'string', enum: ['zillow_id', 'mls_number', 'other', 'unknown'] },
    normalized_address: { type: 'string' },
    discovered_mls_number: { type: ['string', 'null'] },
    listing_representatives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'role', 'brokerage', 'phone'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['listing_agent', 'co_listing_agent'] },
          brokerage: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] },
        },
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'publisher', 'evidence', 'address_match', 'mls_match'],
        properties: {
          url: { type: 'string' },
          publisher: { type: 'string' },
          evidence: { type: 'string' },
          address_match: { type: 'boolean' },
          mls_match: { type: 'boolean' },
        },
      },
    },
    conflicts: { type: 'array', items: { type: 'string' } },
  },
};

function cleanUrl(value) {
  if (!value) return null;
  const markdown = String(value).match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/);
  const candidate = markdown ? markdown[1] : String(value);
  try {
    const url = new URL(candidate);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(key => url.searchParams.delete(key));
    url.hash = '';
    return url.toString();
  } catch (_) {
    return null;
  }
}

function normalizeName(value) {
  return String(value || '')
    .replace(/\b(?:REALTOR|Sales(?:person| Representative)|Broker)\b[®™]?/gi, ' ')
    .replace(/[,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deterministicValidation(result) {
  const sources = (result.sources || [])
    .map(source => ({ ...source, url: cleanUrl(source.url) }))
    .filter(source => source.url);
  const exactSources = sources.filter(source => source.address_match || source.mls_match);
  const directHosts = new Set(exactSources.map(source => {
    try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
  }).filter(Boolean));
  const hasMlsEvidence = sources.some(source => source.mls_match);
  const hasAddressEvidence = sources.some(source => source.address_match);
  const conflicts = result.conflicts || [];
  const seen = new Set();
  const representatives = (result.listing_representatives || [])
    .map(rep => ({ ...rep, name: normalizeName(rep.name) }))
    .filter(rep => {
      const key = rep.name.toLowerCase();
      if (!rep.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  let confidence = 0;
  if (hasAddressEvidence) confidence += 35;
  if (hasMlsEvidence) confidence += 35;
  confidence += Math.min(20, directHosts.size * 10);
  if (representatives.length) confidence += 10;
  if (conflicts.length) confidence -= Math.min(50, conflicts.length * 25);
  confidence = Math.max(0, Math.min(100, confidence));
  let status = 'unresolved';
  if (representatives.length && !conflicts.length && hasAddressEvidence && hasMlsEvidence) {
    status = 'verified';
  } else if (representatives.length && !conflicts.length && directHosts.size >= 2) {
    status = 'high_confidence';
  }
  return { ...result, listing_representatives: representatives, sources, confidence, status,
    accepted: status === 'verified' || status === 'high_confidence' };
}

function buildPrompt(listing) {
  const address = [listing.addressstreet, listing.addresscity || listing.city,
    listing.addressstate || 'Ontario', listing.addresszipcode, 'Canada'].filter(Boolean).join(', ');
  return `Find every listing REALTOR or listing agent for this active Canadian property.

Address: ${address}
Known Zillow property ID: ${listing.zpid || 'unknown'}
Known MLS number: ${listing.listing_mls_id || 'unknown'}

Search the exact address, Zillow ID, and any discovered MLS number. Prioritize direct
property pages from REALTOR.ca, Zillow, the listing brokerage, REW, Royal LePage, RE/MAX,
and other Canadian listing sites. A contact or suggested buyer agent is not a listing agent.
Only return a person explicitly tied to this exact property as the listing or co-listing agent.
Return conflicts instead of guessing. Include only sources actually used.`;
}

function extractCitedUrls(response) {
  const urls = [];
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        const url = cleanUrl(annotation.url || annotation.url_citation?.url);
        if (url) urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

async function searchListingAttribution(listing, options = {}) {
  const client = options.client || new OpenAI({ apiKey: options.apiKey });
  const response = await client.responses.create({
    model: options.model || 'gpt-5-mini',
    tools: [{ type: 'web_search' }],
    input: buildPrompt(listing),
    text: { format: { type: 'json_schema', name: 'listing_attribution', strict: true, schema: OUTPUT_SCHEMA } },
  }, { timeout: options.timeoutMs || 90000 });
  const result = deterministicValidation(JSON.parse(response.output_text));
  result.cited_urls = extractCitedUrls(response);
  return result;
}

module.exports = { OUTPUT_SCHEMA, buildPrompt, cleanUrl, deterministicValidation, extractCitedUrls, searchListingAttribution };
