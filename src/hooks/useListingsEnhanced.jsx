import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
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

  return useQuery({
    queryKey: listingKeys.justListed(filters, page),
    queryFn: async () => {
      try {
        console.log(`useJustListedEnhanced: Starting query with filters:`, filters);
        
        // Get the most recent run ID that has data
        const currentRunId = await getMostRecentRunWithData();
        console.log(`useJustListedEnhanced: Using run ID: ${currentRunId}`);
        
        // Use the existing query function with enhanced filters
        // Support both single city and multiple cities
        const cityFilter = filters.city_name;
          
        console.log(`useJustListedEnhanced: City filter:`, cityFilter);
        
        const { data, count } = await fetchJustListed(
          currentRunId, 
          cityFilter, 
          page, 
          pageSize, 
          filters
        );

        const result = {
          data: data || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          hasNextPage: page < Math.ceil((count || 0) / pageSize),
          hasPrevPage: page > 1,
        };

        console.log(`useJustListedEnhanced: Query successful:`, {
          dataCount: result.data.length,
          totalCount: result.count,
          totalPages: result.totalPages,
          currentPage: result.currentPage
        });

        return result;
      } catch (error) {
        console.error('useJustListedEnhanced: Query failed:', error);
        throw error;
      }
    },
    enabled: !!filters.city_name,
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
      const userMessage = getUserFriendlyMessage(error);
      
      console.error('useJustListedEnhanced: Error details:', errorDetails);
      
      toast({
        variant: "destructive",
        title: "Error fetching just listed properties",
        description: userMessage,
      });
    },
  });
};

// Enhanced hook for sold listings with full filtering
export const useSoldListingsEnhanced = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  return useQuery({
    queryKey: listingKeys.soldListings(filters, page),
    queryFn: async () => {
      // Get the most recent run with data and the previous one
      const currentRunId = await getMostRecentRunWithData();
      
      // Get the previous run ID
      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select('id')
        .order('started_at', { ascending: false })
        .limit(2);

      if (runsError || runsData.length < 2) {
        throw new Error(runsError?.message || 'Could not fetch run data');
      }

      const prevRunId = runsData[1].id;
      
      // Get all sold listings
      // Support both single city and multiple cities
      const cityFilter = filters.city_name;
        
      const allSoldListings = await fetchSoldSincePrev(
        currentRunId, 
        prevRunId, 
        cityFilter, 
        filters
      );

      // Apply client-side pagination for sold listings
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = allSoldListings.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        count: allSoldListings.length,
        totalPages: Math.ceil(allSoldListings.length / pageSize),
        currentPage: page,
        hasNextPage: page < Math.ceil(allSoldListings.length / pageSize),
        hasPrevPage: page > 1,
      };
    },
    enabled: !!filters.city_name,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error fetching sold listings",
        description: error.message,
      });
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
      const { data, error } = await supabase.rpc('reveal_listing', { 
        p_listing_id: listingId,
        p_user_id: userId,
        p_credit_cost: creditCost
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        if (data.error_code === 'INSUFFICIENT_CREDITS') {
          throw new Error('Insufficient credits to reveal this listing');
        }
        throw new Error(data.message || 'Failed to reveal listing');
      }

      return { listingId, userId, alreadyRevealed: data.message?.includes('already revealed') };
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

// Hook for getting available filter options
export const useFilterOptions = (cityName) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['filter-options', cityName],
    queryFn: async () => {
      if (!cityName) return null;

      // Get the latest run ID
      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select('id')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (runsError) return null;

      const currentRunId = runsData.id;

      // Get unique values for filter options from just_listed table
      // Since just_listed doesn't have run_id column, we'll query without it
      let query = supabase
        .from('just_listed')
        .select('unformattedprice, beds, baths, area, statustext')
        .eq('lastcity', cityName);
      
      const { data: listings, error } = await query;

      if (error) return null;

      const prices = listings?.map(l => l.unformattedprice).filter(Boolean) || [];
      const beds = [...new Set(listings?.map(l => l.beds).filter(Boolean))].sort((a, b) => a - b);
      const baths = [...new Set(listings?.map(l => l.baths).filter(Boolean))].sort((a, b) => a - b);
      const areas = listings?.map(l => l.area).filter(Boolean) || [];
      const propertyTypes = [...new Set(listings?.map(l => l.statustext).filter(Boolean))];

      return {
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
        },
        beds: beds,
        baths: baths,
        areaRange: {
          min: Math.min(...areas),
          max: Math.max(...areas),
        },
        propertyTypes: propertyTypes,
      };
    },
    enabled: !!cityName,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for search suggestions
export const useSearchSuggestions = (cityName, searchTerm) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['search-suggestions', cityName, searchTerm],
    queryFn: async () => {
      if (!cityName || !searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('just_listed')
        .select('addressstreet, lastcity, addressstate, addresszipcode')
        .eq('lastcity', cityName)
        .or(`addressstreet.ilike.%${searchTerm}%,addresszipcode.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) return [];

      return data?.map(listing => ({
        address: `${listing.addressstreet}, ${listing.lastcity}, ${listing.addressstate} ${listing.addresszipcode}`,
        street: listing.addressstreet,
        city: listing.lastcity,
        state: listing.addressstate,
        zip: listing.addresszipcode,
      })) || [];
    },
    enabled: !!cityName && !!searchTerm && searchTerm.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
