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

function unitIdentity(street, explicitUnit) {
  const value = text(street).replace(/\s+/g, ' ');
  const suffix = value.match(/\s*(?:\bUNIT|\bAPT|\bAPARTMENT|\bSUITE|#)\s*#?\s*([\w-]+(?:\s+\d+)?)\s*$/i);
  const prefix = value.match(/^\s*([\w]+)\s*-\s*(\d+\s+.+)$/);
  const floor = value.match(/^(\d+\s+.+\b(?:ST|STREET|RD|ROAD|AVE|AVENUE|DR|DRIVE|CT|COURT|BLVD|BOULEVARD|LANE|LN|CRES|CRESCENT)(?:\s+[NSEW])?)\s+(MAIN|UPPER|LOWER|BASEMENT|BSMT|GROUND)(?:\s+(\d+))?$/i);
  const rawUnit = text(explicitUnit || suffix?.[1] || prefix?.[1] || (floor ? `${floor[2]}${floor[3] ? ' '+floor[3] : ''}` : ''));
  const unit = rawUnit.replace(/^(?:UNIT|APT|SUITE)\s*#?\s*/i, '').replace(/^#\s*/, '').replace(/\s+(?:FLOOR|LEVEL)$/i, '').toUpperCase();
  const base = prefix ? prefix[2] : suffix ? value.slice(0,suffix.index).trim() : floor ? floor[1] : value;
  return { street_address: base, address_key: addressKey(base), unit_label: unit || null,
    mailing_street: unit ? `${base} Unit ${unit}` : base };
}

function normalizeZillow(row) {
  const home = row.hdpData?.homeInfo || {};
  const address = row.address && typeof row.address === 'object' ? row.address : {};
  const street = row.addressStreet || row.streetAddress || row.listingAddress?.street || home.streetAddress || address.streetAddress;
  const city = row.addressCity || row.city || row.listingAddress?.city || home.city || address.city;
  const province = row.addressState || row.state || row.listingAddress?.state || home.state || address.state;
  const identity = unitIdentity(street, row.unitNumber || (typeof row.unit === 'string' ? row.unit : '') || row.listingAddress?.unitNumber || home.unitNumber || address.unitNumber);
  const homeType = text(row.homeType || row.propertyType || home.homeType).toUpperCase();
  const singleHome = ['SINGLE_FAMILY', 'SINGLE FAMILY', 'TOWNHOUSE', 'TOWNHOME'].includes(homeType);
  const photos = row.listingPhotos || row.carouselPhotos || row.photos || (row.imgSrc ? [row.imgSrc] : []);
  const url = row.detailUrl || row.propertyUrl || row.url;
  return {
    source: 'zillow', source_family: sourceFamily('zillow'),
    source_listing_id: text(row.zpid || row.id || row.providerListingId),
    source_url: url?.startsWith('/') ? `https://www.zillow.com${url}` : url,
    ...identity,
    city: text(city), province: text(province).toUpperCase(),
    postal_code: text(row.addressZipcode || row.zipcode || row.listingAddress?.zipCode || home.zipcode || address.zipcode),
    latitude: row.latLong?.latitude ?? row.coordinates?.latitude ?? row.latitude ?? home.latitude,
    longitude: row.latLong?.longitude ?? row.coordinates?.longitude ?? row.longitude ?? home.longitude,
    monthly_price: row.unformattedPrice ?? row.listingPrice?.amount ?? (typeof row.price === 'number' ? row.price : null),
    bedrooms: row.beds ?? row.bedrooms ?? home.bedrooms ?? null,
    bathrooms: row.baths ?? row.bathrooms ?? home.bathrooms ?? null,
    entity_type: identity.unit_label || singleHome ? 'unit' : 'property',
    single_home: singleHome, property_type: homeType,
    description: row.description || null,
    photo_urls: photos.map(photo => typeof photo === 'string' ? photo : photo?.url).filter(Boolean),
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
    ...unitIdentity(street, row.unitNumber || row.unit_label),
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
  const location = String(row.url || '').match(/^https:\/\/(?:www\.)?rentseeker\.ca\/rent\/[^/]+\/([^/]+)\/([^/]+)\//i);
  const urlProvince = location?.[1] === 'ontario' ? 'ON' : '';
  const urlCity = location?.[2]?.replace(/-/g, ' ') || '';
  return {
    source: 'rentseeker',
    source_family: sourceFamily('rentseeker'),
    source_listing_id: text(row.objectID || row.id),
    source_url: row.url,
    ...unitIdentity(street, row.unitNumber || row.unit_label),
    city: text(row.city || row.address?.city || urlCity),
    province: text(row.province || row.address?.province || row.state || urlProvince).replace(/^Ontario$/i, 'ON').toUpperCase(),
    postal_code: text(row.postal_code || row.postalCode || row.address?.postalCode),
    geography_verified: Boolean(row.city || row.address?.city || urlCity) && Boolean(row.province || row.address?.province || row.state || urlProvince),
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
  if (!/\b(?:not|never|non)[ -]+(?:fully |partially )?furnished\b|\bunfurnished\b/.test(value) && /\bfurnished\b/.test(value)) add('furnished', 'furnished language');
  if (!/\bnot (?:partially|partly) furnished\b/.test(value) && /\b(?:partially|partly) furnished\b/.test(value)) add('partially_furnished', 'partially furnished language');
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
  unitIdentity,
};
