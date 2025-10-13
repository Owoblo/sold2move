// Authentication utility functions for mobile app

/**
 * Store the intended destination for post-authentication redirect
 * @param {string} path - The path to redirect to after authentication
 */
export const storeIntendedDestination = (path) => {
  if (path && path !== '/login' && path !== '/signup' && path !== '/auth/callback') {
    localStorage.setItem('intendedDestination', path);
    console.log('📍 Stored intended destination:', path);
  }
};

/**
 * Get and clear the intended destination
 * @returns {string|null} - The intended destination path or null
 */
export const getAndClearIntendedDestination = () => {
  const destination = localStorage.getItem('intendedDestination');
  if (destination) {
    localStorage.removeItem('intendedDestination');
    console.log('📍 Retrieved intended destination:', destination);
  }
  return destination;
};

/**
 * Check if a path is a protected route
 * @param {string} path - The path to check
 * @returns {boolean} - True if the path is protected
 */
export const isProtectedRoute = (path) => {
  const protectedRoutes = [
    '/dashboard',
    '/onboarding',
    '/welcome',
    '/post-auth'
  ];
  
  return protectedRoutes.some(route => path.startsWith(route));
};

/**
 * Check if a path is a public route
 * @param {string} path - The path to check
 * @returns {boolean} - True if the path is public
 */
export const isPublicRoute = (path) => {
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/about',
    '/contact',
    '/pricing',
    '/faq',
    '/terms',
    '/privacy',
    '/how-it-works'
  ];
  
  return publicRoutes.includes(path) || publicRoutes.some(route => path.startsWith(route));
};

/**
 * Get the default redirect path for authenticated users
 * @returns {string} - The default path to redirect to
 */
export const getDefaultAuthenticatedPath = () => {
  return '/dashboard';
};

/**
 * Check if the app is running in a mobile environment
 * @returns {boolean} - True if running on mobile
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Check if the app is running as a PWA
 * @returns {boolean} - True if running as PWA
 */
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
};

/**
 * Handle offline detection
 * @returns {boolean} - True if offline
 */
export const isOffline = () => {
  return !navigator.onLine;
};

/**
 * Add offline/online event listeners
 * @param {Function} onOffline - Callback for offline events
 * @param {Function} onOnline - Callback for online events
 * @returns {Function} - Cleanup function
 */
export const addNetworkListeners = (onOffline, onOnline) => {
  const handleOffline = () => {
    console.log('📱 Device went offline');
    onOffline();
  };
  
  const handleOnline = () => {
    console.log('📱 Device came back online');
    onOnline();
  };
  
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  
  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
};
