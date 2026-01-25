import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, MapPin, Check, X, Search, Globe, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAvailableCities, getStateName } from '@/hooks/useAvailableCities';

const DatabaseCitySelector = ({
  selectedCities = [],
  onCitiesChange,
  className = "",
  placeholder = "Select cities from your listings...",
  maxSelections = 20,
  showSearch = true,
  showGrouped = true,
  countryCode = null // 'US', 'CA', or null for all
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const dropdownRef = useRef(null);

  // Fetch cities dynamically from database
  const { data: citiesData, isLoading: loading, error: fetchError } = useAvailableCities(countryCode);

  // Close dropdown when clicking outside - use capture phase to catch clicks before they're stopped
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    // Use capture phase to ensure we get the event even if stopPropagation is called
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Transform cities data to expected format - memoized
  const cities = useMemo(() => citiesData || [], [citiesData]);

  // Filter cities based on search term - memoized
  const filteredCities = useMemo(() => {
    if (!searchTerm) return cities;
    const lowerSearch = searchTerm.toLowerCase();
    return cities.filter(city =>
      city.city.toLowerCase().includes(lowerSearch) ||
      city.state.toLowerCase().includes(lowerSearch)
    );
  }, [cities, searchTerm]);

  // Group cities by state - memoized
  const groupedCities = useMemo(() => {
    return cities.reduce((acc, city) => {
      const stateKey = `${getStateName(city.state)} (${city.state})`;
      if (!acc[stateKey]) {
        acc[stateKey] = [];
      }
      acc[stateKey].push(city);
      return acc;
    }, {});
  }, [cities]);

  // Handle city selection/deselection - memoized
  const handleCityToggle = useCallback((e, cityName, stateCode) => {
    // Prevent event bubbling to parent elements
    e.stopPropagation();
    e.preventDefault();

    const cityKey = `${cityName}, ${stateCode}`;
    const isSelected = selectedCities.includes(cityKey);

    let newCities;
    if (isSelected) {
      newCities = selectedCities.filter(city => city !== cityKey);
    } else {
      if (selectedCities.length >= maxSelections) {
        return; // Don't add if at max
      }
      newCities = [...selectedCities, cityKey];
    }

    onCitiesChange(newCities);

    // Auto-close dropdown after selection if maxSelections is 1 (single-select mode)
    // Or close after a brief delay to allow seeing the selection
    if (maxSelections === 1) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [selectedCities, maxSelections, onCitiesChange]);

  // Remove a city from selection - memoized
  const removeCity = useCallback((e, cityKey) => {
    e.stopPropagation();
    e.preventDefault();
    const newCities = selectedCities.filter(city => city !== cityKey);
    onCitiesChange(newCities);
  }, [selectedCities, onCitiesChange]);

  // Clear all selections - memoized
  const clearAll = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onCitiesChange([]);
  }, [onCitiesChange]);

  // Toggle group expansion - memoized
  const handleGroupToggle = useCallback((e, groupKey) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupKey)) {
        newExpanded.delete(groupKey);
      } else {
        newExpanded.add(groupKey);
      }
      return newExpanded;
    });
  }, []);

  // Check if city is selected - memoized
  const isCitySelected = useCallback((cityName, stateCode) => {
    return selectedCities.includes(`${cityName}, ${stateCode}`);
  }, [selectedCities]);

  // Close dropdown and clear search
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate/30 hover:border-teal/50 transition-all duration-200 hover:bg-light-navy/30 active:scale-[0.99]"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
          <span className="text-lightest-slate truncate">
            {selectedCities.length > 0
              ? `${selectedCities.length} cit${selectedCities.length === 1 ? 'y' : 'ies'} selected`
              : placeholder
            }
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-slate transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Error State */}
      {fetchError && isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-deep-navy border border-red-500/30 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load cities. Please try again.</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && isOpen && !fetchError && (
        <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-deep-navy border border-slate/30 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-center gap-2 text-slate">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal"></div>
            <span>Loading cities from database...</span>
          </div>
        </div>
      )}

      {/* Selected Cities Display */}
      {selectedCities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedCities.map((city) => (
            <Badge
              key={city}
              variant="secondary"
              className="bg-teal/20 text-teal border-teal/30 hover:bg-teal/30 transition-colors"
            >
              <MapPin className="h-3 w-3 mr-1" />
              {city}
              <button
                onClick={(e) => removeCity(e, city)}
                className="ml-2 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedCities.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-slate hover:text-red-400"
            >
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Dropdown - using CSS transitions instead of framer-motion for performance */}
      {isOpen && !loading && !fetchError && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-light-navy border border-lightest-navy/20 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Bar */}
          {showSearch && (
            <div className="p-3 border-b border-lightest-navy/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
                <Input
                  placeholder="Search cities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-deep-navy border-slate/30 text-lightest-slate placeholder-slate focus:border-teal"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Cities List */}
          <div className="max-h-64 overflow-y-auto">
            {cities.length === 0 ? (
              <div className="p-4 text-center text-slate">
                No cities available in the database
              </div>
            ) : searchTerm ? (
              // Search Results
              <div className="p-2">
                {filteredCities.length > 0 ? (
                  filteredCities.slice(0, 50).map((city) => {
                    const cityKey = `${city.city}, ${city.state}`;
                    const isSelected = isCitySelected(city.city, city.state);

                    return (
                      <button
                        key={cityKey}
                        onClick={(e) => handleCityToggle(e, city.city, city.state)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left rounded-lg active:scale-[0.99]",
                          isSelected && "bg-teal/10"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                          <div>
                            <div className="text-lightest-slate font-medium">{city.city}</div>
                            <div className="text-slate text-sm">{getStateName(city.state)} ({city.state})</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate">{city.count} listings</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-teal" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate">
                    No cities found matching "{searchTerm}"
                  </div>
                )}
                {filteredCities.length > 50 && (
                  <div className="p-2 text-center text-slate text-sm">
                    Showing first 50 results. Type more to narrow down.
                  </div>
                )}
              </div>
            ) : showGrouped ? (
              // Grouped by State
              <div className="p-2">
                {Object.entries(groupedCities).sort(([a], [b]) => a.localeCompare(b)).map(([stateKey, stateCities]) => {
                  const isExpanded = expandedGroups.has(stateKey);

                  return (
                    <div key={stateKey} className="border border-slate/20 rounded-lg overflow-hidden mb-2">
                      <button
                        onClick={(e) => handleGroupToggle(e, stateKey)}
                        className="w-full flex items-center justify-between p-3 hover:bg-lightest-navy/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-teal" />
                          <span className="text-lightest-slate font-medium">{stateKey}</span>
                          <Badge variant="secondary" className="bg-slate/20 text-slate">
                            {stateCities.length}
                          </Badge>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-slate transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} />
                      </button>

                      {/* Expanded cities - simple show/hide */}
                      {isExpanded && (
                        <div className="animate-in slide-in-from-top-1 duration-150">
                          {stateCities.map((city) => {
                            const cityKey = `${city.city}, ${city.state}`;
                            const isSelected = isCitySelected(city.city, city.state);

                            return (
                              <button
                                key={cityKey}
                                onClick={(e) => handleCityToggle(e, city.city, city.state)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left border-t border-slate/10 active:scale-[0.99]",
                                  isSelected && "bg-teal/10"
                                )}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                                  <span className="text-lightest-slate">{city.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate">{city.count} listings</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-teal" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Flat List - limit to prevent performance issues
              <div className="p-2">
                {cities.slice(0, 100).map((city) => {
                  const cityKey = `${city.city}, ${city.state}`;
                  const isSelected = isCitySelected(city.city, city.state);

                  return (
                    <button
                      key={cityKey}
                      onClick={(e) => handleCityToggle(e, city.city, city.state)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left rounded-lg active:scale-[0.99]",
                        isSelected && "bg-teal/10"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                        <div>
                          <div className="text-lightest-slate font-medium">{city.city}</div>
                          <div className="text-slate text-sm">{getStateName(city.state)} ({city.state})</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate">{city.count} listings</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-teal" />
                        )}
                      </div>
                    </button>
                  );
                })}
                {cities.length > 100 && (
                  <div className="p-2 text-center text-slate text-sm">
                    Use search to find more cities
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Sticky with prominent Done button */}
          <div className="p-3 border-t border-lightest-navy/20 bg-deep-navy/80 sticky bottom-0">
            <div className="flex items-center justify-between text-sm text-slate">
              <span>{selectedCities.length} of {maxSelections} selected</span>
              <Button
                size="sm"
                onClick={handleClose}
                className="bg-teal text-deep-navy hover:bg-teal/90 font-semibold px-6"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseCitySelector;
