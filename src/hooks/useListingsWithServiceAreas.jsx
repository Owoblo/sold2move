import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';

// Query keys for consistent caching
export const serviceAreaListingKeys = {
  all: ['service-area-listings'],
  lists: () => [...serviceAreaListingKeys.all, 'list'],
  list: (filters, page) => [...serviceAreaListingKeys.lists(), { filters, page }],
  details: () => [...serviceAreaListingKeys.all, 'detail'],
  detail: (id) => [...serviceAreaListingKeys.details(), id],
  revealed: (userId) => [...serviceAreaListingKeys.all, 'revealed', userId],
};

// Fetch just listed properties filtered by user's service areas
export const useJustListedWithServiceAreas = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useQuery({
    queryKey: serviceAreaListingKeys.list(filters, page),
    queryFn: async () => {
      console.log('🔍 useJustListedWithServiceAreas: Starting query');
      console.log('🔍 Profile service cities:', profile?.service_cities);
      console.log('🔍 Profile main service city:', profile?.main_service_city);

      if (!profile?.service_cities || profile.service_cities.length === 0) {
        console.log('⚠️ No service cities configured, returning empty result');
        return {
          data: [],
          count: 0,
          totalPages: 0,
          serviceAreaInfo: null
        };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Extract city names from service cities (format: "City, State")
      const cityNames = profile.service_cities.map(cityState => {
        const [cityName] = cityState.split(', ');
        return cityName;
      });
      
      console.log('🔍 Querying just_listed table with service cities:', profile.service_cities);
      console.log('🔍 Extracted city names for query:', cityNames);

      // Query just_listed table directly with service area filtering
      let query = supabase
        .from('just_listed')
        .select('*', { count: 'exact' })
        .in('address_city', cityNames)
        .order('last_seen_at', { ascending: false })
        .range(from, to);

      // Apply additional filters
      if (filters.minPrice) {
        query = query.gte('unformatted_price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('unformatted_price', filters.maxPrice);
      }
      if (filters.beds) {
        query = query.gte('beds', filters.beds);
      }
      if (filters.baths) {
        query = query.gte('baths', filters.baths);
      }
      if (filters.propertyType) {
        query = query.eq('status_text', filters.propertyType);
      }
      if (filters.minSqft) {
        query = query.gte('area', filters.minSqft);
      }
      if (filters.maxSqft) {
        query = query.lte('area', filters.maxSqft);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching just listed with service areas:', error);
        throw new Error(error.message);
      }

      console.log('✅ Just listed query successful:', {
        dataCount: data?.length || 0,
        totalCount: count || 0
      });

      // Add service area match information to each listing
      const enrichedData = (data || []).map(listing => ({
        ...listing,
        service_area_match: listing.address_city === profile.main_service_city 
          ? profile.main_service_city 
          : listing.address_city
      }));

      // Get service area information
      const serviceAreaInfo = {
        mainCity: profile.main_service_city,
        totalCities: profile.service_cities.length,
        cities: profile.service_cities
      };

      return {
        data: enrichedData,
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        serviceAreaInfo
      };
    },
    enabled: !!profile?.service_cities && profile.service_cities.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('❌ useJustListedWithServiceAreas error:', error);
      toast({
        variant: "destructive",
        title: "Error fetching listings",
        description: error.message,
      });
    },
  });
};

// Fetch sold listings filtered by user's service areas
export const useSoldListingsWithServiceAreas = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['sold-listings-service-areas', filters, page],
    queryFn: async () => {
      console.log('🔍 useSoldListingsWithServiceAreas: Starting query');
      console.log('🔍 Profile service cities:', profile?.service_cities);

      if (!profile?.service_cities || profile.service_cities.length === 0) {
        console.log('⚠️ No service cities configured, returning empty result');
        return {
          data: [],
          count: 0,
          totalPages: 0,
          serviceAreaInfo: null
        };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Extract city names from service cities (format: "City, State")
      const cityNames = profile.service_cities.map(cityState => {
        const [cityName] = cityState.split(', ');
        return cityName;
      });
      
      console.log('🔍 Querying sold_listings table with service cities:', profile.service_cities);
      console.log('🔍 Extracted city names for query:', cityNames);

      // Query sold_listings table directly with service area filtering
      let query = supabase
        .from('sold_listings')
        .select('*', { count: 'exact' })
        .in('address_city', cityNames)
        .order('last_seen_at', { ascending: false })
        .range(from, to);

      // Apply additional filters
      if (filters.minPrice) {
        query = query.gte('unformatted_price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('unformatted_price', filters.maxPrice);
      }
      if (filters.beds) {
        query = query.gte('beds', filters.beds);
      }
      if (filters.baths) {
        query = query.gte('baths', filters.baths);
      }
      if (filters.propertyType) {
        query = query.eq('status_text', filters.propertyType);
      }
      if (filters.minSqft) {
        query = query.gte('area', filters.minSqft);
      }
      if (filters.maxSqft) {
        query = query.lte('area', filters.maxSqft);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching sold listings with service areas:', error);
        throw new Error(error.message);
      }

      console.log('✅ Sold listings query successful:', {
        dataCount: data?.length || 0,
        totalCount: count || 0
      });

      // Add service area match information to each listing
      const enrichedData = (data || []).map(listing => ({
        ...listing,
        service_area_match: listing.address_city === profile.main_service_city 
          ? profile.main_service_city 
          : listing.address_city
      }));

      // Get service area information
      const serviceAreaInfo = {
        mainCity: profile.main_service_city,
        totalCities: profile.service_cities.length,
        cities: profile.service_cities
      };

      return {
        data: enrichedData,
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        serviceAreaInfo
      };
    },
    enabled: !!profile?.service_cities && profile.service_cities.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('❌ useSoldListingsWithServiceAreas error:', error);
      toast({
        variant: "destructive",
        title: "Error fetching sold listings",
        description: error.message,
      });
    },
  });
};

// Fetch revealed listings for service areas
export const useRevealedListingsWithServiceAreas = (userId) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: serviceAreaListingKeys.revealed(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_reveals')
        .select('listing_id')
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      return new Set(data?.map(r => r.listing_id) || []);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Reveal listing mutation for service areas
export const useRevealListingWithServiceAreas = () => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listingId, userId }) => {
      const { error } = await supabase
        .from('listing_reveals')
        .insert({ listing_id: listingId, user_id: userId });

      if (error) {
        throw new Error(error.message);
      }

      return { listingId, userId };
    },
    onSuccess: (data) => {
      // Optimistically update the revealed listings cache
      queryClient.setQueryData(
        serviceAreaListingKeys.revealed(data.userId),
        (oldData) => {
          const newSet = new Set(oldData || []);
          newSet.add(data.listingId);
          return newSet;
        }
      );

      // Invalidate service area listings to refresh the data
      queryClient.invalidateQueries(serviceAreaListingKeys.lists());

      toast({
        title: "Listing revealed!",
        description: "You can now view the full details.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to reveal listing",
        description: error.message,
      });
    },
  });
};

// Get service area statistics
export const useServiceAreaStats = () => {
  const supabase = useSupabaseClient();
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['service-area-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.service_cities || profile.service_cities.length === 0) {
        return {
          totalListings: 0,
          totalSold: 0,
          citiesWithListings: [],
          mainCityListings: 0
        };
      }

      // Get just listed count
      const { count: justListedCount } = await supabase
        .from('just_listed')
        .select('*', { count: 'exact', head: true })
        .in('address_city', profile.service_cities);

      // Get sold listings count
      const { count: soldCount } = await supabase
        .from('sold_listings')
        .select('*', { count: 'exact', head: true })
        .in('address_city', profile.service_cities);

      // Get listings by city breakdown
      const { data: cityBreakdown } = await supabase
        .from('just_listed')
        .select('address_city')
        .in('address_city', profile.service_cities);

      const citiesWithListings = cityBreakdown?.reduce((acc, item) => {
        const city = item.address_city;
        if (!acc[city]) {
          acc[city] = 0;
        }
        acc[city]++;
        return acc;
      }, {}) || {};

      const mainCityListings = citiesWithListings[profile.main_service_city] || 0;

      return {
        totalListings: justListedCount || 0,
        totalSold: soldCount || 0,
        citiesWithListings,
        mainCityListings
      };
    },
    enabled: !!profile?.service_cities && profile.service_cities.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
