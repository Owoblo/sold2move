import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useState, useMemo } from 'react';

// Comprehensive search hook that searches across all listings
export const useComprehensiveSearch = (searchTerm, options = {}) => {
  const supabase = useSupabaseClient();
  const {
    limit = 20,
    includeSold = true,
    includeJustListed = true,
    minLength = 1,
    debounceMs = 300
  } = options;

  // Debounce the search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  return useQuery({
    queryKey: ['comprehensive-search', debouncedSearchTerm, limit, includeSold, includeJustListed],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < minLength) {
        return { suggestions: [], totalCount: 0 };
      }

      const term = debouncedSearchTerm.trim();

      try {
        // Build status filter based on options
        const statusFilters = [];
        if (includeJustListed) statusFilters.push('just_listed');
        if (includeSold) statusFilters.push('sold');

        if (statusFilters.length === 0) {
          return { suggestions: [], totalCount: 0 };
        }

        // Search in unified listings table
        let query = supabase
          .from('listings')
          .select(`
            zpid,
            addressstreet,
            lastcity,
            addresscity,
            addressstate,
            addresszipcode,
            price,
            unformattedprice,
            beds,
            baths,
            area,
            statustext,
            status,
            lastseenat,
            first_seen_at
          `)
          .or(`addressstreet.ilike.%${term}%,lastcity.ilike.%${term}%,addresscity.ilike.%${term}%,addressstate.ilike.%${term}%,addresszipcode.ilike.%${term}%`)
          .in('status', statusFilters)
          .order('lastseenat', { ascending: false })
          .limit(limit);

        const { data, error } = await query;

        if (error) {
          console.error('Comprehensive search error:', error);
          return { suggestions: [], totalCount: 0, error: error.message };
        }

        const results = (data || []).map(item => ({
          id: item.zpid,
          zpid: item.zpid,
          addressstreet: item.addressstreet,
          lastcity: item.lastcity,
          addresscity: item.addresscity,
          addressstate: item.addressstate,
          addresszipcode: item.addresszipcode,
          price: item.price,
          unformattedprice: item.unformattedprice,
          beds: item.beds,
          baths: item.baths,
          area: item.area,
          statustext: item.statustext,
          lastseenat: item.lastseenat,
          created_at: item.first_seen_at,
          type: item.status,
          source: item.status === 'just_listed' ? 'Just Listed' : item.status === 'sold' ? 'Sold' : 'Active',
          displayAddress: `${item.addressstreet}, ${item.lastcity}, ${item.addressstate} ${item.addresszipcode}`,
          searchScore: calculateSearchScore(item, term)
        }));

        // Sort by search score (most relevant first)
        results.sort((a, b) => b.searchScore - a.searchScore);

        // Remove duplicates based on address
        const uniqueResults = [];
        const seenAddresses = new Set();

        for (const result of results) {
          const addressKey = `${result.addressstreet}-${result.lastcity}-${result.addressstate}`.toLowerCase();
          if (!seenAddresses.has(addressKey)) {
            seenAddresses.add(addressKey);
            uniqueResults.push(result);
          }
        }

        return {
          suggestions: uniqueResults.slice(0, limit),
          totalCount: uniqueResults.length,
          searchTerm: debouncedSearchTerm
        };

      } catch (error) {
        console.error('Comprehensive search error:', error);
        return { suggestions: [], totalCount: 0, error: error.message };
      }
    },
    enabled: !!debouncedSearchTerm && debouncedSearchTerm.length >= minLength,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Calculate search relevance score
function calculateSearchScore(item, searchTerm) {
  const searchLower = searchTerm.toLowerCase();
  let score = 0;

  // Exact matches get highest score
  if (item.addressstreet?.toLowerCase().includes(searchLower)) {
    score += 100;
    if (item.addressstreet.toLowerCase().startsWith(searchLower)) {
      score += 50; // Bonus for starting with search term
    }
  }

  if (item.lastcity?.toLowerCase().includes(searchLower)) {
    score += 80;
    if (item.lastcity.toLowerCase().startsWith(searchLower)) {
      score += 40;
    }
  }

  if (item.addresscity?.toLowerCase().includes(searchLower)) {
    score += 70;
  }

  if (item.addressstate?.toLowerCase().includes(searchLower)) {
    score += 60;
  }

  if (item.addresszipcode?.toLowerCase().includes(searchLower)) {
    score += 90; // Zip codes are very specific
  }

  // Boost score for recent listings
  if (item.lastseenat) {
    const daysSinceSeen = (new Date() - new Date(item.lastseenat)) / (1000 * 60 * 60 * 24);
    if (daysSinceSeen < 7) score += 20;
    else if (daysSinceSeen < 30) score += 10;
  }

  return score;
}

// Hook for getting search statistics
export const useSearchStats = () => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['search-stats'],
    queryFn: async () => {
      try {
        const [justListedCount, soldCount, totalCount] = await Promise.all([
          supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'just_listed'),
          supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
          supabase.from('listings').select('*', { count: 'exact', head: true })
        ]);

        return {
          justListedCount: justListedCount.count || 0,
          soldCount: soldCount.count || 0,
          totalCount: totalCount.count || 0
        };
      } catch (error) {
        console.error('Error fetching search stats:', error);
        return { justListedCount: 0, soldCount: 0, totalCount: 0 };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for popular search terms
export const usePopularSearches = () => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      try {
        // Get most common street names, cities, and zip codes from unified listings table
        const [streets, cities, zips] = await Promise.all([
          supabase
            .from('listings')
            .select('addressstreet')
            .not('addressstreet', 'is', null)
            .limit(1000),
          supabase
            .from('listings')
            .select('lastcity')
            .not('lastcity', 'is', null)
            .limit(1000),
          supabase
            .from('listings')
            .select('addresszipcode')
            .not('addresszipcode', 'is', null)
            .limit(1000)
        ]);

        // Count occurrences and return most popular
        const streetCounts = {};
        const cityCounts = {};
        const zipCounts = {};

        streets.data?.forEach(item => {
          if (item.addressstreet) {
            const street = item.addressstreet.split(' ')[0]; // Get first word
            streetCounts[street] = (streetCounts[street] || 0) + 1;
          }
        });

        cities.data?.forEach(item => {
          if (item.lastcity) {
            cityCounts[item.lastcity] = (cityCounts[item.lastcity] || 0) + 1;
          }
        });

        zips.data?.forEach(item => {
          if (item.addresszipcode) {
            const zip = item.addresszipcode.substring(0, 3); // First 3 characters
            zipCounts[zip] = (zipCounts[zip] || 0) + 1;
          }
        });

        return {
          popularStreets: Object.entries(streetCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([street]) => street),
          popularCities: Object.entries(cityCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([city]) => city),
          popularZipPrefixes: Object.entries(zipCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([zip]) => zip)
        };
      } catch (error) {
        console.error('Error fetching popular searches:', error);
        return { popularStreets: [], popularCities: [], popularZipPrefixes: [] };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
