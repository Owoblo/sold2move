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
    
    // Since just_listed doesn't have run_id column, just return the most recent run
    // and let the calling function handle the data fetching
    console.log(`Using most recent run: ${runsWithData[0].id}`);
    return runsWithData[0].id;
    
    throw new Error('No runs with data found - all runs are empty');
  } catch (error) {
    console.error('Error in getMostRecentRunWithData:', error);
    throw error;
  }
}

export async function fetchJustListed(runId, cityName, page = 1, pageSize = 20, filters = {}) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log(`Fetching just listed properties:`, {
      runId,
      cityName,
      page,
      pageSize,
      filters
    });

    // Since just_listed doesn't have run_id column, we'll just use the provided runId
    // for logging purposes but won't filter by it
    let actualRunId = runId;

    let query = supabase
      .from('just_listed')
      .select('id,zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,lastseenat,created_at', { count: 'exact' })
      .order('lastseenat', { ascending: false })
      .range(from, to);

    if (cityName) {
      if (Array.isArray(cityName)) {
        // Multiple cities
        query = query.in('lastcity', cityName);
        console.log(`Filtering by multiple cities:`, cityName);
      } else {
        // Single city
        query = query.eq('lastcity', cityName);
        console.log(`Filtering by single city:`, cityName);
      }
    }
    
    // Date filtering
    if (filters.dateRange && filters.dateRange !== 'all') {
      if (typeof filters.dateRange === 'object' && filters.dateRange.type === 'custom') {
        // Custom date range (specific day)
        query = query.gte('lastseenat', filters.dateRange.startDate);
        query = query.lte('lastseenat', filters.dateRange.endDate);
        console.log(`Custom date filtering: from ${filters.dateRange.startDate} to ${filters.dateRange.endDate}`);
      } else {
        // Preset date range (last X days)
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('lastseenat', cutoffDate.toISOString());
        console.log(`Date filtering: last ${days} days from ${cutoffDate.toISOString()}`);
      }
    }
    
    if (filters.minPrice) {
      query = query.gte('unformattedprice', filters.minPrice);
      console.log(`Min price filter: ${filters.minPrice}`);
    }
    if (filters.maxPrice) {
      query = query.lte('unformattedprice', filters.maxPrice);
      console.log(`Max price filter: ${filters.maxPrice}`);
    }
    if (filters.beds) {
      query = query.gte('beds', filters.beds);
      console.log(`Beds filter: ${filters.beds}`);
    }
    if (filters.baths) {
      query = query.gte('baths', filters.baths);
      console.log(`Baths filter: ${filters.baths}`);
    }
    if (filters.propertyType) {
      query = query.eq('statustext', filters.propertyType);
      console.log(`Property type filter: ${filters.propertyType}`);
    }
    if (filters.minSqft) {
      query = query.gte('area', filters.minSqft);
      console.log(`Min sqft filter: ${filters.minSqft}`);
    }
    if (filters.maxSqft) {
      query = query.lte('area', filters.maxSqft);
      console.log(`Max sqft filter: ${filters.maxSqft}`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw handleDatabaseError(error, 'fetchJustListed', {
        table: 'just_listed',
        operation: 'select_listings',
        runId: actualRunId,
        cityName,
        page,
        pageSize,
        filters
      });
    }
    
    console.log(`Successfully fetched ${data?.length || 0} just listed properties (total: ${count})`);
    
    // Map database column names to expected property names
    const mappedData = (data || []).map((r) => ({
      id: r.id, // Keep as number to match database BIGINT
      zpid: r.zpid,
      imgSrc: r.imgsrc,
      detailUrl: ensureZillowUrl(r.detailurl),
      addressStreet: r.addressstreet, // Map lowercase DB column to camelCase frontend property
      lastcity: r.lastcity,
      addresscity: r.addresscity,
      addressstate: r.addressstate,
      addressZipcode: r.addresszipcode,
      price: r.price,
      unformattedprice: r.unformattedprice, // Use lowercase to match component
      beds: r.beds,
      baths: r.baths,
      area: r.area,
      statustext: r.statustext, // Use lowercase to match component
      lastseenat: r.lastseenat,
      created_at: r.created_at
    }));
    
    return { data: mappedData, count: count || 0 };
  } catch (error) {
    console.error('Error in fetchJustListed:', error);
    throw error;
  }
}

export async function fetchSoldSincePrev(currentRunId, prevRunId, cityName, filters = {}) {
  try {
    console.log(`Fetching sold listings:`, {
      currentRunId,
      prevRunId,
      cityName,
      filters
    });

    // Query sold_listings table directly instead of using RPC
    // Since sold_listings doesn't have run_id column, we'll query without it
    let query = supabase
      .from('sold_listings')
      .select('id,zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,lastseenat,created_at');

    if (cityName) {
      if (Array.isArray(cityName)) {
        // Multiple cities
        query = query.in('lastcity', cityName);
        console.log(`Filtering sold listings by multiple cities:`, cityName);
      } else {
        // Single city
        query = query.eq('lastcity', cityName);
        console.log(`Filtering sold listings by single city:`, cityName);
      }
    }

    // Date filtering
    if (filters.dateRange && filters.dateRange !== 'all') {
      if (typeof filters.dateRange === 'object' && filters.dateRange.type === 'custom') {
        // Custom date range (specific day)
        query = query.gte('lastseenat', filters.dateRange.startDate);
        query = query.lte('lastseenat', filters.dateRange.endDate);
        console.log(`Custom date filtering sold listings: from ${filters.dateRange.startDate} to ${filters.dateRange.endDate}`);
      } else {
        // Preset date range (last X days)
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('lastseenat', cutoffDate.toISOString());
        console.log(`Date filtering sold listings: last ${days} days from ${cutoffDate.toISOString()}`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw handleDatabaseError(error, 'fetchSoldSincePrev', {
        table: 'sold_listings',
        operation: 'select_sold_listings',
        currentRunId,
        prevRunId,
        cityName,
        filters
      });
    }
    
    console.log(`Successfully fetched ${data?.length || 0} sold listings from database`);
    
    let filteredData = data ?? [];

    if (Object.keys(filters).length > 0) {
      console.log(`Applying client-side filters:`, filters);
      filteredData = filteredData.filter(listing => {
      if (filters.minPrice && listing.unformattedprice < filters.minPrice) return false;
      if (filters.maxPrice && listing.unformattedprice > filters.maxPrice) return false;
          if (filters.beds && listing.beds < filters.beds) return false;
          if (filters.baths && listing.baths < filters.baths) return false;
          if (filters.propertyType && listing.statustext !== filters.propertyType) return false;
          if (filters.minSqft && listing.area < filters.minSqft) return false;
          if (filters.maxSqft && listing.area > filters.maxSqft) return false;
          return true;
      });
      console.log(`After client-side filtering: ${filteredData.length} sold listings`);
    }

    const mappedData = filteredData.map((r) => ({
      id: r.id, // Keep as number to match database BIGINT
      zpid: r.zpid,
      imgSrc: r.imgsrc,
      detailUrl: ensureZillowUrl(r.detailurl),
      addressStreet: r.addressstreet, // Map lowercase DB column to camelCase frontend property
      lastcity: r.lastcity,
      addresscity: r.addresscity,
      addressstate: r.addressstate,
      addressZipcode: r.addresszipcode,
      price: r.price,
      unformattedprice: r.unformattedprice, // Use lowercase to match component
      beds: r.beds,
      baths: r.baths,
      area: r.area,
      statustext: r.statustext, // Use lowercase to match component
      lastseenat: r.lastseenat,
      created_at: r.created_at
    }));

    console.log(`Returning ${mappedData.length} mapped sold listings`);
    return mappedData;
  } catch (error) {
    console.error('Error in fetchSoldSincePrev:', error);
    throw error;
  }
}

export async function fetchListingById(listingId) {
  // Try to find the listing in just_listed first, then sold_listings
  let { data, error } = await supabase
    .from('just_listed')
    .select('*')
    .eq('id', listingId)
    .single();

  if (error || !data) {
    // If not found in just_listed, try sold_listings
    const { data: soldData, error: soldError } = await supabase
      .from('sold_listings')
      .select('*')
      .eq('id', listingId)
      .single();
    
    if (soldError) {
      console.error('Error fetching listing by ID:', soldError);
      throw soldError;
    }
    data = soldData;
  }

  if (!data) {
    return null;
  }

  // Map database column names to expected property names (consistent with other fetch functions)
  const mappedData = {
    id: data.id, // Keep as number to match database BIGINT
    zpid: data.zpid,
    imgSrc: data.imgsrc,
    detailUrl: ensureZillowUrl(data.detailurl),
    addressStreet: data.addressstreet, // Map lowercase DB column to camelCase frontend property
    lastcity: data.lastcity,
    addresscity: data.addresscity,
    addressstate: data.addressstate,
    addressZipcode: data.addresszipcode,
    price: data.price,
    unformattedprice: data.unformattedprice, // Use lowercase to match component
    beds: data.beds,
    baths: data.baths,
    area: data.area,
    statustext: data.statustext, // Use lowercase to match component
    lastseenat: data.lastseenat,
    created_at: data.created_at,
    run_id: data.run_id || data.lastrunid,
    isjustlisted: data.isjustlisted,
    
    // JSONB fields (parse if they're strings)
    latlong: typeof data.latlong === 'string' 
      ? JSON.parse(data.latlong) 
      : data.latlong,
    hdpData: typeof data.hdpdata === 'string' 
      ? JSON.parse(data.hdpdata) 
      : data.hdpdata,
    carouselPhotos: typeof data.carouselphotos === 'string' 
      ? JSON.parse(data.carouselphotos) 
      : data.carouselphotos,
    
    // Additional fields that might be needed
    brokerName: data.brokername || data.broker_name,
    detailurl: ensureZillowUrl(data.detailurl), // Ensure URL points to Zillow.com
  };

  return mappedData;
}

/**
 * Ensures that detail URLs point to Zillow.com instead of sold2move.com
 * This fixes URLs that might have been incorrectly stored in the database
 */
function ensureZillowUrl(detailUrl) {
  if (!detailUrl) return detailUrl;
  
  // If the URL contains sold2move.com, replace it with zillow.com
  if (detailUrl.includes('sold2move.com')) {
    return detailUrl.replace('sold2move.com', 'zillow.com');
  }
  
  // If the URL doesn't start with http/https, assume it's a relative path and prepend zillow.com
  if (!detailUrl.startsWith('http')) {
    return `https://www.zillow.com${detailUrl.startsWith('/') ? '' : '/'}${detailUrl}`;
  }
  
  return detailUrl;
}

export async function fetchRevealedListings(userId, listingIds) {
  if (!userId || !listingIds || listingIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('listing_reveals')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds.map(id => Number(id)));

  if (error) {
    console.error('Error fetching revealed listings:', error);
    throw error;
  }

  return data || [];
}