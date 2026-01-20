import React, { useState, useEffect } from 'react';
import { Search, Filter, X, DollarSign, Home, Ruler, Calendar, Star, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useFilterOptions } from '@/hooks/useListingsEnhanced';
import ComprehensiveSearchBar from '@/components/dashboard/search/ComprehensiveSearchBar';
import SavedSearches from '@/components/dashboard/SavedSearches';
import { useNavigate } from 'react-router-dom';

// Price range options for quick filter
const PRICE_OPTIONS = [
  { value: 'all', label: 'Any Price', min: null, max: null },
  { value: '0-300000', label: 'Under $300K', min: 0, max: 300000 },
  { value: '300000-500000', label: '$300K - $500K', min: 300000, max: 500000 },
  { value: '500000-750000', label: '$500K - $750K', min: 500000, max: 750000 },
  { value: '750000-1000000', label: '$750K - $1M', min: 750000, max: 1000000 },
  { value: '1000000-1500000', label: '$1M - $1.5M', min: 1000000, max: 1500000 },
  { value: '1500000-2000000', label: '$1.5M - $2M', min: 1500000, max: 2000000 },
  { value: '2000000-', label: '$2M+', min: 2000000, max: null },
];

const AdvancedFilters = ({
  filters,
  onFiltersChange,
  onSearchChange,
  cityName,
  className = ""
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const navigate = useNavigate();

  // Get filter options from database - no city restriction, gets global options
  const { data: filterOptions, isLoading: filterOptionsLoading } = useFilterOptions();

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
  };

  // Handle search selection from comprehensive search
  const handleSearchSelect = (suggestion) => {
    // Navigate directly to the property detail page
    navigate(`/dashboard/listings/property/${suggestion.id}`);
  };

  // Handle loading saved search
  const handleLoadSavedSearch = (savedFilters) => {
    setLocalFilters(savedFilters);
    onFiltersChange(savedFilters);
    if (savedFilters.searchTerm) {
      setSearchTerm(savedFilters.searchTerm);
      onSearchChange(savedFilters.searchTerm);
    }
    setShowSavedSearches(false);
  };

  // Clear all filters (preserve city selection)
  const clearFilters = () => {
    const clearedFilters = {
      city_name: localFilters.city_name, // Preserve current city selection
      searchTerm: '',
      minPrice: null,
      maxPrice: null,
      beds: null,
      baths: null,
      propertyType: null,
      minSqft: null,
      maxSqft: null,
      dateRange: 'all',
    };
    setLocalFilters(clearedFilters);
    setSearchTerm('');
    onFiltersChange(clearedFilters);
    onSearchChange('');
  };

  // Get active filter count (exclude city_name and dateRange='all' from count)
  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'city_name') return false;
    if (key === 'dateRange' && value === 'all') return false;
    return value !== null && value !== undefined && value !== '' && value !== 'all';
  }).length;

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
      {/* Comprehensive Search Bar */}
      <ComprehensiveSearchBar
        onSearchSelect={handleSearchSelect}
        placeholder="Search any address, city, or zip code across all properties..."
        showStats={true}
        className="w-full"
      />

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
          value={localFilters.beds ? String(localFilters.beds) : 'all'}
          onValueChange={(value) => handleFilterChange('beds', value === 'all' ? null : parseInt(value, 10))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Beds</SelectItem>
            {filterOptions?.beds?.map((beds) => (
              <SelectItem key={beds} value={String(beds)}>{beds}+</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.baths ? String(localFilters.baths) : 'all'}
          onValueChange={(value) => handleFilterChange('baths', value === 'all' ? null : parseInt(value, 10))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Baths" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Baths</SelectItem>
            {filterOptions?.baths?.map((baths) => (
              <SelectItem key={baths} value={String(baths)}>{baths}+</SelectItem>
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

        <Button
          variant="outline"
          onClick={() => setShowSavedSearches(!showSavedSearches)}
          className="flex items-center gap-2"
        >
          <Star className="h-4 w-4" />
          Saved
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
                  <DollarSign className="h-4 w-4 text-teal" />
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
                  <Ruler className="h-4 w-4 text-teal" />
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
                    <Badge variant="outline" className="text-teal border-teal/30">
                      Min: ${localFilters.minPrice.toLocaleString()}
                    </Badge>
                  )}
                  {localFilters.maxPrice && (
                    <Badge variant="outline" className="text-teal border-teal/30">
                      Max: ${localFilters.maxPrice.toLocaleString()}
                    </Badge>
                  )}
                  {localFilters.beds && (
                    <Badge variant="outline" className="text-teal border-teal/30">
                      {localFilters.beds}+ Beds
                    </Badge>
                  )}
                  {localFilters.baths && (
                    <Badge variant="outline" className="text-teal border-teal/30">
                      {localFilters.baths}+ Baths
                    </Badge>
                  )}
                  {localFilters.propertyType && (
                    <Badge variant="outline" className="text-teal border-teal/30">
                      {localFilters.propertyType}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {showSavedSearches && (
        <SavedSearches
          onLoadSearch={handleLoadSavedSearch}
          currentFilters={localFilters}
        />
      )}
    </div>
  );
};

export default AdvancedFilters;
