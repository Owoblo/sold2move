import { useState, useCallback } from 'react';
import { useErrorHandler } from '@/contexts/ErrorContext';

export const useAsyncOperation = (asyncFunction, onSuccess, onError) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const handleError = useErrorHandler();

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setData(null);
    try {
      const result = await asyncFunction(...args);
      setData(result);
      if (onSuccess) {
        onSuccess(result);
      }
      setIsLoading(false);
      return { result, error: null };
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        handleError(err);
      }
      setIsLoading(false);
      return { result: null, error: err };
    }
  }, [asyncFunction, onSuccess, onError, handleError]);

  return { execute, isLoading, data };
};