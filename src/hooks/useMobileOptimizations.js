import { useEffect, useState, useCallback } from 'react';

/**
 * Safe mobile optimizations hook
 * Provides mobile-specific utilities without breaking existing functionality
 */
export const useMobileOptimizations = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    
    // Re-check on resize (in case of device rotation)
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitor virtual keyboard height (iOS/Android)
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;
        
        // Only consider it a keyboard if the difference is significant
        setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  return {
    isMobile,
    keyboardHeight,
    isKeyboardOpen: keyboardHeight > 0
  };
};

/**
 * Safe debounce hook for performance optimization
 * Prevents excessive function calls without affecting functionality
 */
export const useDebounce = (callback, delay) => {
  const [debouncedCallback, setDebouncedCallback] = useState(() => callback);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay]);

  return debouncedCallback;
};

/**
 * Safe intersection observer hook for lazy loading
 * Only works if IntersectionObserver is supported
 */
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsIntersecting(true); // Fallback: assume visible
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
};

/**
 * Safe scroll optimization hook
 * Debounces scroll events for better performance
 */
export const useOptimizedScroll = (callback, delay = 100) => {
  const debouncedCallback = useDebounce(callback, delay);

  const handleScroll = useCallback((e) => {
    debouncedCallback(e);
  }, [debouncedCallback]);

  return handleScroll;
};
