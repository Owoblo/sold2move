/**
 * Canadian City Clusters for Moving Services SaaS
 * Based on major Canadian cities and nearby towns within ~1 hour drive
 * Supports bilingual names (English/French) where applicable
 */

export const CANADA_CITY_CLUSTERS = {
  // Ontario
  'Toronto': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 43.6532, lng: -79.3832 },
    timezone: 'America/Toronto',
    population: 2930000,
    serviceRadius: 60, // km
    nearbyTowns: [
      { name: 'Mississauga', nameFr: 'Mississauga', distance: 25 },
      { name: 'Brampton', nameFr: 'Brampton', distance: 30 },
      { name: 'Markham', nameFr: 'Markham', distance: 35 },
      { name: 'Vaughan', nameFr: 'Vaughan', distance: 30 },
      { name: 'Richmond Hill', nameFr: 'Richmond Hill', distance: 35 },
      { name: 'Oakville', nameFr: 'Oakville', distance: 40 },
      { name: 'Burlington', nameFr: 'Burlington', distance: 45 },
      { name: 'Ajax', nameFr: 'Ajax', distance: 35 },
      { name: 'Pickering', nameFr: 'Pickering', distance: 30 },
      { name: 'Whitby', nameFr: 'Whitby', distance: 40 },
      { name: 'Oshawa', nameFr: 'Oshawa', distance: 45 },
      { name: 'Scarborough', nameFr: 'Scarborough', distance: 20 },
      { name: 'North York', nameFr: 'North York', distance: 15 },
      { name: 'Etobicoke', nameFr: 'Etobicoke', distance: 20 },
      { name: 'York', nameFr: 'York', distance: 10 },
      { name: 'East York', nameFr: 'East York', distance: 15 },
      { name: 'Newmarket', nameFr: 'Newmarket', distance: 40 },
      { name: 'Aurora', nameFr: 'Aurora', distance: 35 },
      { name: 'King City', nameFr: 'King City', distance: 45 },
      { name: 'Caledon', nameFr: 'Caledon', distance: 50 }
    ]
  },

  'Hamilton': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 43.2557, lng: -79.8711 },
    timezone: 'America/Toronto',
    population: 536917,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'St. Catharines', nameFr: 'St. Catharines', distance: 25 },
      { name: 'Niagara Falls', nameFr: 'Chutes du Niagara', distance: 30 },
      { name: 'Welland', nameFr: 'Welland', distance: 35 },
      { name: 'Grimsby', nameFr: 'Grimsby', distance: 20 },
      { name: 'Stoney Creek', nameFr: 'Stoney Creek', distance: 10 },
      { name: 'Dundas', nameFr: 'Dundas', distance: 15 },
      { name: 'Ancaster', nameFr: 'Ancaster', distance: 15 },
      { name: 'Waterdown', nameFr: 'Waterdown', distance: 20 },
      { name: 'Beamsville', nameFr: 'Beamsville', distance: 25 },
      { name: 'Thorold', nameFr: 'Thorold', distance: 30 },
      { name: 'Pelham', nameFr: 'Pelham', distance: 35 },
      { name: 'Lincoln', nameFr: 'Lincoln', distance: 25 },
      { name: 'West Lincoln', nameFr: 'West Lincoln', distance: 30 },
      { name: 'Glanbrook', nameFr: 'Glanbrook', distance: 20 },
      { name: 'Flamborough', nameFr: 'Flamborough', distance: 15 }
    ]
  },

  'London': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 42.9849, lng: -81.2453 },
    timezone: 'America/Toronto',
    population: 383822,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Sarnia', nameFr: 'Sarnia', distance: 45 },
      { name: 'St. Thomas', nameFr: 'St. Thomas', distance: 20 },
      { name: 'Strathroy', nameFr: 'Strathroy', distance: 25 },
      { name: 'Woodstock', nameFr: 'Woodstock', distance: 30 },
      { name: 'Ingersoll', nameFr: 'Ingersoll', distance: 25 },
      { name: 'Tillsonburg', nameFr: 'Tillsonburg', distance: 35 },
      { name: 'Aylmer', nameFr: 'Aylmer', distance: 30 },
      { name: 'Petrolia', nameFr: 'Petrolia', distance: 40 },
      { name: 'Corunna', nameFr: 'Corunna', distance: 45 },
      { name: 'Lambton Shores', nameFr: 'Lambton Shores', distance: 50 },
      { name: 'Middlesex Centre', nameFr: 'Middlesex Centre', distance: 20 },
      { name: 'Thames Centre', nameFr: 'Thames Centre', distance: 25 },
      { name: 'Southwold', nameFr: 'Southwold', distance: 30 },
      { name: 'West Elgin', nameFr: 'West Elgin', distance: 35 }
    ]
  },

  'Kitchener-Waterloo': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 43.4643, lng: -80.5204 },
    timezone: 'America/Toronto',
    population: 470015,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Cambridge', nameFr: 'Cambridge', distance: 15 },
      { name: 'Guelph', nameFr: 'Guelph', distance: 25 },
      { name: 'Elmira', nameFr: 'Elmira', distance: 20 },
      { name: 'New Hamburg', nameFr: 'New Hamburg', distance: 15 },
      { name: 'Ayr', nameFr: 'Ayr', distance: 20 },
      { name: 'Preston', nameFr: 'Preston', distance: 10 },
      { name: 'Hespeler', nameFr: 'Hespeler', distance: 15 },
      { name: 'Breslau', nameFr: 'Breslau', distance: 10 },
      { name: 'St. Jacobs', nameFr: 'St. Jacobs', distance: 15 },
      { name: 'Conestogo', nameFr: 'Conestogo', distance: 20 },
      { name: 'Woolwich', nameFr: 'Woolwich', distance: 15 },
      { name: 'Wellesley', nameFr: 'Wellesley', distance: 20 },
      { name: 'North Dumfries', nameFr: 'North Dumfries', distance: 25 },
      { name: 'Puslinch', nameFr: 'Puslinch', distance: 20 }
    ]
  },

  'Ottawa': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 45.4215, lng: -75.6972 },
    timezone: 'America/Toronto',
    population: 1017449,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Gatineau', nameFr: 'Gatineau', distance: 5 },
      { name: 'Kanata', nameFr: 'Kanata', distance: 20 },
      { name: 'Nepean', nameFr: 'Nepean', distance: 15 },
      { name: 'Orleans', nameFr: 'Orléans', distance: 20 },
      { name: 'Barrhaven', nameFr: 'Barrhaven', distance: 25 },
      { name: 'Gloucester', nameFr: 'Gloucester', distance: 10 },
      { name: 'Cumberland', nameFr: 'Cumberland', distance: 30 },
      { name: 'Rockland', nameFr: 'Rockland', distance: 35 },
      { name: 'Cornwall', nameFr: 'Cornwall', distance: 50 },
      { name: 'Hawkesbury', nameFr: 'Hawkesbury', distance: 55 },
      { name: 'Pembroke', nameFr: 'Pembroke', distance: 60 },
      { name: 'Arnprior', nameFr: 'Arnprior', distance: 40 },
      { name: 'Carleton Place', nameFr: 'Carleton Place', distance: 35 },
      { name: 'Smiths Falls', nameFr: 'Smiths Falls', distance: 45 }
    ]
  },

  'Windsor': {
    province: 'Ontario',
    provinceCode: 'ON',
    coordinates: { lat: 42.3149, lng: -83.0364 },
    timezone: 'America/Toronto',
    population: 229660,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'LaSalle', nameFr: 'LaSalle', distance: 10 },
      { name: 'Tecumseh', nameFr: 'Tecumseh', distance: 15 },
      { name: 'Amherstburg', nameFr: 'Amherstburg', distance: 20 },
      { name: 'Kingsville', nameFr: 'Kingsville', distance: 25 },
      { name: 'Leamington', nameFr: 'Leamington', distance: 30 },
      { name: 'Essex', nameFr: 'Essex', distance: 20 },
      { name: 'Lakeshore', nameFr: 'Lakeshore', distance: 15 },
      { name: 'Tilbury', nameFr: 'Tilbury', distance: 35 },
      { name: 'Belle River', nameFr: 'Belle River', distance: 25 },
      { name: 'Wheatley', nameFr: 'Wheatley', distance: 40 },
      { name: 'Harrow', nameFr: 'Harrow', distance: 25 },
      { name: 'Cottam', nameFr: 'Cottam', distance: 30 },
      { name: 'Ruthven', nameFr: 'Ruthven', distance: 25 }
    ]
  },

  // Alberta
  'Calgary': {
    province: 'Alberta',
    provinceCode: 'AB',
    coordinates: { lat: 51.0447, lng: -114.0719 },
    timezone: 'America/Edmonton',
    population: 1306784,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Airdrie', nameFr: 'Airdrie', distance: 25 },
      { name: 'Cochrane', nameFr: 'Cochrane', distance: 30 },
      { name: 'Okotoks', nameFr: 'Okotoks', distance: 20 },
      { name: 'Chestermere', nameFr: 'Chestermere', distance: 15 },
      { name: 'Strathmore', nameFr: 'Strathmore', distance: 35 },
      { name: 'Canmore', nameFr: 'Canmore', distance: 50 },
      { name: 'Banff', nameFr: 'Banff', distance: 60 },
      { name: 'High River', nameFr: 'High River', distance: 40 },
      { name: 'Didsbury', nameFr: 'Didsbury', distance: 45 },
      { name: 'Crossfield', nameFr: 'Crossfield', distance: 30 },
      { name: 'Beiseker', nameFr: 'Beiseker', distance: 40 },
      { name: 'Irricana', nameFr: 'Irricana', distance: 35 },
      { name: 'Rocky View County', nameFr: 'Rocky View County', distance: 25 }
    ]
  },

  'Edmonton': {
    province: 'Alberta',
    provinceCode: 'AB',
    coordinates: { lat: 53.5461, lng: -113.4938 },
    timezone: 'America/Edmonton',
    population: 1017449,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'St. Albert', nameFr: 'St. Albert', distance: 15 },
      { name: 'Sherwood Park', nameFr: 'Sherwood Park', distance: 10 },
      { name: 'Spruce Grove', nameFr: 'Spruce Grove', distance: 20 },
      { name: 'Stony Plain', nameFr: 'Stony Plain', distance: 25 },
      { name: 'Leduc', nameFr: 'Leduc', distance: 30 },
      { name: 'Beaumont', nameFr: 'Beaumont', distance: 25 },
      { name: 'Fort Saskatchewan', nameFr: 'Fort Saskatchewan', distance: 20 },
      { name: 'Devon', nameFr: 'Devon', distance: 35 },
      { name: 'Morinville', nameFr: 'Morinville', distance: 30 },
      { name: 'Gibbons', nameFr: 'Gibbons', distance: 35 },
      { name: 'Redwater', nameFr: 'Redwater', distance: 40 },
      { name: 'Lamont', nameFr: 'Lamont', distance: 45 },
      { name: 'Mundare', nameFr: 'Mundare', distance: 50 }
    ]
  },

  // British Columbia
  'Vancouver': {
    province: 'British Columbia',
    provinceCode: 'BC',
    coordinates: { lat: 49.2827, lng: -123.1207 },
    timezone: 'America/Vancouver',
    population: 675218,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Burnaby', nameFr: 'Burnaby', distance: 15 },
      { name: 'Richmond', nameFr: 'Richmond', distance: 20 },
      { name: 'Surrey', nameFr: 'Surrey', distance: 25 },
      { name: 'Coquitlam', nameFr: 'Coquitlam', distance: 20 },
      { name: 'Langley', nameFr: 'Langley', distance: 35 },
      { name: 'Delta', nameFr: 'Delta', distance: 30 },
      { name: 'New Westminster', nameFr: 'New Westminster', distance: 15 },
      { name: 'North Vancouver', nameFr: 'North Vancouver', distance: 10 },
      { name: 'West Vancouver', nameFr: 'West Vancouver', distance: 15 },
      { name: 'Port Moody', nameFr: 'Port Moody', distance: 25 },
      { name: 'White Rock', nameFr: 'White Rock', distance: 40 },
      { name: 'Maple Ridge', nameFr: 'Maple Ridge', distance: 35 },
      { name: 'Pitt Meadows', nameFr: 'Pitt Meadows', distance: 30 },
      { name: 'Port Coquitlam', nameFr: 'Port Coquitlam', distance: 25 }
    ]
  },

  'Victoria': {
    province: 'British Columbia',
    provinceCode: 'BC',
    coordinates: { lat: 48.4284, lng: -123.3656 },
    timezone: 'America/Vancouver',
    population: 92000,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Saanich', nameFr: 'Saanich', distance: 10 },
      { name: 'Esquimalt', nameFr: 'Esquimalt', distance: 5 },
      { name: 'Oak Bay', nameFr: 'Oak Bay', distance: 5 },
      { name: 'Sidney', nameFr: 'Sidney', distance: 20 },
      { name: 'Central Saanich', nameFr: 'Central Saanich', distance: 15 },
      { name: 'North Saanich', nameFr: 'North Saanich', distance: 20 },
      { name: 'Colwood', nameFr: 'Colwood', distance: 15 },
      { name: 'Langford', nameFr: 'Langford', distance: 20 },
      { name: 'View Royal', nameFr: 'View Royal', distance: 10 },
      { name: 'Metchosin', nameFr: 'Metchosin', distance: 25 },
      { name: 'Sooke', nameFr: 'Sooke', distance: 35 },
      { name: 'Highlands', nameFr: 'Highlands', distance: 30 }
    ]
  },

  // Quebec
  'Montréal': {
    province: 'Quebec',
    provinceCode: 'QC',
    coordinates: { lat: 45.5017, lng: -73.5673 },
    timezone: 'America/Montreal',
    population: 1780000,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Laval', nameFr: 'Laval', distance: 20 },
      { name: 'Longueuil', nameFr: 'Longueuil', distance: 15 },
      { name: 'Brossard', nameFr: 'Brossard', distance: 20 },
      { name: 'Saint-Jean-sur-Richelieu', nameFr: 'Saint-Jean-sur-Richelieu', distance: 40 },
      { name: 'Saint-Jérôme', nameFr: 'Saint-Jérôme', distance: 35 },
      { name: 'Repentigny', nameFr: 'Repentigny', distance: 25 },
      { name: 'Dollard-des-Ormeaux', nameFr: 'Dollard-des-Ormeaux', distance: 15 },
      { name: 'Pointe-Claire', nameFr: 'Pointe-Claire', distance: 20 },
      { name: 'Kirkland', nameFr: 'Kirkland', distance: 20 },
      { name: 'Beaconsfield', nameFr: 'Beaconsfield', distance: 20 },
      { name: 'Sainte-Anne-de-Bellevue', nameFr: 'Sainte-Anne-de-Bellevue', distance: 25 },
      { name: 'Sainte-Geneviève', nameFr: 'Sainte-Geneviève', distance: 20 },
      { name: 'Pierrefonds', nameFr: 'Pierrefonds', distance: 15 },
      { name: 'Roxboro', nameFr: 'Roxboro', distance: 15 }
    ]
  },

  'Québec City': {
    province: 'Quebec',
    provinceCode: 'QC',
    coordinates: { lat: 46.8139, lng: -71.2080 },
    timezone: 'America/Montreal',
    population: 549459,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Lévis', nameFr: 'Lévis', distance: 10 },
      { name: 'Sainte-Foy', nameFr: 'Sainte-Foy', distance: 5 },
      { name: 'Sillery', nameFr: 'Sillery', distance: 5 },
      { name: 'Beauport', nameFr: 'Beauport', distance: 10 },
      { name: 'Charlesbourg', nameFr: 'Charlesbourg', distance: 10 },
      { name: 'Cap-Rouge', nameFr: 'Cap-Rouge', distance: 15 },
      { name: 'L\'Ancienne-Lorette', nameFr: 'L\'Ancienne-Lorette', distance: 10 },
      { name: 'Saint-Augustin-de-Desmaures', nameFr: 'Saint-Augustin-de-Desmaures', distance: 15 },
      { name: 'Wendake', nameFr: 'Wendake', distance: 20 },
      { name: 'Shannon', nameFr: 'Shannon', distance: 25 },
      { name: 'Sainte-Catherine-de-la-Jacques-Cartier', nameFr: 'Sainte-Catherine-de-la-Jacques-Cartier', distance: 30 },
      { name: 'Saint-Raymond', nameFr: 'Saint-Raymond', distance: 40 },
      { name: 'Donnacona', nameFr: 'Donnacona', distance: 35 }
    ]
  },

  // Other Provinces
  'Winnipeg': {
    province: 'Manitoba',
    provinceCode: 'MB',
    coordinates: { lat: 49.8951, lng: -97.1384 },
    timezone: 'America/Winnipeg',
    population: 705244,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Selkirk', nameFr: 'Selkirk', distance: 30 },
      { name: 'Steinbach', nameFr: 'Steinbach', distance: 40 },
      { name: 'Winkler', nameFr: 'Winkler', distance: 50 },
      { name: 'Morden', nameFr: 'Morden', distance: 55 },
      { name: 'Portage la Prairie', nameFr: 'Portage la Prairie', distance: 60 },
      { name: 'Brandon', nameFr: 'Brandon', distance: 200 }, // Outside 1-hour radius
      { name: 'St. Adolphe', nameFr: 'St. Adolphe', distance: 25 },
      { name: 'Niverville', nameFr: 'Niverville', distance: 30 },
      { name: 'Oakbank', nameFr: 'Oakbank', distance: 20 },
      { name: 'Springfield', nameFr: 'Springfield', distance: 25 },
      { name: 'East St. Paul', nameFr: 'East St. Paul', distance: 15 },
      { name: 'West St. Paul', nameFr: 'West St. Paul', distance: 15 }
    ]
  },

  'Halifax': {
    province: 'Nova Scotia',
    provinceCode: 'NS',
    coordinates: { lat: 44.6488, lng: -63.5752 },
    timezone: 'America/Halifax',
    population: 403131,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Dartmouth', nameFr: 'Dartmouth', distance: 5 },
      { name: 'Bedford', nameFr: 'Bedford', distance: 10 },
      { name: 'Sackville', nameFr: 'Sackville', distance: 15 },
      { name: 'Lower Sackville', nameFr: 'Lower Sackville', distance: 15 },
      { name: 'Cole Harbour', nameFr: 'Cole Harbour', distance: 10 },
      { name: 'Eastern Passage', nameFr: 'Eastern Passage', distance: 15 },
      { name: 'Spryfield', nameFr: 'Spryfield', distance: 10 },
      { name: 'Hammonds Plains', nameFr: 'Hammonds Plains', distance: 20 },
      { name: 'Fall River', nameFr: 'Fall River', distance: 25 },
      { name: 'Waverley', nameFr: 'Waverley', distance: 20 },
      { name: 'Musquodoboit Harbour', nameFr: 'Musquodoboit Harbour', distance: 40 },
      { name: 'Chester', nameFr: 'Chester', distance: 50 }
    ]
  },

  'Saskatoon': {
    province: 'Saskatchewan',
    provinceCode: 'SK',
    coordinates: { lat: 52.1579, lng: -106.6702 },
    timezone: 'America/Regina',
    population: 295095,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Martensville', nameFr: 'Martensville', distance: 15 },
      { name: 'Warman', nameFr: 'Warman', distance: 20 },
      { name: 'Osler', nameFr: 'Osler', distance: 25 },
      { name: 'Dalmeny', nameFr: 'Dalmeny', distance: 30 },
      { name: 'Langham', nameFr: 'Langham', distance: 35 },
      { name: 'Waldheim', nameFr: 'Waldheim', distance: 40 },
      { name: 'Hague', nameFr: 'Hague', distance: 35 },
      { name: 'Rosthern', nameFr: 'Rosthern', distance: 45 },
      { name: 'Laird', nameFr: 'Laird', distance: 40 },
      { name: 'Borden', nameFr: 'Borden', distance: 50 },
      { name: 'Radisson', nameFr: 'Radisson', distance: 55 }
    ]
  },

  'Regina': {
    province: 'Saskatchewan',
    provinceCode: 'SK',
    coordinates: { lat: 50.4452, lng: -104.6189 },
    timezone: 'America/Regina',
    population: 215106,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'White City', nameFr: 'White City', distance: 20 },
      { name: 'Emerald Park', nameFr: 'Emerald Park', distance: 20 },
      { name: 'Balgonie', nameFr: 'Balgonie', distance: 25 },
      { name: 'Pilot Butte', nameFr: 'Pilot Butte', distance: 25 },
      { name: 'Lumsden', nameFr: 'Lumsden', distance: 30 },
      { name: 'Craven', nameFr: 'Craven', distance: 35 },
      { name: 'Southey', nameFr: 'Southey', distance: 40 },
      { name: 'Lipton', nameFr: 'Lipton', distance: 45 },
      { name: 'Sintaluta', nameFr: 'Sintaluta', distance: 50 },
      { name: 'Indian Head', nameFr: 'Indian Head', distance: 55 },
      { name: 'Fort Qu\'Appelle', nameFr: 'Fort Qu\'Appelle', distance: 50 }
    ]
  },

  'St. John\'s': {
    province: 'Newfoundland and Labrador',
    provinceCode: 'NL',
    coordinates: { lat: 47.5615, lng: -52.7126 },
    timezone: 'America/St_Johns',
    population: 108860,
    serviceRadius: 60,
    nearbyTowns: [
      { name: 'Mount Pearl', nameFr: 'Mount Pearl', distance: 5 },
      { name: 'Paradise', nameFr: 'Paradise', distance: 10 },
      { name: 'Conception Bay South', nameFr: 'Conception Bay South', distance: 15 },
      { name: 'Torbay', nameFr: 'Torbay', distance: 10 },
      { name: 'Logy Bay-Middle Cove-Outer Cove', nameFr: 'Logy Bay-Middle Cove-Outer Cove', distance: 15 },
      { name: 'Portugal Cove-St. Philip\'s', nameFr: 'Portugal Cove-St. Philip\'s', distance: 15 },
      { name: 'Pouch Cove', nameFr: 'Pouch Cove', distance: 20 },
      { name: 'Flatrock', nameFr: 'Flatrock', distance: 20 },
      { name: 'Bauline', nameFr: 'Bauline', distance: 25 },
      { name: 'Witless Bay', nameFr: 'Witless Bay', distance: 30 },
      { name: 'Bay Bulls', nameFr: 'Bay Bulls', distance: 35 },
      { name: 'Petty Harbour-Maddox Cove', nameFr: 'Petty Harbour-Maddox Cove', distance: 20 }
    ]
  }
};

// Helper functions
export const getCityCluster = (cityName) => {
  return CANADA_CITY_CLUSTERS[cityName] || null;
};

export const getNearbyTowns = (cityName) => {
  const cluster = getCityCluster(cityName);
  return cluster ? cluster.nearbyTowns : [];
};

export const getAllCities = () => {
  return Object.keys(CANADA_CITY_CLUSTERS);
};

export const getCitiesByProvince = (provinceCode) => {
  return Object.entries(CANADA_CITY_CLUSTERS)
    .filter(([_, data]) => data.provinceCode === provinceCode)
    .map(([cityName, _]) => cityName);
};

export const searchCities = (query) => {
  const searchTerm = query.toLowerCase();
  return Object.entries(CANADA_CITY_CLUSTERS)
    .filter(([cityName, data]) => 
      cityName.toLowerCase().includes(searchTerm) ||
      data.nearbyTowns.some(town => 
        town.name.toLowerCase().includes(searchTerm) ||
        (town.nameFr && town.nameFr.toLowerCase().includes(searchTerm))
      )
    )
    .map(([cityName, data]) => ({ cityName, data }));
};

export const getServiceAreaTowns = (cityName, maxDistance = 60) => {
  const cluster = getCityCluster(cityName);
  if (!cluster) return [];
  
  return cluster.nearbyTowns
    .filter(town => town.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
};

// Export for admin management
export const updateCityCluster = (cityName, updates) => {
  if (CANADA_CITY_CLUSTERS[cityName]) {
    CANADA_CITY_CLUSTERS[cityName] = { ...CANADA_CITY_CLUSTERS[cityName], ...updates };
    return true;
  }
  return false;
};

export const addNearbyTown = (cityName, town) => {
  const cluster = getCityCluster(cityName);
  if (cluster) {
    cluster.nearbyTowns.push(town);
    return true;
  }
  return false;
};

export const removeNearbyTown = (cityName, townName) => {
  const cluster = getCityCluster(cityName);
  if (cluster) {
    cluster.nearbyTowns = cluster.nearbyTowns.filter(town => town.name !== townName);
    return true;
  }
  return false;
};
