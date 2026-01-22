import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download,
  SortAsc,
  SortDesc,
  MapPin,
  Calendar,
  Home,
  Building,
  CheckCircle,
  Eye,
  Search,
  X,
  Mail,
  Filter,
  ChevronDown,
  Clock,
  Flame,
  Sparkles,
  LayoutGrid,
  List,
  Settings2
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAnalytics } from '@/services/analytics.jsx';
import { useJustListedEnhanced, useSoldListingsEnhanced } from '@/hooks/useListingsEnhanced';
import CitySelector from '@/components/ui/CitySelector';
import { hasActiveFilters, clearAllFilters } from '@/utils/filterUtils';

const PAGE_SIZE = 20;

// Property type color mapping
const PROPERTY_TYPE_COLORS = {
  'House for sale': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Condo for sale': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Townhouse for sale': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Multi-family home for sale': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Land for sale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Sold': 'bg-teal/20 text-teal border-teal/30',
  'default': 'bg-slate/20 text-slate border-slate/30'
};

// Property thumbnail component
const PropertyThumbnail = ({ src, alt }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-14 h-14 rounded-lg bg-deep-navy/60 flex items-center justify-center flex-shrink-0">
        <Home className="w-5 h-5 text-slate" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Property'}
      onError={() => setError(true)}
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
    />
  );
};

// Relative time formatter
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Check if listing is new (within last 6 hours)
const isNewListing = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = (now - date) / 3600000;
  return diffHours < 6;
};

// Price per sqft calculator
const calculatePricePerSqft = (price, area) => {
  if (!price || !area || area === 0) return null;
  return Math.round(price / area);
};

const UnifiedListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState(1);
  const [initialCitiesSet, setInitialCitiesSet] = useState(false);
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [isFilterBarSticky, setIsFilterBarSticky] = useState(false);
  const filterBarRef = useRef(null);
  const filterBarOffsetRef = useRef(0);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    thumbnail: true,
    address: true,
    price: true,
    pricePerSqft: true,
    beds: true,
    baths: true,
    sqft: true,
    date: true,
    type: true,
    actions: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

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

  // Sticky filter bar effect
  useEffect(() => {
    const handleScroll = () => {
      if (filterBarRef.current) {
        if (filterBarOffsetRef.current === 0) {
          filterBarOffsetRef.current = filterBarRef.current.offsetTop;
        }
        setIsFilterBarSticky(window.scrollY > filterBarOffsetRef.current - 10);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Set initial cities from profile
  useEffect(() => {
    if (!initialCitiesSet && !profileLoading && profile) {
      let cityNames = [];
      if (profile.service_cities && profile.service_cities.length > 0) {
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
      setSelectedListings(new Set());
    }
  }, [location.pathname]);

  // Use enhanced hooks based on active tab
  const {
    data: justListedData,
    isLoading: justListedLoading,
    error: justListedError,
  } = useJustListedEnhanced(filters, currentPage, PAGE_SIZE);

  const {
    data: soldListingsData,
    isLoading: soldListingsLoading,
    error: soldListingsError,
  } = useSoldListingsEnhanced(filters, currentPage, PAGE_SIZE);

  // Get current data based on active tab
  const currentData = activeTab === 'just-listed' ? justListedData : soldListingsData;
  const currentLoading = activeTab === 'just-listed' ? justListedLoading : soldListingsLoading;
  const currentError = activeTab === 'just-listed' ? justListedError : soldListingsError;

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle city changes
  const handleCitiesChange = (newCities) => {
    setFilters(prev => ({ ...prev, city_name: newCities }));
    setCurrentPage(1);
    trackAction('multi_city_change', { cities: newCities, cityCount: newCities.length, section: activeTab });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedListings(new Set());
    trackAction('pagination', { page, section: activeTab });
  };

  const navigateToProperty = (listingId) => {
    navigate(`/dashboard/listings/property/${listingId}`);
    trackAction('listing_view', { listingId, page: currentPage, type: activeTab });
  };

  // Sort listings client-side
  const sortedListings = useMemo(() => {
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
        case 'pricePerSqft':
          aValue = calculatePricePerSqft(a.unformattedprice, a.area) || 0;
          bValue = calculatePricePerSqft(b.unformattedprice, b.area) || 0;
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

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedListings.size === sortedListings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(sortedListings.map(l => l.id)));
    }
  };

  const toggleSelectListing = (id) => {
    const newSelected = new Set(selectedListings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedListings(newSelected);
  };

  // Export handlers
  const handleExport = (selectedOnly = false) => {
    const listingsToExport = selectedOnly
      ? sortedListings.filter(l => selectedListings.has(l.id))
      : sortedListings;

    if (listingsToExport.length === 0) {
      toast.error("Export Failed", "No listings to export.");
      return;
    }

    trackAction('export', { type: activeTab, count: listingsToExport.length, selectedOnly });

    const dataToExport = listingsToExport.map(listing => ({
      Address: listing.addressStreet,
      City: listing.addresscity,
      State: listing.addressstate,
      Price: listing.unformattedprice ? `$${listing.unformattedprice.toLocaleString()}` : 'N/A',
      'Price/SqFt': calculatePricePerSqft(listing.unformattedprice, listing.area) ? `$${calculatePricePerSqft(listing.unformattedprice, listing.area)}` : 'N/A',
      Beds: listing.beds || 'N/A',
      Baths: listing.baths || 'N/A',
      'Sq. Ft.': listing.area ? listing.area.toLocaleString() : 'N/A',
      'Property Type': listing.statustext || 'N/A',
      Date: listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'N/A'
    }));

    exportToCSV(dataToExport, `${activeTab}-listings-${listingsToExport.length}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success("Export Successful", `${listingsToExport.length} listings exported.`);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedListings(new Set());
    trackAction('tab_change', { from: activeTab, to: tab });
    const newPath = tab === 'sold' ? '/dashboard/listings/sold' : '/dashboard/listings/just-listed';
    window.history.replaceState(null, '', newPath);
  };

  const clearFilters = () => {
    const defaultCities = profile?.service_cities?.map(c => c.split(', ')[0]) || (profile?.city_name ? [profile.city_name] : []);
    setFilters({
      city_name: defaultCities,
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
    setCurrentPage(1);
  };

  const getPropertyTypeColor = (type) => {
    return PROPERTY_TYPE_COLORS[type] || PROPERTY_TYPE_COLORS.default;
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader className="h-16 w-full" />
        <SkeletonLoader className="h-12 w-full" />
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (currentError) {
    console.error('UnifiedListings: Error:', currentError);
  }

  const hasFilters = filters.searchTerm || filters.beds || filters.baths || filters.propertyType ||
                     filters.minPrice || filters.maxPrice || filters.minSqft || filters.maxSqft ||
                     (filters.dateRange && filters.dateRange !== 'all');

  return (
    <div className="space-y-4">
      <Helmet>
        <title>{activeTab === 'just-listed' ? 'Just Listed' : 'Sold'} Properties | Sold2Move</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-lightest-slate">
            {activeTab === 'just-listed' ? 'Just Listed' : 'Recently Sold'}
          </h1>
          <p className="text-sm text-slate mt-0.5">
            {activeTab === 'just-listed' ? 'New listing opportunities' : 'High-intent moving leads'}
            {filters.city_name.length > 0 && (
              <span> in <span className="text-teal">{filters.city_name.length === 1 ? filters.city_name[0] : `${filters.city_name.length} cities`}</span></span>
            )}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-light-navy/80 border border-lightest-navy/10 rounded-lg">
          <button
            onClick={() => handleTabChange('just-listed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'just-listed'
                ? 'bg-teal text-deep-navy'
                : 'text-slate hover:text-lightest-slate'
            }`}
          >
            Just Listed
            {justListedData?.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${activeTab === 'just-listed' ? 'bg-deep-navy/20' : 'bg-lightest-navy/20'}`}>
                {justListedData.count.toLocaleString()}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('sold')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'sold'
                ? 'bg-teal text-deep-navy'
                : 'text-slate hover:text-lightest-slate'
            }`}
          >
            Sold
            {soldListingsData?.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${activeTab === 'sold' ? 'bg-deep-navy/20' : 'bg-lightest-navy/20'}`}>
                {soldListingsData.count.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Unified Power Bar */}
      <div
        ref={filterBarRef}
        className={`transition-all duration-200 ${
          isFilterBarSticky
            ? 'fixed top-0 left-0 right-0 z-50 bg-deep-navy/95 backdrop-blur-sm border-b border-lightest-navy/10 px-4 py-3 shadow-lg md:left-16 lg:left-64'
            : ''
        }`}
      >
        <div className={`flex flex-wrap items-center gap-3 ${isFilterBarSticky ? 'max-w-7xl mx-auto' : ''}`}>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
            <Input
              placeholder="Search address, city, or zip..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="pl-10 bg-light-navy/80 border-lightest-navy/20 h-10"
            />
            {filters.searchTerm && (
              <button
                onClick={() => handleFilterChange('searchTerm', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-lightest-slate"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* City Selector */}
          <CitySelector
            currentCity={filters.city_name[0]}
            onCityChange={(city) => handleCitiesChange([city])}
            selectedCities={filters.city_name}
            onCitiesChange={handleCitiesChange}
            variant="compact"
            showMultiCityOption={true}
          />

          {/* Property Type */}
          <Select value={filters.propertyType || 'all'} onValueChange={(v) => handleFilterChange('propertyType', v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px] h-10 bg-light-navy/80 border-lightest-navy/20">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="House for sale">House</SelectItem>
              <SelectItem value="Condo for sale">Condo</SelectItem>
              <SelectItem value="Townhouse for sale">Townhouse</SelectItem>
              <SelectItem value="Multi-family home for sale">Multi-family</SelectItem>
              <SelectItem value="Land for sale">Land</SelectItem>
            </SelectContent>
          </Select>

          {/* Beds */}
          <Select value={filters.beds?.toString() || 'all'} onValueChange={(v) => handleFilterChange('beds', v === 'all' ? null : parseInt(v))}>
            <SelectTrigger className="w-[100px] h-10 bg-light-navy/80 border-lightest-navy/20">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Beds</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>

          {/* Baths */}
          <Select value={filters.baths?.toString() || 'all'} onValueChange={(v) => handleFilterChange('baths', v === 'all' ? null : parseInt(v))}>
            <SelectTrigger className="w-[100px] h-10 bg-light-navy/80 border-lightest-navy/20">
              <SelectValue placeholder="Baths" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Baths</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>

          {/* Price Range */}
          <Select
            value={filters.minPrice && filters.maxPrice ? `${filters.minPrice}-${filters.maxPrice}` : filters.minPrice ? `${filters.minPrice}-` : 'all'}
            onValueChange={(v) => {
              if (v === 'all') {
                handleFilterChange('minPrice', null);
                handleFilterChange('maxPrice', null);
              } else {
                const [min, max] = v.split('-');
                handleFilterChange('minPrice', min ? parseInt(min) : null);
                handleFilterChange('maxPrice', max ? parseInt(max) : null);
              }
            }}
          >
            <SelectTrigger className="w-[130px] h-10 bg-light-navy/80 border-lightest-navy/20">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="0-300000">Under $300K</SelectItem>
              <SelectItem value="300000-500000">$300K-$500K</SelectItem>
              <SelectItem value="500000-750000">$500K-$750K</SelectItem>
              <SelectItem value="750000-1000000">$750K-$1M</SelectItem>
              <SelectItem value="1000000-">$1M+</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] h-10 bg-light-navy/80 border-lightest-navy/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="pricePerSqft">$/SqFt</SelectItem>
                <SelectItem value="beds">Beds</SelectItem>
                <SelectItem value="area">Sq Ft</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Column Settings */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="h-10 w-10"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            {showColumnSettings && (
              <div className="absolute right-0 top-12 z-50 bg-light-navy border border-lightest-navy/20 rounded-lg p-3 shadow-xl min-w-[180px]">
                <p className="text-xs text-slate mb-2 font-medium">Show Columns</p>
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-lightest-navy/10 px-2 rounded">
                    <Checkbox
                      checked={value}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [key]: checked }))}
                    />
                    <span className="text-sm text-lightest-slate capitalize">{key === 'pricePerSqft' ? '$/SqFt' : key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate hover:text-lightest-slate">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Export */}
          <Button
            onClick={() => handleExport(false)}
            disabled={sortedListings.length === 0}
            variant="outline"
            size="sm"
            className="border-teal/50 text-teal hover:bg-teal/10"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Spacer for sticky bar */}
      {isFilterBarSticky && <div className="h-16" />}

      {/* Bulk Actions Bar */}
      {selectedListings.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-teal rounded-xl shadow-2xl shadow-teal/20">
          <span className="text-deep-navy font-medium">
            {selectedListings.size} selected
          </span>
          <div className="w-px h-6 bg-deep-navy/20" />
          <Button
            onClick={() => handleExport(true)}
            size="sm"
            className="bg-deep-navy/20 hover:bg-deep-navy/30 text-deep-navy"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Selected
          </Button>
          <Button
            onClick={() => navigate('/dashboard/mailing')}
            size="sm"
            className="bg-deep-navy/20 hover:bg-deep-navy/30 text-deep-navy"
          >
            <Mail className="h-4 w-4 mr-1" />
            Add to Mailing
          </Button>
          <button
            onClick={() => setSelectedListings(new Set())}
            className="text-deep-navy/70 hover:text-deep-navy p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate">
          {currentData?.count > 0 ? (
            <>Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, currentData.count)} of <span className="text-lightest-slate font-medium">{currentData.count.toLocaleString()}</span> properties</>
          ) : (
            'No properties found'
          )}
        </span>
        <span className="text-slate">
          Page {currentPage} of {currentData?.totalPages || 1}
        </span>
      </div>

      {/* Listings Table */}
      <Card className="bg-light-navy/80 border-lightest-navy/10 overflow-hidden">
        <CardContent className="p-0">
          {currentLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => <SkeletonLoader key={i} className="h-16 w-full" />)}
            </div>
          ) : sortedListings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-deep-navy/50 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'just-listed' ? (
                  <Building className="h-8 w-8 text-slate" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-slate" />
                )}
              </div>
              <h3 className="text-lg font-medium text-lightest-slate mb-2">No Properties Found</h3>
              <p className="text-slate mb-4 max-w-md mx-auto">
                {hasFilters
                  ? "No properties match your filters. Try adjusting your search criteria."
                  : "No properties found in your service areas."}
              </p>
              {hasFilters && (
                <Button onClick={clearFilters} variant="outline" className="border-teal/50 text-teal hover:bg-teal/10">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-lightest-navy/10 hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedListings.size === sortedListings.length && sortedListings.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    {visibleColumns.thumbnail && <TableHead className="w-16"></TableHead>}
                    {visibleColumns.address && <TableHead className="min-w-[280px]">Property</TableHead>}
                    {visibleColumns.price && <TableHead className="min-w-[100px]">Price</TableHead>}
                    {visibleColumns.pricePerSqft && <TableHead className="min-w-[80px]">$/SqFt</TableHead>}
                    {visibleColumns.beds && <TableHead className="min-w-[60px]">Beds</TableHead>}
                    {visibleColumns.baths && <TableHead className="min-w-[60px]">Baths</TableHead>}
                    {visibleColumns.sqft && <TableHead className="min-w-[80px]">Sq Ft</TableHead>}
                    {visibleColumns.date && <TableHead className="min-w-[100px]">Listed</TableHead>}
                    {visibleColumns.type && <TableHead className="min-w-[120px]">Type</TableHead>}
                    {visibleColumns.actions && <TableHead className="min-w-[160px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedListings.map((listing, index) => {
                    const isNew = isNewListing(listing.lastseenat);
                    const pricePerSqft = calculatePricePerSqft(listing.unformattedprice, listing.area);
                    const isHot = listing.unformattedprice && listing.unformattedprice > 800000;

                    return (
                      <TableRow
                        key={listing.id}
                        className={`border-lightest-navy/10 hover:bg-lightest-navy/5 transition-colors cursor-pointer group ${
                          isNew ? 'border-l-2 border-l-teal bg-teal/5' : ''
                        } ${selectedListings.has(listing.id) ? 'bg-teal/10' : ''}`}
                        onClick={() => navigateToProperty(listing.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedListings.has(listing.id)}
                            onCheckedChange={() => toggleSelectListing(listing.id)}
                          />
                        </TableCell>

                        {visibleColumns.thumbnail && (
                          <TableCell className="pr-0">
                            <PropertyThumbnail src={listing.imgSrc} alt={listing.addressStreet} />
                          </TableCell>
                        )}

                        {visibleColumns.address && (
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-lightest-slate group-hover:text-teal transition-colors truncate">
                                    {listing.addressStreet}
                                  </span>
                                  {isNew && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-teal/20 text-teal text-xs rounded">
                                      <Sparkles className="h-3 w-3" />
                                      New
                                    </span>
                                  )}
                                  {isHot && !isNew && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                      <Flame className="h-3 w-3" />
                                      Hot
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate truncate">
                                  {listing.addresscity}, {listing.addressstate}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.price && (
                          <TableCell>
                            <span className="text-teal font-semibold">
                              {listing.unformattedprice ? `$${listing.unformattedprice.toLocaleString()}` : '—'}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.pricePerSqft && (
                          <TableCell>
                            <span className="text-slate">
                              {pricePerSqft ? `$${pricePerSqft}` : '—'}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.beds && (
                          <TableCell>
                            <span className="text-lightest-slate">{listing.beds || '—'}</span>
                          </TableCell>
                        )}

                        {visibleColumns.baths && (
                          <TableCell>
                            <span className="text-lightest-slate">{listing.baths || '—'}</span>
                          </TableCell>
                        )}

                        {visibleColumns.sqft && (
                          <TableCell>
                            <span className="text-lightest-slate">
                              {listing.area ? listing.area.toLocaleString() : '—'}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.date && (
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-slate">
                              <Clock className="h-3.5 w-3.5" />
                              <span className={`text-sm ${isNew ? 'text-teal font-medium' : ''}`}>
                                {formatRelativeTime(listing.lastseenat)}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.type && (
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPropertyTypeColor(listing.statustext)}`}>
                              {listing.statustext?.replace(' for sale', '') || 'Unknown'}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.actions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <HomeownerLookupButton listing={listing} compact={false} />
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToProperty(listing.id);
                                }}
                                size="sm"
                                variant="ghost"
                                className="text-slate hover:text-lightest-slate"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {currentData?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, currentData.count)} of {currentData.count}
          </span>
          <Pagination
            currentPage={currentPage}
            totalPages={currentData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default UnifiedListings;
