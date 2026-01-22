// Utility functions for filtering logic

export const hasActiveFilters = (filters, profile) => {
  return Object.entries(filters).some(([key, value]) => {
    // Skip city_name as it's not a user-applied filter
    if (key === 'city_name') return false;

    // Skip dateRange if it's 'all' (default value)
    if (key === 'dateRange' && value === 'all') return false;

    // Skip furnitureStatus if it's 'all' (default value)
    if (key === 'furnitureStatus' && value === 'all') return false;

    // Check if value is meaningful (not null, undefined, empty string, or 'all')
    return value !== null &&
           value !== undefined &&
           value !== '' &&
           value !== 'all' &&
           value !== profile?.city_name;
  });
};

export const getFilterCount = (filters, profile) => {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'city_name') return false;
    if (key === 'dateRange' && value === 'all') return false;
    if (key === 'furnitureStatus' && value === 'all') return false;
    return value !== null &&
           value !== undefined &&
           value !== '' &&
           value !== 'all' &&
           value !== profile?.city_name;
  }).length;
};

export const clearAllFilters = (profile, preserveCities = true) => {
  // Get city names from service_cities or fall back to city_name
  let cityNames = [];
  if (preserveCities) {
    if (profile?.service_cities && profile.service_cities.length > 0) {
      cityNames = profile.service_cities.map(cityState => {
        const [cityName] = cityState.split(', ');
        return cityName;
      });
    } else if (profile?.city_name) {
      cityNames = [profile.city_name];
    }
  }

  return {
    city_name: cityNames,
    searchTerm: '',
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    propertyType: null,
    minSqft: null,
    maxSqft: null,
    dateRange: 'all',
    furnitureStatus: 'all',
  };
};

export const getFilterDisplayText = (filters, profile) => {
  const activeFilters = [];

  if (filters.searchTerm) {
    activeFilters.push(`Search: "${filters.searchTerm}"`);
  }

  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `$${filters.minPrice.toLocaleString()}` : 'Any';
    const max = filters.maxPrice ? `$${filters.maxPrice.toLocaleString()}` : 'Any';
    activeFilters.push(`Price: ${min} - ${max}`);
  }

  if (filters.beds) {
    activeFilters.push(`${filters.beds}+ Beds`);
  }

  if (filters.baths) {
    activeFilters.push(`${filters.baths}+ Baths`);
  }

  if (filters.propertyType) {
    activeFilters.push(`Type: ${filters.propertyType}`);
  }

  if (filters.minSqft || filters.maxSqft) {
    const min = filters.minSqft ? `${filters.minSqft.toLocaleString()}` : 'Any';
    const max = filters.maxSqft ? `${filters.maxSqft.toLocaleString()}` : 'Any';
    activeFilters.push(`Size: ${min} - ${max} sq ft`);
  }

  if (filters.dateRange && filters.dateRange !== 'all') {
    if (typeof filters.dateRange === 'object' && filters.dateRange.label) {
      activeFilters.push(`Date: ${filters.dateRange.label}`);
    } else {
      activeFilters.push(`Date: Last ${filters.dateRange} days`);
    }
  }

  if (filters.furnitureStatus && filters.furnitureStatus !== 'all') {
    activeFilters.push(`Furniture: ${filters.furnitureStatus === 'furnished' ? 'Furnished' : 'Empty'}`);
  }

  return activeFilters;
};
