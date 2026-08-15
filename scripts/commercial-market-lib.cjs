const { JSDOM } = require('jsdom');
const { addressKey } = require('./rental-market-lib.cjs');

function numberFrom(text) {
  const value = Number(String(text || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseSize(text) {
  const match = String(text || '').match(/([\d,]+(?:\.\d+)?)\s*ft/i);
  return match ? numberFrom(match[1]) : null;
}

function parseTransaction(card, url) {
  if (/\/for-sale\//.test(url) || card.querySelector('.for-sale')) return 'sale';
  if (/\/for-lease\//.test(url) || card.querySelector('.for-lease')) return 'lease';
  return 'unknown';
}

function cleanUnitLabel(value) {
  return String(value || '').trim().replace(/^#\s*/, '').replace(/\s+/g, ' ') || null;
}

function splitCommercialAddress(value) {
  const raw = String(value || '').trim();
  const patterns = [
    /^(?:units?|suites?|spaces?)\s*#?\s*([^–—-]+?)\s*[–—-]\s*(\d+\s+.+)$/i,
    /^#\s*([\w][\w\s,&/-]*?)\s*[–—-]\s*(\d+\s+.+)$/i,
    /^([A-Z]?\d+[A-Z]?(?:\s*[,/&]\s*[A-Z]?\d+[A-Z]?)*?)\s*[–—-]\s*(\d+\s+.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return { unit_label: cleanUnitLabel(match[1]), street_address: match[2].trim() };
  }
  const trailing = raw.match(/^(.*?)\s*,\s*(?:units?|suites?|spaces?)\s*#?\s*([\w][\w\s,&/-]*)$/i);
  if (trailing) return { unit_label: cleanUnitLabel(trailing[2]), street_address: trailing[1].trim() };
  return { unit_label: null, street_address: raw };
}

function extractDescription(row) {
  const candidates = [
    row.description,
    row.public_remarks,
    row.publicRemarks,
    row.entity?.description,
    row.listing?.description,
    row.listing?.public_remarks,
    row.listing?.publicRemarks,
    row.property?.description,
    row.property?.public_remarks,
    row.property?.publicRemarks,
  ];
  return candidates.find(value => typeof value === 'string' && value.trim())?.trim() || null;
}

function extractAvailabilityDate(text, referenceDate = new Date()) {
  const source = String(text || '');
  const match = source.match(/\b(?:available|availability|possession|occupancy)\s*(?:on|from|as of|date)?\s*[:\-]?\s*(?:immediately|now|([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}))\b/i);
  if (!match) return null;
  if (!match[1]) return 'immediate';
  const raw = match[1].replace(/(\d)(st|nd|rd|th)\b/i, '$1');
  let parsed = /\d{4}/.test(raw) ? new Date(raw) : new Date(`${raw}, ${referenceDate.getUTCFullYear()}`);
  if (!/\d{4}/.test(raw)) {
    if (parsed < referenceDate) parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  }
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function extractOccupant(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const patterns = [
    /\bcurrently occupied by\s+([A-Z][A-Za-z0-9&'. -]{2,60}?)(?=[,.;]|\s+(?:and|but|with|until|through|who|which)\b|$)/i,
    /\bcurrent tenant(?: is|:)\s*([A-Z][A-Za-z0-9&'. -]{2,60}?)(?=[,.;]|\s+(?:and|but|with|until|through|who|which)\b|$)/i,
    /\bhome to\s+([A-Z][A-Za-z0-9&'. -]{2,60}?)(?=[,.;]|\s+(?:and|but|with|until|through|who|which)\b|$)/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (!/^(?:relocating|moving|vacating|unknown|confidential)$/i.test(name)) {
        return { name, confidence: 0.9 };
      }
    }
  }
  return { name: null, confidence: 0 };
}

function classifyCommercialRelocation(record, referenceDate = new Date()) {
  const text = [record.title, record.description].filter(Boolean).join('. ');
  const unit = record.unit_label || splitCommercialAddress(record.street_address).unit_label;
  const scope = record.asset_type === 'land' ? 'land'
    : /\bbusiness\s+(?:for\s+)?sale\b|\bsale of business\b/i.test(text) ? 'business_sale'
      : unit && /[,/&]|\band\b/i.test(String(unit)) ? 'multiple_units'
        : unit ? 'unit'
          : /\bmultiple\s+(?:units?|suites?|spaces?)\b/i.test(text) ? 'multiple_units'
            : /\b(?:entire|whole)\s+(?:building|property)\b/i.test(text) ? 'whole_building'
              : 'unknown';
  const occupant = extractOccupant(text);
  const availabilityDate = extractAvailabilityDate(text, referenceDate);
  const evidence = [];
  const addEvidence = (type, pattern) => {
    const match = text.match(pattern);
    if (match) evidence.push({ type, text: match[0].trim() });
    return Boolean(match);
  };
  const explicitRelocation = addEvidence('tenant_relocation', /\b(?:current\s+)?tenant\s+(?:is\s+)?relocat(?:ing|es|ed)|\boccupant\s+(?:is\s+)?mov(?:ing|es|ed)\b/i);
  const leaseExpiry = addEvidence('lease_expiry', /\b(?:lease\s+(?:expires?|expiry)|upon\s+lease\s+expiry)\b[^.;]{0,60}/i);
  const sublease = addEvidence('sublease', /\bsub-?lease\b[^.;]{0,80}/i);
  const occupied = addEvidence('currently_occupied', /\b(?:currently\s+occupied|occupied\s+until|current\s+tenant)\b[^.;]{0,80}/i);
  const datedAvailability = addEvidence('availability', /\b(?:available|availability|possession|occupancy)\b[^.;]{0,80}/i);

  let score = 0;
  const reasons = [];
  if (scope === 'unit') { score += 25; reasons.push('specific unit identified'); }
  if (scope === 'multiple_units') { score += 10; reasons.push('multiple specific spaces identified'); }
  if (record.transaction_type === 'lease') { score += 10; reasons.push('space marketed for lease'); }
  if (record.space_size_sqft_min >= 1000) { score += record.space_size_sqft_min >= 5000 ? 10 : 5; reasons.push('meaningful square footage'); }
  if (occupied) { score += 15; reasons.push('listing states the space is occupied'); }
  if (occupant.name) { score += 20; reasons.push('current occupant named'); }
  if (availabilityDate || datedAvailability) { score += 15; reasons.push('availability timing stated'); }
  if (explicitRelocation) { score += 35; reasons.push('explicit tenant relocation language'); }
  if (leaseExpiry) { score += 20; reasons.push('lease-expiry transition language'); }
  if (sublease) { score += 15; reasons.push('sublease transition language'); }
  if (scope === 'land' || scope === 'business_sale') score = 0;
  if (record.transaction_type === 'sale' && !record.transaction_types?.includes?.('lease')) score = Math.min(score, 20);
  if (!unit) score = Math.min(score, 35);
  if (!occupant.name) score = Math.min(score, 55);
  if (!(explicitRelocation || leaseExpiry || sublease || availabilityDate || datedAvailability)) score = Math.min(score, 45);
  score = Math.max(0, Math.min(100, score));

  const hardGate = scope === 'unit' && Boolean(occupant.name) &&
    Boolean(explicitRelocation || leaseExpiry || sublease || availabilityDate || datedAvailability);
  return {
    listing_scope: scope,
    unit_label: unit || null,
    current_occupant_name: occupant.name,
    occupant_confidence: occupant.confidence,
    availability_date: availabilityDate,
    transition_evidence: evidence,
    relocation_probability: score,
    direct_relocation_candidate: hardGate && score >= 70,
    relocation_reasons: reasons,
    outreach_status: hardGate && score >= 70 ? 'eligible_for_human_review' : 'market_intelligence_only',
  };
}

function parseAssetType(url, card) {
  const match = url.match(/\/(?:for-sale|for-lease)\/([^/]+)\//);
  if (match) return match[1].toLowerCase();
  const labels = [...card.querySelectorAll('.uppercase')].map(node => node.textContent.trim().toLowerCase());
  return labels.find(value => /office|industrial|retail|medical|land|multifamily|coworking|other/.test(value)) || 'other';
}

function parseSpacelistDetail(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const candidates = [
    document.querySelector('[itemprop="description"]')?.textContent,
    document.querySelector('.listing-description, .property-description, .description')?.textContent,
    document.querySelector('#panel-listing-content')?.textContent,
    document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
  ].map(value => String(value || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const description = candidates.find(value =>
    value.length >= 40 && !/^.+?\. (?:Office|Industrial|Retail|Medical|Land|Other) space for (?:lease|sale).+? on Spacelist\.?$/i.test(value)
  ) || null;
  return { description };
}

function parseSpacelistPage(html, requestedCity) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const coordinateById = new Map();
  const map = document.querySelector('#cluster-map');
  if (map?.dataset.data) {
    try {
      for (const feature of JSON.parse(map.dataset.data).features || []) {
        coordinateById.set(String(feature.properties.id), feature.geometry.coordinates);
      }
    } catch {}
  }
  const records = [];
  for (const card of document.querySelectorAll('.listing-result')) {
    const url = card.querySelector('meta[itemprop="url"]')?.getAttribute('value') ||
      card.querySelector('a.meta-card')?.href;
    const id = url?.match(/\/listings\/(\d+)\//)?.[1];
    if (!url || !id) continue;
    const fullName = card.querySelector('meta[itemprop="name"]')?.getAttribute('value') || '';
    const listedAddress = fullName.replace(new RegExp(`,\\s*${requestedCity},\\s*ON.*$`, 'i'), '').trim();
    const identity = splitCommercialAddress(listedAddress);
    const transaction = parseTransaction(card, url);
    const assetType = parseAssetType(url, card);
    const image = card.querySelector('img[itemprop="image"]')?.src;
    const priceText = card.querySelector('.display-price')?.textContent.replace(/\s+/g, ' ').trim() || '';
    const askingPrice = transaction === 'sale' ? numberFrom(priceText.split(/\s{2,}|ft/i)[0]) : null;
    const leaseRateMatch = priceText.match(/\$([\d,.]+)\s*\/\s*sf\s*\/\s*yr/i);
    const size = parseSize(card.querySelector('.about')?.textContent) ||
      parseSize(card.querySelector('.display-price')?.textContent);
    const titleNodes = [...card.querySelectorAll('.truncated-text[title]')];
    const brokerage = titleNodes.map(node => node.getAttribute('title'))
      .find(value => value && value !== listedAddress && !value.includes(listedAddress)) || null;
    const coordinates = coordinateById.get(id) || [];
    records.push({
      source: 'spacelist',
      source_family: 'spacelist',
      source_listing_id: id,
      source_url: url,
      transaction_type: transaction,
      asset_type: assetType,
      title: fullName,
      description: card.querySelector('.description, .listing-description')?.textContent?.trim() || null,
      street_address: identity.street_address,
      unit_label: identity.unit_label,
      address_key: addressKey(identity.street_address),
      city: requestedCity,
      province: 'ON',
      latitude: coordinates[1] ?? null,
      longitude: coordinates[0] ?? null,
      asking_price: askingPrice,
      lease_rate: leaseRateMatch ? numberFrom(leaseRateMatch[1]) : null,
      lease_rate_unit: leaseRateMatch ? 'per_sqft_year' : null,
      space_size_sqft_min: size,
      space_size_sqft_max: size,
      brokerage_name: brokerage,
      photo_urls: image ? [image] : [],
    });
  }
  const next = document.querySelector('a[rel="next"]')?.href || null;
  return { records, next };
}

function canonicalizeCommercial(records) {
  const properties = new Map();
  for (const record of records) {
    const key = `${record.address_key}|${record.city.toUpperCase()}|${record.province}`;
    if (!properties.has(key)) {
      properties.set(key, {
        canonical_key: key,
        canonical_address: [record.street_address, record.city, record.province].join(', '),
        address_key: record.address_key,
        street_address: record.street_address,
        city: record.city,
        province: record.province,
        postal_code: record.postal_code || null,
        latitude: record.latitude,
        longitude: record.longitude,
        asset_types: [],
        source_record_ids: [],
        transaction_types: [],
        requested_regions: [],
        source_families: [],
      });
    }
    const property = properties.get(key);
    property.asset_types = [...new Set([...property.asset_types, record.asset_type])];
    property.transaction_types = [...new Set([...property.transaction_types, record.transaction_type])];
    property.source_record_ids.push(`${record.source}:${record.source_listing_id}`);
    property.requested_regions = [...new Set([
      ...property.requested_regions,
      record.requested_region || record.city,
    ])];
    property.source_families = [...new Set([...property.source_families, record.source_family])];
  }
  return [...properties.values()];
}

function normalizeAssetType(value) {
  return String(value || 'other').toLowerCase()
    .replace(/multi[- ]family/g, 'multifamily')
    .replace(/vacant land/g, 'land')
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-');
}

function normalizeRealtorCommercial(row, requestedRegion) {
  const fullAddress = row.location?.address || row.entity?.title || '';
  const addressMatch = fullAddress.match(/^(.*),\s*([^,]+),\s*Ontario(?:\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d)?$/i);
  const actualCity = addressMatch?.[2]?.trim() || requestedRegion;
  const rawStreet = addressMatch?.[1]?.trim() || fullAddress.split(',')[0].trim();
  const assetType = normalizeAssetType(row.entity?.category || row.property?.property_type);
  const identity = assetType === 'land'
    ? { street_address: rawStreet, unit_label: null }
    : splitCommercialAddress(rawStreet);
  const priceText = row.pricing?.price_text || '';
  const perSqft = priceText.match(/\$?([\d,.]+)\s*\/\s*(?:square feet|sq\.?\s*ft|sf)/i);
  const images = (row.media?.images || []).map(image =>
    image.high_res_url || image.medium_res_url || image.low_res_url).filter(Boolean);
  const agent = row.relationships?.agent || row.contact_details?.contacts?.[0] || {};
  const brokerage = row.relationships?.agency || row.contact_details?.brokerages?.[0] || {};
  const sizeText = row.property?.building?.size_interior ||
    row.property?.building?.floor_area_measurements?.[0]?.area_unformatted || '';
  let size = numberFrom(sizeText);
  if (/\bm2\b/i.test(sizeText) && size != null) size *= 10.7639;
  return {
    source: 'realtor_ca_commercial',
    source_family: 'crea_realtor',
    source_listing_id: String(row.record_id || row.listing?.listing_id),
    source_url: row.source_context?.listing_url || row.entity?.url,
    transaction_type: row.listing?.deal_type || 'unknown',
    asset_type: assetType,
    title: row.entity?.title,
    description: extractDescription(row),
    street_address: identity.street_address,
    unit_label: identity.unit_label,
    address_key: addressKey(identity.street_address),
    city: actualCity,
    requested_region: requestedRegion,
    province: 'ON',
    postal_code: row.location?.postal_code || null,
    latitude: row.location?.coordinates?.latitude ?? null,
    longitude: row.location?.coordinates?.longitude ?? null,
    asking_price: row.listing?.deal_type === 'sale' ? row.pricing?.price ?? null : null,
    lease_rate: row.listing?.deal_type === 'lease' && perSqft ? numberFrom(perSqft[1]) : null,
    lease_rate_unit: perSqft ? 'per_sqft' : null,
    space_size_sqft_min: size,
    space_size_sqft_max: size,
    brokerage_name: brokerage.name || agent.organization?.name || null,
    agent_name: agent.name || null,
    agent_phone: agent.phones?.find(phone => phone.type === 'Telephone')?.number || null,
    photo_urls: images.length ? images : (row.media?.main_image_url ? [row.media.main_image_url] : []),
  };
}

module.exports = {
  classifyCommercialRelocation,
  canonicalizeCommercial,
  numberFrom,
  parseAssetType,
  parseSize,
  parseSpacelistDetail,
  parseSpacelistPage,
  parseTransaction,
  splitCommercialAddress,
  normalizeAssetType,
  normalizeRealtorCommercial,
};
