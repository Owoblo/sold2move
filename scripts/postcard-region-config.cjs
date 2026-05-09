const REGION_CONFIG = {

  // ─── ZONE 1 ───────────────────────────────────────────────────────────────
  windsor: {
    key: 'windsor',
    label: 'Windsor / Essex County',
    outputPrefix: 'Windsor',
    printRecipientLabel: 'Windsor print batch',
    cities: [
      'Windsor', 'LaSalle', 'Tecumseh', 'Amherstburg',
      'Lakeshore', 'Belle River',
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

  // ─── ZONE 2 ───────────────────────────────────────────────────────────────
  chatham: {
    key: 'chatham',
    label: 'Chatham-Kent',
    outputPrefix: 'Chatham',
    printRecipientLabel: 'Chatham print batch',
    cities: [
      'Chatham', 'Chatham Kent', 'Tilbury', 'Wallaceburg',
      'Blenheim', 'Ridgetown', 'Dresden', 'Thamesville', 'Bothwell',
      'Merlin', 'Pain Court', 'Highgate', 'Morpeth',
      "Mitchell's Bay", 'Charing Cross', 'Cedar Springs', 'Dealtown',
    ],
    bounds: { west: -82.75, east: -81.75, south: 42.20, north: 42.70 },
    returnAddressLines: [
      'Saturn Star Services',
      '3608 Seminole Street, Unit 3',
      'Windsor, ON N8Y 1Y4',
    ],
  },

  // ─── ZONE 3 ───────────────────────────────────────────────────────────────
  sarnia: {
    key: 'sarnia',
    label: 'Sarnia / Lambton County',
    outputPrefix: 'Sarnia',
    printRecipientLabel: 'Sarnia print batch',
    cities: [
      'Sarnia', 'Point Edward', 'Corunna', 'Mooretown',
      'Petrolia', 'Oil Springs', 'Wyoming', 'Plympton-Wyoming',
      'Watford', 'Brigden', 'Alvinston', 'Arkona',
      'Forest', 'Thedford', 'Grand Bend', 'Lambton Shores',
      'Port Franks', 'Ipperwash', 'St. Clair', 'Dawn-Euphemia',
    ],
    bounds: { west: -82.60, east: -81.55, south: 42.65, north: 43.40 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 4 ───────────────────────────────────────────────────────────────
  london: {
    key: 'london',
    label: 'London / Middlesex',
    outputPrefix: 'London',
    printRecipientLabel: 'London print batch',
    cities: [
      'London',
      'St. Thomas', 'Strathroy', 'Glencoe', 'Parkhill', 'Newbury', 'Wardsville',
      'Komoka', 'Dorchester', 'Belmont', 'Ilderton', 'Lucan', 'Ailsa Craig',
      'Middlesex Centre', 'Thames Centre', 'Adelaide-Metcalfe', 'Southwest Middlesex',
      'North Middlesex', 'Lucan Biddulph',
      'Aylmer', 'Port Stanley', 'Springfield', 'Dutton', 'West Lorne', 'Rodney',
      'Central Elgin', 'Malahide', 'Bayham', 'Dutton-Dunwich',
      'Ingersoll', 'Thamesford',
    ],
    bounds: { west: -81.90, east: -80.80, south: 42.45, north: 43.25 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 5 ───────────────────────────────────────────────────────────────
  woodstock: {
    key: 'woodstock',
    label: 'Woodstock / Oxford County',
    outputPrefix: 'Woodstock',
    printRecipientLabel: 'Woodstock print batch',
    cities: [
      'Woodstock', 'Ingersoll', 'Tillsonburg', 'Norwich', 'Tavistock',
      'Sweaburg', 'Thamesford', 'Otterville', 'Burgessville',
      'Drumbo', 'Princeton', 'Plattsville', 'Bright', 'Beachville',
      'Mount Elgin', 'Courtland', 'Aylmer',
    ],
    bounds: { west: -81.05, east: -80.45, south: 42.75, north: 43.40 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── ZONE 6 ───────────────────────────────────────────────────────────────
  wkg: {
    key: 'wkg',
    label: 'Kitchener / Waterloo / Cambridge / Guelph',
    outputPrefix: 'WKG',
    printRecipientLabel: 'WKG print batch',
    cities: [
      'Kitchener', 'Waterloo', 'Cambridge', 'Guelph', 'Ayr',
      'Elmira', 'New Hamburg', 'Fergus', 'Elora',
      'Woolwich', 'Wellesley', 'North Dumfries', 'Wilmot',
      'Guelph-Eramosa', 'Centre Wellington',
      'Breslau', 'Baden', 'St. Jacobs', 'Conestogo', 'Paris',
    ],
    bounds: { west: -81.05, east: -80.10, south: 43.15, north: 43.85 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },

  // ─── OTTAWA ───────────────────────────────────────────────────────────────
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
