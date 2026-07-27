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

function isPlausiblePersonName(value) {
  const name = normalizeName(value);
  if (!name || /^(?:not specified|unknown|n\/a|none|null)$/i.test(name)) return false;
  if (/\b(?:realty|real estate|brokerage|re\/?max|royal lepage|keller williams|century 21|sutton|property management)\b/i.test(name)) {
    return false;
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 7) return false;
  return words.every(word => /^[\p{L}][\p{L}'’.-]*$/u.test(word));
}

function normalizedEvidence(value) {
  return decodeURIComponent(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(place|pl)\b/g, 'pl')
    .replace(/\b(trail|trl)\b/g, 'trl')
    .replace(/\b(close|cl)\b/g, 'cl')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceEvidenceMatches(source, result, listing = {}) {
  const haystack = normalizedEvidence(`${source.url || ''} ${source.evidence || ''}`);
  const street = normalizedEvidence(
    listing.addressstreet || String(result.normalized_address || '').split(',')[0]
  );
  const streetTokens = street.split(' ').filter(Boolean);
  const addressMatch = streetTokens.length >= 2 &&
    streetTokens.every(token => haystack.includes(token));
  const mls = normalizedEvidence(result.discovered_mls_number || listing.listing_mls_id);
  const mlsMatch = Boolean(mls && haystack.replace(/\s/g, '').includes(mls.replace(/\s/g, '')));
  return {
    address_match: Boolean(source.address_match || addressMatch),
    mls_match: Boolean(source.mls_match || mlsMatch),
  };
}

function deterministicValidation(result, listing = {}) {
  const sources = (result.sources || [])
    .map(source => {
      const clean = { ...source, url: cleanUrl(source.url) };
      return { ...clean, ...sourceEvidenceMatches(clean, result, listing) };
    })
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
      if (!isPlausiblePersonName(rep.name) || seen.has(key)) return false;
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

function buildPrompt(listing, options = {}) {
  const address = [listing.addressstreet, listing.addresscity || listing.city,
    listing.addressstate || 'Ontario', listing.addresszipcode, 'Canada'].filter(Boolean).join(', ');
  const priorSources = Array.isArray(listing.listing_attribution_sources)
    ? listing.listing_attribution_sources.map(source => source.url).filter(Boolean).slice(0, 8)
    : [];
  const secondPass = options.pass === 'second';
  return `Find every listing REALTOR or listing agent for this active Canadian property.

Address: ${address}
Known Zillow property ID: ${listing.zpid || 'unknown'}
Known MLS number: ${listing.listing_mls_id || 'unknown'}
${priorSources.length ? `Previously discovered property sources:\n${priorSources.join('\n')}` : ''}

Search the exact address, Zillow ID, and any discovered MLS number. Prioritize direct
property pages from REALTOR.ca, Zillow, the listing brokerage, REW, Royal LePage, RE/MAX,
and other Canadian listing sites. A contact or suggested buyer agent is not a listing agent.
Only return a person explicitly tied to this exact property as the listing or co-listing agent.
Return conflicts instead of guessing. Include only sources actually used.
${secondPass ? `This is a second-pass investigation. Open the property-specific sources and search
the exact MLS number with "listing agent", "salesperson", and "listed by". Look for embedded
listing cards and brokerage mirrors. Do not return an agent unless a source explicitly connects
that person's name to this exact MLS number or address.` : ''}`;
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
  const client = options.client || new OpenAI({ apiKey: options.apiKey, maxRetries: 0 });
  const response = await client.responses.create({
    model: options.model || process.env.OPENAI_ATTRIBUTION_MODEL || 'gpt-4o-mini',
    tools: [{ type: 'web_search' }],
    input: buildPrompt(listing, options),
    text: { format: { type: 'json_schema', name: 'listing_attribution', strict: true, schema: OUTPUT_SCHEMA } },
  }, { timeout: options.timeoutMs || 90000 });
  const result = deterministicValidation(JSON.parse(response.output_text), listing);
  result.cited_urls = extractCitedUrls(response);
  return result;
}

module.exports = {
  OUTPUT_SCHEMA, buildPrompt, cleanUrl, deterministicValidation, extractCitedUrls,
  isPlausiblePersonName, normalizedEvidence, searchListingAttribution, sourceEvidenceMatches,
};
