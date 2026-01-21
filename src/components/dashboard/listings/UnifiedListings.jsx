import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Download,
  SortAsc,
  SortDesc,
  MapPin,
  Calendar,
  DollarSign,
  Home,
  Building,
  RefreshCw,
  TrendingUp,
  Users,
  CheckCircle,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import HomeownerLookupButton from './HomeownerLookupButton';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile';
import { Pagination } from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/csvExporter';
import toast from '@/lib/toast';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnalytics } from '@/services/analytics.jsx';
import { useJustListedEnhanced, useSoldListingsEnhanced } from '@/hooks/useListingsEnhanced';
import AdvancedFilters from '@/components/dashboard/filters/AdvancedFilters';
import DateFilter from '@/components/dashboard/filters/DateFilter';
import CitySelector from '@/components/ui/CitySelector';
import { hasActiveFilters, clearAllFilters } from '@/utils/filterUtils';

const PAGE_SIZE = 20;

const UnifiedListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);

  // Track whether initial cities have been set from profile
  const [initialCitiesSet, setInitialCitiesSet] = useState(false);

  // Determine active tab based on URL
  const getActiveTabFromUrl = () => {
    if (location.pathname.includes('/sold')) {
      return 'sold';
    }
    return 'just-listed';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl());
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
  const [sortOrder, setSortOrder] = useState('desc');
  const { trackAction } = useAnalytics();

  // Set initial cities from profile only once when profile first loads
  useEffect(() => {
    // Only set initial cities if we haven't done so yet and profile is loaded
    if (!initialCitiesSet && !profileLoading && profile) {
      let cityNames = [];
      if (profile.service_cities && profile.service_cities.length > 0) {
        // Extract city names from service cities (format: "City, State")
        cityNames = profile.service_cities.map(cityState => {
          const [cityName] = cityState.split(', ');
          return cityName;
        });
      } else if (profile.city_name) {
        cityNames = [profile.city_name];
      }

      if (cityNames.length > 0) {
        setFilters(prev => ({ ...prev, city_name: cityNames }));
      }
      setInitialCitiesSet(true);
    }
  }, [profile, profileLoading, initialCitiesSet]);

  // Update active tab when URL changes
  useEffect(() => {
    const newActiveTab = getActiveTabFromUrl();
    if (newActiveTab !== activeTab) {
      setActiveTab(newActiveTab);
    }
  }, [location.pathname]);

  // Use enhanced hooks based on active tab
  const {
    data: justListedData,
    isLoading: justListedLoading,
    error: justListedError,
    refetch: refetchJustListed
  } = useJustListedEnhanced(filters, currentPage, PAGE_SIZE);

  const {
    data: soldListingsData,
    isLoading: soldListingsLoading,
    error: soldListingsError,
    refetch: refetchSoldListings
  } = useSoldListingsEnhanced(filters, currentPage, PAGE_SIZE);


  // Get current data based on active tab
  const currentData = activeTab === 'just-listed' ? justListedData : soldListingsData;
  const currentLoading = activeTab === 'just-listed' ? justListedLoading : soldListingsLoading;
  const currentError = activeTab === 'just-listed' ? justListedError : soldListingsError;
  const currentRefetch = activeTab === 'just-listed' ? refetchJustListed : refetchSoldListings;

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
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
      section: activeTab
    });
  };

  // Handle multiple city changes
  const handleCitiesChange = (newCities) => {
    setFilters(prev => ({ ...prev, city_name: newCities }));
    setCurrentPage(1);
    trackAction('multi_city_change', { 
      cities: newCities,
      cityCount: newCities.length,
      section: activeTab
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    trackAction('pagination', { page, section: activeTab });
  };

  const navigateToProperty = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
    trackAction('listing_view', {
      listingId,
      page: currentPage,
      type: activeTab
    });
  };

  // Sort listings client-side
  const sortedListings = React.useMemo(() => {
    if (!currentData?.data) return [];
    
    const sorted = [...currentData.data].sort((a, b) => {
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
  }, [currentData?.data, sortBy, sortOrder]);

  const handleExport = () => {
    if (sortedListings.length === 0) {
      toast.error("Export Failed", "No listings to export with current filters.");
      return;
    }

    trackAction('export', {
      type: activeTab,
      count: sortedListings.length,
      page: currentPage,
      filters: filters
    });

    const dataToExport = sortedListings.map(({ addressStreet, addresscity, unformattedprice, beds, baths, area, statustext }) => ({
      Address: addressStreet,
      City: addresscity,
      Price: unformattedprice ? `$${unformattedprice.toLocaleString()}` : 'N/A',
      Beds: beds || 'N/A',
      Baths: baths || 'N/A',
      'Sq. Ft.': area ? area.toLocaleString() : 'N/A',
      'Property Type': statustext || 'N/A',
    }));
    exportToCSV(dataToExport, `${activeTab}-listings-${sortedListings.length}-${profile?.city_name || 'export'}-${new Date().toLocaleDateString()}.csv`);
    toast.success("Export Successful", `Your CSV file has been downloaded with ${sortedListings.length} listings.`);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return; // Don't do anything if already on this tab
    setActiveTab(tab);
    setCurrentPage(1);
    trackAction('tab_change', { from: activeTab, to: tab });
    // Update URL without causing a page refresh - use replaceState for instant feel
    const newPath = tab === 'sold' ? '/dashboard/listings/sold' : '/dashboard/listings/just-listed';
    window.history.replaceState(null, '', newPath);
  };

  // Only show full loading state on initial profile load, not on tab switch
  if (profileLoading) {
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
  if (currentError) {
    console.error('UnifiedListings: Error occurred but not showing to user:', currentError);
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
        <title>Property Listings | Sold2Move</title>
        <meta name="description" content="Browse just listed and recently sold properties to find moving leads." />
      </Helmet>

      {/* Enhanced Header with Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2 flex-wrap">
              {activeTab === 'just-listed' ? (
                <>
                  <Building className="h-6 w-6 text-teal" />
                  Just Listed Properties
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 text-teal" />
                  Recently Sold Properties
                </>
              )}
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
              {activeTab === 'just-listed' 
                ? 'Find new listings that might be moving leads.'
                : 'Identify high-potential moving leads from recent sales.'
              }
              {filters.city_name && filters.city_name.length > 1 && (
                <span className="text-teal text-sm ml-2">
                  Showing listings from {filters.city_name.length} cities
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
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
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-light-navy rounded-lg w-fit">
          <Button
            onClick={() => handleTabChange('just-listed')}
            variant={activeTab === 'just-listed' ? 'default' : 'ghost'}
            className={activeTab === 'just-listed' 
              ? 'bg-teal text-deep-navy hover:bg-teal/90' 
              : 'text-slate hover:text-lightest-slate hover:bg-lightest-navy/30'
            }
          >
            <Building className="h-4 w-4 mr-2" />
            Just Listed
            {justListedData?.count && (
              <Badge variant="secondary" className="ml-2">
                {justListedData.count}
              </Badge>
            )}
          </Button>
          <Button
            onClick={() => handleTabChange('sold')}
            variant={activeTab === 'sold' ? 'default' : 'ghost'}
            className={activeTab === 'sold' 
              ? 'bg-teal text-deep-navy hover:bg-teal/90' 
              : 'text-slate hover:text-lightest-slate hover:bg-lightest-navy/30'
            }
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Sold
            {soldListingsData?.count && (
              <Badge variant="secondary" className="ml-2">
                {soldListingsData.count}
              </Badge>
            )}
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
              <SelectItem value="date">Date {activeTab === 'just-listed' ? 'Listed' : 'Sold'}</SelectItem>
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
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeTab === 'just-listed' ? (
                  <Building className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {activeTab === 'just-listed' ? 'Just Listed Properties' : 'Sold Properties'}
                <Badge variant="secondary" className="ml-2">
                  {sortedListings.length} results
                </Badge>
              </div>
              <div className="text-sm text-slate">
                Page {currentPage} of {currentData?.totalPages || 1}
              </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
            {sortedListings.length === 0 ? (
              <div className="text-center py-12">
                {activeTab === 'just-listed' ? (
                  <Building className="h-16 w-16 text-slate mx-auto mb-4" />
                ) : (
                  <CheckCircle className="h-16 w-16 text-slate mx-auto mb-4" />
                )}
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                  No {activeTab === 'just-listed' ? 'Just Listed' : 'Sold'} Properties Found
                </h3>
                <p className="text-slate mb-4">
                  {hasActiveFilters(filters, profile)
                    ? "No properties match your current filters. Try adjusting your search criteria."
                    : "No properties found for your service area. Make sure your service area is set in Settings."
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
                      <TableHead className="min-w-[120px]">Date {activeTab === 'just-listed' ? 'Listed' : 'Sold'}</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedListings.map((listing, index) => (
                      <motion.tr
                        key={listing.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-lightest-navy/5 transition-colors cursor-pointer"
                        onClick={() => navigateToProperty(listing.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-light-navy rounded-md">
                              <Home className="h-4 w-4 text-teal" />
                            </div>
                            <div>
                              <div className="font-medium text-lightest-slate cursor-pointer hover:text-teal transition-colors">
                                {listing.addressStreet}
                              </div>
                              <div className="text-xs text-slate">
                                {listing.addresscity}, {listing.addressstate}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-teal font-semibold text-lg">
                            {listing.unformattedprice ? `$${listing.unformattedprice.toLocaleString()}` : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-lightest-slate">
                            {listing.beds || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-lightest-slate">
                            {listing.baths || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-lightest-slate">
                            {listing.area ? `${listing.area.toLocaleString()}` : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-slate border-slate/30">
                            {listing.statustext || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToProperty(listing.id);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-teal text-teal hover:bg-teal/10"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <HomeownerLookupButton
                              listing={listing}
                              compact={true}
                            />
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Enhanced Pagination */}
            {currentData?.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, currentData.count)} of {currentData.count} results
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={currentData.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
};

export default UnifiedListings;
