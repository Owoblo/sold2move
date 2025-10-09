import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Search, 
  Save, 
  Trash2, 
  Play, 
  Filter, 
  Calendar,
  DollarSign,
  Home,
  MapPin,
  Edit,
  Star
} from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import LoadingButton from '@/components/ui/LoadingButton';

const SavedSearches = ({ onLoadSearch, currentFilters }) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      fetchSavedSearches();
    }
  }, [profile?.id]);

  const fetchSavedSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load saved searches.",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentSearch = async () => {
    if (!searchName.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter a name for your saved search.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const searchData = {
        user_id: profile.id,
        name: searchName.trim(),
        description: searchDescription.trim(),
        filters: currentFilters,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('saved_searches')
        .insert(searchData);

      if (error) throw error;

      toast({
        title: "Search Saved",
        description: `"${searchName}" has been saved successfully.`,
      });

      setSearchName('');
      setSearchDescription('');
      setShowSaveDialog(false);
      fetchSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save search. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSearch = async (searchId) => {
    setIsDeleting(searchId);
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "Search Deleted",
        description: "Saved search has been removed.",
      });

      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete search. Please try again.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const loadSearch = (search) => {
    if (onLoadSearch) {
      onLoadSearch(search.filters);
      toast({
        title: "Search Loaded",
        description: `"${search.name}" filters have been applied.`,
      });
    }
  };

  const getFilterSummary = (filters) => {
    const parts = [];
    
    if (filters.city_name && filters.city_name.length > 0) {
      parts.push(`${filters.city_name.length} cit${filters.city_name.length === 1 ? 'y' : 'ies'}`);
    }
    
    if (filters.minPrice || filters.maxPrice) {
      const priceRange = [];
      if (filters.minPrice) priceRange.push(`$${filters.minPrice.toLocaleString()}+`);
      if (filters.maxPrice) priceRange.push(`$${filters.maxPrice.toLocaleString()}`);
      parts.push(priceRange.join(' - '));
    }
    
    if (filters.beds) parts.push(`${filters.beds}+ beds`);
    if (filters.baths) parts.push(`${filters.baths}+ baths`);
    if (filters.propertyType) parts.push(filters.propertyType);
    if (filters.searchTerm) parts.push(`"${filters.searchTerm}"`);
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  if (loading) {
    return (
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <div className="h-6 bg-slate/20 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate/10 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-lightest-slate flex items-center gap-2">
                <Star className="h-5 w-5 text-teal" />
                Saved Searches
              </CardTitle>
              <CardDescription className="text-slate">
                Save and quickly access your favorite search filters
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowSaveDialog(true)}
              size="sm"
              className="bg-teal text-deep-navy hover:bg-teal/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {savedSearches.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-slate mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                No Saved Searches
              </h3>
              <p className="text-slate text-sm mb-4">
                Save your current search filters to quickly access them later.
              </p>
              <Button
                onClick={() => setShowSaveDialog(true)}
                className="bg-teal text-deep-navy hover:bg-teal/90"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current Search
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {savedSearches.map((search, index) => (
                  <motion.div
                    key={search.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lightest-slate">
                                {search.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {new Date(search.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                            {search.description && (
                              <p className="text-sm text-slate mb-2">
                                {search.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-slate">
                              <Filter className="h-3 w-3" />
                              <span>{getFilterSummary(search.filters)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => loadSearch(search)}
                              size="sm"
                              variant="outline"
                              className="border-teal text-teal hover:bg-teal/10"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Load
                            </Button>
                            <Button
                              onClick={() => deleteSearch(search.id)}
                              size="sm"
                              variant="outline"
                              disabled={isDeleting === search.id}
                              className="border-red-400 text-red-400 hover:bg-red-400/10"
                            >
                              {isDeleting === search.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-light-navy border-lightest-navy/20">
          <DialogHeader>
            <DialogTitle className="text-lightest-slate flex items-center gap-2">
              <Save className="h-5 w-5 text-teal" />
              Save Current Search
            </DialogTitle>
            <DialogDescription className="text-slate">
              Give your current search filters a name so you can quickly access them later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-lightest-slate mb-2 block">
                Search Name *
              </label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., High-value properties in downtown"
                className="bg-deep-navy/50 border-lightest-navy/20 text-lightest-slate"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-lightest-slate mb-2 block">
                Description (Optional)
              </label>
              <Input
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                placeholder="e.g., Properties over $500k in downtown area"
                className="bg-deep-navy/50 border-lightest-navy/20 text-lightest-slate"
              />
            </div>
            
            <div className="bg-deep-navy/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-lightest-slate mb-2">
                Current Filters:
              </h4>
              <p className="text-xs text-slate">
                {getFilterSummary(currentFilters)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={saveCurrentSearch}
              disabled={!searchName.trim() || isSaving}
              isLoading={isSaving}
              className="bg-teal text-deep-navy hover:bg-teal/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Search
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedSearches;
