import { useEffect, useRef } from 'react';

/**
 * Hook to detect when a new version of the app is deployed
 * and automatically reload to prevent chunk loading errors.
 *
 * This solves the issue where users have cached HTML that references
 * old JavaScript chunk filenames that no longer exist after deployment.
 */
export function useVersionCheck() {
  const currentVersion = useRef(null);
  const checkInterval = useRef(null);

  useEffect(() => {
    // Store the initial version from the meta tag
    const metaVersion = document.querySelector('meta[name="app-version"]');
    if (metaVersion) {
      currentVersion.current = metaVersion.content;
    }

    // Function to check for new version
    const checkVersion = async () => {
      try {
        // Fetch the index.html with cache-busting to get the latest version
        const response = await fetch(`/?_v=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        // If we can't reach the server, don't do anything
        if (!response.ok) return;

        // Now fetch the actual HTML to check the version
        const htmlResponse = await fetch(`/?_v=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        const html = await htmlResponse.text();

        // Extract version from the fetched HTML
        const versionMatch = html.match(/<meta name="app-version" content="([^"]+)"/);
        const serverVersion = versionMatch ? versionMatch[1] : null;

        // If versions don't match and we have both versions, reload
        if (serverVersion && currentVersion.current && serverVersion !== currentVersion.current) {
          console.log(`[Version Check] New version detected: ${serverVersion} (current: ${currentVersion.current})`);

          // Clear all caches if available
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Force reload to get new assets
          window.location.reload();
        }
      } catch (error) {
        // Silently fail - don't interrupt the user experience
        console.debug('[Version Check] Check failed:', error.message);
      }
    };

    // Check version every 5 minutes
    checkInterval.current = setInterval(checkVersion, 5 * 60 * 1000);

    // Also check when the page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check on initial mount after a short delay
    const initialCheck = setTimeout(checkVersion, 5000);

    return () => {
      clearInterval(checkInterval.current);
      clearTimeout(initialCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * Error boundary helper to detect chunk loading errors
 * and trigger a reload automatically.
 */
export function handleChunkLoadError(error) {
  const isChunkError =
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.name === 'ChunkLoadError';

  if (isChunkError) {
    console.log('[Version Check] Chunk load error detected, reloading...');

    // Clear caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name))).then(() => {
          window.location.reload();
        });
      });
    } else {
      window.location.reload();
    }

    return true;
  }

  return false;
}

export default useVersionCheck;
