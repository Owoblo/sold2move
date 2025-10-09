import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchSoldSincePrev } from '@/lib/queries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Download, 
  Search, 
  Filter, 
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
  CheckCircle
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Pagination } from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/csvExporter';
import toast from '@/lib/toast';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import LoadingButton from '@/components/ui/LoadingButton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/services/analytics.jsx';
import { useSoldListingsWithServiceAreas, useServiceAreaStats } from '@/hooks/useListingsWithServiceAreas';

const PAGE_SIZE = 20;

const SoldListings = ({ filters }) => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [priceFilter, setPriceFilter] = useState('all');
  const { trackAction } = useAnalytics();

  // Use service area hooks
  const {
    data: listingsData,
    isLoading: loading,
    error: listingsError,
    refetch: refetchListings
  } = useSoldListingsWithServiceAreas(filters, currentPage, PAGE_SIZE);
  
  const { data: serviceAreaStats } = useServiceAreaStats();

  const handlePageChange = (page) => {
    setCurrentPage(page);
    trackAction('pagination', { page, section: 'sold_listings' });
  };

  // Process listings data from service area hook
  const processedListings = React.useMemo(() => {
    if (!listingsData?.data) return [];
    
    // Map database data to frontend format
    return listingsData.data.map(listing => ({
      id: listing.id,
      address: listing.address_street,
      city: listing.address_city,
      state: listing.address_state,
      zip: listing.address_zip,
      price: listing.unformatted_price,
      soldDate: listing.last_seen_at,
      date: listing.last_seen_at,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.area,
      status: listing.status_text,
      mls: listing.mls_number,
      agent: listing.listing_agent,
      office: listing.listing_office,
      serviceAreaMatch: listing.service_area_match
    }));
  }, [listingsData?.data]);

  // Filter and sort listings
  const filteredListings = React.useMemo(() => {
    let filtered = [...processedListings];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(listing => {
        const price = listing.price || 0;
        switch (priceFilter) {
          case 'under-500k':
            return price < 500000;
          case '500k-1m':
            return price >= 500000 && price < 1000000;
          case 'over-1m':
            return price >= 1000000;
          default:
            return true;
        }
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
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
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [processedListings, searchTerm, priceFilter, sortBy, sortOrder]);
  
  const handleExport = () => {
    if (filteredListings.length === 0) {
      toast.error("Export Failed", "No listings to export with current filters.");
      return;
    }
    
    trackAction('export', {
      type: 'sold_listings',
      count: filteredListings.length,
      page: currentPage,
      filters: { searchTerm, priceFilter, sortBy, sortOrder }
    });
    
    const dataToExport = pagedListings.map(({ addressStreet, addresscity, unformattedprice, beds, baths, area, statustext }) => ({
      Address: addressStreet,
      City: addresscity,
      Price: unformattedprice ? `$${unformattedprice.toLocaleString()}` : 'N/A',
      Beds: beds || 'N/A',
      Baths: baths || 'N/A',
      'Sq. Ft.': area ? area.toLocaleString() : 'N/A',
      'Property Type': statustext || 'N/A',
    }));
    exportToCSV(dataToExport, `sold-listings-page-${currentPage}-${profile?.city_name || 'export'}-${new Date().toLocaleDateString()}.csv`);
    toast.success("Export Successful", "Your CSV file has been downloaded.");
  };

  const handleRowClick = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
  };

  if (loading || profileLoading) {
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

  if (listingsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-light-navy/30 rounded-lg">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-lightest-slate font-semibold">Failed to load listings</p>
        <p className="text-slate text-sm">{listingsError.message}</p>
        <Button onClick={() => refetchListings()} className="mt-4 bg-teal text-deep-navy hover:bg-teal/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Helmet>
        <title>Sold Properties | Sold2Move</title>
        <meta name="description" content="View recently sold properties to identify high-potential moving leads." />
      </Helmet>

      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-teal" />
            Recently Sold Properties
            {listingsData?.serviceAreaInfo && (
              <span className="text-slate font-normal flex items-center gap-1">
                in{' '}
                <Badge variant="secondary" className="bg-teal/20 text-teal border-teal/30">
                  {listingsData.serviceAreaInfo.mainCity}
                </Badge>
                {listingsData.serviceAreaInfo.totalCities > 1 && (
                  <span className="text-teal text-sm ml-1">
                    +{listingsData.serviceAreaInfo.totalCities - 1} areas
                  </span>
                )}
              </span>
            )}
          </h2>
          <p className="text-slate mt-1">
            Identify high-potential moving leads from recent sales.
            {listingsData?.serviceAreaInfo && (
              <span className="text-teal text-sm ml-2">
                Showing sold properties from {listingsData.serviceAreaInfo.totalCities} cities
                {serviceAreaStats && (
                  <span className="ml-2">
                    • {serviceAreaStats.totalSold} total sold
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={filteredListings.length === 0}
            variant="outline"
            className="border-teal text-teal hover:bg-teal/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({filteredListings.length})
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4"
      >
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
            <Input
              placeholder="Search by address, city, or state..."
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
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date Sold</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="beds">Bedrooms</SelectItem>
            <SelectItem value="area">Square Footage</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          variant="outline"
          className="w-full lg:w-auto"
        >
          {sortOrder === 'asc' ? (
            <SortAsc className="h-4 w-4 mr-2" />
          ) : (
            <SortDesc className="h-4 w-4 mr-2" />
          )}
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
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
                <TrendingUp className="h-5 w-5" />
                Sold Properties
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
            {loading || profileLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">Error Loading Listings</h3>
                <p className="text-slate mb-4">{error}</p>
                <Button onClick={fetchListingsData} className="bg-teal text-deep-navy hover:bg-teal/90">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-slate mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Sold Properties Found</h3>
                <p className="text-slate mb-4">
                  {searchTerm || priceFilter !== 'all'
                    ? "No sold properties match your current filters. Try adjusting your search criteria."
                    : "No sold properties found for your service area. Make sure your service area is set in Settings."
                  }
                </p>
                {(searchTerm || priceFilter !== 'all') && (
                  <Button 
                    onClick={() => {
                      setSearchTerm('');
                      setPriceFilter('all');
                    }}
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
                      <TableHead className="min-w-[120px]">Date Sold</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedListings.map((listing, index) => (
                      <motion.tr
                        key={listing.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-lightest-navy/5 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(listing.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-light-navy rounded-md">
                              <Home className="h-4 w-4 text-teal" />
                            </div>
                            <div>
                              <div className="text-lightest-slate font-medium">
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
                            {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
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
                              {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-slate border-slate/30">
                            {listing.statustext || 'N/A'}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredListings.length)} of {filteredListings.length} results
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
    </motion.div>
  );
};

export default SoldListings;