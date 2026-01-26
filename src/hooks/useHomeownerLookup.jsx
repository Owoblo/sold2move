import { useState, useCallback } from 'react';
import { homeownerLookupService } from '@/services/homeownerLookup';

/**
 * React hook for homeowner lookup functionality
 * Manages loading state, data, and error handling
 */
export function useHomeownerLookup() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [noDataFound, setNoDataFound] = useState(false); // Distinguish "no data" from errors

  /**
   * Look up homeowner information for a listing
   * @param {Object} listing - Listing object with address fields
   */
  const lookupFromListing = useCallback(async (listing) => {
    setLoading(true);
    setError(null);
    setNoDataFound(false);

    try {
      console.log('🔍 Homeowner lookup starting for listing:', listing?.zpid || listing?.id);
      const result = await homeownerLookupService.lookupFromListing(listing);

      console.log('📥 Homeowner lookup raw result:', JSON.stringify(result, null, 2));
      console.log('📊 Result breakdown:', {
        hasError: !!result.error,
        hasData: !!result.data,
        success: result.data?.success,
        dataKeys: result.data?.data ? Object.keys(result.data.data) : [],
        message: result.data?.message
      });

      if (result.error) {
        // Actual API/network error
        console.error('❌ Homeowner lookup error:', result.error);
        setError(result.error);
        setData(null);
        setNoDataFound(false);
      } else if (result.data?.success) {
        // Successfully found homeowner data
        console.log('✅ Homeowner lookup success! Data:', result.data.data);
        setData(result.data.data);
        setError(null);
        setNoDataFound(false);
      } else {
        // API call succeeded but no homeowner data was found (not an error, just no data)
        console.log('ℹ️ Homeowner lookup: No data found for this property:', result.data?.message);
        setData(null);
        setError(null);
        setNoDataFound(true);
      }
    } catch (err) {
      console.error('💥 Homeowner lookup exception:', err);
      setError(err);
      setData(null);
      setNoDataFound(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Look up homeowner information using address components
   * @param {Object} params - Address parameters
   * @param {string} [params.zpid] - Zillow Property ID
   * @param {string} params.street - Street address
   * @param {string} params.city - City
   * @param {string} params.state - State abbreviation
   * @param {string} params.zip - ZIP code
   */
  const lookup = useCallback(async ({ zpid, street, city, state, zip }) => {
    setLoading(true);
    setError(null);
    setNoDataFound(false);

    try {
      const result = await homeownerLookupService.lookupProperty({
        zpid,
        street,
        city,
        state,
        zip
      });

      if (result.error) {
        setError(result.error);
        setData(null);
        setNoDataFound(false);
      } else if (result.data?.success) {
        setData(result.data.data);
        setError(null);
        setNoDataFound(false);
      } else {
        // No data found - not an error, just no results
        setData(null);
        setError(null);
        setNoDataFound(true);
      }
    } catch (err) {
      setError(err);
      setData(null);
      setNoDataFound(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if data is cached for a listing
   * @param {string} zpid - Zillow Property ID
   * @returns {Promise<boolean>}
   */
  const checkCache = useCallback(async (zpid) => {
    try {
      const result = await homeownerLookupService.checkCache(zpid);
      if (result.cached && result.data) {
        setData(result.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    setError(null);
    setNoDataFound(false);
  }, []);

  /**
   * Check if we have valid homeowner data
   */
  const hasData = data && (data.firstName || data.lastName || data.emails?.length > 0 || data.phoneNumbers?.length > 0);

  /**
   * Get the full name of the homeowner
   */
  const fullName = data
    ? [data.firstName, data.lastName].filter(Boolean).join(' ') || null
    : null;

  return {
    // Actions
    lookup,
    lookupFromListing,
    checkCache,
    reset,

    // State
    loading,
    data,
    error,
    noDataFound, // True when lookup succeeded but no homeowner data exists

    // Computed
    hasData,
    fullName,

    // Helper functions from service
    formatPhoneNumber: homeownerLookupService.formatPhoneNumber,
    getScoreColor: homeownerLookupService.getScoreColor,
    getPhoneTypeBadge: homeownerLookupService.getPhoneTypeBadge
  };
}

export default useHomeownerLookup;
