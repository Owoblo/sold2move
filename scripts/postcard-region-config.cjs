const REGION_CONFIG = {
  windsor: {
    key: 'windsor',
    label: 'Windsor',
    outputPrefix: 'Windsor',
    printRecipientLabel: 'Windsor print batch',
    cities: [
      'Windsor', 'Essex', 'Tecumseh', 'Amherstburg', 'Lakeshore',
      'Chatham Kent', 'LaSalle', 'Leamington', 'Kingsville', 'Tilbury',
      'Belle River', 'Harrow', 'McGregor',
      'Wallaceburg', 'Ridgetown', 'Blenheim', 'Dresden', 'Thamesville', 'Bothwell',
    ],
    bounds: { west: -83.30, east: -82.75, south: 42.15, north: 42.45 },
    returnAddressLines: [
      'Saturn Star Services',
      '1487 Ouellette Avenue, G Floor',
      'Windsor, ON N9X 1K1',
    ],
  },
  wkg: {
    key: 'wkg',
    label: 'WKG (Waterloo/Kitchener/Guelph)',
    outputPrefix: 'WKG',
    printRecipientLabel: 'WKG print batch',
    cities: [
      'Waterloo', 'Kitchener', 'Guelph', 'Cambridge',
      'Elmira', 'New Hamburg', 'Fergus', 'Elora',
      'Woolwich', 'Wellesley', 'North Dumfries', 'Wilmot',
      'Guelph-Eramosa', 'Centre Wellington',
    ],
    bounds: { west: -81.05, east: -80.10, south: 43.28, north: 43.80 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },
  london: {
    key: 'london',
    label: 'London',
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
      'Woodstock', 'Ingersoll', 'Tillsonburg', 'Norwich', 'Tavistock',
      'Thamesford', 'Sweaburg',
    ],
    bounds: { west: -81.55, east: -80.70, south: 42.75, north: 43.20 },
    returnAddressLines: [
      'Saturn Star Services',
      '55 Cedar St',
      'Guelph, ON N1G 1C4',
    ],
  },
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
