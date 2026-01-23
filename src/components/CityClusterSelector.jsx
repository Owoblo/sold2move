import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Search,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  Building,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CANADA_CITY_CLUSTERS } from '@/data/canadaCityClusters';
import { cn } from '@/lib/utils';

// Helper to format population
const formatPopulation = (population) => {
  if (!population) return '0';
  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  }
  if (population >= 1000) {
    return `${(population / 1000).toFixed(0)}K`;
  }
  return population.toLocaleString();
};

/**
 * CityClusterSelector - Cluster-based city selection with nearby towns
 *
 * @param {Array} selectedCities - Currently selected cities (array of city names)
 * @param {Function} onChange - Callback when selection changes
 * @param {string} countryCode - Filter by country (CA, US)
 * @param {boolean} showPricePreview - Show calculated price based on selection
 * @param {number} maxSelections - Maximum number of cities that can be selected (0 = unlimited)
 */
const CityClusterSelector = ({
  selectedCities = [],
  onChange,
  countryCode = 'CA',
  showPricePreview = true,
  maxSelections = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCities, setExpandedCities] = useState(new Set());

  // Get cities based on country code
  const availableCities = useMemo(() => {
    if (countryCode === 'CA') {
      return Object.entries(CANADA_CITY_CLUSTERS).map(([name, data]) => ({
        name,
        ...data,
      }));
    }
    // For US cities, we'd need a similar data structure
    // For now, return empty array for US
    return [];
  }, [countryCode]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return availableCities;

    const query = searchQuery.toLowerCase();
    return availableCities.filter(city => {
      // Match main city name
      if (city.name.toLowerCase().includes(query)) return true;

      // Match nearby towns
      if (city.nearbyTowns?.some(town =>
        town.name.toLowerCase().includes(query) ||
        (town.nameFr && town.nameFr.toLowerCase().includes(query))
      )) return true;

      // Match province
      if (city.province?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [availableCities, searchQuery]);

  // Calculate total population for display
  const totalPopulation = useMemo(() => {
    let total = 0;
    selectedCities.forEach(cityName => {
      const city = CANADA_CITY_CLUSTERS[cityName];
      if (city?.population) {
        total += city.population;
      }
    });
    return total;
  }, [selectedCities]);

  // Toggle city expansion
  const toggleExpand = useCallback((cityName) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(cityName)) {
        next.delete(cityName);
      } else {
        next.add(cityName);
      }
      return next;
    });
  }, []);

  // Toggle city selection
  const toggleCity = useCallback((cityName) => {
    const newSelection = selectedCities.includes(cityName)
      ? selectedCities.filter(c => c !== cityName)
      : maxSelections > 0 && selectedCities.length >= maxSelections
        ? selectedCities // Don't add if at max
        : [...selectedCities, cityName];

    onChange(newSelection);
  }, [selectedCities, onChange, maxSelections]);

  // Clear all selections
  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Check if can add more cities
  const canAddMore = maxSelections === 0 || selectedCities.length < maxSelections;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cities..."
          className="pl-10 bg-deep-navy/50 border-lightest-navy/30"
        />
      </div>

      {/* Selected Cities Summary */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate">Selected:</span>
          {selectedCities.map(cityName => (
            <Badge
              key={cityName}
              variant="secondary"
              className="bg-teal/20 text-teal flex items-center gap-1"
            >
              {cityName}
              <X
                className="h-3 w-3 cursor-pointer hover:text-white"
                onClick={() => toggleCity(cityName)}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-slate hover:text-white text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Selection Summary */}
      {showPricePreview && selectedCities.length > 0 && (
        <Card className="bg-gradient-to-r from-teal/10 to-deep-navy border-teal/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-teal" />
                <div>
                  <p className="text-sm text-slate">Selected Service Areas</p>
                  <p className="text-lg font-semibold text-lightest-slate">
                    {selectedCities.length} {selectedCities.length === 1 ? 'city' : 'cities'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate">Combined Population</p>
                <p className="text-lg font-semibold text-lightest-slate">
                  <Users className="h-4 w-4 inline mr-1" />
                  {formatPopulation(totalPopulation)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cities List */}
      <ScrollArea className="h-[400px] rounded-lg border border-lightest-navy/20">
        <div className="p-2 space-y-1">
          {filteredCities.length === 0 ? (
            <p className="text-slate text-center py-8">
              No cities found matching "{searchQuery}"
            </p>
          ) : (
            filteredCities.map(city => {
              const isSelected = selectedCities.includes(city.name);
              const isExpanded = expandedCities.has(city.name);
              const hasNearbyTowns = city.nearbyTowns && city.nearbyTowns.length > 0;

              return (
                <div key={city.name} className="space-y-1">
                  {/* Main City Row */}
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-teal/20 border border-teal/50'
                        : 'bg-deep-navy/30 hover:bg-deep-navy/50'
                    )}
                  >
                    {/* Expand/Collapse */}
                    {hasNearbyTowns && (
                      <button
                        onClick={() => toggleExpand(city.name)}
                        className="text-slate hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {!hasNearbyTowns && <div className="w-4" />}

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCity(city.name)}
                      disabled={!isSelected && !canAddMore}
                      className="data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                    />

                    {/* City Info */}
                    <div className="flex-1" onClick={() => toggleCity(city.name)}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-teal" />
                        <span className="font-medium text-lightest-slate">{city.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {city.provinceCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {formatPopulation(city.population)}
                        </span>
                        {hasNearbyTowns && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {city.nearbyTowns.length} nearby towns
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nearby Towns (Expandable) */}
                  <AnimatePresence>
                    {isExpanded && hasNearbyTowns && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-8 pl-4 border-l-2 border-lightest-navy/20"
                      >
                        <p className="text-xs text-slate py-2">
                          Nearby towns within {city.serviceRadius}km radius (included in {city.name} service area):
                        </p>
                        <div className="grid grid-cols-2 gap-1 pb-2">
                          {city.nearbyTowns
                            .filter(town => town.distance <= city.serviceRadius)
                            .sort((a, b) => a.distance - b.distance)
                            .map(town => (
                              <div
                                key={town.name}
                                className="flex items-center gap-2 text-sm text-slate py-1"
                              >
                                <MapPin className="h-3 w-3 text-slate/50" />
                                <span>{town.name}</span>
                                <span className="text-xs text-slate/50">({town.distance}km)</span>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Max Selections Warning */}
      {maxSelections > 0 && !canAddMore && (
        <p className="text-sm text-amber-400 flex items-center gap-2">
          <Building className="h-4 w-4" />
          Maximum of {maxSelections} cities reached. Remove a city to add another.
        </p>
      )}
    </div>
  );
};

export default CityClusterSelector;
