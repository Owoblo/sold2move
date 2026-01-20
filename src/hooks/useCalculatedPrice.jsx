import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { calculatePrice, calculatePriceBreakdown, PRICING_CONSTANTS } from '@/lib/pricingUtils';

/**
 * Hook to calculate subscription price based on selected cities
 *
 * @param {Array} selectedCities - Array of city names or city objects
 * @param {string} countryCode - Country code filter (default: null for all)
 * @returns {Object} Calculated price data and utilities
 */
export const useCalculatedPrice = (selectedCities = [], countryCode = null) => {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cityPopulations, setCityPopulations] = useState([]);
  const [allCities, setAllCities] = useState([]);

  // Normalize selected cities to array of city names
  const normalizedCityNames = useMemo(() => {
    if (!selectedCities || selectedCities.length === 0) return [];
    return selectedCities.map(city =>
      typeof city === 'string' ? city : city.city_name || city.name
    );
  }, [selectedCities]);

  // Fetch all available cities for selection
  const fetchAllCities = useCallback(async () => {
    try {
      let query = supabase
        .from('city_populations')
        .select('*')
        .order('city_name');

      if (countryCode) {
        query = query.eq('country_code', countryCode);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAllCities(data || []);
    } catch (err) {
      console.error('Error fetching cities:', err);
      setError(err.message);
    }
  }, [supabase, countryCode]);

  // Fetch population data for selected cities
  const fetchCityPopulations = useCallback(async () => {
    if (normalizedCityNames.length === 0) {
      setCityPopulations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('city_populations')
        .select('*')
        .in('city_name', normalizedCityNames);

      if (countryCode) {
        query = query.eq('country_code', countryCode);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCityPopulations(data || []);
    } catch (err) {
      console.error('Error fetching city populations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, normalizedCityNames, countryCode]);

  // Fetch cities on mount and when country changes
  useEffect(() => {
    fetchAllCities();
  }, [fetchAllCities]);

  // Fetch populations when selected cities change
  useEffect(() => {
    fetchCityPopulations();
  }, [fetchCityPopulations]);

  // Calculate total population from fetched data
  const totalPopulation = useMemo(() => {
    return cityPopulations.reduce((sum, city) => sum + (city.population || 0), 0);
  }, [cityPopulations]);

  // Calculate prices
  const prices = useMemo(() => {
    return calculatePrice(totalPopulation);
  }, [totalPopulation]);

  // Calculate price breakdown by city
  const priceBreakdown = useMemo(() => {
    return calculatePriceBreakdown(cityPopulations);
  }, [cityPopulations]);

  // Check for cities without population data
  const citiesWithoutData = useMemo(() => {
    const foundCityNames = cityPopulations.map(c => c.city_name.toLowerCase());
    return normalizedCityNames.filter(
      name => !foundCityNames.includes(name.toLowerCase())
    );
  }, [normalizedCityNames, cityPopulations]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchAllCities();
    fetchCityPopulations();
  }, [fetchAllCities, fetchCityPopulations]);

  return {
    // Loading and error states
    loading,
    error,

    // Price data
    prices,
    totalPopulation,
    priceBreakdown,

    // City data
    cityPopulations,
    allCities,
    citiesWithoutData,
    selectedCount: normalizedCityNames.length,
    foundCount: cityPopulations.length,

    // Utilities
    refresh,

    // Constants for reference
    pricingConstants: PRICING_CONSTANTS,
  };
};

/**
 * Hook to get population for a single city
 *
 * @param {string} cityName - Name of the city
 * @param {string} countryCode - Country code (optional)
 * @returns {Object} City population data
 */
export const useCityPopulation = (cityName, countryCode = null) => {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [cityData, setCityData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cityName) {
      setCityData(null);
      return;
    }

    const fetchCity = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('city_populations')
          .select('*')
          .eq('city_name', cityName);

        if (countryCode) {
          query = query.eq('country_code', countryCode);
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        setCityData(data || null);
      } catch (err) {
        console.error('Error fetching city population:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCity();
  }, [supabase, cityName, countryCode]);

  return {
    loading,
    error,
    cityData,
    population: cityData?.population || 0,
  };
};

export default useCalculatedPrice;
