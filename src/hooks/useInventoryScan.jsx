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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const progressIntervalRef = useRef(null);
  const photoIntervalRef = useRef(null);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
      }
    };
  }, []);

  /**
   * Start progress simulation for long-running scan
   * @param {number} photoCount - Number of photos being scanned (for photo cycling)
   */
  const startProgressSimulation = useCallback((photoCount = 12) => {
    setProgress(0);
    setCurrentPhotoIndex(0);
    setTotalPhotos(Math.min(photoCount, 12)); // Max 12 photos analyzed

    // Progress simulation
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

    // Photo cycling - cycle through photos to show which one is being analyzed
    // Photos are processed in batches of 2 with ~45s per photo
    // We'll cycle every 3 seconds to give visual feedback
    photoIntervalRef.current = setInterval(() => {
      setCurrentPhotoIndex((prev) => {
        const maxIndex = Math.min(photoCount, 12) - 1;
        return prev < maxIndex ? prev + 1 : prev;
      });
    }, 3000);
  }, []);

  /**
   * Stop progress simulation and photo cycling
   */
  const stopProgressSimulation = useCallback((success = true) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
    setProgress(success ? 100 : 0);
    if (!success) {
      setCurrentPhotoIndex(0);
    }
  }, []);

  /**
   * Scan inventory for a listing
   * @param {Object} listing - Listing object with zpid
   * @param {boolean} [forceRefresh=false] - Force re-scan even if cached
   * @param {number} [photoCount=12] - Number of photos (for progress animation)
   */
  const scanFromListing = useCallback(async (listing, forceRefresh = false, photoCount = 12) => {
    setLoading(true);
    setError(null);
    startProgressSimulation(photoCount);

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
    setCurrentPhotoIndex(0);
    setTotalPhotos(0);
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
    currentPhotoIndex,
    totalPhotos,

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
