import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { fetchJustListed, fetchSoldSincePrev, fetchRevealedListings, getMostRecentRunWithData } from '@/lib/queries';
import { handleQueryError, handleMutationError, getUserFriendlyMessage } from '@/lib/errorHandler';

// Query keys for consistent caching
export const listingKeys = {
  all: ['listings'],
  justListed: (filters, page) => ['just-listed', filters, page],
  soldListings: (filters, page) => ['sold-listings', filters, page],
  revealed: (userId) => ['revealed-listings', userId],
  runs: () => ['runs'],
};

// Enhanced hook for just listed properties with full filtering
export const useJustListedEnhanced = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useQuery({
    queryKey: listingKeys.justListed(filters, page),
    queryFn: async () => {
      try {
        // Support both single city and multiple cities
        const cityFilter = filters.city_name;

        // If no city filter is provided, use profile's service_cities (user markets)
        // This ensures users only see listings from their selected markets
        let finalCityFilter = cityFilter;
        if (!finalCityFilter && profile?.service_cities?.length > 0) {
          // Extract city names from "City, State" format
          finalCityFilter = profile.service_cities.map(c => c.split(', ')[0]);
        } else if (!finalCityFilter && profile?.city_name) {
          // Fallback to primary city if service_cities not set
          finalCityFilter = [profile.city_name];
        }

        // Add AI furniture filter and country code from user profile
        const enhancedFilters = {
          ...filters,
          aiFurnitureFilter: profile?.ai_furniture_filter || false,
          countryCode: profile?.country_code || null, // Add country restriction
        };

        const { data, count } = await fetchJustListed(
          null, // No run ID needed
          finalCityFilter || null, // Allow null city filter
          page,
          pageSize,
          enhancedFilters
        );

        return {
          data: data || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          hasNextPage: page < Math.ceil((count || 0) / pageSize),
          hasPrevPage: page > 1,
        };
      } catch (error) {
        throw error;
      }
    },
    enabled: true, // Always enabled - let the query handle empty filters gracefully
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    retry: (failureCount, error) => {
      // Don't retry on certain error types
      if (error.code === 'COLUMN_NOT_FOUND' || error.code === 'TABLE_NOT_FOUND') {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      const errorDetails = handleQueryError(error, 'useJustListedEnhanced', { filters, page, pageSize });
      console.error('useJustListedEnhanced: Error details:', errorDetails);
    },
  });
};

// Enhanced hook for sold listings with full filtering
export const useSoldListingsEnhanced = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useQuery({
    queryKey: listingKeys.soldListings(filters, page),
    queryFn: async () => {
      // Support both single city and multiple cities
      const cityFilter = filters.city_name;

      // If no city filter is provided, use profile's service_cities (user markets)
      // This ensures users only see listings from their selected markets
      let finalCityFilter = cityFilter;
      if (!finalCityFilter && profile?.service_cities?.length > 0) {
        // Extract city names from "City, State" format
        finalCityFilter = profile.service_cities.map(c => c.split(', ')[0]);
      } else if (!finalCityFilter && profile?.city_name) {
        // Fallback to primary city if service_cities not set
        finalCityFilter = [profile.city_name];
      }

      // Add AI furniture filter and country code from user profile
      const enhancedFilters = {
        ...filters,
        aiFurnitureFilter: profile?.ai_furniture_filter || false,
        countryCode: profile?.country_code || null, // Add country restriction
      };

      // fetchSoldSincePrev now uses server-side pagination via fetchListings
      const { data, count } = await fetchSoldSincePrev(
        null, // currentRunId not needed anymore
        null, // prevRunId not needed anymore
        finalCityFilter || null,
        { ...enhancedFilters, page, pageSize }
      );

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        hasNextPage: page < Math.ceil((count || 0) / pageSize),
        hasPrevPage: page > 1,
      };
    },
    enabled: true, // Always enabled - let the query handle empty filters gracefully
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    retry: (failureCount, error) => {
      // Don't retry on certain error types
      if (error.code === 'COLUMN_NOT_FOUND' || error.code === 'TABLE_NOT_FOUND') {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      console.error('useSoldListingsEnhanced: Error occurred:', error);
    },
  });
};

// Enhanced revealed listings hook
export const useRevealedListingsEnhanced = (userId) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: listingKeys.revealed(userId),
    queryFn: async () => {
      if (!userId) return new Set();
      
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

// Enhanced reveal listing mutation with better error handling
export const useRevealListingEnhanced = () => {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listingId, userId, creditCost = 1 }) => {
      // First, check if user has enough credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits_remaining, unlimited')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch user profile');
      }

      if (!profile.unlimited && profile.credits_remaining < creditCost) {
        throw new Error('Insufficient credits to reveal this listing');
      }

      // Check if already revealed
      
      // Try number first, then string as fallback
      let existingReveal, checkError;
      
      // First try with number
      const { data: data1, error: error1 } = await supabase
        .from('listing_reveals')
        .select('id')
        .eq('user_id', userId)
        .eq('listing_id', Number(listingId))
        .single();
        
      if (error1 && error1.code === 'PGRST116') {
        // Not found with number, try with string
        const { data: data2, error: error2 } = await supabase
          .from('listing_reveals')
          .select('id')
          .eq('user_id', userId)
          .eq('listing_id', String(listingId))
          .single();
          
        existingReveal = data2;
        checkError = error2;
      } else {
        existingReveal = data1;
        checkError = error1;
      }

      if (existingReveal) {
        return { listingId, userId, alreadyRevealed: true };
      }

      // If checkError exists but it's not a "not found" error, throw it
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Failed to check existing reveals');
      }

      // Deduct credits if not unlimited
      if (!profile.unlimited) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            credits_remaining: profile.credits_remaining - creditCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error('Failed to deduct credits');
        }
      }

      // Insert reveal record (use upsert to handle conflicts)
      const { error: insertError } = await supabase
        .from('listing_reveals')
        .upsert({ 
          user_id: userId, 
          listing_id: Number(listingId)
        }, {
          onConflict: 'user_id,listing_id'
        });

      if (insertError) {
        throw new Error('Failed to reveal listing');
      }

      return { listingId, userId, alreadyRevealed: false };
    },
    onMutate: async ({ listingId, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(listingKeys.revealed(userId));

      // Snapshot the previous value
      const previousRevealed = queryClient.getQueryData(listingKeys.revealed(userId));

      // Optimistically update to the new value
      queryClient.setQueryData(listingKeys.revealed(userId), (old) => {
        const newSet = new Set(old || []);
        newSet.add(listingId);
        return newSet;
      });

      return { previousRevealed };
    },
    onSuccess: (data, variables) => {
      if (!data.alreadyRevealed) {
        toast({
          title: "Listing revealed!",
          description: "You can now view the full details.",
        });
      } else {
        toast({
          title: "Already revealed",
          description: "This listing was already revealed.",
        });
      }
    },
    onError: (error, variables, context) => {
      // Revert the optimistic update
      if (context?.previousRevealed) {
        queryClient.setQueryData(listingKeys.revealed(variables.userId), context.previousRevealed);
      }

      toast({
        variant: "destructive",
        title: "Failed to reveal listing",
        description: error.message,
      });
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(listingKeys.revealed(variables.userId));
    },
  });
};

// Hook for getting available filter options - fetches unique values from listings table
export const useFilterOptions = () => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['filter-options-global'],
    queryFn: async () => {
      try {
        // Get unique beds values
        const { data: bedsData, error: bedsError } = await supabase
          .from('listings')
          .select('beds')
          .not('beds', 'is', null)
          .order('beds', { ascending: true });

        // Get unique baths values
        const { data: bathsData, error: bathsError } = await supabase
          .from('listings')
          .select('baths')
          .not('baths', 'is', null)
          .order('baths', { ascending: true });

        // Get unique property types
        const { data: typesData, error: typesError } = await supabase
          .from('listings')
          .select('statustext')
          .not('statustext', 'is', null);

        // Get price range
        const { data: priceData, error: priceError } = await supabase
          .from('listings')
          .select('unformattedprice')
          .not('unformattedprice', 'is', null)
          .order('unformattedprice', { ascending: true });

        // Get area range
        const { data: areaData, error: areaError } = await supabase
          .from('listings')
          .select('area')
          .not('area', 'is', null)
          .order('area', { ascending: true });

        // Extract unique values
        const beds = [...new Set(bedsData?.map(d => d.beds) || [])].filter(b => b > 0).sort((a, b) => a - b);
        const baths = [...new Set(bathsData?.map(d => d.baths) || [])].filter(b => b > 0).sort((a, b) => a - b);
        const propertyTypes = [...new Set(typesData?.map(d => d.statustext) || [])].filter(Boolean);
        const prices = priceData?.map(d => d.unformattedprice).filter(p => p > 0) || [];
        const areas = areaData?.map(d => d.area).filter(a => a > 0) || [];

        return {
          beds: beds.length > 0 ? beds : [1, 2, 3, 4, 5, 6],
          baths: baths.length > 0 ? baths : [1, 2, 3, 4, 5],
          propertyTypes: propertyTypes.length > 0 ? propertyTypes : ['House for sale', 'Condo for sale', 'Townhouse for sale', 'Land for sale'],
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 10000000,
          },
          areaRange: {
            min: areas.length > 0 ? Math.min(...areas) : 0,
            max: areas.length > 0 ? Math.max(...areas) : 10000,
          },
        };
      } catch (error) {
        console.error('useFilterOptions: Error fetching filter options:', error);
        // Return default values on error
        return {
          beds: [1, 2, 3, 4, 5, 6],
          baths: [1, 2, 3, 4, 5],
          propertyTypes: ['House for sale', 'Condo for sale', 'Townhouse for sale', 'Land for sale'],
          priceRange: { min: 0, max: 10000000 },
          areaRange: { min: 0, max: 10000 },
        };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - filter options don't change often
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for search suggestions
export const useSearchSuggestions = (cityName, searchTerm) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['search-suggestions', cityName, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      let query = supabase
        .from('listings')
        .select('addressstreet, lastcity, addressstate, addresszipcode')
        .or(`addressstreet.ilike.%${searchTerm}%,addresszipcode.ilike.%${searchTerm}%`)
        .limit(10);

      // Apply city filter if provided
      if (cityName) {
        if (Array.isArray(cityName)) {
          query = query.in('lastcity', cityName);
        } else {
          query = query.eq('lastcity', cityName);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('useSearchSuggestions: Error:', error);
        return [];
      }

      return data?.map(listing => ({
        address: `${listing.addressstreet}, ${listing.lastcity}, ${listing.addressstate} ${listing.addresszipcode}`,
        street: listing.addressstreet,
        city: listing.lastcity,
        state: listing.addressstate,
        zip: listing.addresszipcode,
      })) || [];
    },
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
