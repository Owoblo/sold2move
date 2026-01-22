import { useState, useCallback, useRef, useEffect } from 'react';
import { inventoryScanService } from '@/services/inventoryScan';

/**
 * React hook for inventory scan functionality
 * Manages loading state, data, error handling, and progress simulation
 */
export function useInventoryScan() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // Clean up progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  /**
   * Start progress simulation for long-running scan
   */
  const startProgressSimulation = useCallback(() => {
    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we approach 90% (never reach 100% until complete)
        if (prev < 30) return prev + 2;
        if (prev < 60) return prev + 1;
        if (prev < 85) return prev + 0.5;
        if (prev < 95) return prev + 0.1;
        return prev;
      });
    }, 1000);
  }, []);

  /**
   * Stop progress simulation
   */
  const stopProgressSimulation = useCallback((success = true) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(success ? 100 : 0);
  }, []);

  /**
   * Scan inventory for a listing
   * @param {Object} listing - Listing object with zpid
   * @param {boolean} [forceRefresh=false] - Force re-scan even if cached
   */
  const scanFromListing = useCallback(async (listing, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    startProgressSimulation();

    try {
      console.log('📦 Inventory scan starting for listing:', listing?.zpid || listing?.id);
      const result = await inventoryScanService.scanFromListing(listing, forceRefresh);

      console.log('📥 Inventory scan result:', result);

      if (result.error) {
        console.error('❌ Inventory scan error:', result.error);
        setError(result.error);
        setData(null);
        stopProgressSimulation(false);
      } else {
        console.log('✅ Inventory scan success!', result.data);
        setData(result.data);
        setError(null);
        stopProgressSimulation(true);
      }
    } catch (err) {
      console.error('💥 Inventory scan exception:', err);
      setError(err);
      setData(null);
      stopProgressSimulation(false);
    } finally {
      setLoading(false);
    }
  }, [startProgressSimulation, stopProgressSimulation]);

  /**
   * Scan inventory by zpid directly
   * @param {Object} params
   * @param {string|number} params.zpid - Zillow Property ID
   * @param {boolean} [params.forceRefresh=false] - Force re-scan
   */
  const scan = useCallback(async ({ zpid, forceRefresh = false }) => {
    setLoading(true);
    setError(null);
    startProgressSimulation();

    try {
      const result = await inventoryScanService.scanInventory({ zpid, forceRefresh });
      setData(result);
      setError(null);
      stopProgressSimulation(true);
    } catch (err) {
      setError(err);
      setData(null);
      stopProgressSimulation(false);
    } finally {
      setLoading(false);
    }
  }, [startProgressSimulation, stopProgressSimulation]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    setError(null);
    setProgress(0);
    stopProgressSimulation(false);
  }, [stopProgressSimulation]);

  // Computed values
  const hasData = data && data.inventory?.length > 0;
  const totalItems = data?.summary?.totalItems || 0;
  const totalCubicFeet = data?.summary?.totalCubicFeet || 0;
  const isCached = data?.cached || false;
  const roomBreakdown = data?.summary?.roomBreakdown || {};

  return {
    // Actions
    scan,
    scanFromListing,
    reset,

    // State
    loading,
    data,
    error,
    progress,

    // Computed
    hasData,
    totalItems,
    totalCubicFeet,
    isCached,
    roomBreakdown,

    // Helper functions from service
    formatCubicFeet: inventoryScanService.formatCubicFeet,
    getConfidenceColor: inventoryScanService.getConfidenceColor,
    getRoomIcon: inventoryScanService.getRoomIcon,
    getSizeBadgeVariant: inventoryScanService.getSizeBadgeVariant,
    canShowScanButton: inventoryScanService.canShowScanButton.bind(inventoryScanService)
  };
}

export default useInventoryScan;
