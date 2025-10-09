import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Check, X, Search, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Simple city data for testing
const SIMPLE_CITIES = [
  { name: 'Toronto', province: 'Ontario', nearby: ['Mississauga', 'Brampton', 'Markham', 'Vaughan'] },
  { name: 'Vancouver', province: 'British Columbia', nearby: ['Burnaby', 'Richmond', 'Surrey', 'Coquitlam'] },
  { name: 'Montreal', province: 'Quebec', nearby: ['Laval', 'Longueuil', 'Brossard', 'Repentigny'] },
  { name: 'Calgary', province: 'Alberta', nearby: ['Airdrie', 'Cochrane', 'Okotoks', 'Chestermere'] },
  { name: 'Ottawa', province: 'Ontario', nearby: ['Gatineau', 'Kanata', 'Nepean', 'Orleans'] },
  { name: 'Windsor', province: 'Ontario', nearby: ['LaSalle', 'Tecumseh', 'Amherstburg', 'Kingsville'] },
  { name: 'Hamilton', province: 'Ontario', nearby: ['St. Catharines', 'Niagara Falls', 'Welland', 'Grimsby'] },
  { name: 'London', province: 'Ontario', nearby: ['Sarnia', 'St. Thomas', 'Strathroy', 'Woodstock'] },
  { name: 'Kitchener-Waterloo', province: 'Ontario', nearby: ['Cambridge', 'Guelph', 'Elmira', 'New Hamburg'] },
  { name: 'Edmonton', province: 'Alberta', nearby: ['St. Albert', 'Sherwood Park', 'Spruce Grove', 'Stony Plain'] }
];

const SimpleMultiCitySelector = ({ 
  selectedCities = [], 
  onCitiesChange, 
  className = "",
  variant = "default",
  placeholder = "Select cities...",
  maxSelections = 10
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
  const filteredCities = SIMPLE_CITIES.filter(city => 
    city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.nearby.some(town => town.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group cities by province
  const groupedCities = filteredCities.reduce((acc, city) => {
    if (!acc[city.province]) {
      acc[city.province] = [];
    }
    acc[city.province].push(city);
    return acc;
  }, {});

  const handleCityToggle = (cityName) => {
    const isSelected = selectedCities.includes(cityName);
    let newCities;
    
    if (isSelected) {
      newCities = selectedCities.filter(city => city !== cityName);
    } else {
      if (selectedCities.length >= maxSelections) {
        return; // Don't add if at max
      }
      newCities = [...selectedCities, cityName];
    }
    
    onCitiesChange(newCities);
  };

  const handleGroupToggle = (province) => {
    const groupCities = groupedCities[province].map(city => city.name);
    const selectedGroupCities = groupCities.filter(city => selectedCities.includes(city));
    
    let newCities;
    if (selectedGroupCities.length === groupCities.length) {
      // Deselect all cities in group
      newCities = selectedCities.filter(city => !groupCities.includes(city));
    } else {
      // Select all cities in group
      const citiesToAdd = groupCities.filter(city => !selectedCities.includes(city));
      const remainingSlots = maxSelections - selectedCities.length;
      const citiesToAddLimited = citiesToAdd.slice(0, remainingSlots);
      newCities = [...selectedCities, ...citiesToAddLimited];
    }
    
    onCitiesChange(newCities);
  };

  const toggleGroupExpansion = (province) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(province)) {
      newExpanded.delete(province);
    } else {
      newExpanded.add(province);
    }
    setExpandedGroups(newExpanded);
  };

  const removeCity = (cityName) => {
    const newCities = selectedCities.filter(city => city !== cityName);
    onCitiesChange(newCities);
  };

  const clearAll = () => {
    onCitiesChange([]);
  };

  const getDisplayText = () => {
    if (selectedCities.length === 0) return placeholder;
    if (selectedCities.length === 1) return selectedCities[0];
    if (selectedCities.length <= 3) return selectedCities.join(', ');
    return `${selectedCities.length} cities selected`;
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate/30 hover:border-teal/50 transition-all duration-300 hover:bg-light-navy/30"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-teal" />
          <span className="text-lightest-slate font-medium">
            {getDisplayText()}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-5 w-5 text-slate" />
        </motion.div>
      </motion.button>

      {/* Selected Cities Display */}
      {selectedCities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
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
          {selectedCities.length > 0 && (
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-3 bg-light-navy border border-lightest-navy/20 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-slate" />
                <Input
                  placeholder="Search cities or provinces..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-deep-navy border-slate/30 text-lightest-slate"
                />
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Object.entries(groupedCities).map(([province, cities]) => {
                  const selectedInGroup = cities.filter(city => selectedCities.includes(city.name));
                  const isGroupFullySelected = selectedInGroup.length === cities.length;
                  const isGroupPartiallySelected = selectedInGroup.length > 0 && selectedInGroup.length < cities.length;
                  
                  return (
                    <div key={province} className="border border-slate/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleGroupToggle(province)}
                        className="w-full flex items-center justify-between p-3 hover:bg-lightest-navy/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            isGroupFullySelected ? "bg-teal border-teal" : 
                            isGroupPartiallySelected ? "bg-teal/20 border-teal" : "border-slate/40"
                          )}>
                            {isGroupFullySelected && <Check className="h-3 w-3 text-white" />}
                            {isGroupPartiallySelected && <div className="w-2 h-2 bg-teal rounded-full" />}
                          </div>
                          <span className="font-semibold text-lightest-slate">{province}</span>
                          <span className="text-sm text-slate">
                            ({selectedInGroup.length}/{cities.length})
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedGroups.has(province) ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-slate" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedGroups.has(province) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate/20"
                          >
                            {cities.map((city) => (
                              <motion.button
                                key={city.name}
                                onClick={() => handleCityToggle(city.name)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left",
                                  selectedCities.includes(city.name) && "bg-teal/10"
                                )}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                  selectedCities.includes(city.name) ? "bg-teal border-teal" : "border-slate/40"
                                )}>
                                  {selectedCities.includes(city.name) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-slate" />
                                  <span className="font-medium text-lightest-slate">
                                    {city.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-teal/30 text-teal">
                                    Main
                                  </Badge>
                                </div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate/20 flex justify-between items-center">
                <span className="text-sm text-slate">
                  {selectedCities.length}/{maxSelections} cities selected
                </span>
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

export default SimpleMultiCitySelector;
