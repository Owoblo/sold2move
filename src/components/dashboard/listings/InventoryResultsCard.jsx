import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Package,
  AlertTriangle,
  Clock,
  Sofa,
  Bed,
  UtensilsCrossed,
  Bath,
  Monitor,
  Car,
  TreePine,
  Image,
  Box
} from 'lucide-react';
import { inventoryScanService } from '@/services/inventoryScan';

/**
 * Get icon component for a room type
 */
const getRoomIconComponent = (room) => {
  const iconMap = {
    'Living Room': Sofa,
    'Bedroom': Bed,
    'Master Bedroom': Bed,
    'Kitchen': UtensilsCrossed,
    'Dining Room': UtensilsCrossed,
    'Bathroom': Bath,
    'Office': Monitor,
    'Garage': Car,
    'Outdoor': TreePine,
    'Patio': TreePine,
    'Backyard': TreePine
  };
  return iconMap[room] || Package;
};

/**
 * Display inventory scan results in a card format
 */
const InventoryResultsCard = ({ data, loading, error, progress = 0, onRetry }) => {
  const { formatCubicFeet, getSizeBadgeVariant } = inventoryScanService;

  // Loading state with progress bar
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal animate-bounce" />
            Analyzing Photos...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-4 h-2" />
          <p className="text-sm text-slate mb-4">
            This typically takes 1-2 minutes. We're analyzing each photo to detect furniture and estimate volumes.
          </p>
          <div className="space-y-3">
            <div className="h-4 bg-lightest-navy/20 rounded w-3/4"></div>
            <div className="h-4 bg-lightest-navy/20 rounded w-1/2"></div>
            <div className="h-4 bg-lightest-navy/20 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Scan Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate text-sm mb-4">
            {error.message || 'Could not analyze listing photos'}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return null;
  }

  // Check if we have any inventory
  const hasInventory = data.inventory && data.inventory.length > 0;
  const summary = data.summary || {};
  const roomBreakdown = summary.roomBreakdown || {};

  if (!hasInventory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal" />
            Inventory Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate text-sm">
            No furniture or items detected in the listing photos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group items by room
  const itemsByRoom = {};
  data.inventory.forEach((item) => {
    const room = item.room || 'Other';
    if (!itemsByRoom[room]) {
      itemsByRoom[room] = [];
    }
    itemsByRoom[room].push(item);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal" />
            Inventory Results
          </div>
          <div className="flex items-center gap-2">
            {data.cached && (
              <Badge variant="outline" className="text-xs text-slate border-slate/30">
                <Clock className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-lightest-navy/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-teal">{summary.totalItems || 0}</div>
            <div className="text-xs text-slate">Items</div>
          </div>
          <div className="p-3 bg-lightest-navy/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">
              {summary.totalCubicFeet?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-slate">Cubic Feet</div>
          </div>
          <div className="p-3 bg-lightest-navy/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-lightest-slate flex items-center justify-center gap-1">
              <Image className="h-5 w-5" />
              {data.photosAnalyzed || 0}
            </div>
            <div className="text-xs text-slate">Photos</div>
          </div>
        </div>

        {/* Room Breakdown Accordion */}
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(roomBreakdown)}>
          {Object.entries(roomBreakdown).map(([room, roomData]) => {
            const RoomIcon = getRoomIconComponent(room);
            const roomItems = itemsByRoom[room] || [];

            return (
              <AccordionItem key={room} value={room}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-teal/10 rounded">
                      <RoomIcon className="h-4 w-4 text-teal" />
                    </div>
                    <span className="font-medium">{room}</span>
                    <Badge variant="secondary" className="text-xs">
                      {roomData.items} items
                    </Badge>
                    <span className="text-sm text-slate">
                      {formatCubicFeet(roomData.cubicFeet)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-10">
                    {roomItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-lightest-navy/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Box className="h-3.5 w-3.5 text-slate" />
                          <span className="text-sm text-lightest-slate">
                            {item.label}
                          </span>
                          {item.qty > 1 && (
                            <Badge variant="outline" className="text-xs">
                              x{item.qty}
                            </Badge>
                          )}
                          {item.size && (
                            <Badge
                              variant={getSizeBadgeVariant(item.size)}
                              className="text-xs capitalize"
                            >
                              {item.size}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-slate font-mono">
                          {item.cubicFeet} cu ft
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Processing info */}
        {data.processingTimeMs && (
          <p className="text-xs text-slate text-center mt-2">
            Processed in {(data.processingTimeMs / 1000).toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryResultsCard;
