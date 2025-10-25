import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Home, Clock, TrendingUp, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useComprehensiveSearch, useSearchStats, usePopularSearches } from '@/hooks/useComprehensiveSearch';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/services/analytics';

const ComprehensiveSearchBar = ({ 
  onSearchSelect, 
  placeholder = "Search any address, city, or zip code...",
  showStats = true,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();

  // Use comprehensive search hook
  const { 
    data: searchData, 
    isLoading: searchLoading, 
    error: searchError 
  } = useComprehensiveSearch(searchTerm, {
    limit: 15,
    includeSold: true,
    includeJustListed: true,
    minLength: 1,
    debounceMs: 200
  });

  // Get search statistics
  const { data: stats } = useSearchStats();
  
  // Get popular searches
  const { data: popularSearches } = usePopularSearches();

  const suggestions = searchData?.suggestions || [];

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
    setSelectedIndex(-1);
    
    if (value.length > 0) {
      trackAction('search_input', { 
        searchTerm: value, 
        length: value.length 
      });
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSearchTerm(suggestion.displayAddress);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    trackAction('search_suggestion_selected', {
      address: suggestion.displayAddress,
      type: suggestion.type,
      source: suggestion.source
    });

    if (onSearchSelect) {
      onSearchSelect(suggestion);
    } else {
      // Navigate to property detail page
      navigate(`/dashboard/listings/property/${suggestion.id}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchRef.current?.focus();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'Price N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get source badge color
  const getSourceBadgeColor = (source) => {
    switch (source) {
      case 'Just Listed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Sold':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
        <Input
          ref={searchRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(searchTerm.length > 0)}
          className="pl-10 pr-10 h-12 text-base bg-light-navy border-lightest-navy/20 text-lightest-slate placeholder-slate focus:border-teal focus:ring-teal/20"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-lightest-navy/20"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Statistics */}
      {showStats && stats && (
        <div className="mt-2 flex items-center gap-4 text-xs text-slate">
          <span className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            {stats.justListedCount.toLocaleString()} Just Listed
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {stats.soldCount.toLocaleString()} Sold
          </span>
          <span className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {stats.totalCount.toLocaleString()} Total Properties
          </span>
        </div>
      )}

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-2 bg-light-navy border border-lightest-navy/20 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {searchLoading && (
            <div className="p-4 text-center text-slate">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal mx-auto mb-2"></div>
              Searching through {stats?.totalCount.toLocaleString()} properties...
            </div>
          )}

          {searchError && (
            <div className="p-4 text-center text-red-400">
              Search error: {searchError}
            </div>
          )}

          {!searchLoading && !searchError && suggestions.length === 0 && searchTerm.length > 0 && (
            <div className="p-4 text-center text-slate">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No properties found for "{searchTerm}"</p>
              <p className="text-xs mt-1">Try a different address, city, or zip code</p>
            </div>
          )}

          {!searchLoading && !searchError && suggestions.length > 0 && (
            <>
              {/* Search Results Header */}
              <div className="px-4 py-2 border-b border-lightest-navy/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-lightest-slate">
                    {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                  </span>
                  <span className="text-xs text-slate">
                    Press ↑↓ to navigate, Enter to select
                  </span>
                </div>
              </div>

              {/* Search Results */}
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-lightest-navy/10 transition-colors border-b border-lightest-navy/5 last:border-b-0 ${
                    index === selectedIndex ? 'bg-lightest-navy/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Address */}
                      <div className="font-medium text-lightest-slate truncate">
                        {suggestion.addressstreet}
                      </div>
                      
                      {/* Location */}
                      <div className="text-sm text-slate flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {suggestion.lastcity}, {suggestion.addressstate} {suggestion.addresszipcode}
                        </span>
                      </div>

                      {/* Property Details */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate">
                        {suggestion.beds && (
                          <span>{suggestion.beds} bed{suggestion.beds !== 1 ? 's' : ''}</span>
                        )}
                        {suggestion.baths && (
                          <span>{suggestion.baths} bath{suggestion.baths !== 1 ? 's' : ''}</span>
                        )}
                        {suggestion.area && (
                          <span>{suggestion.area.toLocaleString()} sq ft</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* Price */}
                      <div className="text-sm font-medium text-lightest-slate">
                        {formatPrice(suggestion.unformattedprice || suggestion.price)}
                      </div>

                      {/* Source Badge */}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSourceBadgeColor(suggestion.source)}`}
                      >
                        {suggestion.source}
                      </Badge>

                      {/* Date */}
                      {suggestion.lastseenat && (
                        <div className="flex items-center gap-1 text-xs text-slate">
                          <Clock className="h-3 w-3" />
                          {new Date(suggestion.lastseenat).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Popular Searches */}
              {popularSearches && (popularSearches.popularCities.length > 0 || popularSearches.popularStreets.length > 0) && (
                <div className="px-4 py-3 border-t border-lightest-navy/10 bg-lightest-navy/5">
                  <div className="text-xs text-slate mb-2">Popular searches:</div>
                  <div className="flex flex-wrap gap-1">
                    {popularSearches.popularCities.slice(0, 3).map(city => (
                      <button
                        key={city}
                        onClick={() => setSearchTerm(city)}
                        className="px-2 py-1 text-xs bg-lightest-navy/20 text-slate rounded hover:bg-lightest-navy/30 transition-colors"
                      >
                        {city}
                      </button>
                    ))}
                    {popularSearches.popularStreets.slice(0, 2).map(street => (
                      <button
                        key={street}
                        onClick={() => setSearchTerm(street)}
                        className="px-2 py-1 text-xs bg-lightest-navy/20 text-slate rounded hover:bg-lightest-navy/30 transition-colors"
                      >
                        {street} St
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ComprehensiveSearchBar;
