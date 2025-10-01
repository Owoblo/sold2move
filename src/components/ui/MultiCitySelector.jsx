import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Check, Plus, X, Search, Globe, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CANADA_CITY_CLUSTERS, getServiceAreaTowns, searchCities } from '@/data/canadaCityClusters';

const MultiCitySelector = ({ 
  selectedCities = [], 
  onCitiesChange, 
  className = "",
  variant = "default", // "default", "compact", "settings"
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

  // Get all cities from Canadian clusters
  const getAllCities = () => {
    const cities = [];
    Object.entries(CANADA_CITY_CLUSTERS).forEach(([cityName, data]) => {
      cities.push({ 
        name: cityName, 
        group: `${data.province} Region`, 
        isMain: true,
        province: data.province,
        provinceCode: data.provinceCode,
        population: data.population,
        serviceRadius: data.serviceRadius
      });
      data.nearbyTowns.forEach(town => {
        cities.push({ 
          name: town.name, 
          nameFr: town.nameFr,
          group: `${data.province} Region`, 
          isMain: false,
          province: data.province,
          provinceCode: data.provinceCode,
          distance: town.distance,
          parentCity: cityName
        });
      });
    });
    return cities;
  };

  // Filter cities based on search term
  const filteredCities = searchTerm 
    ? searchCities(searchTerm).flatMap(({ cityName, data }) => {
        const cities = [{ 
          name: cityName, 
          group: `${data.province} Region`, 
          isMain: true,
          province: data.province,
          provinceCode: data.provinceCode,
          population: data.population,
          serviceRadius: data.serviceRadius
        }];
        data.nearbyTowns.forEach(town => {
          cities.push({ 
            name: town.name, 
            nameFr: town.nameFr,
            group: `${data.province} Region`, 
            isMain: false,
            province: data.province,
            provinceCode: data.provinceCode,
            distance: town.distance,
            parentCity: cityName
          });
        });
        return cities;
      })
    : getAllCities();

  // Group filtered cities by province
  const groupedCities = filteredCities.reduce((acc, city) => {
    if (!acc[city.group]) {
      acc[city.group] = { main: null, nearby: [], province: city.province, provinceCode: city.provinceCode };
    }
    if (city.isMain) {
      acc[city.group].main = city;
    } else {
      acc[city.group].nearby.push(city);
    }
    return acc;
  }, {});

  const handleCityToggle = (cityName, groupName) => {
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

  const handleGroupToggle = (groupName) => {
    const group = groupedCities[groupName];
    if (!group) return;
    
    const groupCities = [group.main?.name, ...group.nearby.map(city => city.name)].filter(Boolean);
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

  const toggleGroupExpansion = (groupName) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
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

  if (variant === "compact") {
    return (
      <div className={cn("relative", className)} ref={dropdownRef}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-light-navy/30 border border-transparent hover:border-green/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Globe className="h-4 w-4 text-green" />
          <span className="text-green font-semibold group-hover:text-green/80 transition-colors">
            {getDisplayText()}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-4 w-4 text-green" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-3 w-80 bg-light-navy border border-lightest-navy/20 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-slate" />
                  <Input
                    placeholder="Search cities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-deep-navy border-slate/30 text-lightest-slate"
                  />
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(groupedCities).map(([groupName, group]) => (
                    <div key={groupName} className="border-b border-slate/20 pb-2 last:border-b-0">
                      <button
                        onClick={() => toggleGroupExpansion(groupName)}
                        className="w-full flex items-center justify-between p-2 hover:bg-lightest-navy/20 rounded-md transition-colors"
                      >
                        <span className="font-medium text-lightest-slate">{groupName}</span>
                        <motion.div
                          animate={{ rotate: expandedGroups.has(groupName) ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-slate" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedGroups.has(groupName) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-4 space-y-1"
                          >
                            {group.main && (
                              <CityItem
                                city={group.main}
                                isSelected={selectedCities.includes(group.main.name)}
                                onToggle={() => handleCityToggle(group.main.name, groupName)}
                                isMain={true}
                              />
                            )}
                            {group.nearby.map((city) => (
                              <CityItem
                                key={city.name}
                                city={city}
                                isSelected={selectedCities.includes(city.name)}
                                onToggle={() => handleCityToggle(city.name, groupName)}
                                isMain={false}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate/30 hover:border-green/50 transition-all duration-300 hover:bg-light-navy/30"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-green" />
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
              className="bg-green/20 text-green border-green/30 hover:bg-green/30 transition-colors"
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
                  placeholder="Search cities or regions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-deep-navy border-slate/30 text-lightest-slate"
                />
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Object.entries(groupedCities).map(([groupName, group]) => {
                  const groupCities = [group.main, ...group.nearby].filter(Boolean);
                  const selectedInGroup = groupCities.filter(city => selectedCities.includes(city.name));
                  const isGroupFullySelected = selectedInGroup.length === groupCities.length;
                  const isGroupPartiallySelected = selectedInGroup.length > 0 && selectedInGroup.length < groupCities.length;
                  
                  return (
                    <div key={groupName} className="border border-slate/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleGroupToggle(groupName)}
                        className="w-full flex items-center justify-between p-3 hover:bg-lightest-navy/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            isGroupFullySelected ? "bg-green border-green" : 
                            isGroupPartiallySelected ? "bg-green/20 border-green" : "border-slate/40"
                          )}>
                            {isGroupFullySelected && <Check className="h-3 w-3 text-white" />}
                            {isGroupPartiallySelected && <div className="w-2 h-2 bg-green rounded-full" />}
                          </div>
                          <span className="font-semibold text-lightest-slate">{groupName}</span>
                          <span className="text-sm text-slate">
                            ({selectedInGroup.length}/{groupCities.length})
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedGroups.has(groupName) ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-slate" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedGroups.has(groupName) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate/20"
                          >
                            {group.main && (
                              <CityItem
                                city={group.main}
                                isSelected={selectedCities.includes(group.main.name)}
                                onToggle={() => handleCityToggle(group.main.name, groupName)}
                                isMain={true}
                              />
                            )}
                            {group.nearby.map((city) => (
                              <CityItem
                                key={city.name}
                                city={city}
                                isSelected={selectedCities.includes(city.name)}
                                onToggle={() => handleCityToggle(city.name, groupName)}
                                isMain={false}
                              />
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
                  className="border-green text-green hover:bg-green/10"
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

// Individual city item component
const CityItem = ({ city, isSelected, onToggle, isMain }) => (
  <motion.button
    onClick={onToggle}
    className={cn(
      "w-full flex items-center gap-3 p-3 hover:bg-lightest-navy/20 transition-colors text-left",
      isSelected && "bg-green/10"
    )}
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className={cn(
      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
      isSelected ? "bg-green border-green" : "border-slate/40"
    )}>
      {isSelected && <Check className="h-3 w-3 text-white" />}
    </div>
    <div className="flex items-center gap-2 flex-1">
      <MapPin className="h-4 w-4 text-slate" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            isMain ? "text-lightest-slate" : "text-slate",
            isSelected && "text-green"
          )}>
            {city.name}
          </span>
          {city.nameFr && city.name !== city.nameFr && (
            <span className="text-xs text-slate/70">
              ({city.nameFr})
            </span>
          )}
          {isMain && (
            <Badge variant="outline" className="text-xs border-green/30 text-green">
              Main
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate/70 mt-1">
          {isMain && city.population && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{city.population.toLocaleString()}</span>
            </div>
          )}
          {!isMain && city.distance && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{city.distance}km</span>
            </div>
          )}
          {city.province && (
            <span className="text-slate/50">{city.provinceCode}</span>
          )}
        </div>
      </div>
    </div>
  </motion.button>
);

export default MultiCitySelector;
