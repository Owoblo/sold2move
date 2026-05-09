const REGION_CONFIG = {

  // ─── ZONE 1: WINDSOR / ESSEX COUNTY ──────────────────────────────────────
  windsor: {
    key: 'windsor',
    label: 'Windsor / Essex County',
    outputPrefix: 'Windsor',
    printRecipientLabel: 'Windsor print batch',
    cities: [
      // City of Windsor
      'Windsor',
      // Windsor suburbs / Middlesex
      'LaSalle', 'Tecumseh', 'Amherstburg',
      // Lakeshore municipality (Belle River, Comber, Stoney Point, St. Joachim)
      'Lakeshore', 'Belle River', 'Comber', 'Stoney Point', 'St. Joachim',
      // Tecumseh area hamlets
      'Puce', 'Emeryville',
      // Amherstburg area
      'Anderdon',
      // Essex County towns
      'Leamington', 'Kingsville', 'Essex',
      'Harrow', 'McGregor', 'Cottam', 'Ruthven',
      'Colchester', 'Maidstone', 'Wheatley',
    ],
    bounds: { west: -83.20, east: -82.45, south: 41.90, north: 42.45 },
    returnAddressLines: [
      'Saturn Star Services',
      '3608 Seminole Street, Unit 3',
      'Windsor, ON N8Y 1Y4',
    ],
  },

  // ─── ZONE 2: CHATHAM-KENT ─────────────────────────────────────────────────
  chatham: {
    key: 'chatham',
    label: 'Chatham-Kent',
    outputPrefix: 'Chatham',
    printRecipientLabel: 'Chatham print batch',
    cities: [
      // Chatham urban area
      'Chatham', 'Chatham Kent',
      // West CK (401 corridor)
      'Tilbury', 'Wallaceburg', 'Dresden', 'Pain Court',
      // Central CK
      'Blenheim', 'Merlin', 'Charing Cross', 'Cedar Springs', 'Dealtown',
      // East CK
      'Ridgetown', 'Thamesville', 'Bothwell', 'Highgate', 'Morpeth', 'Muirkirk',
      // Lake Erie shoreline
      "Mitchell's Bay", 'Lighthouse Cove', 'Erieau', 'Shrewsbury', 'Erie Beach',
    ],
    bounds: { west: -82.75, east: -81.75, south: 42.15, north: 42.70 },
    returnAddressLines: [
      'Saturn Star Services',
      '3608 Seminole Street, Unit 3',
      'Windsor, ON N8Y 1Y4',
    ],
  },

  // ─── ZONE 3: SARNIA / LAMBTON COUNTY ─────────────────────────────────────
  sarnia: {
    key: 'sarnia',
    label: 'Sarnia / Lambton County',
    outputPrefix: 'Sarnia',
    printRecipientLabel: 'Sarnia print batch',
    cities: [
      // Sarnia urban area
      'Sarnia', 'Point Edward', 'Brights Grove', 'Camlachie',
      // St. Clair River corridor
      'Corunna', 'Mooretown', 'Courtright', 'Sombra', 'Port Lambton',
      // St. Clair Township & Dawn-Euphemia
      'St. Clair', 'Dawn-Euphemia',
      // Petrolia / Oil Springs area
      'Petrolia', 'Oil Springs', 'Brigden',
      // Wyoming / Plympton area
      'Wyoming', 'Plympton-Wyoming',
      // East Lambton
      'Watford', 'Warwick', 'Alvinston', 'Brooke-Alvinston',
      // North Lambton (Lake Huron shore)
      'Arkona', 'Forest', 'Thedford',
      'Grand Bend', 'Lambton Shores', 'Port Franks', 'Ipperwash',
    ],
    bounds: { west: -82.60, east: -81.55, south: 42.60, north: 43.40 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 4: LONDON / MIDDLESEX ───────────────────────────────────────────
  london: {
    key: 'london',
    label: 'London / Middlesex',
    outputPrefix: 'London',
    printRecipientLabel: 'London print batch',
    cities: [
      // London urban
      'London',
      // Middlesex County north
      'Lucan', 'Lucan Biddulph', 'Ailsa Craig', 'Parkhill', 'Ilderton',
      'North Middlesex',
      // Middlesex County west
      'Strathroy', 'Strathroy-Caradoc', 'Mount Brydges', 'Kerwood',
      'Glencoe', 'Newbury', 'Wardsville', 'Adelaide-Metcalfe', 'Southwest Middlesex',
      // Middlesex County central
      'Komoka', 'Middlesex Centre',
      // Middlesex County east
      'Dorchester', 'Thames Centre', 'Thamesford',
      // Middlesex County south
      'Belmont',
      // Elgin County (St. Thomas, Lake Erie towns)
      'St. Thomas', 'Central Elgin', 'Southwold', 'Talbotville',
      'Shedden', 'Fingal', 'Port Stanley', 'Dutton', 'Dutton-Dunwich',
      'West Lorne', 'Rodney',
      // Elgin County east
      'Aylmer', 'Springfield', 'Malahide', 'Bayham', 'Vienna', 'Port Burwell',
      // Perth County
      'St. Marys',
      // Oxford (shared with Woodstock zone)
      'Ingersoll',
    ],
    bounds: { west: -81.90, east: -80.75, south: 42.45, north: 43.30 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 5: WOODSTOCK / OXFORD COUNTY ───────────────────────────────────
  woodstock: {
    key: 'woodstock',
    label: 'Woodstock / Oxford County',
    outputPrefix: 'Woodstock',
    printRecipientLabel: 'Woodstock print batch',
    cities: [
      // Oxford County west
      'Woodstock', 'Ingersoll', 'Beachville',
      // Oxford County central
      'Sweaburg', 'Burgessville', 'Otterville', 'Norwich', 'Mount Elgin', 'Courtland',
      // Oxford County east (Tillsonburg area)
      'Tillsonburg',
      // Oxford County north (Tavistock / Zorra area)
      'Tavistock', 'Thamesford', 'Innerkip', 'East Zorra-Tavistock',
      'Embro', 'Hickson', 'Kintore', 'Zorra',
      // Oxford County northeast (Blandford-Blenheim)
      'Drumbo', 'Princeton', 'Plattsville', 'Bright',
      // Norfolk County (within bounds)
      'Delhi',
      // Elgin (shared)
      'Aylmer',
    ],
    bounds: { west: -81.05, east: -80.45, south: 42.75, north: 43.40 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 6: KITCHENER / WATERLOO / CAMBRIDGE / GUELPH ──────────────────
  wkg: {
    key: 'wkg',
    label: 'Kitchener / Waterloo / Cambridge / Guelph',
    outputPrefix: 'WKG',
    printRecipientLabel: 'WKG print batch',
    cities: [
      // Waterloo Region core
      'Kitchener', 'Waterloo', 'Cambridge', 'Guelph',
      // Waterloo Region townships
      'Elmira', 'St. Jacobs', 'Conestogo', 'Breslau', 'Woolwich',
      'New Hamburg', 'Baden', 'Wellesley', 'Wilmot',
      'Ayr', 'North Dumfries',
      // Guelph area
      'Puslinch', 'Guelph-Eramosa', 'Rockwood',
      // Wellington County
      'Fergus', 'Elora', 'Centre Wellington',
      'Drayton', 'Mapleton', 'Arthur',
      'Palmerston',
      // Perth County (within bounds)
      'Stratford', 'Listowel',
      // Brant County
      'Paris',
    ],
    bounds: { west: -81.05, east: -80.10, south: 43.15, north: 43.85 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── OTTAWA (PAUSED) ──────────────────────────────────────────────────────
  ottawa: {
    key: 'ottawa',
    label: 'Ottawa',
    outputPrefix: 'Ottawa',
    printRecipientLabel: 'Ottawa print batch',
    cities: [
      'Ottawa', 'Kanata', 'Nepean', 'Orleans', 'Gloucester',
      'Stittsville', 'Barrhaven', 'Manotick', 'Rockland', 'Carp',
    ],
    bounds: { west: -76.40, east: -75.35, south: 45.10, north: 45.60 },
    returnAddressLines: [
      'Dexa Services',
      '4108-1100 Canadian Shield Avenue',
      'Kanata, Ottawa, ON K2K 0K9',
    ],
  },
};

function getRegionConfig(region) {
  return REGION_CONFIG[(region || 'windsor').toLowerCase()] || REGION_CONFIG.windsor;
}

function listRegionKeys() {
  return Object.keys(REGION_CONFIG);
}

module.exports = {
  REGION_CONFIG,
  getRegionConfig,
  listRegionKeys,
};
