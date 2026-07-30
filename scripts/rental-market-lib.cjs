const SOURCE_FAMILIES = Object.freeze({
  zillow: 'zillow_trulia',
  trulia: 'zillow_trulia',
  zumper: 'zumper_padmapper',
  padmapper: 'zumper_padmapper',
  rentcafe: 'yardi_rentcafe',
  rentseeker: 'rentseeker',
  realtor_ca: 'crea_realtor',
});

function text(value) {
  return String(value || '').trim();
}

function stripUnit(street) {
  return text(street)
    .replace(/\s+(?:UNIT|APT|APARTMENT|SUITE|#)\s*#?\s*[\w-]+.*$/i, '')
    .trim();
}

function addressKey(street) {
  return stripUnit(street).toUpperCase()
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bLANE\b/g, 'LN')
    .replace(/\bCOURT\b/g, 'CT')
    .replace(/\bTRAIL\b/g, 'TRL')
    .replace(/\bHIGHWAY\b/g, 'HWY')
    .replace(/\bNORTH\b/g, 'N')
    .replace(/\bSOUTH\b/g, 'S')
    .replace(/\bEAST\b/g, 'E')
    .replace(/\bWEST\b/g, 'W')
    .replace(/[^A-Z0-9]/g, '');
}

function sourceFamily(source) {
  return SOURCE_FAMILIES[source] || source;
}

function normalizeZillow(row) {
  const street = row.addressStreet || row.listingAddress?.street || row.hdpData?.homeInfo?.streetAddress;
  const city = row.addressCity || row.listingAddress?.city || row.hdpData?.homeInfo?.city;
  const province = row.addressState || row.listingAddress?.state || row.hdpData?.homeInfo?.state;
  return {
    source: 'zillow',
    source_family: sourceFamily('zillow'),
    source_listing_id: text(row.zpid || row.id || row.providerListingId),
    source_url: row.detailUrl || row.propertyUrl,
    street_address: stripUnit(street),
    address_key: addressKey(street),
    city: text(city),
    province: text(province).toUpperCase(),
    postal_code: text(row.addressZipcode || row.listingAddress?.zipCode),
    latitude: row.latLong?.latitude ?? row.coordinates?.latitude,
    longitude: row.latLong?.longitude ?? row.coordinates?.longitude,
    monthly_price: row.unformattedPrice ?? row.listingPrice?.amount ?? null,
    description: row.description || null,
    photo_urls: (row.listingPhotos || []).map(photo => photo.url).filter(Boolean),
    raw_payload: row,
  };
}

function normalizeRentCafe(row) {
  const street = row.address?.street;
  return {
    source: 'rentcafe',
    source_family: sourceFamily('rentcafe'),
    source_listing_id: text(row.propertyId || row.url),
    source_url: row.url,
    street_address: stripUnit(street),
    address_key: addressKey(street),
    city: text(row.address?.city),
    province: text(row.address?.state).toUpperCase(),
    postal_code: text(row.address?.zip),
    latitude: row.latitude,
    longitude: row.longitude,
    monthly_price: row.priceMin ?? null,
    description: row.description || null,
    photo_urls: (row.photos || []).filter(Boolean),
    contact_company: row.companyName || null,
    contact_phone: row.phone || null,
    online_leasing_url: row.onlineLeasingUrl || null,
    entity_type: (row.floorplans?.length || row.unitsAvailable != null) ? 'building' : 'unit',
    units_available: row.unitsAvailable ?? null,
    floorplans: (row.floorplans || []).map(plan => ({
      floorplan_name: plan.name || plan.beds || null,
      bedrooms_label: plan.beds || null,
      monthly_price_min: plan.rentValue ?? null,
      monthly_price_max: plan.rentValue ?? null,
      raw_payload: plan,
    })),
    raw_payload: row,
  };
}

function normalizeRentSeeker(row, requestedCity, province = 'ON') {
  const street = row.name;
  const furnished = row.features?.furnished === true;
  return {
    source: 'rentseeker',
    source_family: sourceFamily('rentseeker'),
    source_listing_id: text(row.objectID || row.id),
    source_url: row.url,
    street_address: stripUnit(street),
    address_key: addressKey(street),
    city: requestedCity,
    province,
    postal_code: '',
    latitude: Number(row._geoloc?.lat),
    longitude: Number(row._geoloc?.lng),
    monthly_price: Number.isFinite(Number(row.price_low)) ? Number(row.price_low) / 100 : null,
    description: null,
    photo_urls: row.image_url ? [row.image_url] : [],
    contact_company: row.company_name || null,
    contact_phone: row.company_phone || null,
    entity_type: 'building',
    listing_categories: furnished ? ['rental', 'furnished'] : ['rental'],
    floorplans: Object.entries(row.prices_low || {})
      .filter(([, price]) => Number.isFinite(Number(price)) && Number(price) > 0)
      .map(([bedrooms, price]) => ({
        floorplan_name: `${bedrooms} bedroom`,
        bedrooms_label: bedrooms,
        monthly_price_min: Number(price) / 100,
        monthly_price_max: Number(row.prices_high?.[bedrooms] || price) / 100,
        raw_payload: { bedrooms, price_low: price, price_high: row.prices_high?.[bedrooms] },
      })),
    raw_payload: row,
  };
}

function isInProvince(record, province = 'ON') {
  return record.province === province.toUpperCase();
}

function canonicalKey(record) {
  return [record.address_key, record.city.toUpperCase(), record.province, 'CA'].join('|');
}

function classifyDescription(description) {
  const value = text(description).toLowerCase();
  const categories = ['rental'];
  const signals = [];
  const add = (category, signal) => {
    if (!categories.includes(category)) categories.push(category);
    signals.push(signal);
  };
  if (/\b(student|students|student housing|student rental|student-friendly)\b/.test(value)) {
    add('student_housing', 'explicit student-housing language');
  }
  if (/\b(senior|seniors|retirement|assisted living|55\+|independent living)\b/.test(value)) add('senior_housing', 'senior/retirement language');
  if (/\bfully furnished\b|\bfurnished\b/.test(value)) add('furnished', 'furnished language');
  if (/\bpartially furnished\b|\bpartly furnished\b/.test(value)) add('partially_furnished', 'partially furnished language');
  if (/\bpurpose[- ]built rental\b|\bprofessionally managed\b/.test(value)) add('purpose_built_rental', 'purpose-built/managed language');
  if (/\bnew construction\b|\bbrand new build\b|\bnewly built\b/.test(value)) add('new_construction', 'new-build language');
  return { categories, signals };
}

module.exports = {
  SOURCE_FAMILIES,
  addressKey,
  canonicalKey,
  classifyDescription,
  isInProvince,
  normalizeRentCafe,
  normalizeRentSeeker,
  normalizeZillow,
  sourceFamily,
  stripUnit,
};
