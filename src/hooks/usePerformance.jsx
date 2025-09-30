import React, { useEffect } from 'react';
import { analytics } from '@/services/analytics.jsx';

// Hook for tracking performance metrics
export const usePerformance = () => {
  useEffect(() => {
    // Track Core Web Vitals
    const trackWebVitals = () => {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        analytics.trackPerformance('lcp', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          analytics.trackPerformance('fid', entry.processingStart - entry.startTime, {
            eventType: entry.name,
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        analytics.trackPerformance('cls', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });

      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          analytics.trackPerformance('fcp', entry.startTime);
        });
      }).observe({ entryTypes: ['paint'] });
    };

    // Track page load time
    const trackPageLoad = () => {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          analytics.trackPerformance('page_load', navigation.loadEventEnd - navigation.loadEventStart, {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            domComplete: navigation.domComplete - navigation.domContentLoadedEventStart,
          });
        }
      });
    };

    // Track API response times
    const trackApiPerformance = () => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        try {
          const response = await originalFetch(...args);
          const end = performance.now();
          
          analytics.trackPerformance('api_response', end - start, {
            url: args[0],
            status: response.status,
            method: args[1]?.method || 'GET',
          });
          
          return response;
        } catch (error) {
          const end = performance.now();
          analytics.trackPerformance('api_error', end - start, {
            url: args[0],
            error: error.message,
          });
          throw error;
        }
      };
    };

    // Initialize performance tracking
    if (typeof window !== 'undefined') {
      trackWebVitals();
      trackPageLoad();
      trackApiPerformance();
    }

    // Cleanup
    return () => {
      // Restore original fetch if needed
      if (window.fetch._original) {
        window.fetch = window.fetch._original;
      }
    };
  }, []);
};

// Hook for tracking component render performance
export const useComponentPerformance = (componentName) => {
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      analytics.trackPerformance('component_render', end - start, {
        component: componentName,
      });
    };
  }, [componentName]);
};

// Hook for tracking user interactions
export const useInteractionTracking = () => {
  const trackClick = (element, properties = {}) => {
    analytics.trackAction('click', {
      element: element.tagName,
      id: element.id,
      className: element.className,
      ...properties,
    });
  };

  const trackScroll = (depth) => {
    analytics.trackAction('scroll', { depth });
  };

  const trackFormInteraction = (formName, fieldName, action) => {
    analytics.trackAction('form_interaction', {
      form: formName,
      field: fieldName,
      action, // 'focus', 'blur', 'change', 'submit'
    });
  };

  return {
    trackClick,
    trackScroll,
    trackFormInteraction,
  };
};
