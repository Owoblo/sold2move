import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { User, Loader2, UserSearch, MapPinOff } from 'lucide-react';
import { useHomeownerLookup } from '@/hooks/useHomeownerLookup';
import HomeownerInfoCard from './HomeownerInfoCard';
import toast from '@/lib/toast';

// Canadian provinces - homeowner lookup is not available for these
const CA_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

/**
 * Check if a listing is from Canada based on its state/province code
 */
const isCanadianListing = (listing) => {
  const state = listing?.addressState || listing?.addressstate || listing?.address_state || '';
  return CA_PROVINCES.includes(state.toUpperCase());
};

/**
 * Button component for triggering homeowner lookups
 * Can be used in compact mode (icon only) or full mode (with text)
 *
 * @param {Object} props
 * @param {Object} props.listing - The listing to look up homeowner info for
 * @param {boolean} [props.compact=false] - If true, shows only an icon
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.variant='outline'] - Button variant
 */
const HomeownerLookupButton = ({
  listing,
  compact = false,
  className = '',
  variant = 'outline'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { lookupFromListing, loading, data, error, noDataFound, reset, hasData } = useHomeownerLookup();

  // Check if this is a Canadian listing
  const isCanadian = isCanadianListing(listing);

  // For Canadian listings, show a disabled button with explanation
  if (isCanadian) {
    if (compact) {
      return (
        <Button
          variant={variant}
          size="sm"
          disabled
          className={`h-8 w-8 p-0 opacity-50 cursor-not-allowed ${className}`}
          title="Homeowner info not available for Canadian listings"
        >
          <MapPinOff className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <Button
        variant={variant}
        disabled
        className={`opacity-50 cursor-not-allowed ${className}`}
        title="Homeowner info not available for Canadian listings"
      >
        <MapPinOff className="h-4 w-4 mr-2" />
        Not Available in Canada
      </Button>
    );
  }

  const handleLookup = async (e) => {
    // Prevent row click in table
    e?.stopPropagation?.();

    if (!listing) {
      toast.error('Error', 'No listing data available');
      return;
    }

    // Open dialog
    setDialogOpen(true);

    // If we already have data, don't re-fetch
    if (hasData) {
      return;
    }

    // Perform lookup
    await lookupFromListing(listing);
  };

  const handleRetry = async () => {
    reset();
    await lookupFromListing(listing);
  };

  const handleClose = () => {
    setDialogOpen(false);
    // Don't reset data so it persists if user re-opens
  };

  // Build address string for display
  const addressStr = listing
    ? `${listing.addressStreet || listing.addressstreet || ''}, ${listing.addresscity || listing.addressCity || ''}, ${listing.addressstate || listing.addressState || ''}`
    : 'Unknown Address';

  // Compact mode - icon only button
  if (compact) {
    return (
      <>
        <Button
          variant={variant}
          size="sm"
          onClick={handleLookup}
          disabled={loading}
          className={`h-8 w-8 p-0 border-primary/50 text-primary hover:bg-primary/10 hover:shadow-glow-sm transition-all ${className}`}
          title="Get Homeowner Info"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserSearch className="h-4 w-4" />
          )}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Homeowner Lookup
              </DialogTitle>
              <DialogDescription className="text-slate">
                {addressStr}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <HomeownerInfoCard
                data={data}
                loading={loading}
                error={error}
                noDataFound={noDataFound}
                onRetry={handleRetry}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full mode - button with text
  return (
    <>
      <Button
        variant={variant}
        onClick={handleLookup}
        disabled={loading}
        className={`border-primary text-primary hover:bg-primary/10 hover:shadow-glow-sm transition-all ${className}`}
      >
        {loading ? (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal" />
              Homeowner Lookup
            </DialogTitle>
            <DialogDescription className="text-slate">
              {addressStr}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <HomeownerInfoCard
              data={data}
              loading={loading}
              error={error}
              noDataFound={noDataFound}
              onRetry={handleRetry}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeownerLookupButton;
