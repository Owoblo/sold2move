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
  TreePine,
  Wifi,
  Shield,
  Star,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';
import PageWrapper from '@/components/layout/PageWrapper';

const PropertyDetailPage = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === 'johnowolabi80@gmail.com';

  // Credit validation effect
  useEffect(() => {
    if (profile && !isAdmin) {
      // Check if user has unlimited access or if this is a revealed listing
      // For now, we'll allow access if they have any credits (they should have paid to get here)
      if (!profile.unlimited && profile.credits_remaining <= 0) {
        navigate('/pricing', { 
          state: { 
            message: 'You need credits to view property details. Please purchase credits to continue.' 
          } 
        });
        return;
      }
    }
  }, [profile, isAdmin, navigate]);

  useEffect(() => {
    const getListing = async () => {
      try {
        setLoading(true);
        const data = await fetchListingById(listingId);
        setListing(data);
        
        const photos = data?.carouselPhotos || (data?.imgSrc ? [{ url: data.imgSrc }] : []);
        if (photos.length > 0) {
          setSelectedImage(photos[0].url);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getListing();
  }, [listingId]);

  const photos = listing?.carouselPhotos || (listing?.imgSrc ? [{ url: listing.imgSrc }] : []);
  
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
        console.log('Error sharing:', err);
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
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-96 bg-light-navy/30 rounded-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-xl text-lightest-slate font-semibold">Failed to load property details</p>
          <p className="text-slate mt-2">{error}</p>
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
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-[16/10] bg-lightest-navy/10 rounded-lg overflow-hidden">
                  {selectedImage ? (
                    <img 
                      src={selectedImage} 
                      alt="Property" 
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105" 
                      onClick={() => setIsFullscreen(true)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate">
                      <div className="text-center">
                        <Home className="h-16 w-16 mx-auto mb-4 text-slate/50" />
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
                </div>
                
                {/* Thumbnail Strip */}
                {photos.length > 1 && (
                  <div className="p-4 bg-light-navy">
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
              </CardContent>
            </Card>

            {/* Property Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <Bed className="mx-auto h-8 w-8 text-teal mb-2" />
                    <p className="text-2xl font-bold text-lightest-slate">{listing.beds || 'N/A'}</p>
                    <p className="text-sm text-slate">Bedrooms</p>
                  </div>
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <Bath className="mx-auto h-8 w-8 text-teal mb-2" />
                    <p className="text-2xl font-bold text-lightest-slate">{listing.baths || 'N/A'}</p>
                    <p className="text-sm text-slate">Bathrooms</p>
                  </div>
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <Ruler className="mx-auto h-8 w-8 text-teal mb-2" />
                    <p className="text-2xl font-bold text-lightest-slate">
                      {listing.area ? `${(listing.area / 1000).toFixed(1)}k` : 'N/A'}
                    </p>
                    <p className="text-sm text-slate">Sq Ft</p>
                  </div>
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <DollarSign className="mx-auto h-8 w-8 text-teal mb-2" />
                    <p className="text-2xl font-bold text-lightest-slate">
                      {pricePerSqft ? `$${pricePerSqft}` : 'N/A'}
                    </p>
                    <p className="text-sm text-slate">Per Sq Ft</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate">Property Type:</span>
                      <Badge variant="outline" className="text-lightest-slate bg-teal/10 border-teal/30">
                        Just Listed
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">Year Built:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.yearBuilt || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">Lot Size:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.lotSize || 'N/A'}
                      </span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate">Parking:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.parkingFeatures || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate">Heating:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.heating || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">Cooling:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.cooling || 'N/A'}
                      </span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate">Flooring:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.flooring || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate">Roof:</span>
                      <span className="text-lightest-slate font-medium">
                        {homeInfo.roof || 'N/A'}
                    </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <Clock className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                    <p className="text-xl font-bold text-lightest-slate">
                      {daysOnMarket || 'N/A'}
                    </p>
                    <p className="text-sm text-slate">Days on Market</p>
                  </div>
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <CalendarDays className="mx-auto h-8 w-8 text-green-500 mb-2" />
                    <p className="text-xl font-bold text-lightest-slate">
                      {listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-sm text-slate">Last Updated</p>
                  </div>
                  <div className="text-center p-4 bg-lightest-navy/10 rounded-lg">
                    <Building className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                    <p className="text-xl font-bold text-lightest-slate">
                      {homeInfo.homeStatus || 'N/A'}
                    </p>
                    <p className="text-sm text-slate">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin-only Zillow Link */}
            {isAdmin && listing.detailurl && (
              <Card className="border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-5 w-5" />
                    Admin Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate mb-4">This link is only visible to admin users.</p>
                  <Button asChild className="w-full bg-yellow-500 text-black hover:bg-yellow-500/90">
                    <a href={listing.detailurl} target="_blank" rel="noopener noreferrer">
                      View on Zillow <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Key Information */}
          <div className="space-y-6">
            {/* Price and Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl text-teal">{formatPrice(listing.unformattedprice)}</CardTitle>
                <p className="text-lg text-lightest-slate font-medium">{listing.addressStreet}</p>
                <p className="text-slate flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {listing.addresscity}, {listing.addressstate} {listing.addresszipcode}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Price per Sq Ft:</span>
                    <span className="text-lightest-slate font-medium">
                      {pricePerSqft ? `$${pricePerSqft}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Property ID:</span>
                    <span className="text-lightest-slate font-mono text-sm">{listing.id}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate">Zillow ID:</span>
                      <span className="text-lightest-slate font-mono text-sm">{listing.zpid || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Total Area:</span>
                    <span className="text-lightest-slate font-medium">
                      {listing.area ? `${listing.area.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Bedrooms:</span>
                    <span className="text-lightest-slate font-medium">{listing.beds || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Bathrooms:</span>
                    <span className="text-lightest-slate font-medium">{listing.baths || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Property Type:</span>
                    <Badge variant="outline" className="text-lightest-slate bg-teal/10 border-teal/30">
                      Just Listed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-teal mt-0.5" />
                    <div>
                      <p className="text-lightest-slate font-medium">{listing.addressStreet}</p>
                      <p className="text-slate text-sm">
                        {listing.addresscity}, {listing.addressstate} {listing.addresszipcode}
                      </p>
                    </div>
                  </div>
                  
                  {schoolInfo.schoolDistrict && (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-lightest-slate font-medium">School District</p>
                        <p className="text-slate text-sm">{schoolInfo.schoolDistrict}</p>
                      </div>
                    </div>
                  )}
                  
                  {homeInfo.neighborhood && (
                    <div className="flex items-start gap-3">
                      <TreePine className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-lightest-slate font-medium">Neighborhood</p>
                        <p className="text-slate text-sm">{homeInfo.neighborhood}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Take Action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-teal text-deep-navy hover:bg-teal/90">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Agent
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Schedule Tour
                </Button>
              </CardContent>
            </Card>
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