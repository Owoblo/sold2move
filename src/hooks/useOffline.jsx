import { useState, useEffect } from 'react';
import { addNetworkListeners } from '@/utils/authUtils';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const cleanup = addNetworkListeners(
      () => {
        setIsOffline(true);
        setWasOffline(true);
      },
      () => {
        setIsOffline(false);
      }
    );

    return cleanup;
  }, []);

  return { isOffline, wasOffline, setWasOffline };
};
