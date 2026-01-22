import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for looking up homeowner information via Batch Data API
 * Results are cached in the database to avoid duplicate API calls
 */
class HomeownerLookupService {
  /**
   * Look up homeowner information for a property
   * @param {Object} params - Lookup parameters
   * @param {string} [params.zpid] - Zillow Property ID (optional, used for cache matching)
   * @param {string} params.street - Street address
   * @param {string} params.city - City
   * @param {string} params.state - State abbreviation
   * @param {string} params.zip - ZIP code
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async lookupProperty({ zpid, street, city, state, zip }) {
    try {
      console.log('🌐 Calling homeowner-lookup edge function with:', { zpid, street, city, state, zip });

      const { data, error } = await supabase.functions.invoke('homeowner-lookup', {
        body: { zpid, street, city, state, zip }
      });

      console.log('📡 Edge function response:', { data, error });
      console.log('📡 Edge function data stringified:', JSON.stringify(data, null, 2));

      if (error) {
        console.error('❌ Homeowner lookup edge function error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('💥 Homeowner lookup exception:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Look up homeowner information using a listing object
   * Extracts address components from the listing
   * @param {Object} listing - Listing object with address fields
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async lookupFromListing(listing) {
    if (!listing) {
      return { data: null, error: new Error('No listing provided') };
    }

    // Extract address components from listing
    // Handle various field name formats
    const street = listing.addressStreet || listing.addressstreet || listing.address_street || '';
    const city = listing.addressCity || listing.addresscity || listing.address_city || '';
    const state = listing.addressState || listing.addressstate || listing.address_state || '';
    const zip = listing.addressZipcode || listing.addresszipcode || listing.address_zipcode || listing.addressZip || '';
    const zpid = listing.zpid || listing.id || null;

    // Validate we have the required fields
    if (!street || !city || !state || !zip) {
      return {
        data: null,
        error: new Error('Listing is missing required address fields')
      };
    }

    return this.lookupProperty({ zpid, street, city, state, zip });
  }

  /**
   * Check if homeowner data is already cached for a property
   * @param {string} zpid - Zillow Property ID
   * @returns {Promise<{cached: boolean, data: Object|null}>}
   */
  async checkCache(zpid) {
    if (!zpid) {
      return { cached: false, data: null };
    }

    try {
      const { data, error } = await supabase
        .from('homeowner_lookups')
        .select('*')
        .eq('zpid', zpid)
        .eq('lookup_successful', true)
        .maybeSingle();

      if (error || !data) {
        return { cached: false, data: null };
      }

      return {
        cached: true,
        data: {
          firstName: data.homeowner_first_name,
          lastName: data.homeowner_last_name,
          emails: data.emails || [],
          phoneNumbers: data.phone_numbers || [],
          isLitigator: data.is_litigator || false,
          hasDncPhone: data.has_dnc_phone || false,
          fromCache: true,
          cachedAt: data.created_at
        }
      };
    } catch (err) {
      console.error('Cache check error:', err);
      return { cached: false, data: null };
    }
  }

  /**
   * Format a phone number for display (e.g., (555) 123-4567)
   * @param {string} number - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(number) {
    if (!number) return '';

    // Remove all non-numeric characters
    const cleaned = number.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // If 11 digits starting with 1, remove the 1 and format
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const withoutCountry = cleaned.slice(1);
      return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
    }

    // Return as-is if not standard format
    return number;
  }

  /**
   * Get a color class for phone score (higher is better)
   * @param {string|number} score - Phone score (0-100)
   * @returns {string} Tailwind color class
   */
  getScoreColor(score) {
    const numScore = parseInt(score) || 0;
    if (numScore >= 80) return 'text-green-500';
    if (numScore >= 60) return 'text-teal';
    if (numScore >= 40) return 'text-yellow-500';
    return 'text-slate';
  }

  /**
   * Get a badge variant for phone type
   * @param {string} type - Phone type (Mobile, Land Line, etc.)
   * @returns {string} Badge variant
   */
  getPhoneTypeBadge(type) {
    const lowerType = (type || '').toLowerCase();
    if (lowerType.includes('mobile')) return 'default';
    if (lowerType.includes('land')) return 'secondary';
    return 'outline';
  }
}

// Export singleton instance
export const homeownerLookupService = new HomeownerLookupService();
export default homeownerLookupService;
