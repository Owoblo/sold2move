import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { fetchJustListed, fetchSoldSincePrev, fetchActiveListings, fetchRevealedListings, getMostRecentRunWithData } from '@/lib/queries';
import { handleQueryError, handleMutationError, getUserFriendlyMessage } from '@/lib/errorHandler';

// Query keys for consistent caching
export const listingKeys = {
  all: ['listings'],
  justListed: (filters, page) => ['just-listed', filters, page],
  soldListings: (filters, page) => ['sold-listings', filters, page],
  activeListings: (filters, page) => ['active-listings', filters, page],
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
      console.log('=== useJustListedEnhanced queryFn START ===');
      console.log('Input filters:', JSON.stringify(filters, null, 2));
      console.log('Page:', page, 'PageSize:', pageSize);
      console.log('Profile:', profile ? { id: profile.id, city_name: profile.city_name, service_cities: profile.service_cities, country_code: profile.country_code } : 'null');

      try {
        // Support both single city and multiple cities
        const cityFilter = filters.city_name;
        console.log('City filter from filters:', cityFilter);

        // If no city filter is provided, use profile's service_cities (user markets)
        // This ensures users only see listings from their selected markets
        let finalCityFilter = cityFilter;
        if (!finalCityFilter && profile?.service_cities?.length > 0) {
          // Extract city names from "City, State" format
          finalCityFilter = profile.service_cities.map(c => c.split(', ')[0]);
          console.log('Using service_cities as filter:', finalCityFilter);
        } else if (!finalCityFilter && profile?.city_name) {
          // Fallback to primary city if service_cities not set
          finalCityFilter = [profile.city_name];
          console.log('Using city_name as filter:', finalCityFilter);
        }
        console.log('Final city filter:', finalCityFilter);

        // Add AI furniture filter and country code from user profile
        const enhancedFilters = {
          ...filters,
          aiFurnitureFilter: profile?.ai_furniture_filter || false,
          countryCode: profile?.country_code || null, // Add country restriction
        };
        console.log('Enhanced filters:', JSON.stringify(enhancedFilters, null, 2));

        console.log('Calling fetchJustListed...');
        const { data, count } = await fetchJustListed(
          null, // No run ID needed
          finalCityFilter || null, // Allow null city filter
          page,
          pageSize,
          enhancedFilters
        );

        console.log('fetchJustListed returned:');
        console.log('  - Count:', count);
        console.log('  - Data length:', data?.length);
        console.log('  - First item:', data?.[0] ? { id: data[0].id, addressStreet: data[0].addressStreet } : 'none');
        console.log('=== useJustListedEnhanced queryFn SUCCESS ===');

        return {
          data: data || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          hasNextPage: page < Math.ceil((count || 0) / pageSize),
          hasPrevPage: page > 1,
        };
      } catch (error) {
        console.error('=== useJustListedEnhanced queryFn ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        console.error('Error stack:', error?.stack);
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
      console.log('=== useSoldListingsEnhanced queryFn START ===');
      console.log('Input filters:', JSON.stringify(filters, null, 2));
      console.log('Page:', page, 'PageSize:', pageSize);
      console.log('Profile:', profile ? { id: profile.id, city_name: profile.city_name, service_cities: profile.service_cities, country_code: profile.country_code } : 'null');

      try {
        // Support both single city and multiple cities
        const cityFilter = filters.city_name;
        console.log('City filter from filters:', cityFilter);

        // If no city filter is provided, use profile's service_cities (user markets)
        // This ensures users only see listings from their selected markets
        let finalCityFilter = cityFilter;
        if (!finalCityFilter && profile?.service_cities?.length > 0) {
          // Extract city names from "City, State" format
          finalCityFilter = profile.service_cities.map(c => c.split(', ')[0]);
          console.log('Using service_cities as filter:', finalCityFilter);
        } else if (!finalCityFilter && profile?.city_name) {
          // Fallback to primary city if service_cities not set
          finalCityFilter = [profile.city_name];
          console.log('Using city_name as filter:', finalCityFilter);
        }
        console.log('Final city filter:', finalCityFilter);

        // Add AI furniture filter and country code from user profile
        const enhancedFilters = {
          ...filters,
          aiFurnitureFilter: profile?.ai_furniture_filter || false,
          countryCode: profile?.country_code || null, // Add country restriction
        };
        console.log('Enhanced filters:', JSON.stringify(enhancedFilters, null, 2));

        console.log('Calling fetchSoldSincePrev...');
        // fetchSoldSincePrev now uses server-side pagination via fetchListings
        const { data, count } = await fetchSoldSincePrev(
          null, // currentRunId not needed anymore
          null, // prevRunId not needed anymore
          finalCityFilter || null,
          { ...enhancedFilters, page, pageSize }
        );

        console.log('fetchSoldSincePrev returned:');
        console.log('  - Count:', count);
        console.log('  - Data length:', data?.length);
        console.log('  - First item:', data?.[0] ? { id: data[0].id, addressStreet: data[0].addressStreet } : 'none');
        console.log('=== useSoldListingsEnhanced queryFn SUCCESS ===');

        return {
          data: data || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          hasNextPage: page < Math.ceil((count || 0) / pageSize),
          hasPrevPage: page > 1,
        };
      } catch (error) {
        console.error('=== useSoldListingsEnhanced queryFn ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        console.error('Error stack:', error?.stack);
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
      console.error('useSoldListingsEnhanced: Error occurred:', error);
    },
  });
};

// Enhanced hook for active listings (currently on market, older than 2 days)
export const useActiveListingsEnhanced = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  return useQuery({
    queryKey: listingKeys.activeListings(filters, page),
    queryFn: async () => {
      console.log('=== useActiveListingsEnhanced queryFn START ===');
      console.log('Input filters:', JSON.stringify(filters, null, 2));
      console.log('Page:', page, 'PageSize:', pageSize);

      try {
        // Support both single city and multiple cities
        const cityFilter = filters.city_name;

        // If no city filter is provided, use profile's service_cities (user markets)
        let finalCityFilter = cityFilter;
        if (!finalCityFilter && profile?.service_cities?.length > 0) {
          finalCityFilter = profile.service_cities.map(c => c.split(', ')[0]);
        } else if (!finalCityFilter && profile?.city_name) {
          finalCityFilter = [profile.city_name];
        }

        // Add AI furniture filter and country code from user profile
        const enhancedFilters = {
          ...filters,
          aiFurnitureFilter: profile?.ai_furniture_filter || false,
          countryCode: profile?.country_code || null,
        };

        const { data, count } = await fetchActiveListings(
          finalCityFilter || null,
          page,
          pageSize,
          enhancedFilters
        );

        console.log('fetchActiveListings returned:', { count, dataLength: data?.length });

        return {
          data: data || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          hasNextPage: page < Math.ceil((count || 0) / pageSize),
          hasPrevPage: page > 1,
        };
      } catch (error) {
        console.error('=== useActiveListingsEnhanced queryFn ERROR ===');
        console.error('Error:', error);
        throw error;
      }
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    retry: (failureCount, error) => {
      if (error.code === 'COLUMN_NOT_FOUND' || error.code === 'TABLE_NOT_FOUND') {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      console.error('useActiveListingsEnhanced: Error occurred:', error);
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

// Default filter options - used to avoid expensive full table scans
const DEFAULT_FILTER_OPTIONS = {
  beds: [1, 2, 3, 4, 5, 6],
  baths: [1, 2, 3, 4, 5],
  propertyTypes: ['House for sale', 'Condo for sale', 'Townhouse for sale', 'Land for sale', 'Multi-family home for sale'],
  priceRange: { min: 0, max: 10000000 },
  areaRange: { min: 0, max: 10000 },
};

// Hook for getting available filter options - returns static defaults to prevent database timeouts
export const useFilterOptions = () => {
  return useQuery({
    queryKey: ['filter-options-global'],
    queryFn: async () => {
      // Return static defaults immediately - no database queries needed
      // These options cover the vast majority of real estate listings
      return DEFAULT_FILTER_OPTIONS;
    },
    staleTime: Infinity, // Never refetch - these are static defaults
    cacheTime: Infinity,
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
