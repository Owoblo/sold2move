import { useQuery } from '@tanstack/react-query';
import { fetchAvailableCities, fetchAvailableStates } from '@/lib/queries';

/**
 * Hook to fetch available cities from the listings database
 * @param {string} countryCode - 'US', 'CA', or null for all countries
 * @returns {Object} Query result with cities data
 */
export const useAvailableCities = (countryCode = null) => {
  return useQuery({
    queryKey: ['available-cities', countryCode],
    queryFn: () => fetchAvailableCities(countryCode),
    staleTime: 30 * 60 * 1000, // 30 minutes - cities don't change often
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
};

/**
 * Hook to fetch available states/provinces from the listings database
 * @param {string} countryCode - 'US', 'CA', or null for all countries
 * @returns {Object} Query result with states data
 */
export const useAvailableStates = (countryCode = null) => {
  return useQuery({
    queryKey: ['available-states', countryCode],
    queryFn: () => fetchAvailableStates(countryCode),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
};

/**
 * Hook to get cities filtered by state
 * @param {string} countryCode - 'US', 'CA', or null
 * @param {string} stateCode - State/province code to filter by
 * @returns {Object} Query result with filtered cities
 */
export const useCitiesByState = (countryCode = null, stateCode = null) => {
  const { data: allCities, isLoading, error } = useAvailableCities(countryCode);

  // Filter cities by state if stateCode is provided
  const filteredCities = stateCode && allCities
    ? allCities.filter(city => city.state === stateCode)
    : allCities || [];

  return {
    data: filteredCities,
    isLoading,
    error,
  };
};

/**
 * Get state name from state code
 */
export const getStateName = (stateCode, countryCode = 'US') => {
  const stateNames = {
    // Canadian Provinces
    'ON': 'Ontario',
    'BC': 'British Columbia',
    'AB': 'Alberta',
    'QC': 'Quebec',
    'MB': 'Manitoba',
    'SK': 'Saskatchewan',
    'NS': 'Nova Scotia',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'PE': 'Prince Edward Island',
    'NT': 'Northwest Territories',
    'YT': 'Yukon',
    'NU': 'Nunavut',
    // US States (common ones)
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  };

  return stateNames[stateCode] || stateCode;
};

export default useAvailableCities;
