import { useState, useCallback } from 'react';

const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);

  const withLoading = useCallback(async (asyncFunc) => {
    setIsLoading(true);
    try {
      return await asyncFunc();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return [isLoading, withLoading, setIsLoading];
};

export default useLoading;