import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Mail, AlertTriangle, Filter, MapPin, Building, Globe, Eye, Lock, ZapOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useListings, useRevealedListings, useRevealListing } from '@/hooks/useListings.jsx';
import { Pagination } from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Country, State } from 'country-state-city';
import { Link } from 'react-router-dom';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAnalytics } from '@/services/analytics.jsx';
import { usePerformance } from '@/hooks/usePerformance.jsx';

const LISTINGS_PER_PAGE = 15;

const DashboardPage = () => {
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const { trackAction, trackListingInteraction, trackConversion } = useAnalytics();
  
  // Performance tracking
  usePerformance();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [revealingId, setRevealingId] = useState(null);

  // Use React Query hooks for data fetching
  const { 
    data: listingsData, 
    isLoading: listingsLoading, 
    error: listingsError,
    refetch: refetchListings 
  } = useListings(
    { 
      state_code: profile?.state_code, 
      city_name: profile?.city_name 
    }, 
    currentPage, 
    LISTINGS_PER_PAGE
  );

  const { 
    data: revealedListings = new Set(), 
    isLoading: revealedLoading 
  } = useRevealedListings(profile?.id);

  const revealListingMutation = useRevealListing();

  // Track page view
  useEffect(() => {
    trackAction('page_view', { page: 'dashboard' });
  }, [trackAction]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    trackAction('pagination', { page, section: 'listings' });
  };

  // Handle reveal listing with analytics
  const handleRevealListing = async (listingId) => {
    if (!profile) return;
    
    setRevealingId(listingId);
    
    try {
      await revealListingMutation.mutateAsync({
        listingId,
        userId: profile.id,
      });
      
      // Track conversion
      trackConversion('listing_revealed', null, {
        listingId,
        page: currentPage,
      });
      
      trackListingInteraction('reveal', listingId, {
        page: currentPage,
        totalListings: listingsData?.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to reveal listing:', error);
    } finally {
      setRevealingId(null);
    }
  };

  // Handle export with analytics
  const handleExport = () => {
    if (!listingsData?.data?.length) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no listings to export at this time.",
      });
      return;
    }

    trackAction('export', {
      type: 'listings',
      count: listingsData.data.length,
      page: currentPage,
    });

    // Export logic here
    toast({
      title: "Export started",
      description: "Your listings are being prepared for download.",
    });
  };

  // Handle mailing with analytics
  const handleMailing = () => {
    trackAction('mailing_click', {
      source: 'dashboard',
      listingsCount: listingsData?.data?.length || 0,
    });
  };

  // Loading states
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!profile?.onboarding_complete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Complete Your Setup</h2>
        <p className="text-slate text-center max-w-md">
          Please complete your onboarding to start viewing listings in your area.
        </p>
        <Button asChild className="bg-green text-deep-navy hover:bg-green/90">
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </div>
    );
  }

  if (listingsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Error Loading Listings</h2>
        <p className="text-slate text-center max-w-md">
          {listingsError.message || 'Something went wrong while loading listings.'}
        </p>
        <Button onClick={() => refetchListings()} className="bg-green text-deep-navy hover:bg-green/90">
          Try Again
        </Button>
      </div>
    );
  }

  const listings = listingsData?.data || [];
  const totalPages = listingsData?.totalPages || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate">Dashboard</h1>
          <p className="text-slate mt-1">
            Welcome back! Here are the latest listings in your area.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={!listings.length}
            variant="outline"
            className="border-green text-green hover:bg-green/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleMailing}
            asChild
            className="bg-green text-deep-navy hover:bg-green/90"
          >
            <Link to="/dashboard/mailing">
              <Mail className="h-4 w-4 mr-2" />
              Mailing
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lightest-slate">
              {listingsData?.count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate">Revealed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green">
              {revealedListings.size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate">Service Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lightest-slate">
              {profile?.city_name}, {profile?.state_code}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Recent Listings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listingsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <SkeletonLoader key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-slate mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Listings Found</h3>
              <p className="text-slate">
                No listings found for your service area. Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => {
                    const isRevealed = revealedListings.has(listing.id);
                    const isRevealing = revealingId === listing.id;
                    
                    return (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate" />
                            <span className="text-lightest-slate">
                              {listing.address || 'Address not available'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-green font-semibold">
                          {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-slate">
                          {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green/10 text-green">
                            {isRevealed ? 'Revealed' : 'Hidden'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isRevealed ? (
                            <div className="flex items-center gap-2 text-green">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">View Details</span>
                            </div>
                          ) : (
                            <LoadingButton
                              onClick={() => handleRevealListing(listing.id)}
                              isLoading={isRevealing}
                              disabled={isRevealing}
                              size="sm"
                              className="bg-green text-deep-navy hover:bg-green/90"
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Reveal
                            </LoadingButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
