import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Check, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import MultiCitySelector from './MultiCitySelector';

const CitySelector = ({
  currentCity,
  onCityChange,
  availableCities = [],
  className = "",
  variant = "default", // "default", "minimal", or "multi"
  selectedCities = [],
  onCitiesChange,
  showMultiCityOption = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Default cities if none provided
  const cities = availableCities.length > 0 ? availableCities : [
    'Windsor',
    'Toronto',
    'Vancouver',
    'Calgary',
    'Edmonton',
    'Ottawa',
    'Montreal',
    'Quebec City',
    'Halifax',
    'Winnipeg'
  ];

  const handleCitySelect = (city) => {
    onCityChange(city);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Filter cities based on search term
  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMultiCityToggle = () => {
    if (onCitiesChange) {
      onCitiesChange(selectedCities.length > 0 ? [] : [currentCity]);
    }
  };

  if (variant === "minimal") {
    return (
      <div className={cn("relative inline-block", className)} ref={dropdownRef}>
        <motion.button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setIsOpen(!isOpen)}
          className="group relative inline-flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200 hover:bg-light-navy/50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-teal font-medium group-hover:text-teal/80 transition-colors">
            {currentCity}
          </span>
          <motion.div
            animate={{ 
              rotate: isOpen ? 180 : 0,
              opacity: isHovered ? 1 : 0.6
            }}
            transition={{ duration: 0.2 }}
            className="ml-1"
          >
            <ChevronDown className="h-3 w-3 text-teal" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 w-64 bg-light-navy border border-lightest-navy/20 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2">
                {/* Search Input */}
                <div className="mb-2 px-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search cities..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-deep-navy border border-slate/20 rounded-md text-lightest-slate placeholder-slate/50 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all"
                    />
                  </div>
                </div>

                {showMultiCityOption && onCitiesChange && (
                  <motion.button
                    onClick={handleMultiCityToggle}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-150 mb-2 border-b border-slate/20",
                      selectedCities.length > 0
                        ? "bg-teal/20 text-teal"
                        : "text-lightest-slate hover:bg-lightest-navy/30 hover:text-teal"
                    )}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      <span>Select Multiple Cities</span>
                    </div>
                    {selectedCities.length > 0 && (
                      <Check className="h-3 w-3 text-teal" />
                    )}
                  </motion.button>
                )}

                <div className="max-h-64 overflow-y-auto">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <motion.button
                        key={city}
                        onClick={() => handleCitySelect(city)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-150",
                          currentCity === city
                            ? "bg-teal/20 text-teal"
                            : "text-lightest-slate hover:bg-lightest-navy/30 hover:text-teal"
                        )}
                        whileHover={{ x: 4 }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{city}</span>
                        </div>
                        {currentCity === city && (
                          <Check className="h-3 w-3 text-teal" />
                        )}
                      </motion.button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate text-center">
                      No cities found
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-light-navy/30 border border-transparent hover:border-teal/20"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <MapPin className="h-4 w-4 text-teal" />
        <span className="text-teal font-semibold group-hover:text-teal/80 transition-colors">
          {currentCity}
        </span>
        <motion.div
          animate={{ 
            rotate: isOpen ? 180 : 0,
            opacity: isHovered ? 1 : 0.7
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4 text-teal" />
        </motion.div>
        
        {/* Hover indicator */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal/5 to-teal/10 opacity-0"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-3 w-72 bg-light-navy border border-lightest-navy/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm"
          >
            <div className="p-3">
              <div className="text-xs font-medium text-slate mb-2 px-2">
                Select your service area
              </div>

              {/* Search Input */}
              <div className="mb-3 px-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search cities..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-deep-navy border border-slate/20 rounded-lg text-lightest-slate placeholder-slate/50 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city, index) => (
                    <motion.button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group",
                        currentCity === city
                          ? "bg-teal/20 text-teal border border-teal/30"
                          : "text-lightest-slate hover:bg-lightest-navy/50 hover:text-teal hover:border-teal/20 border border-transparent"
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors",
                          currentCity === city
                            ? "bg-teal/20"
                            : "bg-slate/20 group-hover:bg-teal/20"
                        )}>
                          <MapPin className="h-3 w-3" />
                        </div>
                        <span className="font-medium">{city}</span>
                      </div>
                      {currentCity === city && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Check className="h-4 w-4 text-teal" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-slate text-center">
                    No cities found
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitySelector;
