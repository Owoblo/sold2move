import React, { createContext, useState, useContext, useCallback } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

const ErrorContext = createContext(null);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (context === null) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);

  const handleError = useCallback((errorToHandle) => {
    setError(errorToHandle);
  }, []);
  
  if (error) {
    throw error;
  }

  return (
    <ErrorContext.Provider value={{ handleError }}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
};