// Database-driven city data from Supabase listings
// This data is extracted from actual just_listed and sold_listings tables

export const DATABASE_CITIES = [
  { name: 'Amherstburg', state: 'ON', country: 'CA' },
  { name: 'Brampton', state: 'ON', country: 'CA' },
  { name: 'Burlington', state: 'ON', country: 'CA' },
  { name: 'Chatham-Kent', state: 'ON', country: 'CA' },
  { name: 'Chatham-Kent', state: 'MI', country: 'US' },
  { name: 'Essex', state: 'ON', country: 'CA' },
  { name: 'Kingsville', state: 'ON', country: 'CA' },
  { name: 'Lakeshore', state: 'ON', country: 'CA' },
  { name: 'Lasalle', state: 'ON', country: 'CA' },
  { name: 'Leamington', state: 'ON', country: 'CA' },
  { name: 'Markham', state: 'ON', country: 'CA' },
  { name: 'Mississauga', state: 'ON', country: 'CA' },
  { name: 'Oakville', state: 'ON', country: 'CA' },
  { name: 'Richmond Hill', state: 'ON', country: 'CA' },
  { name: 'Tecumseh', state: 'ON', country: 'CA' },
  { name: 'Toronto', state: 'ON', country: 'CA' },
  { name: 'Vaughan', state: 'ON', country: 'CA' },
  { name: 'Windsor', state: 'ON', country: 'CA' },
];

// Helper function to get cities formatted for Combobox
export const getCitiesForCombobox = () => {
  return DATABASE_CITIES.map(city => ({
    value: `${city.name}, ${city.state}`,
    label: `${city.name}, ${city.state}`,
    city: city.name,
    state: city.state,
    country: city.country
  }));
};

// Helper function to get cities grouped by state
export const getCitiesByState = () => {
  const grouped = {};
  DATABASE_CITIES.forEach(city => {
    const stateKey = `${city.state}, ${city.country}`;
    if (!grouped[stateKey]) {
      grouped[stateKey] = [];
    }
    grouped[stateKey].push(city);
  });
  return grouped;
};

// Helper function to search cities
export const searchCities = (searchTerm) => {
  if (!searchTerm) return DATABASE_CITIES;
  
  const term = searchTerm.toLowerCase();
  return DATABASE_CITIES.filter(city => 
    city.name.toLowerCase().includes(term) ||
    city.state.toLowerCase().includes(term)
  );
};

// Helper function to get city display name
export const getCityDisplayName = (cityName, stateCode) => {
  return `${cityName}, ${stateCode}`;
};

// Helper function to parse city from display name
export const parseCityFromDisplayName = (displayName) => {
  const parts = displayName.split(', ');
  return {
    name: parts[0],
    state: parts[1] || '',
    displayName: displayName
  };
};
