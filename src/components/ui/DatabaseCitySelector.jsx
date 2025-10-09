import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Check, X, Search, Globe, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DATABASE_CITIES, getCitiesByState, searchCities } from '@/data/databaseCities';

const DatabaseCitySelector = ({ 
  selectedCities = [], 
  onCitiesChange, 
  className = "",
  placeholder = "Select cities from your listings...",
  maxSelections = 20,
  showSearch = true,
  showGrouped = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter cities based on search term
  const filteredCities = searchTerm ? searchCities(searchTerm) : DATABASE_CITIES;
  const groupedCities = getCitiesByState();

  // Handle city selection/deselection
  const handleCityToggle = (cityName, stateCode) => {
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
  };

  // Remove a city from selection
  const removeCity = (cityKey) => {
    const newCities = selectedCities.filter(city => city !== cityKey);
    onCitiesChange(newCities);
  };

  // Clear all selections
  const clearAll = () => {
    onCitiesChange([]);
  };

  // Toggle group expansion
  const handleGroupToggle = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Check if city is selected
  const isCitySelected = (cityName, stateCode) => {
    return selectedCities.includes(`${cityName}, ${stateCode}`);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate/30 hover:border-teal/50 transition-all duration-300 hover:bg-light-navy/30"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
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
      </motion.button>

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
                onClick={() => removeCity(city)}
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

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-light-navy border border-lightest-navy/20 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden"
          >
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
                  />
                </div>
              </div>
            )}

            {/* Cities List */}
            <div className="max-h-64 overflow-y-auto">
              {searchTerm ? (
                // Search Results
                <div className="p-2">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => {
                      const cityKey = `${city.name}, ${city.state}`;
                      const isSelected = isCitySelected(city.name, city.state);
                      
                      return (
                        <motion.button
                          key={cityKey}
                          onClick={() => handleCityToggle(city.name, city.state)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left rounded-lg",
                            isSelected && "bg-teal/10"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                            <div>
                              <div className="text-lightest-slate font-medium">{city.name}</div>
                              <div className="text-slate text-sm">{city.state}, {city.country}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-teal" />
                          )}
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate">
                      No cities found matching "{searchTerm}"
                    </div>
                  )}
                </div>
              ) : showGrouped ? (
                // Grouped by State
                <div className="p-2">
                  {Object.entries(groupedCities).map(([stateKey, cities]) => {
                    const isExpanded = expandedGroups.has(stateKey);
                    
                    return (
                      <div key={stateKey} className="border border-slate/20 rounded-lg overflow-hidden mb-2">
                        <button
                          onClick={() => handleGroupToggle(stateKey)}
                          className="w-full flex items-center justify-between p-3 hover:bg-lightest-navy/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-teal" />
                            <span className="text-lightest-slate font-medium">{stateKey}</span>
                            <Badge variant="secondary" className="bg-slate/20 text-slate">
                              {cities.length}
                            </Badge>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-slate transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              {cities.map((city) => {
                                const cityKey = `${city.name}, ${city.state}`;
                                const isSelected = isCitySelected(city.name, city.state);
                                
                                return (
                                  <motion.button
                                    key={cityKey}
                                    onClick={() => handleCityToggle(city.name, city.state)}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left border-t border-slate/10",
                                      isSelected && "bg-teal/10"
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                                      <span className="text-lightest-slate">{city.name}</span>
                                    </div>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-teal" />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Flat List
                <div className="p-2">
                  {DATABASE_CITIES.map((city) => {
                    const cityKey = `${city.name}, ${city.state}`;
                    const isSelected = isCitySelected(city.name, city.state);
                    
                    return (
                      <motion.button
                        key={cityKey}
                        onClick={() => handleCityToggle(city.name, city.state)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left rounded-lg",
                          isSelected && "bg-teal/10"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="h-4 w-4 text-teal flex-shrink-0" />
                          <div>
                            <div className="text-lightest-slate font-medium">{city.name}</div>
                            <div className="text-slate text-sm">{city.state}, {city.country}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-teal" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-lightest-navy/20 bg-deep-navy/30">
              <div className="flex items-center justify-between text-sm text-slate">
                <span>{selectedCities.length} of {maxSelections} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="border-teal text-teal hover:bg-teal/10"
                >
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatabaseCitySelector;
