import { useEffect, useState } from 'react';

/**
 * Safe performance monitoring hook
 * Only logs performance metrics in development mode
 * Does not affect production performance
 */
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Check if PerformanceObserver is supported
    if (!('PerformanceObserver' in window)) {
      console.log('Performance monitoring not supported in this browser');
      return;
    }

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('📊 Performance metric:', {
          name: entry.name,
          value: entry.value,
          type: entry.entryType,
          timestamp: entry.startTime
        });
      }
    });

    try {
      // Observe different performance metrics
      observer.observe({ 
        entryTypes: [
          'largest-contentful-paint', 
          'first-input', 
          'layout-shift',
          'navigation',
          'resource'
        ] 
      });
    } catch (error) {
      console.log('Performance monitoring setup failed:', error);
    }

    // Cleanup
    return () => {
      try {
        observer.disconnect();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, []);
};

/**
 * Safe device detection hook
 * Returns device information without affecting functionality
 */
export const useDeviceInfo = () => {
  const getDeviceInfo = () => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        userAgent: '',
        screenWidth: 0,
        screenHeight: 0,
        viewportWidth: 0,
        viewportHeight: 0
      };
    }

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    return {
      isMobile,
      isIOS,
      isAndroid,
      userAgent,
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0
    };
  };

  return getDeviceInfo();
};

/**
 * Safe offline detection hook
 * Monitors online/offline status without affecting functionality
 */
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
