import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { fetchListingById } from '@/lib/queries';
import { Loader2, AlertCircle, Bed, Bath, Ruler, MapPin, ArrowLeft, ExternalLink, CalendarDays, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageWrapper from '@/components/layout/PageWrapper';

const PropertyDetailPage = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [daysOnZillow, setDaysOnZillow] = useState(null);

  useEffect(() => {
    const getListing = async () => {
      try {
        setLoading(true);
        const data = await fetchListingById(listingId);
        setListing(data);
        
        if (data?.hdpData?.homeInfo?.daysOnZillow) {
          setDaysOnZillow(data.hdpData.homeInfo.daysOnZillow);
        }

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

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-green" />
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
        <title>{listing.addressStreet} | Property Details</title>
        <meta name="description" content={`Details for property at ${listing.addressStreet}`} />
      </Helmet>
      
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate hover:text-lightest-slate">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-w-16 aspect-h-9 bg-lightest-navy/10">
                  {selectedImage ? (
                    <img src={selectedImage} alt="Property" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate">No Image Available</div>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="p-4 flex space-x-2 overflow-x-auto bg-light-navy">
                    {photos.map((photo, index) => (
                      <div key={index} className="flex-shrink-0" onClick={() => setSelectedImage(photo.url)}>
                        <img 
                          src={photo.url} 
                          alt={`Thumbnail ${index + 1}`} 
                          className={`w-24 h-16 object-cover rounded-md cursor-pointer border-2 ${selectedImage === photo.url ? 'border-green' : 'border-transparent'}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl text-green">{listing.price}</CardTitle>
                <p className="text-lg text-lightest-slate">{listing.addressStreet}</p>
                <p className="text-md text-slate flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {listing.addressCity}, {listing.addressState} {listing.addressZipcode}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center my-4">
                  <div className="p-2 rounded-lg bg-lightest-navy/10">
                    <Bed className="mx-auto h-6 w-6 text-green mb-1" />
                    <p className="font-bold text-lightest-slate">{listing.beds || 'N/A'}</p>
                    <p className="text-xs text-slate">Beds</p>
                  </div>
                  <div className="p-2 rounded-lg bg-lightest-navy/10">
                    <Bath className="mx-auto h-6 w-6 text-green mb-1" />
                    <p className="font-bold text-lightest-slate">{listing.baths || 'N/A'}</p>
                    <p className="text-xs text-slate">Baths</p>
                  </div>
                  <div className="p-2 rounded-lg bg-lightest-navy/10">
                    <Ruler className="mx-auto h-6 w-6 text-green mb-1" />
                    <p className="font-bold text-lightest-slate">{listing.area ? `${listing.area.toLocaleString()} sqft` : 'N/A'}</p>
                    <p className="text-xs text-slate">Area</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm mt-6">
                  <div className="flex justify-between">
                    <span className="text-slate">Property Type:</span>
                    <span className="font-medium text-lightest-slate">{listing.statusText || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate">Zillow ID (zpid):</span>
                    <span className="font-medium text-lightest-slate">{listing.zpid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate">Days on Zillow:</span>
                    <span className="font-medium text-lightest-slate flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4 text-green" />
                      {daysOnZillow ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate">Listed By:</span>
                    <span className="font-medium text-lightest-slate flex items-center">
                      <Building className="mr-2 h-4 w-4 text-green" />
                      {listing.brokerName || 'N/A'}
                    </span>
                  </div>
                </div>
                {listing.detailUrl && (
                  <Button asChild className="w-full mt-6 bg-green text-deep-navy hover:bg-green/90">
                    <a href={listing.detailUrl} target="_blank" rel="noopener noreferrer">
                      View on Zillow <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
};

export default PropertyDetailPage;