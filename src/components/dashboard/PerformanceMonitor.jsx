import React, { useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/services/analytics';

const PerformanceMonitor = ({ children, componentName }) => {
  const { trackPerformance } = useAnalytics();
  const renderStartRef = useRef(null);
  const hasTrackedRef = useRef(false);

  // Memoize the trackPerformance function to prevent infinite loops
  const memoizedTrackPerformance = useCallback(trackPerformance, []);

  useEffect(() => {
    // Only track once per component mount
    if (hasTrackedRef.current) return;
    
    const startTime = performance.now();
    renderStartRef.current = startTime;
    hasTrackedRef.current = true;
    
    return () => {
      if (renderStartRef.current) {
        const endTime = performance.now();
        const renderTime = endTime - renderStartRef.current;
        
        // Use a timeout to ensure the tracking doesn't interfere with render cycle
        setTimeout(() => {
          memoizedTrackPerformance({
            name: `${componentName}_render_time`,
            value: renderTime,
            component: componentName,
            timestamp: Date.now()
          });
        }, 0);
      }
    };
  }, [componentName, memoizedTrackPerformance]);

  // Monitor memory usage - only once per component mount
  useEffect(() => {
    if (hasTrackedRef.current && 'memory' in performance) {
      const memoryInfo = performance.memory;
      
      // Use a timeout to prevent render cycle interference
      setTimeout(() => {
        memoizedTrackPerformance({
          name: 'memory_usage',
          value: memoryInfo.usedJSHeapSize,
          component: componentName,
          details: {
            totalJSHeapSize: memoryInfo.totalJSHeapSize,
            jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
          }
        });
      }, 0);
    }
  }, [componentName, memoizedTrackPerformance]);

  return children;
};

export default PerformanceMonitor;
