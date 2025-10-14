import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchJustListed, fetchRevealedListings } from '@/lib/queries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Download, 
  Eye, 
  Zap, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  MapPin,
  Calendar,
  DollarSign,
  Home,
  Building,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile.jsx';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/services/analytics.jsx';

const PAGE_SIZE = 20;

const ListingsEnhanced = ({ filters }) => {
  const navigate = useNavigate();
  const [pagedListings, setPagedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [isRevealing, setIsRevealing] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const { trackAction, trackListingInteraction } = useAnalytics();

  const fetchRevealedStatus = useCallback(async (listingIds) => {
    if (!profile || listingIds.length === 0) return;
    try {
      const revealed = await fetchRevealedListings(profile.id, listingIds);
      setRevealedIds(new Set(revealed.map(r => r.listing_id)));
    } catch (err) {
      console.error("Error fetching revealed status:", err);
    }
  }, [profile]);

  const fetchListings = useCallback(async () => {
    if (!profile || !profile.onboarding_complete) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, count } = await fetchJustListed(
        profile.city_name,
        currentPage,
        PAGE_SIZE,
        filters
      );
      
      setPagedListings(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
      
      if (data && data.length > 0) {
        const listingIds = data.map(l => l.id);
        await fetchRevealedStatus(listingIds);
      }
      
      trackAction('listings_loaded', { 
        count: data?.length || 0, 
        page: currentPage,
        filters: Object.keys(filters || {})
      });
    } catch (err) {
      console.error("Error fetching listings:", err);
      setError(err.message || "Failed to load listings");
      trackAction('listings_error', { error: err.message });
    } finally {
      setLoading(false);
    }
  }, [profile, currentPage, filters, fetchRevealedStatus, trackAction]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleRevealListing = async (listingId) => {
    if (!profile) return;
    
    if (profile.credits_remaining <= 0 && !profile.unlimited) {
      setShowUpgradeModal(true);
      return;
    }
    
    setIsRevealing(listingId);
    
    try {
      const { error } = await supabase
        .from('listing_reveals')
        .insert({ user_id: profile.id, listing_id: listingId });
      
      if (error) throw error;
      
      setRevealedIds(prev => new Set([...prev, listingId]));
      await refreshProfile();
      
      trackListingInteraction('reveal', listingId, {
        page: currentPage,
        totalListings: pagedListings.length,
      });
      
      toast.success("Listing revealed successfully!");
    } catch (err) {
      console.error("Error revealing listing:", err);
      toast.error(err.message || "Failed to reveal listing");
    } finally {
      setIsRevealing(null);
    }
  };

  const handleExport = () => {
    if (!pagedListings.length) {
      toast.error("No listings to export");
      return;
    }
    
    trackAction('export_listings', { 
      count: pagedListings.length,
      page: currentPage,
      filters: Object.keys(filters || {})
    });
    
    exportToCSV(pagedListings, `listings-page-${currentPage}.csv`);
    toast.success("Export started!");
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    trackAction('pagination', { page, section: 'listings' });
  };

  // Filter and sort listings
  const filteredListings = React.useMemo(() => {
    let filtered = [...pagedListings];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.addressCity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.addressState?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'address':
          aValue = a.address || '';
          bValue = b.address || '';
          break;
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
  }, [pagedListings, searchTerm, sortBy, sortOrder]);

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
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Complete Your Setup</h2>
        <p className="text-slate text-center max-w-md">
          Please complete your onboarding to start viewing listings in your area.
        </p>
        <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 space-y-4"
      >
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-lightest-slate">Error Loading Listings</h2>
        <p className="text-slate text-center max-w-md">{error}</p>
        <Button onClick={fetchListings} className="bg-teal text-deep-navy hover:bg-teal/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Listings - Sold2Move</title>
        <meta name="description" content="View and manage your real estate listings" />
      </Helmet>

      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate">Listings</h1>
          <p className="text-slate mt-1">
            Discover new opportunities in your service area.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={!pagedListings.length}
            variant="outline"
            className="border-teal text-teal hover:bg-teal/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({pagedListings.length})
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
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date Listed</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="address">Address</SelectItem>
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

      {/* Enhanced Listings Display */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-slate mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Listings Found</h3>
                <p className="text-slate mb-4">
                  {searchTerm 
                    ? "No listings match your search criteria. Try adjusting your search terms."
                    : "No listings found for your service area. Try adjusting your filters or check back later."
                  }
                </p>
                {searchTerm && (
                  <Button 
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    className="border-teal text-teal hover:bg-teal/10"
                  >
                    Clear Search
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
                      <TableHead className="min-w-[100px]">Beds</TableHead>
                      <TableHead className="min-w-[100px]">Baths</TableHead>
                      <TableHead className="min-w-[120px]">Sq Ft</TableHead>
                      <TableHead className="min-w-[120px]">Date Listed</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing, index) => {
                      const isRevealed = revealedIds.has(listing.id);
                      const isRevealing = isRevealing === listing.id;
                      
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
                                <div className="text-lightest-slate font-medium">
                                  {listing.address || 'Address not available'}
                                </div>
                                <div className="text-xs text-slate">
                                  {listing.addressCity}, {listing.addressState} {listing.addressZipcode}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-teal font-semibold text-lg">
                              {listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}
                            </div>
                            {listing.unformattedprice && listing.unformattedprice !== listing.price && (
                              <div className="text-xs text-slate">
                                Est: ${listing.unformattedprice.toLocaleString()}
                              </div>
                            )}
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
                            <Badge 
                              variant={isRevealed ? "default" : "secondary"}
                              className={isRevealed ? "bg-teal/10 text-teal border-teal/20" : ""}
                            >
                              {isRevealed ? 'Revealed' : 'Hidden'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isRevealed ? (
                              <div className="flex items-center gap-2 text-teal">
                                <Eye className="h-4 w-4" />
                                <span className="text-sm">View Details</span>
                              </div>
                            ) : (
                              <LoadingButton
                                onClick={() => handleRevealListing(listing.id)}
                                isLoading={isRevealing}
                                disabled={isRevealing}
                                size="sm"
                                className="bg-teal text-deep-navy hover:bg-teal/90"
                              >
                                <Zap className="h-4 w-4 mr-2" />
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
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, pagedListings.length)} of {pagedListings.length} results
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

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal" />
              Credits Required
            </DialogTitle>
            <DialogDescription>
              You need credits to reveal listing details. Upgrade your plan to get unlimited access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-lightest-slate mb-2">
                {profile?.credits_remaining || 0} Credits Remaining
              </div>
              <p className="text-slate">
                Each listing reveal costs 1 credit. Upgrade to get unlimited access.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowUpgradeModal(false);
                navigate('/pricing');
              }}
              className="bg-teal text-deep-navy hover:bg-teal/90"
            >
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingsEnhanced;
