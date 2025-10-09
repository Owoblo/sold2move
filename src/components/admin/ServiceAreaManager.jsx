import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  RotateCcw, 
  Search,
  Globe,
  Clock,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CANADA_CITY_CLUSTERS, 
  updateCityCluster, 
  addNearbyTown, 
  removeNearbyTown,
  getServiceAreaTowns 
} from '@/data/canadaCityClusters';
import { useAnalytics } from '@/services/analytics.jsx';
import toast from '@/lib/toast';

const ServiceAreaManager = () => {
  const { trackAction } = useAnalytics();
  const [selectedCity, setSelectedCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTown, setEditingTown] = useState(null);
  const [newTown, setNewTown] = useState({ name: '', nameFr: '', distance: 30 });
  const [hasChanges, setHasChanges] = useState(false);
  const [localData, setLocalData] = useState(CANADA_CITY_CLUSTERS);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(localData) !== JSON.stringify(CANADA_CITY_CLUSTERS));
  }, [localData]);

  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
    setEditingTown(null);
    setNewTown({ name: '', nameFr: '', distance: 30 });
    trackAction('admin_city_select', { cityName });
  };

  const handleAddTown = () => {
    if (!selectedCity || !newTown.name.trim()) {
      toast.error("Missing information", "Please enter a town name.");
      return;
    }

    const town = {
      name: newTown.name.trim(),
      nameFr: newTown.nameFr.trim() || newTown.name.trim(),
      distance: Math.max(1, Math.min(100, newTown.distance))
    };

    const updatedData = { ...localData };
    if (updatedData[selectedCity]) {
      updatedData[selectedCity] = {
        ...updatedData[selectedCity],
        nearbyTowns: [...updatedData[selectedCity].nearbyTowns, town]
      };
      setLocalData(updatedData);
      setNewTown({ name: '', nameFr: '', distance: 30 });
      toast.success("Town added", `${town.name} has been added to ${selectedCity}'s service area.`);
      trackAction('admin_town_add', { cityName: selectedCity, townName: town.name });
    }
  };

  const handleEditTown = (townName, newData) => {
    if (!selectedCity) return;

    const updatedData = { ...localData };
    if (updatedData[selectedCity]) {
      updatedData[selectedCity] = {
        ...updatedData[selectedCity],
        nearbyTowns: updatedData[selectedCity].nearbyTowns.map(town =>
          town.name === townName ? { ...town, ...newData } : town
        )
      };
      setLocalData(updatedData);
      setEditingTown(null);
      toast.success("Town updated", `${townName} has been updated.`);
      trackAction('admin_town_edit', { cityName: selectedCity, townName });
    }
  };

  const handleDeleteTown = (townName) => {
    if (!selectedCity) return;

    const updatedData = { ...localData };
    if (updatedData[selectedCity]) {
      updatedData[selectedCity] = {
        ...updatedData[selectedCity],
        nearbyTowns: updatedData[selectedCity].nearbyTowns.filter(town => town.name !== townName)
      };
      setLocalData(updatedData);
      toast.success("Town removed", `${townName} has been removed from ${selectedCity}'s service area.`);
      trackAction('admin_town_delete', { cityName: selectedCity, townName });
    }
  };

  const handleSaveChanges = () => {
    // In a real app, this would save to a database
    Object.entries(localData).forEach(([cityName, data]) => {
      updateCityCluster(cityName, data);
    });
    
    setHasChanges(false);
    toast.success("Changes saved", "Service area boundaries have been updated.");
    trackAction('admin_service_areas_save', { 
      citiesUpdated: Object.keys(localData).length 
    });
  };

  const handleReset = () => {
    setLocalData(CANADA_CITY_CLUSTERS);
    setEditingTown(null);
    setNewTown({ name: '', nameFr: '', distance: 30 });
    toast.info("Changes reset", "All changes have been reverted.");
    trackAction('admin_service_areas_reset');
  };

  const filteredCities = Object.entries(localData).filter(([cityName, data]) =>
    cityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCityData = selectedCity ? localData[selectedCity] : null;
  const serviceAreaTowns = selectedCityData ? selectedCityData.nearbyTowns : [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal" />
              Service Area Management
            </CardTitle>
            <p className="text-slate text-sm">
              Manage service area boundaries for moving companies. Add, edit, or remove towns within ~1 hour drive of major cities.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and City Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-lightest-slate mb-2 block">
                  Search Cities
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
                  <Input
                    placeholder="Search by city or province..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-deep-navy border-slate/30 text-lightest-slate"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-lightest-slate mb-2 block">
                  Select City
                </label>
                <Select value={selectedCity} onValueChange={handleCitySelect}>
                  <SelectTrigger className="bg-deep-navy border-slate/30 text-lightest-slate">
                    <SelectValue placeholder="Choose a city to manage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCities.map(([cityName, data]) => (
                      <SelectItem key={cityName} value={cityName}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-teal" />
                          <span>{cityName}</span>
                          <Badge variant="outline" className="text-xs">
                            {data.provinceCode}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected City Info */}
            {selectedCityData && (
              <div className="p-4 bg-light-navy/30 rounded-lg border border-teal/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-lightest-slate flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-teal" />
                    {selectedCity}
                  </h3>
                  <Badge variant="outline" className="border-teal/30 text-teal">
                    {selectedCityData.province}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate" />
                    <span className="text-slate">Population: {selectedCityData.population.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate" />
                    <span className="text-slate">Service Radius: {selectedCityData.serviceRadius}km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate" />
                    <span className="text-slate">Nearby Towns: {serviceAreaTowns.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Add New Town */}
            {selectedCity && (
              <div className="p-4 bg-deep-navy/50 rounded-lg border border-slate/20">
                <h4 className="text-sm font-medium text-lightest-slate mb-3">Add New Town</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Town name (English)"
                    value={newTown.name}
                    onChange={(e) => setNewTown(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-light-navy border-slate/30 text-lightest-slate"
                  />
                  <Input
                    placeholder="Nom de ville (Français)"
                    value={newTown.nameFr}
                    onChange={(e) => setNewTown(prev => ({ ...prev, nameFr: e.target.value }))}
                    className="bg-light-navy border-slate/30 text-lightest-slate"
                  />
                  <Input
                    type="number"
                    placeholder="Distance (km)"
                    value={newTown.distance}
                    onChange={(e) => setNewTown(prev => ({ ...prev, distance: parseInt(e.target.value) || 30 }))}
                    className="bg-light-navy border-slate/30 text-lightest-slate"
                    min="1"
                    max="100"
                  />
                  <Button
                    onClick={handleAddTown}
                    disabled={!newTown.name.trim()}
                    className="bg-teal text-deep-navy hover:bg-teal/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Town
                  </Button>
                </div>
              </div>
            )}

            {/* Service Area Towns List */}
            {selectedCity && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-lightest-slate">
                  Service Area Towns ({serviceAreaTowns.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {serviceAreaTowns
                    .sort((a, b) => a.distance - b.distance)
                    .map((town, index) => (
                    <motion.div
                      key={town.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-light-navy/30 rounded-lg border border-slate/20 hover:border-teal/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate" />
                          <span className="font-medium text-lightest-slate">{town.name}</span>
                          {town.nameFr && town.name !== town.nameFr && (
                            <span className="text-sm text-slate/70">({town.nameFr})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate">
                          <Clock className="h-3 w-3" />
                          <span>{town.distance}km</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTown(town.name)}
                          className="text-slate hover:text-teal"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTown(town.name)}
                          className="text-slate hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate/20">
              <div className="text-sm text-slate">
                {hasChanges ? (
                  <div className="flex items-center gap-2 text-orange-400">
                    <AlertCircle className="h-4 w-4" />
                    You have unsaved changes
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-teal">
                    <CheckCircle className="h-4 w-4" />
                    All changes saved
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-slate/30 text-slate hover:bg-slate/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges}
                  className="bg-teal text-deep-navy hover:bg-teal/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ServiceAreaManager;
