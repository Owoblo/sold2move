import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with optimized settings for large datasets
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Don't retry on timeout errors (likely due to large dataset)
        if (error?.message?.includes('timeout') || error?.code === 'PGRST301') {
          return false;
        }
        // Retry up to 2 times for other errors (reduced from 3)
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch when component remounts if data exists
      refetchOnReconnect: false, // Don't refetch on reconnect
      keepPreviousData: true, // Keep showing old data while fetching new
      networkMode: 'offlineFirst', // Use cache first, then network
    },
    mutations: {
      retry: false,
    },
  },
});

export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };
