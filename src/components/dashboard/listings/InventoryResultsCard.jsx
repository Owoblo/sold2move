import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useTheme } from '@/contexts/ThemeContext';

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
 * Note: Loading state is now handled by AIScanningOverlay in the parent component
 */
const InventoryResultsCard = ({ data, error, onRetry }) => {
  const { formatCubicFeet, getSizeBadgeVariant } = inventoryScanService;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Error state
  if (error) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Scan Failed</span>
        </div>
        <p className="text-sm mb-4" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          {error.message || 'Could not analyze listing photos'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // No data state
  if (!data) {
    return null;
  }

  // Ensure inventory is an array
  const inventoryItems = Array.isArray(data.inventory) ? data.inventory : [];
  const hasInventory = inventoryItems.length > 0;
  const summary = data.summary || {};
  const roomBreakdown = summary.roomBreakdown || {};

  if (!hasInventory) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Inventory Results</span>
        </div>
        <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          No furniture or items detected in the listing photos.
        </p>
      </div>
    );
  }

  // Group items by room
  const itemsByRoom = {};
  inventoryItems.forEach((item) => {
    const room = item.room || 'Other';
    if (!itemsByRoom[room]) {
      itemsByRoom[room] = [];
    }
    itemsByRoom[room].push(item);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" style={{ color: isLight ? '#059669' : '#00FF88' }} />
          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Inventory Results</span>
        </div>
        <div className="flex items-center gap-2">
          {data.cached && (
            <Badge variant="outline" className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8', borderColor: isLight ? '#d1d5db' : 'rgba(148, 163, 184, 0.3)' }}>
              <Clock className="h-3 w-3 mr-1" />
              Cached
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
          <div className="text-2xl font-bold" style={{ color: isLight ? '#059669' : '#00FF88' }}>{summary.totalItems || 0}</div>
          <div className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Items</div>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
          <div className="text-2xl font-bold" style={{ color: isLight ? '#059669' : '#00FF88' }}>
            {summary.totalCubicFeet?.toLocaleString() || 0}
          </div>
          <div className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Cubic Feet</div>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)' }}>
          <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
            <Image className="h-5 w-5" />
            {data.photosAnalyzed || 0}
          </div>
          <div className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Photos</div>
        </div>
      </div>

      {/* Room Breakdown Accordion */}
      <Accordion type="multiple" className="w-full" defaultValue={Object.keys(roomBreakdown)}>
        {Object.entries(roomBreakdown).map(([room, roomData]) => {
          const RoomIcon = getRoomIconComponent(room);
          const roomItems = itemsByRoom[room] || [];

          return (
            <AccordionItem key={room} value={room} style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
              <AccordionTrigger className="hover:no-underline" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded" style={{ backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
                    <RoomIcon className="h-4 w-4" style={{ color: isLight ? '#059669' : '#00FF88' }} />
                  </div>
                  <span className="font-medium">{room}</span>
                  <Badge variant="secondary" className="text-xs">
                    {roomData.items} items
                  </Badge>
                  <span className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                    {formatCubicFeet(roomData.cubicFeet)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-10">
                  {roomItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Box className="h-3.5 w-3.5" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                        <span className="text-sm" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
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
                      <span className="text-sm font-mono" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
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
        <p className="text-xs text-center mt-2" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
          Processed in {(data.processingTimeMs / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  );
};

export default InventoryResultsCard;
