import { supabase } from '@/lib/customSupabaseClient';
import { handleDatabaseError, handleQueryError, retryWithBackoff } from '@/lib/errorHandler';

// Utility function to get the most recent run that has data
export async function getMostRecentRunWithData() {
  try {
    const { data: runsWithData, error: runsError } = await supabase
      .from('runs')
      .select('id')
      .order('started_at', { ascending: false });

    if (runsError) {
      throw handleDatabaseError(runsError, 'getMostRecentRunWithData', {
        table: 'runs',
        operation: 'select_runs'
      });
    }

    if (!runsWithData || runsWithData.length === 0) {
      throw new Error('No runs found in database');
    }

    return runsWithData[0].id;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch listings from the unified listings table
 * @param {string} status - Filter by status: 'just_listed', 'sold', 'active', or null for all
 * @param {string|array} cityName - City name(s) to filter by
 * @param {number} page - Page number for pagination
 * @param {number} pageSize - Number of items per page
 * @param {object} filters - Additional filters (price, beds, baths, dates, countryCode, etc.)
 */
export async function fetchListings(status = null, cityName = null, page = 1, pageSize = 20, filters = {}) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query - fetching from unified 'listings' table
    let query = supabase
      .from('listings')
      .select('zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,status,lastseenat,first_seen_at,last_updated_at', { count: 'exact' })
      .range(from, to);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Order by lastseenat (most recent first)
    query = query.order('lastseenat', { ascending: false });

    // Country filtering based on state codes
    if (filters.countryCode) {
      if (filters.countryCode === 'CA') {
        query = query.in('addressstate', CA_PROVINCES);
      } else if (filters.countryCode === 'US') {
        // Exclude Canadian provinces to get only US states
        query = query.not('addressstate', 'in', `(${CA_PROVINCES.join(',')})`);
      }
    }

    // City filtering
    if (cityName) {
      if (Array.isArray(cityName)) {
        // Multiple cities
        query = query.in('lastcity', cityName);
      } else {
        // Single city - try both lastcity and addresscity columns
        query = query.or(`lastcity.eq.${cityName},addresscity.eq.${cityName}`);
      }
    }

    // Date filtering
    if (filters.dateRange && filters.dateRange !== 'all') {
      if (typeof filters.dateRange === 'object' && filters.dateRange.type === 'custom') {
        // Custom date range (specific day)
        query = query.gte('lastseenat', filters.dateRange.startDate);
        query = query.lte('lastseenat', filters.dateRange.endDate);
      } else {
        // Preset date range (last X days)
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('lastseenat', cutoffDate.toISOString());
      }
    }

    // Price filtering
    if (filters.minPrice) {
      query = query.gte('unformattedprice', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('unformattedprice', filters.maxPrice);
    }

    // Beds/Baths filtering
    if (filters.beds) {
      query = query.gte('beds', filters.beds);
    }
    if (filters.baths) {
      query = query.gte('baths', filters.baths);
    }

    // Property type filtering
    if (filters.propertyType) {
      query = query.eq('statustext', filters.propertyType);
    }

    // Square footage filtering
    if (filters.minSqft) {
      query = query.gte('area', filters.minSqft);
    }
    if (filters.maxSqft) {
      query = query.lte('area', filters.maxSqft);
    }

    // Search term filter - search across address, city, state, and zip
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.trim();
      query = query.or(`addressstreet.ilike.%${searchTerm}%,lastcity.ilike.%${searchTerm}%,addresscity.ilike.%${searchTerm}%,addressstate.ilike.%${searchTerm}%,addresszipcode.ilike.%${searchTerm}%`);
    }

    // AI Furniture Filter - only show properties with furniture if enabled
    if (filters.aiFurnitureFilter) {
      query = query.filter('ai_analysis', 'not.is', null)
                   .filter('ai_analysis->has_furniture', 'eq', true);
    }

    const { data, error, count } = await query;

    if (error) {
      throw handleDatabaseError(error, 'fetchListings', {
        table: 'listings',
        operation: 'select_listings',
        status,
        cityName,
        page,
        pageSize,
        filters
      });
    }

    // Map database column names to expected property names
    const mappedData = (data || []).map((r) => ({
      id: r.zpid, // Use zpid as id since there's no separate id column
      zpid: r.zpid,
      imgSrc: r.imgsrc,
      detailUrl: r.detailurl,
      addressStreet: r.addressstreet,
      lastcity: r.lastcity,
      addresscity: r.addresscity,
      addressstate: r.addressstate,
      addressZipcode: r.addresszipcode,
      price: r.price,
      unformattedprice: r.unformattedprice,
      beds: r.beds,
      baths: r.baths,
      area: r.area,
      statustext: r.statustext,
      status: r.status,
      lastseenat: r.lastseenat,
      created_at: r.first_seen_at, // Map first_seen_at to created_at
      updated_at: r.last_updated_at // Map last_updated_at to updated_at
    }));

    return { data: mappedData, count: count || 0 };
  } catch (error) {
    // Provide more specific error information
    if (error.code === 'PGRST116') {
      throw new Error('No data found for the specified criteria. Please check your filters or try again later.');
    } else if (error.code === 'PGRST301') {
      throw new Error('Database connection issue. Please try again in a moment.');
    } else if (error.message?.includes('column') || error.message?.includes('does not exist')) {
      throw new Error('Database structure issue. Please contact support.');
    }

    throw error;
  }
}

/**
 * Fetch just listed properties (wrapper for fetchListings with status='just_listed')
 * Kept for backward compatibility with existing code
 */
export async function fetchJustListed(runId, cityName, page = 1, pageSize = 20, filters = {}) {
  return fetchListings('just_listed', cityName, page, pageSize, filters);
}

/**
 * Fetch sold properties (wrapper for fetchListings with status='sold')
 * Kept for backward compatibility with existing code
 */
export async function fetchSoldSincePrev(currentRunId, prevRunId, cityName, filters = {}) {
  // For sold listings, we don't need pagination in the original function signature
  // but we'll add it for consistency
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  return fetchListings('sold', cityName, page, pageSize, filters);
}

/**
 * Fetch active properties (wrapper for fetchListings with status='active')
 */
export async function fetchActiveListings(cityName, page = 1, pageSize = 20, filters = {}) {
  return fetchListings('active', cityName, page, pageSize, filters);
}

/**
 * Fetch all listings regardless of status
 */
export async function fetchAllListings(cityName, page = 1, pageSize = 20, filters = {}) {
  return fetchListings(null, cityName, page, pageSize, filters);
}

/**
 * Fetch revealed listings for a specific user
 */
export async function fetchRevealedListings(userId, page = 1, pageSize = 20) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('listing_reveals')
      .select('listing_id, created_at, listings!inner(zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,status,lastseenat,first_seen_at)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw handleDatabaseError(error, 'fetchRevealedListings', {
        table: 'listing_reveals',
        operation: 'select_revealed_listings',
        userId,
        page,
        pageSize
      });
    }

    // Map the nested listings data
    const mappedData = (data || []).map((reveal) => {
      const listing = reveal.listings;
      return {
        id: listing.zpid, // Use zpid as id
        zpid: listing.zpid,
        imgSrc: listing.imgsrc,
        detailUrl: listing.detailurl,
        addressStreet: listing.addressstreet,
        lastcity: listing.lastcity,
        addresscity: listing.addresscity,
        addressstate: listing.addressstate,
        addressZipcode: listing.addresszipcode,
        price: listing.price,
        unformattedprice: listing.unformattedprice,
        beds: listing.beds,
        baths: listing.baths,
        area: listing.area,
        statustext: listing.statustext,
        status: listing.status,
        lastseenat: listing.lastseenat,
        created_at: listing.first_seen_at, // Map first_seen_at to created_at
        revealed_at: reveal.created_at
      };
    });

    return { data: mappedData, count: count || 0 };
  } catch (error) {
    throw error;
  }
}

/**
 * Reveal a listing (deduct credit and create reveal record)
 */
export async function revealListing(userId, listingId) {
  try {
    // Call the Supabase RPC function that handles credit deduction and reveal
    const { data, error } = await supabase.rpc('reveal_listing', {
      p_user_id: userId,
      p_listing_id: listingId
    });

    if (error) {
      throw handleDatabaseError(error, 'revealListing', {
        operation: 'reveal_listing_rpc',
        userId,
        listingId
      });
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch a single listing by zpid (Zillow Property ID)
 */
export async function fetchListingById(listingId) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,status,lastseenat,first_seen_at,last_updated_at')
      .eq('zpid', listingId)
      .single();

    if (error) {
      throw handleDatabaseError(error, 'fetchListingById', {
        table: 'listings',
        operation: 'select_single_listing',
        listingId
      });
    }

    if (!data) {
      throw new Error(`Listing with ID ${listingId} not found`);
    }

    // Map database column names to expected property names
    return {
      id: data.zpid, // Use zpid as id
      zpid: data.zpid,
      imgSrc: data.imgsrc,
      detailUrl: data.detailurl,
      addressStreet: data.addressstreet,
      lastcity: data.lastcity,
      addresscity: data.addresscity,
      addressstate: data.addressstate,
      addressZipcode: data.addresszipcode,
      price: data.price,
      unformattedprice: data.unformattedprice,
      beds: data.beds,
      baths: data.baths,
      area: data.area,
      statustext: data.statustext,
      status: data.status,
      lastseenat: data.lastseenat,
      created_at: data.first_seen_at, // Map first_seen_at to created_at
      updated_at: data.last_updated_at // Map last_updated_at to updated_at
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get listings count by status
 */
export async function getListingsCountByStatus(cityName = null) {
  try {
    let query = supabase
      .from('listings')
      .select('status', { count: 'exact', head: true });

    if (cityName) {
      if (Array.isArray(cityName)) {
        query = query.in('lastcity', cityName);
      } else {
        query = query.or(`lastcity.eq.${cityName},addresscity.eq.${cityName}`);
      }
    }

    // Get counts for each status
    const [justListedResult, soldResult, activeResult] = await Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'just_listed'),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    return {
      just_listed: justListedResult.count || 0,
      sold: soldResult.count || 0,
      active: activeResult.count || 0,
      total: (justListedResult.count || 0) + (soldResult.count || 0) + (activeResult.count || 0)
    };
  } catch (error) {
    throw error;
  }
}

// Canadian provinces/territories
const CA_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

/**
 * Fetch available cities from the listings table
 * Returns unique city/state combinations with listing counts
 * @param {string} countryCode - 'US', 'CA', or null for all
 * @returns {Promise<Array<{city: string, state: string, count: number}>>}
 */
export async function fetchAvailableCities(countryCode = null) {
  try {
    // Query to get city/state combinations from listings
    let query = supabase
      .from('listings')
      .select('lastcity, addressstate')
      .not('lastcity', 'is', null)
      .not('addressstate', 'is', null);

    // Filter by country based on state/province codes
    if (countryCode === 'CA') {
      query = query.in('addressstate', CA_PROVINCES);
    } else if (countryCode === 'US') {
      // Exclude Canadian provinces to get US states
      query = query.not('addressstate', 'in', `(${CA_PROVINCES.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('fetchAvailableCities error:', error);
      throw error;
    }

    // Deduplicate and count occurrences in JavaScript
    const cityMap = new Map();
    (data || []).forEach(row => {
      if (row.lastcity && row.addressstate) {
        const key = `${row.lastcity}-${row.addressstate}`;
        const existing = cityMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          cityMap.set(key, {
            city: row.lastcity,
            state: row.addressstate,
            count: 1
          });
        }
      }
    });

    // Convert to array and sort by count (most listings first)
    const cities = Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count);

    return cities;
  } catch (error) {
    console.error('fetchAvailableCities error:', error);
    throw error;
  }
}

/**
 * Fetch available states/provinces from the listings table
 * @param {string} countryCode - 'US', 'CA', or null for all
 * @returns {Promise<Array<{state: string, count: number}>>}
 */
export async function fetchAvailableStates(countryCode = null) {
  try {
    let query = supabase
      .from('listings')
      .select('addressstate')
      .not('addressstate', 'is', null);

    // Filter by country
    if (countryCode === 'CA') {
      query = query.in('addressstate', CA_PROVINCES);
    } else if (countryCode === 'US') {
      query = query.not('addressstate', 'in', `(${CA_PROVINCES.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('fetchAvailableStates error:', error);
      throw error;
    }

    // Count occurrences per state
    const stateMap = new Map();
    (data || []).forEach(row => {
      if (row.addressstate) {
        const existing = stateMap.get(row.addressstate);
        if (existing) {
          existing.count += 1;
        } else {
          stateMap.set(row.addressstate, {
            state: row.addressstate,
            count: 1
          });
        }
      }
    });

    // Convert to array and sort by count
    return Array.from(stateMap.values())
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('fetchAvailableStates error:', error);
    throw error;
  }
}
