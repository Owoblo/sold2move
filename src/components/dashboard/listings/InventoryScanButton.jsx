import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Package, Loader2 } from 'lucide-react';
import { useInventoryScan } from '@/hooks/useInventoryScan';
import { inventoryScanService } from '@/services/inventoryScan';
import InventoryResultsCard from './InventoryResultsCard';
import toast from '@/lib/toast';

/**
 * Button component for triggering inventory scans
 * Can be used in compact mode (icon only) or full mode (with text)
 *
 * @param {Object} props
 * @param {Object} props.listing - The listing to scan
 * @param {boolean} [props.compact=false] - If true, shows only an icon
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.variant='outline'] - Button variant
 */
const InventoryScanButton = ({
  listing,
  compact = false,
  className = '',
  variant = 'outline'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { scanFromListing, loading, data, error, reset, hasData, progress } = useInventoryScan();

  // Don't render if button shouldn't be shown (no photos or not in LA area)
  if (!inventoryScanService.canShowScanButton(listing)) {
    return null;
  }

  const handleScan = async (e) => {
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

    // Perform scan
    await scanFromListing(listing);
  };

  const handleRetry = async () => {
    reset();
    await scanFromListing(listing);
  };

  // Build address string for display
  const addressStr = listing
    ? `${listing.addressStreet || listing.addressstreet || ''}, ${listing.addresscity || listing.addressCity || listing.lastcity || ''}`
    : 'Unknown Address';

  // Compact mode - icon only button
  if (compact) {
    return (
      <>
        <Button
          variant={variant}
          size="sm"
          onClick={handleScan}
          disabled={loading}
          className={`h-8 w-8 p-0 border-teal/50 text-teal hover:bg-teal/10 hover:shadow-glow-sm transition-all ${className}`}
          title="Scan Inventory"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-teal" />
                Inventory Scan
              </DialogTitle>
              <DialogDescription className="text-slate">
                {addressStr}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <InventoryResultsCard
                data={data}
                loading={loading}
                error={error}
                progress={progress}
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
        onClick={handleScan}
        disabled={loading}
        className={`border-teal text-teal hover:bg-teal/10 hover:shadow-glow-sm transition-all ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Package className="h-4 w-4 mr-2" />
            Scan Inventory
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-teal" />
              Inventory Scan
            </DialogTitle>
            <DialogDescription className="text-slate">
              {addressStr}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <InventoryResultsCard
              data={data}
              loading={loading}
              error={error}
              progress={progress}
              onRetry={handleRetry}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryScanButton;
