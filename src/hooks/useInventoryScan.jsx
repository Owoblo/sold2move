import { useState, useCallback, useRef, useEffect } from 'react';
import { inventoryScanService } from '@/services/inventoryScan';

// Minimum animation duration for cached results (in ms)
// This gives the "AI scanning" illusion even for instant cached responses
const MIN_ANIMATION_DURATION_MS = 4000;

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
  const scanStartTimeRef = useRef(null);

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
   * @param {boolean} isFastMode - If true, run faster animation for cached results
   */
  const startProgressSimulation = useCallback((photoCount = 12, isFastMode = false) => {
    setProgress(0);
    setCurrentPhotoIndex(0);
    setTotalPhotos(Math.min(photoCount, 12)); // Max 12 photos analyzed
    scanStartTimeRef.current = Date.now();

    // Progress simulation - faster for cached results
    const progressInterval = isFastMode ? 100 : 1000;
    const progressIncrement = isFastMode ? 3 : 1;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (isFastMode) {
          // Fast mode: quickly reach 90% in ~3 seconds
          if (prev < 90) return prev + progressIncrement;
          return prev;
        }
        // Normal mode: slow down as we approach 90%
        if (prev < 30) return prev + 2;
        if (prev < 60) return prev + 1;
        if (prev < 85) return prev + 0.5;
        if (prev < 95) return prev + 0.1;
        return prev;
      });
    }, progressInterval);

    // Photo cycling - faster for cached results
    const photoInterval = isFastMode ? 800 : 3000;
    photoIntervalRef.current = setInterval(() => {
      setCurrentPhotoIndex((prev) => {
        const maxIndex = Math.min(photoCount, 12) - 1;
        return prev < maxIndex ? prev + 1 : 0; // Loop back for fast mode
      });
    }, photoInterval);
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
    setData(null);

    // Check if this listing likely has cached data (for faster animation)
    const likelyHasCachedData = listing?.furniture_scan_date &&
      Array.isArray(listing?.furniture_items_detected) &&
      listing.furniture_items_detected.length > 0;

    startProgressSimulation(photoCount, likelyHasCachedData);

    try {
      console.log('📦 Inventory scan starting for listing:', listing?.zpid || listing?.id);
      const result = await inventoryScanService.scanFromListing(listing, forceRefresh);

      console.log('📥 Inventory scan result:', result);

      // Calculate how long the animation has been running
      const elapsedTime = Date.now() - (scanStartTimeRef.current || Date.now());
      const isCachedResult = result.data?.cached;

      // For cached results, ensure minimum animation duration for the AI experience
      if (isCachedResult && elapsedTime < MIN_ANIMATION_DURATION_MS) {
        const remainingTime = MIN_ANIMATION_DURATION_MS - elapsedTime;
        console.log(`⏳ Cached result - showing animation for ${remainingTime}ms more`);

        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

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
