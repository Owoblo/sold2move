import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';

// Query keys for consistent caching
export const listingKeys = {
  all: ['listings'],
  lists: () => [...listingKeys.all, 'list'],
  list: (filters, page) => [...listingKeys.lists(), { filters, page }],
  details: () => [...listingKeys.all, 'detail'],
  detail: (id) => [...listingKeys.details(), id],
  revealed: (userId) => [...listingKeys.all, 'revealed', userId],
};

// Fetch listings with React Query
export const useListings = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  return useQuery({
    queryKey: listingKeys.list(filters, page),
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('current_listings')
        .select('id, address, created_at, price, pgapt, addressstate, lastcity', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters.state_code) {
        query = query.eq('addressstate', filters.state_code);
      }
      if (filters.city_name) {
        query = query.eq('lastcity', filters.city_name);
      }
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!filters.state_code, // Only run when we have required filters
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error fetching listings",
        description: error.message,
      });
    },
  });
};

// Fetch revealed listings
export const useRevealedListings = (userId) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: listingKeys.revealed(userId),
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

// Reveal listing mutation
export const useRevealListing = () => {
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
        listingKeys.revealed(data.userId),
        (oldData) => {
          const newSet = new Set(oldData || []);
          newSet.add(data.listingId);
          return newSet;
        }
      );

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

// Fetch just listed properties
export const useJustListed = (filters = {}, page = 1, pageSize = 20) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['just-listed', filters, page],
    queryFn: async () => {
      // First get the latest run ID
      const { data: runsData, error: runsError } = await supabase
        .from('runs')
        .select('id')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (runsError) {
        throw new Error(runsError.message);
      }

      const currentRunId = runsData.id;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('just_listed')
        .select('id,zpid,imgsrc,detailurl,addressstreet,lastcity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext', { count: 'exact' })
        .order('unformattedprice', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters.city_name) {
        query = query.eq('lastcity', filters.city_name);
      }
      if (filters.minPrice) {
        query = query.gte('unformattedprice', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('unformattedprice', filters.maxPrice);
      }
      if (filters.beds) {
        query = query.gte('beds', filters.beds);
      }
      if (filters.baths) {
        query = query.gte('baths', filters.baths);
      }
      if (filters.propertyType) {
        query = query.eq('statustext', filters.propertyType);
      }
      if (filters.minSqft) {
        query = query.gte('area', filters.minSqft);
      }
      if (filters.maxSqft) {
        query = query.lte('area', filters.maxSqft);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!filters.city_name,
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error fetching just listed properties",
        description: error.message,
      });
    },
  });
};
