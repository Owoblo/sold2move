import { supabase } from '@/lib/customSupabaseClient';

export async function fetchJustListed(runId, cityName, page = 1, pageSize = 20, filters = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('listings1')
    .select('id,zpid,imgSrc,detailUrl,addressStreet,addressCity,addressState,addressZipcode,price,unformattedPrice,beds,baths,area,statusText', { count: 'exact' })
    .eq('lastRunId', runId)
    .lte('lastPage', 4)
    .order('unformattedPrice', { ascending: false })
    .range(from, to);

  if (cityName) {
    query = query.eq('addressCity', cityName);
  }
  
  if (filters.minPrice) {
    query = query.gte('unformattedPrice', filters.minPrice);
  }
  if (filters.maxPrice) {
    query = query.lte('unformattedPrice', filters.maxPrice);
  }
  if (filters.beds) {
    query = query.gte('beds', filters.beds);
  }
  if (filters.baths) {
    query = query.gte('baths', filters.baths);
  }
  if (filters.propertyType) {
    query = query.eq('statusText', filters.propertyType);
  }
  if (filters.minSqft) {
    query = query.gte('area', filters.minSqft);
  }
  if (filters.maxSqft) {
    query = query.lte('area', filters.maxSqft);
  }


  const { data, error, count } = await query;

  if (error) throw error;
  
  return { data, count };
}

export async function fetchSoldSincePrev(currentRunId, prevRunId, cityName, filters = {}) {
  let { data, error } = await supabase
    .rpc('sold_since_prev', {
      current_run: currentRunId,
      previous_run: prevRunId,
      city_filter: cityName
    });

  if (error) throw error;
  
  let filteredData = data ?? [];

  if (Object.keys(filters).length > 0) {
    filteredData = filteredData.filter(listing => {
        if (filters.minPrice && listing.unformattedPrice < filters.minPrice) return false;
        if (filters.maxPrice && listing.unformattedPrice > filters.maxPrice) return false;
        if (filters.beds && listing.beds < filters.beds) return false;
        if (filters.baths && listing.baths < filters.baths) return false;
        if (filters.propertyType && listing.statusText !== filters.propertyType) return false;
        if (filters.minSqft && listing.area < filters.minSqft) return false;
        if (filters.maxSqft && listing.area > filters.maxSqft) return false;
        return true;
    });
  }

  return filteredData.map((r) => ({
    id: r.id,
    zpid: r.zpid,
    imgSrc: r.imgSrc,
    detailUrl: r.detailUrl,
    addressStreet: r.addressStreet,
    addressCity: r.addressCity,
    addressState: r.addressState,
    addressZipcode: r.addressZipcode,
    price: r.price,
    unformattedPrice: r.unformattedPrice,
    beds: r.beds,
    baths: r.baths,
    area: r.area,
    statusText: r.statusText,
  }));
}

export async function fetchListingById(listingId) {
  const { data, error } = await supabase
    .from('listings1')
    .select('*')
    .eq('id', listingId)
    .single();

  if (error) {
    console.error('Error fetching listing by ID:', error);
    throw error;
  }

  return data;
}

export async function fetchRevealedListings(userId, listingIds) {
  if (!userId || !listingIds || listingIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('listing_reveals')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);

  if (error) {
    console.error('Error fetching revealed listings:', error);
    throw error;
  }

  return data || [];
}