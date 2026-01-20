import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Save, RotateCcw, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DatabaseCitySelector from '@/components/ui/DatabaseCitySelector';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useAnalytics } from '@/services/analytics.jsx';
import { useCalculatedPrice } from '@/hooks/useCalculatedPrice';
import { formatPrice, formatPopulation } from '@/lib/pricingUtils';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

// Error boundary for the component
const ErrorFallback = ({ error, resetError }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-red-400">
        <Globe className="h-5 w-5" />
        Service Areas - Error
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center py-8">
        <p className="text-slate mb-4">Something went wrong loading the service areas.</p>
        <Button onClick={resetError} variant="outline">
          Try Again
        </Button>
      </div>
    </CardContent>
  </Card>
);

const MultiCitySettings = () => {
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { trackAction } = useAnalytics();
  const [selectedCities, setSelectedCities] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Extract city names for price calculation (format: "City, StateCode" -> "City")
  const cityNamesForPricing = selectedCities.map(c => c.split(', ')[0]);

  // Get calculated prices based on selected cities
  const {
    loading: priceLoading,
    prices,
    totalPopulation,
  } = useCalculatedPrice(cityNamesForPricing);

  // Reset error when component mounts
  useEffect(() => {
    setError(null);
  }, []);

  // Initialize selected cities from profile
  useEffect(() => {
    if (profile?.service_cities) {
      setSelectedCities(profile.service_cities);
    } else if (profile?.city_name) {
      // Convert old format to new format if needed
      setSelectedCities([profile.city_name]);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    const originalCities = profile?.service_cities || (profile?.city_name ? [profile.city_name] : []);
    setHasChanges(JSON.stringify(selectedCities.sort()) !== JSON.stringify(originalCities.sort()));
  }, [selectedCities, profile]);

  const handleCitiesChange = (newCities) => {
    try {
      setSelectedCities(newCities);
      setError(null); // Clear any previous errors
      trackAction('multi_city_selection', { 
        cityCount: newCities.length,
        cities: newCities 
      });
    } catch (err) {
      console.error('Error in handleCitiesChange:', err);
      setError('Failed to update city selection');
    }
  };

  const handleSave = async () => {
    if (selectedCities.length === 0) {
      toast.error("Please select at least one city", "You need to select at least one service area.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // Extract city name from "City, StateCode" format for city_name field
      const primaryCity = selectedCities[0].split(', ')[0];

      await updateProfile({
        service_cities: selectedCities,
        city_name: primaryCity // Set primary city as first selected (just the city name)
      });

      trackAction('multi_city_saved', {
        cityCount: selectedCities.length,
        cities: selectedCities
      });

      toast.success("Service areas updated", `You're now serving ${selectedCities.length} cities.`);
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating service cities:', error);
      setError('Failed to save service areas. Please try again.');
      toast.error("Update failed", "Could not save your service areas. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const originalCities = profile?.service_cities || (profile?.city_name ? [profile.city_name] : []);
    setSelectedCities(originalCities);
    trackAction('multi_city_reset');
  };

  if (profileLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal" />
            Service Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-12 bg-light-navy rounded-lg animate-pulse" />
            <div className="h-32 bg-light-navy rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Globe className="h-5 w-5" />
            Service Areas - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate mb-4">{error}</p>
            <Button onClick={() => setError(null)} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal" />
            Service Areas
          </CardTitle>
          <p className="text-slate text-sm">
            Select all the cities where you provide real estate services. This will show you listings from all selected areas.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Selection Summary */}
          {selectedCities.length > 0 && (
            <div className="p-4 bg-light-navy/30 rounded-lg border border-teal/20">
              <h4 className="text-sm font-medium text-lightest-slate mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal" />
                Your Service Areas ({selectedCities.length} cities)
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedCities.map((city, index) => (
                  <Badge
                    key={city}
                    variant="secondary"
                    className={cn(
                      "bg-teal/20 text-teal border-teal/30",
                      index === 0 && "ring-2 ring-teal/50" // Highlight primary city
                    )}
                  >
                    {index === 0 && "📍 "}
                    {city}
                    {index === 0 && " (Primary)"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Calculated Price Preview */}
          {selectedCities.length > 0 && !priceLoading && (
            <div className="p-4 bg-gradient-to-r from-teal/10 to-deep-navy rounded-lg border border-teal/30">
              <h4 className="text-sm font-medium text-lightest-slate mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-teal" />
                Your Estimated Monthly Price
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate mb-1">Basic Plan</p>
                  <p className="text-2xl font-bold text-lightest-slate">{formatPrice(prices.basic)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate mb-1">Movers Special</p>
                  <p className="text-2xl font-bold text-teal">{formatPrice(prices.moversSpecial)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-teal/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate">
                  <Users className="h-4 w-4" />
                  Total Population: {formatPopulation(totalPopulation)}
                </div>
                <Link to="/dashboard/billing" className="text-teal text-sm hover:underline">
                  View billing →
                </Link>
              </div>
            </div>
          )}

          {/* Multi-City Selector */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-lightest-slate mb-2 block">
                Select Cities
              </label>
              <DatabaseCitySelector
                selectedCities={selectedCities}
                onCitiesChange={handleCitiesChange}
                placeholder="Choose your service areas..."
                maxSelections={20}
              />
            </div>

            {/* Tips */}
            <div className="p-4 bg-deep-navy/50 rounded-lg border border-slate/20">
              <h4 className="text-sm font-medium text-lightest-slate mb-2">💡 Tips</h4>
              <ul className="text-xs text-slate space-y-1">
                <li>• Select the main city first - it will be your primary service area</li>
                <li>• Include nearby suburbs and smaller cities in your region</li>
                <li>• You can select up to 20 cities total</li>
                <li>• Your subscription price is based on the total population of your selected cities</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate/20">
            <div className="text-sm text-slate">
              {hasChanges ? "You have unsaved changes" : "All changes saved"}
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="border-slate/30 text-slate hover:bg-slate/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || selectedCities.length === 0 || !hasChanges}
                className="bg-teal text-deep-navy hover:bg-teal/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Wrap with error boundary
const MultiCitySettingsWithErrorBoundary = () => {
  const [hasError, setHasError] = useState(false);

  const resetError = () => {
    setHasError(false);
  };

  if (hasError) {
    return <ErrorFallback error={null} resetError={resetError} />;
  }

  try {
    return <MultiCitySettings />;
  } catch (error) {
    console.error('MultiCitySettings error:', error);
    setHasError(true);
    return <ErrorFallback error={error} resetError={resetError} />;
  }
};

export default MultiCitySettingsWithErrorBoundary;
