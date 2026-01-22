import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { chainDetectionService } from '@/services/chainDetection';

/**
 * React hook for managing chain leads (buyer-seller chain detection)
 * Provides loading state, pagination, and reveal tracking
 */
export function useChainLeads(options = {}) {
  const { user } = useAuth();
  const {
    status = 'detected',
    minConfidence = 60,
    city = null,
    limit = 20,
    autoFetch = true
  } = options;

  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [detectingId, setDetectingId] = useState(null);

  // Fetch chains
  const fetchChains = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);

    try {
      const offset = pageNum * limit;
      const result = await chainDetectionService.getChains({
        status,
        minConfidence,
        city,
        limit,
        offset
      });

      if (result.error) {
        setError(result.error);
        setChains([]);
        setCount(0);
      } else {
        setChains(result.data);
        setCount(result.count);
        setPage(pageNum);
      }
    } catch (err) {
      setError(err);
      setChains([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [status, minConfidence, city, limit]);

  // Fetch revealed chain IDs for current user
  const fetchRevealedIds = useCallback(async () => {
    if (!user?.id) return;

    try {
      const revealed = await chainDetectionService.getRevealedChainIds(user.id);
      setRevealedIds(revealed);
    } catch (err) {
      console.error('Error fetching revealed chains:', err);
    }
  }, [user?.id]);

  // Reveal a chain (costs credits)
  const revealChain = useCallback(async (chainId) => {
    if (!user?.id) {
      return { success: false, error: new Error('Must be logged in') };
    }

    try {
      const result = await chainDetectionService.revealChain(chainId, user.id);

      if (result.success) {
        setRevealedIds(prev => new Set([...prev, chainId]));
      }

      return result;
    } catch (err) {
      return { success: false, error: err };
    }
  }, [user?.id]);

  // Detect chain for a specific listing
  const detectForListing = useCallback(async (listingId) => {
    setDetectingId(listingId);

    try {
      const result = await chainDetectionService.detectForListing(listingId);

      if (result.data?.chainsDetected > 0) {
        // Refresh the list to include new chains
        await fetchChains(page);
      }

      return result;
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setDetectingId(null);
    }
  }, [fetchChains, page]);

  // Run batch detection
  const runBatchDetection = useCallback(async (batchLimit = 10) => {
    setLoading(true);

    try {
      const result = await chainDetectionService.runBatchDetection(batchLimit);

      if (result.data?.chainsDetected > 0) {
        await fetchChains(0);
      }

      return result;
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [fetchChains]);

  // Update chain status
  const updateStatus = useCallback(async (chainId, newStatus) => {
    const result = await chainDetectionService.updateChainStatus(chainId, newStatus);

    if (result.success) {
      // Update local state
      setChains(prev => prev.map(c =>
        c.id === chainId ? { ...c, chain_status: newStatus } : c
      ));
    }

    return result;
  }, []);

  // Pagination
  const nextPage = useCallback(() => {
    if ((page + 1) * limit < count) {
      fetchChains(page + 1);
    }
  }, [page, limit, count, fetchChains]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      fetchChains(page - 1);
    }
  }, [page, fetchChains]);

  const goToPage = useCallback((pageNum) => {
    fetchChains(pageNum);
  }, [fetchChains]);

  // Check if a chain is revealed
  const isRevealed = useCallback((chainId) => {
    return revealedIds.has(chainId);
  }, [revealedIds]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchChains(0);
      fetchRevealedIds();
    }
  }, [autoFetch, fetchChains, fetchRevealedIds]);

  // Computed values
  const totalPages = Math.ceil(count / limit);
  const hasNextPage = (page + 1) * limit < count;
  const hasPrevPage = page > 0;

  // Separate chains by confidence
  const highConfidenceChains = chains.filter(c => c.confidence_score >= 80);
  const mediumConfidenceChains = chains.filter(c => c.confidence_score >= 60 && c.confidence_score < 80);

  return {
    // Data
    chains,
    count,
    highConfidenceChains,
    mediumConfidenceChains,

    // Loading/Error
    loading,
    error,
    detectingId,

    // Pagination
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,

    // Actions
    fetchChains,
    revealChain,
    detectForListing,
    runBatchDetection,
    updateStatus,
    refresh: () => fetchChains(page),

    // Reveal tracking
    revealedIds,
    isRevealed,

    // Helper functions
    getConfidenceLabel: chainDetectionService.getConfidenceLabel,
    getConfidenceColor: chainDetectionService.getConfidenceColor,
    formatMatchSignals: chainDetectionService.formatMatchSignals,
    getDaysSinceDetection: chainDetectionService.getDaysSinceDetection
  };
}

export default useChainLeads;
