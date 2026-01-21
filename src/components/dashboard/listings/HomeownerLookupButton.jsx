import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { User, Loader2, UserSearch } from 'lucide-react';
import { useHomeownerLookup } from '@/hooks/useHomeownerLookup';
import HomeownerInfoCard from './HomeownerInfoCard';
import toast from '@/lib/toast';

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
  const { lookupFromListing, loading, data, error, reset, hasData } = useHomeownerLookup();

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
          className={`h-8 w-8 p-0 border-teal/50 text-teal hover:bg-teal/10 ${className}`}
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
        className={`border-teal text-teal hover:bg-teal/10 ${className}`}
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
              onRetry={handleRetry}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeownerLookupButton;
