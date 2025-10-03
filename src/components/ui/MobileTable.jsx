import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Eye, 
  Zap,
  Building,
  Ruler
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/frontend-data-mapping';

const MobileTable = ({ 
  listings, 
  onReveal, 
  onViewDetails, 
  revealedListings, 
  profile,
  isRevealing = false 
}) => {
  const isRevealed = (listingId) => {
    return profile?.unlimited || revealedListings?.has(listingId);
  };

  const getPropertyTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'house':
      case 'single family':
        return <Home className="h-4 w-4" />;
      case 'condo':
      case 'condominium':
        return <Building className="h-4 w-4" />;
      default:
        return <Home className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {listings.map((listing, index) => (
        <motion.div
          key={listing.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="bg-light-navy border-lightest-navy/20 hover:bg-light-navy/80 transition-colors">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getPropertyTypeIcon(listing.statustext)}
                    <span className="text-sm text-slate">
                      {listing.statustext || 'Property'}
                    </span>
                    {isRevealed(listing.id) && (
                      <Badge variant="outline" className="text-xs text-green border-green/30">
                        Revealed
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lightest-slate text-sm leading-tight">
                    {isRevealed(listing.id) ? listing.addressStreet : '***** ******* **'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {isRevealed(listing.id) 
                        ? `${listing.addresscity}, ${listing.addressstate}`
                        : 'Click reveal to see location'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green">
                    {isRevealed(listing.id) 
                      ? formatPrice(listing.unformattedprice, true)
                      : '*****'
                    }
                  </div>
                  <div className="text-xs text-slate">
                    {isRevealed(listing.id) ? 'Listed' : 'Price'}
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-deep-navy/50 rounded flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {isRevealed(listing.id) ? (listing.beds || 'N/A') : '***'}
                    </span>
                  </div>
                  <span className="text-slate">Beds</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-deep-navy/50 rounded flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {isRevealed(listing.id) ? (listing.baths || 'N/A') : '***'}
                    </span>
                  </div>
                  <span className="text-slate">Baths</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="h-4 w-4 text-slate" />
                  <span className="text-slate">
                    {isRevealed(listing.id) 
                      ? (listing.area ? `${listing.area.toLocaleString()} sq ft` : 'N/A')
                      : '**** sq ft'
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate" />
                  <span className="text-slate">
                    {formatDate(listing.lastseenat)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isRevealed(listing.id) ? (
                  <Button
                    onClick={() => onViewDetails(listing.id)}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-green text-green hover:bg-green/10"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                ) : (
                  <Button
                    onClick={() => onReveal(listing.id)}
                    disabled={isRevealing}
                    size="sm"
                    className="flex-1 bg-green text-deep-navy hover:bg-green/90"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Reveal (1 credit)
                  </Button>
                )}
                
                {isRevealed(listing.id) && (
                  <Button
                    onClick={() => onViewDetails(listing.id)}
                    size="sm"
                    variant="outline"
                    className="px-3 border-slate text-slate hover:bg-slate/10"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default MobileTable;
