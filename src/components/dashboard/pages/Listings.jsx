import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DataErrorBoundary from '@/components/dashboard/DataErrorBoundary';
import PerformanceMonitor from '@/components/dashboard/PerformanceMonitor';

const UnifiedListings = lazy(() => import('@/components/dashboard/listings/UnifiedListings'));
const PropertyDetailPage = lazy(() => import('@/components/dashboard/listings/PropertyDetailPage'));

const Listings = () => {

  return (
    <PageWrapper>
      <Helmet>
        <title>Real Estate Listings | Sold2Move</title>
        <meta name="description" content="Browse just listed and recently sold real estate listings to find moving leads." />
      </Helmet>
      
      <DataErrorBoundary>
        <PerformanceMonitor componentName="ListingsPage">
          <Suspense fallback={<div className="flex justify-center items-center h-96"><LoadingSpinner size="xl" /></div>}>
            <Routes>
              <Route 
                path="/property/:listingId" 
                element={
                  <DataErrorBoundary>
                    <PropertyDetailPage />
                  </DataErrorBoundary>
                } 
              />
              <Route path="*" element={
                <DataErrorBoundary>
                  <UnifiedListings />
                </DataErrorBoundary>
              } />
            </Routes>
          </Suspense>
        </PerformanceMonitor>
      </DataErrorBoundary>
    </PageWrapper>
  );
};

export default Listings;