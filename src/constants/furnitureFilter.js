// Cities where furniture filter data is available (LA area)
export const LA_AREA_CITIES = [
  'Los Angeles',
  'Beverly Hills',
  'Santa Monica',
  'Pasadena',
  'Long Beach',
  'Glendale',
  'Burbank'
];

// Check if furniture filter should be shown for selected cities
export const isFurnitureFilterAvailable = (cityNames) => {
  if (!cityNames || cityNames.length === 0) return false;

  // Check if any selected city is in LA area (case-insensitive)
  return cityNames.some(city =>
    LA_AREA_CITIES.some(laCity =>
      city.toLowerCase().includes(laCity.toLowerCase())
    )
  );
};

// Furniture status dropdown options
export const FURNITURE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Properties' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'empty', label: 'Empty/Unfurnished' }
];
