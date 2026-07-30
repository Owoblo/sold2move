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

function parseAssetType(url, card) {
  const match = url.match(/\/(?:for-sale|for-lease)\/([^/]+)\//);
  if (match) return match[1].toLowerCase();
  const labels = [...card.querySelectorAll('.uppercase')].map(node => node.textContent.trim().toLowerCase());
  return labels.find(value => /office|industrial|retail|medical|land|multifamily|coworking|other/.test(value)) || 'other';
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
    const address = fullName.replace(new RegExp(`,\\s*${requestedCity},\\s*ON.*$`, 'i'), '').trim();
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
      .find(value => value && value !== address && !value.includes(address)) || null;
    const coordinates = coordinateById.get(id) || [];
    records.push({
      source: 'spacelist',
      source_family: 'spacelist',
      source_listing_id: id,
      source_url: url,
      transaction_type: transaction,
      asset_type: assetType,
      title: fullName,
      street_address: address,
      address_key: addressKey(address),
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
  const street = assetType === 'land'
    ? rawStreet
    : rawStreet.replace(/^(?:#?[\w-]+|UNIT\s*#?\s*[\w-]+)\s*-\s*/i, '').trim();
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
    description: null,
    street_address: street,
    address_key: addressKey(street),
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
  canonicalizeCommercial,
  numberFrom,
  parseAssetType,
  parseSize,
  parseSpacelistPage,
  parseTransaction,
  normalizeAssetType,
  normalizeRealtorCommercial,
};
