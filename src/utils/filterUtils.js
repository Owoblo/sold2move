// Utility functions for filtering logic

export const hasActiveFilters = (filters, profile) => {
  return Object.entries(filters).some(([key, value]) => {
    // Skip city_name as it's not a user-applied filter
    if (key === 'city_name') return false;
    
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
    return value !== null && 
           value !== undefined && 
           value !== '' && 
           value !== 'all' && 
           value !== profile?.city_name;
  }).length;
};

export const clearAllFilters = (profile) => {
  return {
    city_name: profile?.city_name,
    searchTerm: '',
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    propertyType: null,
    minSqft: null,
    maxSqft: null,
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
  
  return activeFilters;
};
