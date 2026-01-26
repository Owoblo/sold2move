import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { fetchListingById } from '@/lib/queries';
import {
  Loader2,
  AlertCircle,
  Bed,
  Bath,
  Ruler,
  MapPin,
  ArrowLeft,
  CalendarDays,
  Building,
  Home,
  Car,
  Wifi,
  Shield,
  TrendingUp,
  DollarSign,
  Clock,
  Phone,
  Mail,
  Share2,
  Heart,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  UserSearch,
  Sofa,
  Package,
  X
} from 'lucide-react';
import HomeownerInfoCard from './HomeownerInfoCard';
import InventoryResultsCard from './InventoryResultsCard';
import { useHomeownerLookup } from '@/hooks/useHomeownerLookup';
import { useInventoryScan } from '@/hooks/useInventoryScan';
import { inventoryScanService } from '@/services/inventoryScan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AIScanningOverlay from '@/components/ui/AIScanningOverlay';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/layout/PageWrapper';

// Canadian provinces - homeowner lookup is not available for these
const CA_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

/**
 * Check if a listing is from Canada based on its state/province code
 */
const isCanadianListing = (listing) => {
  const state = listing?.addressState || listing?.addressstate || listing?.address_state || '';
  return CA_PROVINCES.includes(state.toUpperCase());
};

const PropertyDetailPage = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Homeowner lookup hook
  const {
    lookupFromListing,
    loading: homeownerLoading,
    data: homeownerData,
    error: homeownerError,
    reset: resetHomeowner,
    hasData: hasHomeownerData
  } = useHomeownerLookup();

  // Inventory scan hook
  const {
    scanFromListing: scanInventory,
    loading: inventoryLoading,
    data: inventoryData,
    error: inventoryError,
    reset: resetInventory,
    hasData: hasInventoryData,
    progress: inventoryProgress,
    currentPhotoIndex: inventoryPhotoIndex
  } = useInventoryScan();

  // Tab state for content sections
  const [activeTab, setActiveTab] = useState('overview');

  // Check if user is admin
  const isAdmin = user?.email === 'johnowolabi80@gmail.com';

  useEffect(() => {
    const getListing = async () => {
      try {
        setLoading(true);
        const data = await fetchListingById(listingId);
        setListing(data);

        // Process photos using the same logic as the component
        const processCarouselPhotos = (listing) => {
          if (listing?.carouselPhotosComposable?.photoData) {
            const { baseUrl, photoData } = listing.carouselPhotosComposable;
            return photoData.map(photo => ({
              url: baseUrl.replace('{photoKey}', photo.photoKey)
            }));
          }

          if (listing?.carouselPhotos) {
            return listing.carouselPhotos;
          }

          if (listing?.imgSrc) {
            return [{ url: listing.imgSrc }];
          }

          return [];
        };

        const photos = processCarouselPhotos(data);

        if (photos.length > 0) {
          setSelectedImage(photos[0].url);
        }

        // Auto-fetch cached inventory data ONLY if listing has completed scan with items
        // Check for furniture_items_detected to ensure there's actual cached data to fetch
        if (data?.furniture_scan_date &&
            Array.isArray(data?.furniture_items_detected) &&
            data.furniture_items_detected.length > 0) {
          console.log('📦 Auto-fetching cached inventory data...');
          scanInventory(data, false, photos.length);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getListing();
  }, [listingId]);

  // Process carousel photos from composable data
  const processCarouselPhotos = (listing) => {
    // First try carousel_photos_composable
    if (listing?.carouselPhotosComposable?.photoData) {
      const { baseUrl, photoData } = listing.carouselPhotosComposable;
      return photoData.map(photo => ({
        url: baseUrl.replace('{photoKey}', photo.photoKey)
      }));
    }
    
    // Fallback to regular carouselPhotos
    if (listing?.carouselPhotos) {
      return listing.carouselPhotos;
    }
    
    // Final fallback to single image
    if (listing?.imgSrc) {
      return [{ url: listing.imgSrc }];
    }
    
    return [];
  };

  const photos = processCarouselPhotos(listing);
  
  // Extract rich data from hdpData
  const homeInfo = listing?.hdpData?.homeInfo || {};
  const propertyDetails = listing?.hdpData?.propertyDetails || {};
  const priceHistory = listing?.hdpData?.priceHistory || [];
  const taxHistory = listing?.hdpData?.taxHistory || [];
  const schoolInfo = listing?.hdpData?.schoolInfo || {};
  
  // Calculate property metrics
  const pricePerSqft = listing?.area && listing?.unformattedprice 
    ? Math.round(listing.unformattedprice / listing.area) 
    : null;
  
  const daysOnMarket = homeInfo.daysOnZillow || null;
  
  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Navigation functions
  const nextImage = () => {
    if (photos.length > 0) {
      const nextIndex = (currentImageIndex + 1) % photos.length;
      setCurrentImageIndex(nextIndex);
      setSelectedImage(photos[nextIndex].url);
    }
  };

  const prevImage = () => {
    if (photos.length > 0) {
      const prevIndex = currentImageIndex === 0 ? photos.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(prevIndex);
      setSelectedImage(photos[prevIndex].url);
    }
  };

  const selectImage = (index) => {
    setCurrentImageIndex(index);
    setSelectedImage(photos[index].url);
  };

  // Share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.addressStreet}`,
          text: `Check out this property: ${listing.addressStreet}`,
          url: window.location.href,
        });
      } catch (err) {
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Toggle favorite
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Here you would typically save to database
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isFullscreen) {
        switch (e.key) {
          case 'Escape':
            setIsFullscreen(false);
            break;
          case 'ArrowLeft':
            prevImage();
            break;
          case 'ArrowRight':
            nextImage();
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, photos.length, currentImageIndex]);

  // Auto-switch to inventory tab when scan completes
  useEffect(() => {
    if (hasInventoryData && !inventoryLoading) {
      setActiveTab('inventory');
    }
  }, [hasInventoryData, inventoryLoading]);

  // Handler for starting inventory scan with photo count
  const handleScanInventory = () => {
    scanInventory(listing, false, photos.length);
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-teal" />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    // Check if it's a "not found" error specifically
    const isNotFound = error.toLowerCase().includes('not found') || error.includes('NOT_FOUND');

    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-96 bg-light-navy/30 rounded-lg">
          <AlertCircle className={`h-12 w-12 mb-4 ${isNotFound ? 'text-amber-500' : 'text-red-500'}`} />
          <p className="text-xl text-lightest-slate font-semibold">
            {isNotFound ? 'Property Not Found' : 'Failed to load property details'}
          </p>
          <p className="text-slate mt-2 text-center max-w-md px-4">
            {isNotFound
              ? 'This property may have been removed or the link is incorrect.'
              : error}
          </p>
          <Button
            onClick={() => navigate('/dashboard/listings/just-listed')}
            className="mt-6 bg-teal text-deep-navy hover:bg-teal/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>
        </div>
      </PageWrapper>
    );
  }

  if (!listing) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="h-12 w-12 text-slate mb-4" />
          <p className="text-xl text-lightest-slate font-semibold">Property not found</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Helmet>
        <title>{listing.addressStreet || 'Property'} | Property Details</title>
        <meta name="description" content={`Details for property at ${listing.addressStreet || 'this location'}`} />
      </Helmet>
      
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* Header with Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate hover:text-lightest-slate">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleFavorite}>
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              {isFavorite ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery / AI Scanning Overlay */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-0">
                {/* Show AI Scanning Overlay when inventory scan is in progress */}
                {inventoryLoading ? (
                  <AIScanningOverlay
                    photos={photos}
                    currentPhotoIndex={inventoryPhotoIndex}
                    progress={inventoryProgress}
                    isLight={isLight}
                  />
                ) : (
                  <div className="relative aspect-[4/3] max-w-[1000px] mx-auto rounded-lg overflow-hidden" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Property"
                        className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                        loading="lazy"
                        onClick={() => setIsFullscreen(true)}
                        onError={(e) => {
                          console.error('❌ Image failed to load:', selectedImage);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                        <div className="text-center">
                          <Home className="h-16 w-16 mx-auto mb-4" style={{ color: isLight ? '#94a3b8' : '#64748b' }} />
                          <p>No Image Available</p>
                        </div>
                      </div>
                    )}

                    {/* Image Navigation */}
                    {photos.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* Image Counter */}
                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {currentImageIndex + 1} / {photos.length}
                        </div>

                        {/* Fullscreen Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-white/20"
                          onClick={() => setIsFullscreen(true)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Scan Inventory Button - shown on gallery when can scan */}
                    {inventoryScanService.canShowScanButton(listing) && !hasInventoryData && !inventoryError && (
                      <Button
                        className="absolute bottom-4 left-4 bg-teal text-deep-navy hover:bg-teal/90 shadow-lg"
                        onClick={handleScanInventory}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Scan Inventory with AI
                      </Button>
                    )}
                  </div>
                )}

                {/* Thumbnail Strip - hide during scanning */}
                {photos.length > 1 && !inventoryLoading && (
                  <div className="p-4" style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(22, 26, 31, 0.8)' }}>
                    <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
                      {photos.map((photo, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 cursor-pointer group"
                          onClick={() => selectImage(index)}
                        >
                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={`Thumbnail ${index + 1}`}
                              className={`w-20 h-16 object-cover rounded-lg border-2 transition-all duration-200 ${
                                currentImageIndex === index
                                  ? 'border-teal scale-105 shadow-lg'
                                  : 'border-transparent hover:border-slate/50 hover:scale-105'
                              }`}
                            />
                            {currentImageIndex === index && (
                              <div className="absolute inset-0 bg-teal/20 rounded-lg"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabbed Content Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className="w-full grid grid-cols-4 h-12 p-1 rounded-xl"
                style={{
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-medium"
                  style={{
                    color: activeTab === 'overview' ? (isLight ? '#0f172a' : '#e2e8f0') : (isLight ? '#64748b' : '#94a3b8'),
                    backgroundColor: activeTab === 'overview' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.1)') : 'transparent'
                  }}
                >
                  <Home className="h-4 w-4 mr-1.5 hidden sm:inline" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-medium relative"
                  style={{
                    color: activeTab === 'inventory' ? (isLight ? '#0f172a' : '#e2e8f0') : (isLight ? '#64748b' : '#94a3b8'),
                    backgroundColor: activeTab === 'inventory' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.1)') : 'transparent'
                  }}
                >
                  <Package className="h-4 w-4 mr-1.5 hidden sm:inline" style={{ color: hasInventoryData ? (isLight ? '#059669' : '#00FF88') : undefined }} />
                  Inventory
                  {hasInventoryData && (
                    <Badge className="ml-1.5 h-5 px-1.5 text-xs" style={{ backgroundColor: isLight ? '#059669' : '#00FF88', color: isLight ? '#ffffff' : '#0D0F12' }}>
                      {inventoryData?.summary?.totalItems || 0}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-medium"
                  style={{
                    color: activeTab === 'details' ? (isLight ? '#0f172a' : '#e2e8f0') : (isLight ? '#64748b' : '#94a3b8'),
                    backgroundColor: activeTab === 'details' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.1)') : 'transparent'
                  }}
                >
                  <Info className="h-4 w-4 mr-1.5 hidden sm:inline" />
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="market"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-medium"
                  style={{
                    color: activeTab === 'market' ? (isLight ? '#0f172a' : '#e2e8f0') : (isLight ? '#64748b' : '#94a3b8'),
                    backgroundColor: activeTab === 'market' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.1)') : 'transparent'
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-1.5 hidden sm:inline" />
                  Market
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="mt-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                    border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                    <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Overview
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <Bed className="mx-auto h-8 w-8 mb-2" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{listing.beds || 'N/A'}</p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Bedrooms</p>
                      </div>
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <Bath className="mx-auto h-8 w-8 mb-2" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{listing.baths || 'N/A'}</p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Bathrooms</p>
                      </div>
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <Ruler className="mx-auto h-8 w-8 mb-2" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          {listing.area ? `${(listing.area / 1000).toFixed(1)}k` : 'N/A'}
                        </p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Sq Ft</p>
                      </div>
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <DollarSign className="mx-auto h-8 w-8 mb-2" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          {pricePerSqft ? `$${pricePerSqft}` : 'N/A'}
                        </p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Per Sq Ft</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Inventory Tab Content */}
              <TabsContent value="inventory" className="mt-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                    border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                    <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                      AI Inventory Scan
                      {inventoryData?.cached && (
                        <Badge variant="outline" className="ml-2 text-xs">Cached</Badge>
                      )}
                    </h3>
                  </div>
                  <div className="p-6">
                    {/* Empty property - no point scanning */}
                    {listing.is_furnished === false ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                        <p className="font-medium mb-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          Empty Property
                        </p>
                        <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                          This listing appears to be unfurnished.
                        </p>
                        <p className="text-sm mt-2" style={{ color: isLight ? '#059669' : '#00FF88' }}>
                          Great lead - these homeowners need furniture moved!
                        </p>
                      </div>
                    ) : !inventoryScanService.hasPhotos(listing) ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                        <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                          Inventory scan is not available for this listing.
                        </p>
                        <p className="text-sm mt-1" style={{ color: isLight ? '#94a3b8' : '#64748b' }}>
                          This feature requires listing photos.
                        </p>
                      </div>
                    ) : !hasInventoryData && !inventoryError ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-3" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <p className="font-medium mb-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          AI-Powered Inventory Detection
                        </p>
                        <p className="text-sm mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                          {listing.is_furnished === true
                            ? 'This furnished listing is ready for detailed inventory analysis.'
                            : 'Analyze listing photos to detect furniture and estimate move size.'}
                        </p>
                        <Button
                          className="bg-teal text-deep-navy hover:bg-teal/90"
                          onClick={handleScanInventory}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          {listing.is_furnished === true ? 'Scan Full Inventory' : 'Start Inventory Scan'}
                        </Button>
                      </div>
                    ) : inventoryError ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
                        <p className="font-medium mb-2 text-red-500">Scan Failed</p>
                        <p className="text-sm mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                          {inventoryError.message || 'Could not analyze listing photos'}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetInventory();
                            handleScanInventory();
                          }}
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <InventoryResultsCard
                        data={inventoryData}
                        loading={false}
                        error={null}
                        progress={100}
                        onRetry={() => {
                          resetInventory();
                          handleScanInventory();
                        }}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Details Tab Content */}
              <TabsContent value="details" className="mt-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                    border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                    <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Property Details
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Property Type:</span>
                          <Badge variant="outline" style={{ color: isLight ? '#047857' : '#e2e8f0', backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 255, 136, 0.1)', borderColor: isLight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 255, 136, 0.3)' }}>
                            Just Listed
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Year Built:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.yearBuilt || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Lot Size:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.lotSize || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Parking:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.parkingFeatures || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Heating:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.heating || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Cooling:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.cooling || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Flooring:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.flooring || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Roof:</span>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-medium">
                            {homeInfo.roof || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Market Tab Content */}
              <TabsContent value="market" className="mt-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                    border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                    <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Market Information
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <Clock className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                        <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          {daysOnMarket || 'N/A'}
                        </p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Days on Market</p>
                      </div>
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <CalendarDays className="mx-auto h-8 w-8 text-green-500 mb-2" />
                        <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          {listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Last Updated</p>
                      </div>
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                        <Building className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                        <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                          {homeInfo.homeStatus || 'N/A'}
                        </p>
                        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Status</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Admin-only Zillow Link */}
            {isAdmin && listing.detailurl && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.2)',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <div className="p-6 border-b" style={{ borderColor: isLight ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.1)' }}>
                  <h3 className="font-semibold flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-5 w-5" />
                    Admin Access
                  </h3>
                </div>
                <div className="p-6">
                  <p className="mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>This link is only visible to admin users.</p>
                  <Button asChild className="w-full bg-yellow-500 text-black hover:bg-yellow-500/90">
                    <a href={listing.detailurl} target="_blank" rel="noopener noreferrer">
                      View on Zillow <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Key Information */}
          <div className="space-y-6">
            {/* Price and Address */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6">
                <h3 style={{ color: isLight ? '#059669' : '#00FF88' }} className="text-3xl font-bold">{formatPrice(listing.unformattedprice)}</h3>
                <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-lg font-medium mt-1">{listing.addressStreet}</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="flex items-center mt-1">
                  <MapPin className="mr-2 h-4 w-4" />
                  {listing.addresscity}, {listing.addressstate} {listing.addresszipcode}
                </p>

                {/* Furniture Status Badge - inline under address */}
                {listing.is_furnished !== null && listing.is_furnished !== undefined && (
                  <div className="mt-3">
                    <Badge
                      className="flex items-center gap-1.5 w-fit"
                      style={{
                        backgroundColor: listing.is_furnished
                          ? (isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.2)')
                          : (isLight ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.2)'),
                        color: listing.is_furnished
                          ? (isLight ? '#7c3aed' : '#a78bfa')
                          : (isLight ? '#64748b' : '#94a3b8'),
                        borderColor: listing.is_furnished
                          ? (isLight ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.4)')
                          : (isLight ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.4)')
                      }}
                    >
                      {listing.is_furnished ? (
                        <>
                          <Sofa className="h-3.5 w-3.5" />
                          Furnished
                        </>
                      ) : (
                        <>
                          <Package className="h-3.5 w-3.5" />
                          Empty
                        </>
                      )}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Quick property stats - compact grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                    <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{listing.beds || '-'}</p>
                    <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Beds</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                    <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{listing.baths || '-'}</p>
                    <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Baths</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
                    <p className="text-xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {listing.area ? listing.area.toLocaleString() : '-'}
                    </p>
                    <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Sq Ft</p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 border-t" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Property ID:</span>
                    <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-mono">{listing.id}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Zillow ID:</span>
                      <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-mono">{listing.zpid || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Realtor Info */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                  Listing Agent
                </h3>
              </div>
              <div className="p-6">
                {listing.listing_agent || listing.agent_phone || listing.agent_email ? (
                  <div className="space-y-4">
                    {/* Agent Name */}
                    {listing.listing_agent && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.1)' }}>
                          <Building className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                            {listing.listing_agent}
                          </p>
                          <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Listing Agent</p>
                        </div>
                      </div>
                    )}

                    {/* Agent Phone */}
                    {listing.agent_phone && (
                      <a
                        href={`tel:${listing.agent_phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                        style={{
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Phone className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <div>
                          <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                            {listing.agent_phone}
                          </p>
                          <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tap to call</p>
                        </div>
                      </a>
                    )}

                    {/* Agent Email */}
                    {listing.agent_email && (
                      <a
                        href={`mailto:${listing.agent_email}`}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                        style={{
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Mail className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                        <div>
                          <p className="font-medium text-sm break-all" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                            {listing.agent_email}
                          </p>
                          <p className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Tap to email</p>
                        </div>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                    <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      No agent information available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Homeowner Information */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)' }}>
                <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold flex items-center gap-2">
                  <UserSearch style={{ color: isLight ? '#059669' : '#00FF88' }} className="h-5 w-5" />
                  Homeowner Information
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {isCanadianListing(listing) ? (
                  <div className="text-center py-4">
                    <MapPin className="h-8 w-8 text-slate mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-slate">
                      Homeowner lookup is not available for Canadian listings.
                    </p>
                    <p className="text-xs text-slate/70 mt-1">
                      This feature is only available for US properties.
                    </p>
                  </div>
                ) : (
                  <>
                    {!hasHomeownerData && !homeownerLoading && !homeownerError && (
                      <>
                        <p className="text-sm text-slate mb-3">
                          Look up contact information for the property owner including phone numbers and email addresses.
                        </p>
                        <Button
                          className="w-full bg-teal text-deep-navy hover:bg-teal/90"
                          onClick={() => lookupFromListing(listing)}
                          disabled={homeownerLoading}
                        >
                          {homeownerLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Looking up...
                            </>
                          ) : (
                            <>
                              <UserSearch className="h-4 w-4 mr-2" />
                              Get Homeowner Info
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {(hasHomeownerData || homeownerLoading || homeownerError) && (
                      <HomeownerInfoCard
                        data={homeownerData}
                        loading={homeownerLoading}
                        error={homeownerError}
                        onRetry={() => {
                          resetHomeowner();
                          lookupFromListing(listing);
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Fullscreen Image Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-white/20"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Main Image */}
            <div className="relative max-w-7xl max-h-full">
              <img 
                src={selectedImage} 
                alt="Property Fullscreen" 
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Navigation in Fullscreen */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Image Counter in Fullscreen */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {currentImageIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail Strip in Fullscreen */}
            {photos.length > 1 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-2 bg-black/50 rounded-lg p-2">
                  {photos.map((photo, index) => (
                    <div 
                      key={index} 
                      className="cursor-pointer" 
                      onClick={() => selectImage(index)}
                    >
                      <img 
                        src={photo.url} 
                        alt={`Thumbnail ${index + 1}`} 
                        className={`w-12 h-8 object-cover rounded border-2 transition-all ${
                          currentImageIndex === index 
                            ? 'border-teal' 
                            : 'border-transparent hover:border-white/50'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default PropertyDetailPage;