import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from 'react-helmet-async';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ListingsFilter = lazy(() => import('@/components/dashboard/listings/ListingsFilter'));
const JustListed = lazy(() => import('@/components/dashboard/listings/JustListed'));
const SoldListings = lazy(() => import('@/components/dashboard/listings/SoldListings'));
const PropertyDetailPage = lazy(() => import('@/components/dashboard/listings/PropertyDetailPage'));

const Listings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  const onTabChange = (value) => {
    navigate(`/dashboard/listings/${value}`);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };
  
  const handleResetFilters = () => {
    setFilters({});
    setAppliedFilters({});
  };

  const getCurrentTab = () => {
    const pathParts = location.pathname.split('/');
    const current = pathParts[3];
    if (current === 'sold') return 'sold';
    if (current === 'just-listed') return 'just-listed';
    return 'just-listed';
  };
  
  const isDetailPage = location.pathname.includes('/dashboard/listings/property/');

  return (
    <PageWrapper>
      <Helmet>
        <title>Real Estate Listings | Sold2Move</title>
        <meta name="description" content="Browse just listed and recently sold real estate listings to find moving leads." />
      </Helmet>
      
      <Suspense fallback={<div className="flex justify-center items-center h-96"><LoadingSpinner size="xl" /></div>}>
        <Routes>
          <Route path="/property/:listingId" element={<PropertyDetailPage />} />
          <Route path="*" element={
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-lightest-slate">Listings</h1>
              </div>
              
              <ListingsFilter 
                filters={filters}
                onFilterChange={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
              
              <Tabs value={getCurrentTab()} onValueChange={onTabChange} className="w-full">
                <TabsList>
                  <TabsTrigger value="just-listed">Just Listed</TabsTrigger>
                  <TabsTrigger value="sold">Sold</TabsTrigger>
                </TabsList>
                <div className="mt-6">
                  <Routes>
                    <Route path="/" element={<Navigate to="just-listed" replace />} />
                    <Route path="/just-listed" element={<JustListed filters={appliedFilters} />} />
                    <Route path="/sold" element={<SoldListings filters={appliedFilters} />} />
                  </Routes>
                </div>
              </Tabs>
            </>
          } />
        </Routes>
      </Suspense>
    </PageWrapper>
  );
};

export default Listings;