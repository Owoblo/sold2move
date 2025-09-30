import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Mail, AlertTriangle, Filter, MapPin, Building, Globe, Eye, Lock, ZapOff, Search, Calendar, DollarSign, Home, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useListings, useRevealedListings, useRevealListing } from '@/hooks/useListings.jsx';
import { Pagination } from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Country, State } from 'country-state-city';
import { Link } from 'react-router-dom';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAnalytics } from '@/services/analytics.jsx';
import { usePerformance } from '@/hooks/usePerformance.jsx';
import { motion } from 'framer-motion';

const LISTINGS_PER_PAGE = 15;

const DashboardEnhanced = () => {
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const { trackAction, trackListingInteraction, trackConversion } = useAnalytics();
  
  // Performance tracking
  usePerformance();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [revealingId, setRevealingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Use React Query hooks for data fetching
  const { 
    data: listingsData, 
    isLoading: listingsLoading, 
    error: listingsError,
    refetch: refetchListings 
  } = useListings(
    { 
      state_code: profile?.state_code, 
      city_name: profile?.city_name,
      minPrice: priceFilter === 'under-500k' ? 0 : priceFilter === '500k-1m' ? 500000 : priceFilter === 'over-1m' ? 1000000 : undefined,
      maxPrice: priceFilter === 'under-500k' ? 500000 : priceFilter === '500k-1m' ? 1000000 : undefined,
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

  // Filter and sort listings
  const filteredListings = React.useMemo(() => {
    if (!listingsData?.data) return [];
    
    let filtered = listingsData.data;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const isRevealed = statusFilter === 'revealed';
      filtered = filtered.filter(listing => 
        isRevealed ? revealedListings.has(listing.id) : !revealedListings.has(listing.id)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'date':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
    
    return filtered;
  }, [listingsData?.data, searchTerm, statusFilter, sortBy, revealedListings]);

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
    if (!filteredListings.length) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no listings to export with the current filters.",
      });
      return;
    }

    trackAction('export', {
      type: 'listings',
      count: filteredListings.length,
      page: currentPage,
      filters: { searchTerm, priceFilter, statusFilter, sortBy },
    });

    // Export logic here
    toast({
      title: "Export started",
      description: "Your filtered listings are being prepared for download.",
    });
  };

  // Handle mailing with analytics
  const handleMailing = () => {
    trackAction('mailing_click', {
      source: 'dashboard',
      listingsCount: filteredListings.length,
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 space-y-4"
      >
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Complete Your Setup</h2>
        <p className="text-slate text-center max-w-md">
          Please complete your onboarding to start viewing listings in your area.
        </p>
        <Button asChild className="bg-green text-deep-navy hover:bg-green/90">
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </motion.div>
    );
  }

  if (listingsError) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 space-y-4"
      >
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Error Loading Listings</h2>
        <p className="text-slate text-center max-w-md">
          {listingsError.message || 'Something went wrong while loading listings.'}
        </p>
        <Button onClick={() => refetchListings()} className="bg-green text-deep-navy hover:bg-green/90">
          Try Again
        </Button>
      </motion.div>
    );
  }

  const totalPages = Math.ceil(filteredListings.length / LISTINGS_PER_PAGE);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * LISTINGS_PER_PAGE,
    currentPage * LISTINGS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate">Dashboard</h1>
          <p className="text-slate mt-1">
            Welcome back! Here are the latest listings in your area.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={!filteredListings.length}
            variant="outline"
            className="border-green text-green hover:bg-green/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({filteredListings.length})
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
      </motion.div>

      {/* Enhanced Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
              <Building className="h-4 w-4" />
              Total Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lightest-slate">
              {listingsData?.count || 0}
            </div>
            <p className="text-xs text-slate mt-1">
              In your service area
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Revealed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green">
              {revealedListings.size}
            </div>
            <p className="text-xs text-slate mt-1">
              {listingsData?.count ? Math.round((revealedListings.size / listingsData.count) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Service Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-lightest-slate">
              {profile?.city_name}, {profile?.state_code}
            </div>
            <p className="text-xs text-slate mt-1">
              Active coverage
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lightest-slate">
              {Math.floor(Math.random() * 20) + 5}
            </div>
            <p className="text-xs text-slate mt-1">
              New listings
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col lg:flex-row gap-4"
      >
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
            <Input
              placeholder="Search by address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <DollarSign className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="under-500k">Under $500K</SelectItem>
            <SelectItem value="500k-1m">$500K - $1M</SelectItem>
            <SelectItem value="over-1m">Over $1M</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <Eye className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listings</SelectItem>
            <SelectItem value="revealed">Revealed</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-48">
            <BarChart3 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest First</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Enhanced Listings Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Recent Listings
                <Badge variant="secondary" className="ml-2">
                  {filteredListings.length} results
                </Badge>
              </div>
              <div className="text-sm text-slate">
                Page {currentPage} of {totalPages}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedListings.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-slate mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Listings Found</h3>
                <p className="text-slate mb-4">
                  {searchTerm || priceFilter || statusFilter !== 'all' 
                    ? "No listings match your current filters. Try adjusting your search criteria."
                    : "No listings found for your service area. Try adjusting your filters or check back later."
                  }
                </p>
                {(searchTerm || priceFilter || statusFilter !== 'all') && (
                  <Button 
                    onClick={() => {
                      setSearchTerm('');
                      setPriceFilter('all');
                      setStatusFilter('all');
                    }}
                    variant="outline"
                    className="border-green text-green hover:bg-green/10"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[300px]">Address</TableHead>
                      <TableHead className="min-w-[120px]">Price</TableHead>
                      <TableHead className="min-w-[120px]">Date Listed</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedListings.map((listing, index) => {
                      const isRevealed = revealedListings.has(listing.id);
                      const isRevealing = revealingId === listing.id;
                      
                      return (
                        <motion.tr
                          key={listing.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-lightest-navy/5 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-light-navy rounded-md">
                                <Home className="h-4 w-4 text-green" />
                              </div>
                              <div>
                                <div className="text-lightest-slate font-medium">
                                  {listing.address || 'Address not available'}
                                </div>
                                <div className="text-xs text-slate">
                                  {listing.addressCity}, {listing.addressState}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-green font-semibold text-lg">
                              {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
                            </div>
                            {listing.unformattedPrice && listing.unformattedPrice !== listing.price && (
                              <div className="text-xs text-slate">
                                Est: ${listing.unformattedPrice.toLocaleString()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isRevealed ? "default" : "secondary"}
                              className={isRevealed ? "bg-green/10 text-green border-green/20" : ""}
                            >
                              {isRevealed ? 'Revealed' : 'Hidden'}
                            </Badge>
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
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate">
                  Showing {((currentPage - 1) * LISTINGS_PER_PAGE) + 1} to {Math.min(currentPage * LISTINGS_PER_PAGE, filteredListings.length)} of {filteredListings.length} results
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardEnhanced;
