import React, { useState, useEffect } from 'react';
import { Search, Filter, X, DollarSign, Home, Ruler, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useSearchSuggestions, useFilterOptions } from '@/hooks/useListingsEnhanced';

const AdvancedFilters = ({ 
  filters, 
  onFiltersChange, 
  onSearchChange, 
  cityName,
  className = "" 
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  // Get search suggestions
  const { data: suggestions = [] } = useSearchSuggestions(cityName, searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get filter options
  const { data: filterOptions } = useFilterOptions(cityName);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle search changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    onSearchChange(value);
    setShowSuggestions(value.length >= 2);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSearchTerm(suggestion.address);
    onSearchChange(suggestion.address);
    setShowSuggestions(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      searchTerm: '',
      minPrice: null,
      maxPrice: null,
      beds: null,
      baths: null,
      propertyType: null,
      minSqft: null,
      maxSqft: null,
    };
    setLocalFilters(clearedFilters);
    setSearchTerm('');
    onFiltersChange(clearedFilters);
    onSearchChange('');
  };

  // Get active filter count
  const activeFilterCount = Object.values(localFilters).filter(value => 
    value !== null && value !== undefined && value !== '' && value !== 'all'
  ).length;

  // Price range slider
  const handlePriceRangeChange = (values) => {
    const [min, max] = values;
    handleFilterChange('minPrice', min);
    handleFilterChange('maxPrice', max);
  };

  // Area range slider
  const handleAreaRangeChange = (values) => {
    const [min, max] = values;
    handleFilterChange('minSqft', min);
    handleFilterChange('maxSqft', max);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar with Suggestions */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
          <Input
            placeholder="Search by address, city, or zip code..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowSuggestions(searchTerm.length >= 2)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-light-navy border border-lightest-navy/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full px-4 py-2 text-left text-lightest-slate hover:bg-lightest-navy/10 transition-colors"
              >
                <div className="font-medium">{suggestion.street}</div>
                <div className="text-sm text-slate">
                  {suggestion.city}, {suggestion.state} {suggestion.zip}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Select 
          value={localFilters.propertyType || 'all'} 
          onValueChange={(value) => handleFilterChange('propertyType', value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Home className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filterOptions?.propertyTypes?.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={localFilters.beds || 'all'} 
          onValueChange={(value) => handleFilterChange('beds', value === 'all' ? null : parseInt(value))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Beds</SelectItem>
            {filterOptions?.beds?.map((beds) => (
              <SelectItem key={beds} value={beds.toString()}>{beds}+</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={localFilters.baths || 'all'} 
          onValueChange={(value) => handleFilterChange('baths', value === 'all' ? null : parseInt(value))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Baths" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Baths</SelectItem>
            {filterOptions?.baths?.map((baths) => (
              <SelectItem key={baths} value={baths.toString()}>{baths}+</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-slate hover:text-lightest-slate"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="bg-light-navy/50 border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Range */}
            {filterOptions?.priceRange && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green" />
                  <span className="text-sm font-medium">Price Range</span>
                </div>
                <div className="px-3">
                  <Slider
                    value={[
                      localFilters.minPrice || filterOptions.priceRange.min,
                      localFilters.maxPrice || filterOptions.priceRange.max
                    ]}
                    onValueChange={handlePriceRangeChange}
                    min={filterOptions.priceRange.min}
                    max={filterOptions.priceRange.max}
                    step={10000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate mt-2">
                    <span>${(localFilters.minPrice || filterOptions.priceRange.min).toLocaleString()}</span>
                    <span>${(localFilters.maxPrice || filterOptions.priceRange.max).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Area Range */}
            {filterOptions?.areaRange && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-green" />
                  <span className="text-sm font-medium">Square Footage</span>
                </div>
                <div className="px-3">
                  <Slider
                    value={[
                      localFilters.minSqft || filterOptions.areaRange.min,
                      localFilters.maxSqft || filterOptions.areaRange.max
                    ]}
                    onValueChange={handleAreaRangeChange}
                    min={filterOptions.areaRange.min}
                    max={filterOptions.areaRange.max}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate mt-2">
                    <span>{(localFilters.minSqft || filterOptions.areaRange.min).toLocaleString()} sq ft</span>
                    <span>{(localFilters.maxSqft || filterOptions.areaRange.max).toLocaleString()} sq ft</span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {localFilters.minPrice && (
                    <Badge variant="outline" className="text-green border-green/30">
                      Min: ${localFilters.minPrice.toLocaleString()}
                    </Badge>
                  )}
                  {localFilters.maxPrice && (
                    <Badge variant="outline" className="text-green border-green/30">
                      Max: ${localFilters.maxPrice.toLocaleString()}
                    </Badge>
                  )}
                  {localFilters.beds && (
                    <Badge variant="outline" className="text-green border-green/30">
                      {localFilters.beds}+ Beds
                    </Badge>
                  )}
                  {localFilters.baths && (
                    <Badge variant="outline" className="text-green border-green/30">
                      {localFilters.baths}+ Baths
                    </Badge>
                  )}
                  {localFilters.propertyType && (
                    <Badge variant="outline" className="text-green border-green/30">
                      {localFilters.propertyType}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilters;
