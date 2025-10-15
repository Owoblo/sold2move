import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Download, 
  Eye, 
  Zap, 
  SortAsc, 
  SortDesc,
  MapPin,
  Calendar,
  DollarSign,
  Home,
  Building,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile';
import { Pagination } from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/csvExporter';
import toast from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/services/analytics.jsx';
import { useJustListedWithServiceAreas, useRevealedListingsWithServiceAreas, useRevealListingWithServiceAreas, useServiceAreaStats } from '@/hooks/useListingsWithServiceAreas';
import { useBulkReveal } from '@/hooks/useBulkReveal';
import AdvancedFilters from '@/components/dashboard/filters/AdvancedFilters';
import DateFilter from '@/components/dashboard/filters/DateFilter';
import CitySelector from '@/components/ui/CitySelector';
import BulkRevealModal from '@/components/dashboard/BulkRevealModal';
import ExportModal from '@/components/dashboard/ExportModal';
import { hasActiveFilters, clearAllFilters } from '@/utils/filterUtils';
import { mapDatabaseListingsToFrontend, formatPrice, formatArea, formatDate, isListingRevealed } from '@/lib/frontend-data-mapping';

const PAGE_SIZE = 20;

const JustListed = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    city_name: [],
    searchTerm: '',
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    propertyType: null,
    minSqft: null,
    maxSqft: null,
    dateRange: 'all',
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // Default to newest first
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBulkRevealModal, setShowBulkRevealModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { trackAction, trackListingInteraction } = useAnalytics();

  // Update filters when profile changes
  useEffect(() => {
    if (profile?.service_cities && profile.service_cities.length > 0) {
      // Extract city names from service cities (format: "City, State")
      const cityNames = profile.service_cities.map(cityState => {
        const [cityName] = cityState.split(', ');
        return cityName;
      });
      setFilters(prev => ({ ...prev, city_name: cityNames }));
    } else if (profile?.city_name) {
      setFilters(prev => ({ ...prev, city_name: [profile.city_name] }));
    }
  }, [profile?.service_cities, profile?.city_name]);

  // Use enhanced hooks
  const {
    data: listingsData,
    isLoading: listingsLoading,
    error: listingsError,
    refetch: refetchListings
  } = useJustListedWithServiceAreas(filters, currentPage, PAGE_SIZE);

  const {
    data: revealedListings = new Set(),
    isLoading: revealedLoading
  } = useRevealedListingsWithServiceAreas(profile?.id);

  const revealListingMutation = useRevealListingWithServiceAreas();
  const { data: serviceAreaStats } = useServiceAreaStats();
  const { bulkRevealListings, isRevealing: isBulkRevealing } = useBulkReveal();
  
  // Local state to track immediately revealed listings
  const [localRevealedListings, setLocalRevealedListings] = useState(new Set());
  
  // Combine server and local revealed listings
  const allRevealedListings = React.useMemo(() => {
    const combined = new Set(revealedListings || []);
    localRevealedListings.forEach(id => combined.add(id));
    return combined;
  }, [revealedListings, localRevealedListings]);

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle search changes
  const handleSearchChange = (searchTerm) => {
    setFilters(prev => ({ ...prev, searchTerm }));
    setCurrentPage(1);
  };

  // Handle city changes
  const handleCityChange = (newCity) => {
    setFilters(prev => ({ ...prev, city_name: [newCity] }));
    setCurrentPage(1);
    trackAction('city_change', { 
      newCity, 
      previousCity: profile?.city_name,
      section: 'just_listed'
    });
  };

  // Handle multiple city changes
  const handleCitiesChange = (newCities) => {
    setFilters(prev => ({ ...prev, city_name: newCities }));
    setCurrentPage(1);
    trackAction('multi_city_change', { 
      cities: newCities,
      cityCount: newCities.length,
      section: 'just_listed'
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    trackAction('pagination', { page, section: 'just_listed' });
  };

  // Map and sort listings client-side
  const sortedListings = React.useMemo(() => {
    if (!listingsData?.data) return [];
    
    // Map database data to frontend format
    const mappedListings = mapDatabaseListingsToFrontend(listingsData.data);
    
    const sorted = [...mappedListings].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.unformattedprice || 0;
          bValue = b.unformattedprice || 0;
          break;
        case 'beds':
          aValue = a.beds || 0;
          bValue = b.beds || 0;
          break;
        case 'area':
          aValue = a.area || 0;
          bValue = b.area || 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.lastseenat || 0);
          bValue = new Date(b.lastseenat || 0);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [listingsData?.data, sortBy, sortOrder]);
  
  const handleExport = () => {
    if (sortedListings.length === 0) {
      toast.error("Export Failed", "No listings to export with current filters.");
      return;
    }
    setShowExportModal(true);
  };

  const handleExportComplete = (exportData) => {
    trackAction('export', {
      type: 'just_listed',
      count: sortedListings.length,
      page: currentPage,
      filters: filters,
      format: exportData.format,
      includeContactInfo: exportData.includeContactInfo,
      crmType: exportData.crmType
    });
  };

  const navigateToProperty = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
  };

  const handleRowClick = (listingId) => {
    // Check if user has credits or unlimited access
    if (profile?.unlimited || allRevealedListings.has(listingId)) {
      navigateToProperty(listingId);
      return;
    }

    // Check if user has sufficient credits
    const creditCost = 1; // Just listed costs 1 credit
    if (profile?.credits_remaining < creditCost) {
      toast.error("Insufficient Credits", `You need ${creditCost} credit to view this property. Please purchase more credits.`);
      navigate('/pricing');
      return;
    }

    // If user has credits, show confirmation dialog
    const confirmMessage = `Viewing this property will cost ${creditCost} credit. You have ${profile?.credits_remaining || 0} credits remaining. Continue?`;
    
    if (window.confirm(confirmMessage)) {
      // Use the existing reveal mechanism to deduct credits and then navigate
      handleReveal(listingId, { stopPropagation: () => {} });
    }
  };

  const handleReveal = async (listingId, e) => {
    e.stopPropagation();
    if (profile?.unlimited || allRevealedListings.has(listingId)) {
        navigateToProperty(listingId);
        return;
    }

    trackAction('listing_reveal_attempt', { 
      listingId, 
      page: currentPage,
      totalListings: sortedListings.length 
    });
    
    try {
      await revealListingMutation.mutateAsync({
        listingId,
        userId: profile.id,
        creditCost: 1, // Just Listed properties cost 1 credit
      });
      
      // Immediately add to local revealed state for instant UI update
      setLocalRevealedListings(prev => new Set([...prev, listingId]));
      
      trackListingInteraction('reveal', listingId, {
        page: currentPage,
        totalListings: sortedListings.length,
      });
      
      // Navigate to property detail page after successful reveal
      navigateToProperty(listingId);
    } catch (err) {
      if (err.message.includes('Insufficient credits')) {
        setShowUpgradeModal(true);
      }
    }
  };

  const handleBulkReveal = async (selectedListingIds) => {
    const result = await bulkRevealListings(selectedListingIds, profile.id, 1);
    if (result.success) {
      // Add to local revealed state for instant UI update
      setLocalRevealedListings(prev => {
        const newSet = new Set(prev);
        selectedListingIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // Refetch listings to get updated data
      refetchListings();
    }
  };

  if (listingsLoading || profileLoading) {
    return (
      <Card className="bg-light-navy border-border">
        <CardHeader className="flex flex-row items-center justify-between">
            <SkeletonLoader className="h-8 w-1/3" />
            <SkeletonLoader className="h-9 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(PAGE_SIZE)].map((_, i) => <SkeletonLoader key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show error state - just log it and show empty state instead
  if (listingsError) {
    console.error('JustListed: Error occurred but not showing to user:', listingsError);
    // Fall through to show empty state instead of error
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Helmet>
        <title>Just Listed Properties | Sold2Move</title>
        <meta name="description" content="View the most recently listed properties to find new moving leads." />
      </Helmet>

      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2 flex-wrap">
            <Building className="h-6 w-6 text-teal" />
            Just Listed Properties
            {filters.city_name && filters.city_name.length > 0 && (
              <span className="text-slate font-normal flex items-center gap-1">
                in{' '}
                <CitySelector
                  currentCity={filters.city_name[0]}
                  onCityChange={handleCityChange}
                  selectedCities={filters.city_name}
                  onCitiesChange={handleCitiesChange}
                  variant="minimal"
                  className="inline-block"
                  showMultiCityOption={true}
                />
                {filters.city_name.length > 1 && (
                  <span className="text-teal text-sm ml-1">
                    +{filters.city_name.length - 1} more
                  </span>
                )}
              </span>
            )}
          </h2>
          <p className="text-slate mt-1">
            Discover the latest properties in your service area.
            {filters.city_name && filters.city_name.length > 1 && (
              <span className="text-teal text-sm ml-2">
                Showing listings from {filters.city_name.length} cities
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkRevealModal(true)}
            disabled={sortedListings.length === 0 || isBulkRevealing}
            className="bg-teal text-deep-navy hover:bg-teal/90"
          >
            <Zap className="h-4 w-4 mr-2" />
            Bulk Reveal
          </Button>
          <Button
            onClick={handleExport}
            disabled={sortedListings.length === 0}
            variant="outline"
            className="border-teal text-teal hover:bg-teal/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({sortedListings.length})
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          cityName={profile?.city_name}
        />
      </motion.div>

      {/* Date Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <DateFilter
          value={filters.dateRange}
          onChange={(value) => {
            setFilters(prev => ({ ...prev, dateRange: value }));
            setCurrentPage(1);
          }}
        />
      </motion.div>

      {/* Sort Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Listed</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="beds">Bedrooms</SelectItem>
              <SelectItem value="area">Square Footage</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            variant="outline"
            className="flex items-center gap-2"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Listings Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Recent Listings
                <Badge variant="secondary" className="ml-2">
                  {sortedListings.length} results
                </Badge>
              </div>
              <div className="text-sm text-slate">
                Page {currentPage} of {listingsData?.totalPages || 1}
              </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
            {sortedListings.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-slate mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Listings Found</h3>
                <p className="text-slate mb-4">
                  {hasActiveFilters(filters, profile)
                    ? "No listings match your current filters. Try adjusting your search criteria."
                    : "No just-listed properties found for your service area. Make sure your service area is set in Settings."
                  }
                </p>
                {hasActiveFilters(filters, profile) && (
                  <Button 
                    onClick={() => setFilters(clearAllFilters(profile))}
                    variant="outline"
                    className="border-teal text-teal hover:bg-teal/10"
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
                      <TableHead className="min-w-[80px]">Beds</TableHead>
                      <TableHead className="min-w-[80px]">Baths</TableHead>
                      <TableHead className="min-w-[100px]">Sq Ft</TableHead>
                      <TableHead className="min-w-[120px]">Date Listed</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedListings.map((listing, index) => {
                      const isRevealed = isListingRevealed(listing.id, allRevealedListings, profile);
                      const isRevealing = revealListingMutation.isPending && revealListingMutation.variables?.listingId === listing.id;
                      
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
                                <Home className="h-4 w-4 text-teal" />
                              </div>
                              <div>
                                <div 
                                  className={`font-medium ${
                                    isRevealed 
                                      ? 'text-lightest-slate cursor-pointer hover:text-teal transition-colors' 
                                      : 'text-slate'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isRevealed) {
                                      handleRowClick(listing.id);
                                    }
                                  }}
                          >
                            {isRevealed ? listing.addressStreet : '*****'}
                                </div>
                                <div className="text-xs text-slate">
                                  {isRevealed 
                                    ? `${listing.addresscity}, ${listing.addressstate}`
                                    : 'Click Reveal to see address'
                                  }
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-teal font-semibold text-lg">
                              {formatPrice(listing.unformattedprice, isRevealed)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-lightest-slate">
                              {isRevealed 
                                ? (listing.beds !== null && listing.beds !== undefined ? listing.beds : 'N/A')
                                : '***'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-lightest-slate">
                              {isRevealed 
                                ? (listing.baths !== null && listing.baths !== undefined ? listing.baths : 'N/A')
                                : '***'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-lightest-slate">
                              {formatArea(listing.area, isRevealed)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {formatDate(listing.lastseenat)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isRevealed ? (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(listing.id);
                                }}
                                size="sm"
                                variant="outline"
                                className="border-teal text-teal hover:bg-teal/10"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            ) : (
                            <LoadingButton
                                onClick={(e) => handleReveal(listing.id, e)}
                                isLoading={isRevealing}
                                disabled={isRevealing}
                              size="sm"
                                className="bg-teal text-deep-navy hover:bg-teal/90"
                              >
                                      <Zap className="h-4 w-4 mr-2" />
                                      Reveal (1)
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
            {listingsData?.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, listingsData.count)} of {listingsData.count} results
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={listingsData.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-light-navy border-lightest-navy/20 text-lightest-slate">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal" />
              Out of Credits
            </DialogTitle>
            <DialogDescription>
              You don't have enough credits to reveal this address. Please purchase more credits or upgrade your plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start gap-2">
            <LoadingButton asChild className="bg-teal text-deep-navy hover:bg-teal/90">
              <Link to="/pricing#top-up" onClick={() => setShowUpgradeModal(false)}>Buy Credits</Link>
            </LoadingButton>
            <LoadingButton asChild variant="outline">
              <Link to="/pricing" onClick={() => setShowUpgradeModal(false)}>Upgrade Plan</Link>
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reveal Modal */}
      <BulkRevealModal
        isOpen={showBulkRevealModal}
        onClose={() => setShowBulkRevealModal(false)}
        listings={sortedListings}
        onBulkReveal={handleBulkReveal}
        isRevealing={isBulkRevealing}
        revealedListings={allRevealedListings}
        creditCost={1}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        listings={sortedListings}
        listingType="just-listed"
        onExport={handleExportComplete}
      />
    </motion.div>
  );
};

export default JustListed;