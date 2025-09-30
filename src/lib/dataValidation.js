// Data validation utilities for listings

export const validateListingData = (listing) => {
  const errors = [];
  
  // Required fields
  if (!listing.id) errors.push('Missing listing ID');
  if (!listing.addressstreet) errors.push('Missing street address');
  if (!listing.addressCity) errors.push('Missing city');
  if (!listing.addressState) errors.push('Missing state');
  
  // Optional but important fields
  if (listing.unformattedPrice && (isNaN(listing.unformattedPrice) || listing.unformattedPrice < 0)) {
    errors.push('Invalid price value');
  }
  
  if (listing.beds && (isNaN(listing.beds) || listing.beds < 0)) {
    errors.push('Invalid beds value');
  }
  
  if (listing.baths && (isNaN(listing.baths) || listing.baths < 0)) {
    errors.push('Invalid baths value');
  }
  
  if (listing.area && (isNaN(listing.area) || listing.area < 0)) {
    errors.push('Invalid area value');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeListingData = (listing) => {
  return {
    ...listing,
    addressStreet: listing.addressstreet?.trim() || '',
    addressCity: listing.addresscity?.trim() || '',
    addressState: listing.addressstate?.trim() || '',
    addressZipcode: listing.addresszipcode?.trim() || '',
    unformattedPrice: listing.unformattedPrice ? Number(listing.unformattedPrice) : null,
    beds: listing.beds ? Number(listing.beds) : null,
    baths: listing.baths ? Number(listing.baths) : null,
    area: listing.area ? Number(listing.area) : null,
    statusText: listing.statustext?.trim() || 'Unknown',
  };
};

export const formatListingForDisplay = (listing) => {
  const sanitized = sanitizeListingData(listing);
  
  return {
    ...sanitized,
    formattedPrice: sanitized.unformattedPrice 
      ? `$${sanitized.unformattedPrice.toLocaleString()}` 
      : 'N/A',
    formattedArea: sanitized.area 
      ? `${sanitized.area.toLocaleString()} sq ft` 
      : 'N/A',
    formattedDate: sanitized.created_at 
      ? new Date(sanitized.created_at).toLocaleDateString() 
      : 'N/A',
    fullAddress: `${sanitized.addressStreet}, ${sanitized.addressCity}, ${sanitized.addressState} ${sanitized.addressZipcode}`.trim(),
  };
};

export const validateFilters = (filters) => {
  const errors = [];
  
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    errors.push('Minimum price cannot be greater than maximum price');
  }
  
  if (filters.minSqft && filters.maxSqft && filters.minSqft > filters.maxSqft) {
    errors.push('Minimum square footage cannot be greater than maximum square footage');
  }
  
  if (filters.minPrice && (isNaN(filters.minPrice) || filters.minPrice < 0)) {
    errors.push('Invalid minimum price');
  }
  
  if (filters.maxPrice && (isNaN(filters.maxPrice) || filters.maxPrice < 0)) {
    errors.push('Invalid maximum price');
  }
  
  if (filters.beds && (isNaN(filters.beds) || filters.beds < 0 || filters.beds > 20)) {
    errors.push('Invalid number of bedrooms');
  }
  
  if (filters.baths && (isNaN(filters.baths) || filters.baths < 0 || filters.baths > 20)) {
    errors.push('Invalid number of bathrooms');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeFilters = (filters) => {
  const sanitized = { ...filters };
  
  // Convert string numbers to actual numbers
  if (sanitized.minPrice) sanitized.minPrice = Number(sanitized.minPrice);
  if (sanitized.maxPrice) sanitized.maxPrice = Number(sanitized.maxPrice);
  if (sanitized.beds) sanitized.beds = Number(sanitized.beds);
  if (sanitized.baths) sanitized.baths = Number(sanitized.baths);
  if (sanitized.minSqft) sanitized.minSqft = Number(sanitized.minSqft);
  if (sanitized.maxSqft) sanitized.maxSqft = Number(sanitized.maxSqft);
  
  // Remove empty strings and null values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  return sanitized;
};
