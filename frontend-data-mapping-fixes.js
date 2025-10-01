// Frontend Data Mapping Fixes for Sold2Move
// These functions ensure consistent data mapping between database and frontend

/**
 * Maps database listing data to frontend component format
 * This ensures consistent property names across all components
 */
export function mapDatabaseListingToFrontend(dbListing) {
  if (!dbListing) return null;

  return {
    // Core identifiers
    id: dbListing.id,
    zpid: dbListing.zpid,
    
    // Images and URLs
    imgSrc: dbListing.imgsrc,
    detailUrl: dbListing.detailurl,
    
    // Address information (ensure consistent mapping)
    address: dbListing.address || dbListing.addressstreet,
    addressStreet: dbListing.addressstreet, // Map lowercase DB to camelCase frontend
    addresscity: dbListing.addresscity,
    addressstate: dbListing.addressstate,
    addressZipcode: dbListing.addresszipcode,
    lastcity: dbListing.lastcity,
    
    // Price information
    price: dbListing.price, // Text field
    unformattedprice: dbListing.unformattedprice, // Numeric field for calculations
    
    // Property details
    beds: dbListing.beds,
    baths: dbListing.baths,
    area: dbListing.area,
    statustext: dbListing.statustext,
    
    // Timestamps
    lastseenat: dbListing.lastseenat,
    created_at: dbListing.created_at,
    
    // Additional fields
    run_id: dbListing.run_id || dbListing.lastrunid,
    isjustlisted: dbListing.isjustlisted,
    
    // JSONB fields (parse if they're strings)
    latlong: typeof dbListing.latlong === 'string' 
      ? JSON.parse(dbListing.latlong) 
      : dbListing.latlong,
    hdpdata: typeof dbListing.hdpdata === 'string' 
      ? JSON.parse(dbListing.hdpdata) 
      : dbListing.hdpdata,
    carouselphotos: typeof dbListing.carouselphotos === 'string' 
      ? JSON.parse(dbListing.carouselphotos) 
      : dbListing.carouselphotos,
  };
}

/**
 * Maps multiple database listings to frontend format
 */
export function mapDatabaseListingsToFrontend(dbListings) {
  if (!Array.isArray(dbListings)) return [];
  
  return dbListings
    .map(mapDatabaseListingToFrontend)
    .filter(Boolean); // Remove any null/undefined entries
}

/**
 * Validates listing data before display
 */
export function validateListingData(listing) {
  if (!listing) return { isValid: false, errors: ['Listing is null or undefined'] };
  
  const errors = [];
  
  // Required fields
  if (!listing.id) errors.push('Missing listing ID');
  if (!listing.zpid) errors.push('Missing ZPID');
  
  // Address validation
  if (!listing.addressStreet && !listing.address) {
    errors.push('Missing address information');
  }
  
  if (!listing.addresscity) {
    errors.push('Missing city information');
  }
  
  if (!listing.addressstate) {
    errors.push('Missing state information');
  }
  
  // Numeric field validation
  if (listing.beds !== null && listing.beds !== undefined && (listing.beds < 0 || listing.beds > 20)) {
    errors.push(`Invalid beds value: ${listing.beds}`);
  }
  
  if (listing.baths !== null && listing.baths !== undefined && (listing.baths < 0 || listing.baths > 20)) {
    errors.push(`Invalid baths value: ${listing.baths}`);
  }
  
  if (listing.area !== null && listing.area !== undefined && (listing.area < 0 || listing.area > 100000)) {
    errors.push(`Invalid area value: ${listing.area}`);
  }
  
  if (listing.unformattedprice !== null && listing.unformattedprice !== undefined && (listing.unformattedprice < 0 || listing.unformattedprice > 100000000)) {
    errors.push(`Invalid price value: ${listing.unformattedprice}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formats listing data for display
 */
export function formatListingForDisplay(listing) {
  if (!listing) return null;
  
  const validation = validateListingData(listing);
  if (!validation.isValid) {
    console.warn('Invalid listing data:', validation.errors);
    return null;
  }
  
  return {
    ...listing,
    
    // Formatted display values
    formattedPrice: listing.unformattedprice 
      ? `$${listing.unformattedprice.toLocaleString()}` 
      : 'N/A',
    
    formattedArea: listing.area 
      ? `${listing.area.toLocaleString()} sq ft` 
      : 'N/A',
    
    formattedBeds: listing.beds !== null && listing.beds !== undefined 
      ? listing.beds.toString() 
      : 'N/A',
    
    formattedBaths: listing.baths !== null && listing.baths !== undefined 
      ? listing.baths.toString() 
      : 'N/A',
    
    formattedDate: listing.lastseenat 
      ? new Date(listing.lastseenat).toLocaleDateString() 
      : 'N/A',
    
    fullAddress: [
      listing.addressStreet,
      listing.addresscity,
      listing.addressstate,
      listing.addressZipcode
    ].filter(Boolean).join(', '),
    
    shortAddress: listing.addressStreet || 'Address not available',
  };
}

/**
 * Maps listing data for CSV export
 */
export function mapListingForExport(listing, isRevealed = false) {
  if (!listing) return {};
  
  return {
    Address: isRevealed ? listing.addressStreet : '*****',
    City: listing.addresscity,
    State: listing.addressstate,
    'Zip Code': listing.addressZipcode,
    Price: isRevealed && listing.unformattedprice 
      ? `$${listing.unformattedprice.toLocaleString()}` 
      : '*****',
    Beds: isRevealed && listing.beds !== null && listing.beds !== undefined 
      ? listing.beds.toString() 
      : '***',
    Baths: isRevealed && listing.baths !== null && listing.baths !== undefined 
      ? listing.baths.toString() 
      : '***',
    'Sq. Ft.': isRevealed && listing.area 
      ? listing.area.toLocaleString() 
      : '****',
    'Property Type': isRevealed && listing.statustext 
      ? listing.statustext 
      : '****',
    'Date Listed': listing.lastseenat 
      ? new Date(listing.lastseenat).toLocaleDateString() 
      : 'N/A',
    ZPID: listing.zpid,
  };
}

/**
 * Maps multiple listings for CSV export
 */
export function mapListingsForExport(listings, revealedListings = new Set()) {
  if (!Array.isArray(listings)) return [];
  
  return listings.map(listing => 
    mapListingForExport(listing, revealedListings.has(listing.id))
  );
}

/**
 * Creates a consistent filter object for API calls
 */
export function createFilterObject(filters) {
  const cleanFilters = {};
  
  // City filter (support both single and multiple cities)
  if (filters.city_name) {
    cleanFilters.city_name = Array.isArray(filters.city_name) 
      ? filters.city_name 
      : [filters.city_name];
  }
  
  // Search term
  if (filters.searchTerm && filters.searchTerm.trim()) {
    cleanFilters.searchTerm = filters.searchTerm.trim();
  }
  
  // Price filters
  if (filters.minPrice && filters.minPrice > 0) {
    cleanFilters.minPrice = Number(filters.minPrice);
  }
  
  if (filters.maxPrice && filters.maxPrice > 0) {
    cleanFilters.maxPrice = Number(filters.maxPrice);
  }
  
  // Property details
  if (filters.beds && filters.beds > 0) {
    cleanFilters.beds = Number(filters.beds);
  }
  
  if (filters.baths && filters.baths > 0) {
    cleanFilters.baths = Number(filters.baths);
  }
  
  if (filters.propertyType && filters.propertyType !== 'all') {
    cleanFilters.propertyType = filters.propertyType;
  }
  
  // Area filters
  if (filters.minSqft && filters.minSqft > 0) {
    cleanFilters.minSqft = Number(filters.minSqft);
  }
  
  if (filters.maxSqft && filters.maxSqft > 0) {
    cleanFilters.maxSqft = Number(filters.maxSqft);
  }
  
  // Date range
  if (filters.dateRange && filters.dateRange !== 'all') {
    cleanFilters.dateRange = filters.dateRange;
  }
  
  return cleanFilters;
}

/**
 * Validates filter object before sending to API
 */
export function validateFilters(filters) {
  const errors = [];
  
  // Check for invalid price ranges
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    errors.push('Minimum price cannot be greater than maximum price');
  }
  
  // Check for invalid area ranges
  if (filters.minSqft && filters.maxSqft && filters.minSqft > filters.maxSqft) {
    errors.push('Minimum square footage cannot be greater than maximum square footage');
  }
  
  // Check for reasonable price limits
  if (filters.minPrice && filters.minPrice < 0) {
    errors.push('Minimum price cannot be negative');
  }
  
  if (filters.maxPrice && filters.maxPrice > 100000000) {
    errors.push('Maximum price seems unreasonably high');
  }
  
  // Check for reasonable area limits
  if (filters.minSqft && filters.minSqft < 0) {
    errors.push('Minimum square footage cannot be negative');
  }
  
  if (filters.maxSqft && filters.maxSqft > 100000) {
    errors.push('Maximum square footage seems unreasonably high');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a consistent sort object for API calls
 */
export function createSortObject(sortBy, sortOrder) {
  const validSortFields = ['date', 'price', 'beds', 'baths', 'area'];
  const validSortOrders = ['asc', 'desc'];
  
  return {
    sortBy: validSortFields.includes(sortBy) ? sortBy : 'date',
    sortOrder: validSortOrders.includes(sortOrder) ? sortOrder : 'desc'
  };
}

/**
 * Utility function to check if a listing is revealed
 */
export function isListingRevealed(listingId, revealedListings, userProfile) {
  if (userProfile?.unlimited) return true;
  if (!revealedListings) return false;
  
  return revealedListings.has(listingId);
}

/**
 * Utility function to get display value for a field
 */
export function getDisplayValue(value, isRevealed, placeholder = '*****') {
  if (isRevealed) {
    return value !== null && value !== undefined ? value : 'N/A';
  }
  return placeholder;
}

/**
 * Utility function to format price for display
 */
export function formatPrice(price, isRevealed) {
  if (!isRevealed) return '*****';
  if (!price || price === null || price === undefined) return 'N/A';
  return `$${price.toLocaleString()}`;
}

/**
 * Utility function to format area for display
 */
export function formatArea(area, isRevealed) {
  if (!isRevealed) return '****';
  if (!area || area === null || area === undefined) return 'N/A';
  return `${area.toLocaleString()} sq ft`;
}

/**
 * Utility function to format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.warn('Invalid date string:', dateString);
    return 'N/A';
  }
}

// Export all functions
export default {
  mapDatabaseListingToFrontend,
  mapDatabaseListingsToFrontend,
  validateListingData,
  formatListingForDisplay,
  mapListingForExport,
  mapListingsForExport,
  createFilterObject,
  validateFilters,
  createSortObject,
  isListingRevealed,
  getDisplayValue,
  formatPrice,
  formatArea,
  formatDate
};
