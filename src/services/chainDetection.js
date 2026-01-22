import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for buyer-seller chain detection
 * Identifies when a property buyer still owns another property = guaranteed move lead
 */
class ChainDetectionService {
  /**
   * Detect ownership chains for a specific sold listing
   * @param {string} soldListingId - The ID of the sold listing to analyze
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async detectForListing(soldListingId) {
    try {
      console.log('🔗 Detecting chain for listing:', soldListingId);

      const { data, error } = await supabase.functions.invoke('detect-ownership-chain', {
        body: { soldListingId }
      });

      if (error) {
        console.error('❌ Chain detection error:', error);
        return { data: null, error };
      }

      console.log('✅ Chain detection result:', data);
      return { data, error: null };
    } catch (err) {
      console.error('💥 Chain detection exception:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Detect ownership chains for an address
   * @param {Object} params - Address parameters
   * @param {string} params.street - Street address
   * @param {string} params.city - City
   * @param {string} params.state - State abbreviation
   * @param {string} params.zip - ZIP code
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async detectForAddress({ street, city, state, zip }) {
    try {
      console.log('🔗 Detecting chain for address:', { street, city, state, zip });

      const { data, error } = await supabase.functions.invoke('detect-ownership-chain', {
        body: { street, city, state, zip }
      });

      if (error) {
        console.error('❌ Chain detection error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('💥 Chain detection exception:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Run batch chain detection on recent sold listings
   * @param {number} limit - Max number of listings to process
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async runBatchDetection(limit = 10) {
    try {
      console.log('🔗 Running batch chain detection, limit:', limit);

      const { data, error } = await supabase.functions.invoke('detect-ownership-chain', {
        body: { limit }
      });

      if (error) {
        console.error('❌ Batch detection error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('💥 Batch detection exception:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Get all detected chains with optional filtering
   * @param {Object} options - Query options
   * @param {string} [options.status] - Filter by chain status
   * @param {number} [options.minConfidence] - Minimum confidence score
   * @param {string} [options.city] - Filter by city
   * @param {number} [options.limit] - Max results
   * @param {number} [options.offset] - Pagination offset
   * @returns {Promise<{data: Array, count: number, error: Error|null}>}
   */
  async getChains({ status = 'detected', minConfidence = 60, city, limit = 50, offset = 0 } = {}) {
    try {
      let query = supabase
        .from('ownership_chains')
        .select('*', { count: 'exact' })
        .gte('confidence_score', minConfidence)
        .order('confidence_score', { ascending: false })
        .order('detected_at', { ascending: false });

      if (status) {
        query = query.eq('chain_status', status);
      }

      if (city) {
        query = query.or(`sold_city.ilike.%${city}%,owned_property_city.ilike.%${city}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('❌ Error fetching chains:', error);
        return { data: [], count: 0, error };
      }

      return { data: data || [], count: count || 0, error: null };
    } catch (err) {
      console.error('💥 Get chains exception:', err);
      return { data: [], count: 0, error: err };
    }
  }

  /**
   * Get a single chain by ID
   * @param {string} chainId - Chain ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getChainById(chainId) {
    try {
      const { data, error } = await supabase
        .from('ownership_chains')
        .select('*')
        .eq('id', chainId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  /**
   * Reveal a chain lead (costs credits)
   * @param {string} chainId - Chain ID to reveal
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async revealChain(chainId, userId) {
    try {
      // Check if already revealed
      const { data: existing } = await supabase
        .from('chain_reveals')
        .select('id')
        .eq('chain_id', chainId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyRevealed: true, error: null };
      }

      // Insert reveal record
      const { error } = await supabase
        .from('chain_reveals')
        .insert({
          chain_id: chainId,
          user_id: userId,
          credit_cost: 1
        });

      if (error) {
        console.error('❌ Error revealing chain:', error);
        return { success: false, error };
      }

      return { success: true, alreadyRevealed: false, error: null };
    } catch (err) {
      console.error('💥 Reveal chain exception:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Check which chains a user has revealed
   * @param {string} userId - User ID
   * @returns {Promise<Set<string>>}
   */
  async getRevealedChainIds(userId) {
    try {
      const { data, error } = await supabase
        .from('chain_reveals')
        .select('chain_id')
        .eq('user_id', userId);

      if (error || !data) {
        return new Set();
      }

      return new Set(data.map(r => r.chain_id));
    } catch (err) {
      console.error('💥 Get revealed chains exception:', err);
      return new Set();
    }
  }

  /**
   * Update chain status
   * @param {string} chainId - Chain ID
   * @param {string} status - New status
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async updateChainStatus(chainId, status) {
    try {
      const { error } = await supabase
        .from('ownership_chains')
        .update({ chain_status: status })
        .eq('id', chainId);

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  /**
   * Get confidence level label
   * @param {number} score - Confidence score (0-100)
   * @returns {string} Label
   */
  getConfidenceLabel(score) {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  }

  /**
   * Get confidence color class
   * @param {number} score - Confidence score (0-100)
   * @returns {string} Tailwind color class
   */
  getConfidenceColor(score) {
    if (score >= 80) return 'text-green-500 bg-green-500/10';
    if (score >= 60) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-slate-400 bg-slate-400/10';
  }

  /**
   * Format match signals for display
   * @param {Object} signals - Match signals object
   * @returns {Array<string>} Formatted signal descriptions
   */
  formatMatchSignals(signals) {
    if (!signals) return [];

    const descriptions = [];

    if (signals.exactNameMatch) descriptions.push('Exact name match');
    if (signals.fuzzyNameMatch) descriptions.push('Similar name');
    if (signals.partialNameMatch) descriptions.push('Partial name match');
    if (signals.mailingMismatch) descriptions.push('Different mailing address');
    if (signals.sameState) descriptions.push('Same state');
    if (signals.recentSale) descriptions.push('Recent sale');

    return descriptions;
  }

  /**
   * Calculate days since detection
   * @param {string} detectedAt - ISO date string
   * @returns {number} Days since detection
   */
  getDaysSinceDetection(detectedAt) {
    if (!detectedAt) return 0;
    const detected = new Date(detectedAt);
    const now = new Date();
    return Math.floor((now - detected) / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const chainDetectionService = new ChainDetectionService();
export default chainDetectionService;
