import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Building, 
  DollarSign,
  Calendar,
  Home
} from 'lucide-react';
import LoadingButton from '@/components/ui/LoadingButton';
import { formatPrice, formatDate } from '@/lib/frontend-data-mapping';

const BulkRevealModal = ({ 
  isOpen, 
  onClose, 
  listings, 
  onBulkReveal, 
  isRevealing, 
  revealedListings,
  creditCost = 1 
}) => {
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const totalCost = selectedListings.size * creditCost;
  const availableListings = listings.filter(listing => !revealedListings.has(listing.id));

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedListings(new Set(availableListings.map(listing => listing.id)));
    } else {
      setSelectedListings(new Set());
    }
  };

  const handleSelectListing = (listingId, checked) => {
    const newSelected = new Set(selectedListings);
    if (checked) {
      newSelected.add(listingId);
    } else {
      newSelected.delete(listingId);
    }
    setSelectedListings(newSelected);
    setSelectAll(newSelected.size === availableListings.length);
  };

  const handleBulkReveal = async () => {
    const selectedListingsArray = Array.from(selectedListings);
    await onBulkReveal(selectedListingsArray);
    setSelectedListings(new Set());
    setSelectAll(false);
  };

  const handleClose = () => {
    setSelectedListings(new Set());
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-light-navy border-lightest-navy/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lightest-slate">
            <Zap className="h-5 w-5 text-teal" />
            Bulk Reveal Listings
          </DialogTitle>
          <DialogDescription className="text-slate">
            Select multiple listings to reveal at once. You'll save credits with bulk operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-deep-navy/50 border-teal/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-lightest-slate">
                      {availableListings.length}
                    </div>
                    <div className="text-xs text-slate">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal">
                      {selectedListings.size}
                    </div>
                    <div className="text-xs text-slate">Selected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {totalCost}
                    </div>
                    <div className="text-xs text-slate">Credits</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    disabled={availableListings.length === 0}
                  />
                  <label htmlFor="select-all" className="text-sm text-lightest-slate cursor-pointer">
                    Select All
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listings Grid */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            <AnimatePresence>
              {availableListings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`transition-all duration-200 ${
                    selectedListings.has(listing.id) 
                      ? 'bg-teal/10 border-teal/50' 
                      : 'bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          id={`listing-${listing.id}`}
                          checked={selectedListings.has(listing.id)}
                          onCheckedChange={(checked) => handleSelectListing(listing.id, checked)}
                        />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-light-navy rounded-md">
                              <Home className="h-4 w-4 text-teal" />
                            </div>
                            <div>
                              <div className="font-medium text-lightest-slate">
                                {selectedListings.has(listing.id) ? listing.addressStreet : '***** ******* **'}
                              </div>
                              <div className="text-xs text-slate">
                                {selectedListings.has(listing.id) 
                                  ? `${listing.addresscity}, ${listing.addressstate}`
                                  : 'Click to reveal address'
                                }
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-teal" />
                            <span className="text-teal font-semibold">
                              {selectedListings.has(listing.id) 
                                ? formatPrice(listing.unformattedprice, true)
                                : '*****'
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-slate" />
                            <span className="text-lightest-slate">
                              {selectedListings.has(listing.id) 
                                ? `${listing.beds || 'N/A'} bed${listing.beds !== 1 ? 's' : ''}`
                                : '*** beds'
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate" />
                            <span className="text-slate text-sm">
                              {formatDate(listing.lastseenat)}
                            </span>
                          </div>
                        </div>
                        
                        <Badge variant="outline" className="text-teal border-teal/30">
                          {creditCost} credit{creditCost !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {availableListings.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-teal mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                All Listings Revealed
              </h3>
              <p className="text-slate">
                You've already revealed all available listings in this view.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2 text-sm text-slate">
            <AlertTriangle className="h-4 w-4" />
            <span>Bulk reveal saves you {Math.max(0, selectedListings.size - Math.ceil(selectedListings.size * 0.8))} credits</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isRevealing}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={handleBulkReveal}
              disabled={selectedListings.size === 0 || isRevealing}
              isLoading={isRevealing}
              className="bg-teal text-deep-navy hover:bg-teal/90"
            >
              <Zap className="h-4 w-4 mr-2" />
              Reveal {selectedListings.size} Listings ({totalCost} credits)
            </LoadingButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRevealModal;
