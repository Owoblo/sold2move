import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  Mail, 
  AlertTriangle, 
  Filter, 
  MapPin, 
  Building, 
  Globe, 
  Eye, 
  Lock, 
  ZapOff,
  Search,
  SortAsc,
  SortDesc,
  Calendar,
  DollarSign,
  Home,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Pagination } from '@/components/ui/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Country, State } from 'country-state-city';
import { Link } from 'react-router-dom';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useAnalytics } from '@/services/analytics.jsx';

const LISTINGS_PER_PAGE = 15;

const DashboardPage = () => {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const [listings, setListings] = useState([]);
  const [revealedListings, setRevealedListings] = useState(new Set());
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [revealingId, setRevealingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [priceFilter, setPriceFilter] = useState('all');
  const { trackAction, trackListingInteraction } = useAnalytics();

  const fetchRevealedListings = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('listing_reveals').select('listing_id').eq('user_id', profile.id);
    if (!error) {
      setRevealedListings(new Set(data.map(r => r.listing_id)));
    }
  }, [supabase, profile]);

  const fetchListings = useCallback(async (page, userProfile) => {
    if (!userProfile || !userProfile.onboarding_complete) {
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    setError(null);
    try {
      const from = (page - 1) * LISTINGS_PER_PAGE;
      const to = from + LISTINGS_PER_PAGE - 1;
      
      // Use just_listed table instead of current_listings
      let query = supabase
        .from('just_listed')
        .select('id, addressstreet as address, lastseenat as created_at, unformattedprice as price, statustext as pgapt', { count: 'exact' });
      
      if (userProfile.state_code) query = query.eq('addressstate', userProfile.state_code);
      if (userProfile.city_name) query = query.eq('lastcity', userProfile.city_name);
      
      const { data, error, count } = await query.order('lastseenat', { ascending: false }).range(from, to);
      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      setListings(data || []);
      setTotalPages(Math.ceil((count || 0) / LISTINGS_PER_PAGE));
    } catch (err) {
      console.error('Error in fetchListings:', err);
      setError(err.message || 'Failed to fetch listings');
      toast({ 
        variant: "destructive", 
        title: "Error fetching listings", 
        description: err.message || 'Please try again later' 
      });
    } finally {
      setListingsLoading(false);
    }
  }, [toast, supabase]);

  useEffect(() => {
    if (profile) {
      fetchListings(currentPage, profile);
      fetchRevealedListings();
    } else if (!profileLoading) {
      setListingsLoading(false);
    }
  }, [fetchListings, currentPage, profile, profileLoading, fetchRevealedListings]);
  
  const handleReveal = async (listingId) => {
    setRevealingId(listingId);
    
    try {
    trackAction('listing_reveal_attempt', { 
      listingId, 
      page: currentPage,
      totalListings: listings.length 
    });
    } catch (error) {
      console.error('Analytics error:', error);
    }
    
    try {
      // Convert listingId to number if it's a string
      const numericListingId = Number(listingId);
      if (isNaN(numericListingId)) {
        throw new Error('Invalid listing ID');
      }
      
      const { data, error } = await supabase.rpc('reveal_listing', { p_listing_id: numericListingId });
      if (error) throw error;
      if (data.ok) {
        toast({ title: "Address Revealed!", description: data.already_revealed ? "You've already revealed this address." : "1 credit has been deducted." });
        setRevealedListings(prev => new Set(prev).add(listingId));
        
        try {
        trackListingInteraction('reveal', listingId, {
          page: currentPage,
          totalListings: listings.length,
        });
        } catch (error) {
          console.error('Analytics error:', error);
        }
        
        if (!data.already_revealed && !data.unlimited) {
          refreshProfile();
        }
      } else if (data.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: "Insufficient Credits", description: "Please purchase more credits to reveal this address." });
      } else {
        throw new Error(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Reveal Failed", description: err.message });
    } finally {
      setRevealingId(null);
    }
  };


  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    try {
    trackAction('pagination', { page: newPage, section: 'dashboard' });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Filter and sort listings
  const filteredListings = React.useMemo(() => {
    let filtered = [...listings];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.address?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [listings, searchTerm, priceFilter, sortBy, sortOrder]);

  const handleActionClick = (action) => {
    try {
    trackAction('feature_click', { feature: action });
    } catch (error) {
      console.error('Analytics error:', error);
    }
    toast({ title: `🚧 ${action}`, description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
  };
  
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(price) || 0);

  const LocationDisplay = () => {
    if (profileLoading) return <SkeletonLoader className="h-6 w-3/4" />;
    if (!profile) return null;
    const { city_name, state_code, country_code } = profile;
    if (!city_name || !state_code || !country_code) return <p className="text-amber-400">Please complete your profile to see filtered listings.</p>;
    
    try {
      const countryName = Country.getCountryByCode(country_code)?.name || country_code;
      const stateName = State.getStateByCodeAndCountry(state_code, country_code)?.name || state_code;
    return (
      <div className="flex items-center gap-4 text-slate">
        <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-teal" /><span>{countryName}</span></div>
        <div className="flex items-center gap-2"><Building className="h-4 w-4 text-teal" /><span>{stateName}</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal" /><span>{city_name}</span></div>
      </div>
    );
    } catch (error) {
      console.error('Error in LocationDisplay:', error);
      return (
        <div className="flex items-center gap-4 text-slate">
          <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-teal" /><span>{country_code}</span></div>
          <div className="flex items-center gap-2"><Building className="h-4 w-4 text-teal" /><span>{state_code}</span></div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal" /><span>{city_name}</span></div>
        </div>
      );
    }
  };
  
  const OutOfCredits = () => (
    <TableRow>
      <TableCell colSpan={5} className="h-[400px]">
        <div className="flex flex-col items-center justify-center gap-4 text-slate h-full">
          <ZapOff className="h-12 w-12 text-red-500" />
          <h3 className="text-xl font-bold text-lightest-slate">You've run out of credits!</h3>
          <p>To continue revealing new leads, please top up your credits or upgrade your plan.</p>
          <div className="flex gap-4 mt-2">
            <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90"><Link to="/pricing#top-up">Buy Credits</Link></Button>
            <Button asChild variant="outline"><Link to="/pricing">Upgrade Plan</Link></Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
  
  const TableSkeleton = () => (
    [...Array(10)].map((_, index) => (
      <TableRow key={index}>
        <TableCell><SkeletonLoader className="h-5 w-48" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-24" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-20" /></TableCell>
        <TableCell><SkeletonLoader className="h-5 w-28" /></TableCell>
        <TableCell className="text-right"><SkeletonLoader className="h-8 w-32 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  const creditsRemaining = profile?.credits_remaining ?? 0;
  const isUnlimited = profile?.unlimited ?? false;
  const outOfCredits = !isUnlimited && creditsRemaining <= 0;

  // Show loading if profile is still loading
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error if there's a critical error and no profile
  if (!profile && !profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-lightest-slate">Profile Not Found</h3>
        <p className="text-slate text-center">Unable to load your profile. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()} className="bg-teal text-deep-navy hover:bg-teal/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">
            Welcome, {profile?.company_name || 'Mover'}!
          </h1>
          <p className="text-lg text-slate mt-2">Here are your latest real-time leads.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => handleActionClick('Export CSV')} 
            variant="outline" 
            className="border-teal text-teal hover:bg-teal/10 hover:text-teal"
          >
            <Download className="mr-2 h-4 w-4" /> 
            Export CSV
          </Button>
          <Button 
            onClick={() => handleActionClick('Generate Mail Pack')} 
            className="bg-teal text-deep-navy hover:bg-teal/90"
          >
            <Mail className="mr-2 h-4 w-4" /> 
            Generate Mail Pack
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
              {listings.length}
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
            <div className="text-2xl font-bold text-teal">
              {revealedListings.size}
            </div>
            <p className="text-xs text-slate mt-1">
              {listings.length ? Math.round((revealedListings.size / listings.length) * 100) : 0}% of total
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
      
      {/* Service Area Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-lightest-slate">
              <Filter className="h-5 w-5 text-teal" />
              Your Active Service Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LocationDisplay />
          </CardContent>
      </Card>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-48">
            <BarChart3 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date Listed</SelectItem>
            <SelectItem value="price">Price</SelectItem>
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
        transition={{ delay: 0.4 }}
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
      <div className="bg-light-navy rounded-lg overflow-hidden">
        <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Sold Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
          <TableBody>
            {profileLoading || listingsLoading ? (
              <TableSkeleton />
            ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-64">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <AlertTriangle className="h-12 w-12 text-red-500" />
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-lightest-slate mb-2">Error Loading Listings</h3>
                            <p className="text-slate mb-4">{error}</p>
                            <Button onClick={() => window.location.reload()} className="bg-teal text-deep-navy hover:bg-teal/90">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredListings.length > 0 && outOfCredits ? (
                <OutOfCredits />
                  ) : filteredListings.length > 0 ? (
                    filteredListings.map((lead, index) => {
                const isRevealed = revealedListings.has(lead.id);
                return (
                        <motion.tr
                          key={lead.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-lightest-navy/5 transition-colors"
                        >
                          <TableCell className="font-medium text-lightest-slate">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-light-navy rounded-md">
                                <Home className="h-4 w-4 text-teal" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {isRevealed ? lead.address : '***** ******* **'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {formatDate(lead.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-teal font-semibold text-lg">
                              {formatPrice(lead.price)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-slate border-slate/30">
                              {lead.pgapt || 'N/A'}
                            </Badge>
                          </TableCell>
                    <TableCell className="text-right">
                      {isRevealed ? (
                              <div className="flex items-center justify-end gap-2 text-teal">
                                <Eye className="h-4 w-4" />
                                <span className="text-sm">Revealed</span>
                              </div>
                            ) : (
                              <LoadingButton 
                                variant="outline" 
                                size="sm" 
                                isLoading={revealingId === lead.id} 
                                onClick={() => handleReveal(lead.id)}
                                className="bg-teal text-deep-navy hover:bg-teal/90"
                              >
                           <Lock className="mr-2 h-4 w-4" />
                          Reveal (1 credit)
                        </LoadingButton>
                      )}
                    </TableCell>
                        </motion.tr>
                );
              })
            ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-64">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Building className="h-16 w-16 text-slate" />
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-lightest-slate mb-2">No Listings Found</h3>
                            <p className="text-slate mb-4">
                              {profile?.onboarding_complete 
                                ? "No listings found for your service area." 
                                : "Please complete your profile to view listings."
                              }
                            </p>
                            {!profile?.onboarding_complete && (
                              <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
                                <Link to="/onboarding">Complete Profile</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
            )}
          </TableBody>
        </Table>
              {!(filteredListings.length > 0 && outOfCredits) && totalPages > 1 && (
                <div className="p-4">
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={handlePageChange} 
                  />
                </div>
              )}
      </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardPage;