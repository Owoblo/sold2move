import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  Mail, 
  MapPin, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';

const EmailAlertsSettings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    frequency: 'daily', // daily, weekly, immediate
    priceRange: 'all', // all, under-500k, 500k-1m, over-1m
    maxPrice: '',
    minPrice: '',
    email: '',
    serviceAreas: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  useEffect(() => {
    if (isOpen && profile) {
      loadSettings();
    }
  }, [isOpen, profile]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_alerts')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (data && !error) {
        setSettings({
          enabled: data.enabled || false,
          frequency: data.frequency || 'daily',
          priceRange: data.price_range || 'all',
          maxPrice: data.max_price || '',
          minPrice: data.min_price || '',
          email: data.email || profile.email || '',
          serviceAreas: data.service_areas || []
        });
      } else {
        // Set defaults
        setSettings(prev => ({
          ...prev,
          email: profile?.email || '',
          serviceAreas: profile?.service_cities || [profile?.city_name].filter(Boolean)
        }));
      }
    } catch (error) {
      console.error('Error loading email alert settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const alertData = {
        user_id: profile.id,
        enabled: settings.enabled,
        frequency: settings.frequency,
        price_range: settings.priceRange,
        max_price: settings.maxPrice ? parseFloat(settings.maxPrice) : null,
        min_price: settings.minPrice ? parseFloat(settings.minPrice) : null,
        email: settings.email,
        service_areas: settings.serviceAreas,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('email_alerts')
        .upsert(alertData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "✅ Email Alerts Updated",
        description: settings.enabled 
          ? "You'll receive notifications about new listings in your area!"
          : "Email alerts have been disabled."
      });

      onClose();
    } catch (error) {
      console.error('Error saving email alert settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save email alert settings. Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  const frequencyOptions = [
    { value: 'immediate', label: 'Immediate (as they come in)' },
    { value: 'daily', label: 'Daily digest' },
    { value: 'weekly', label: 'Weekly summary' }
  ];

  const priceRangeOptions = [
    { value: 'all', label: 'All prices' },
    { value: 'under-500k', label: 'Under $500K' },
    { value: '500k-1m', label: '$500K - $1M' },
    { value: 'over-1m', label: 'Over $1M' },
    { value: 'custom', label: 'Custom range' }
  ];

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal" />
            Email Alerts & Notifications
          </DialogTitle>
          <DialogDescription>
            Get notified about new listings in your service areas. Never miss a potential lead!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled" className="text-lightest-slate font-medium">
                    Enable Email Alerts
                  </Label>
                  <p className="text-sm text-slate mt-1">
                    Receive notifications about new listings in your service areas
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {settings.enabled && (
            <>
              {/* Email Address */}
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-lg">Email Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full"
                  />
                  <p className="text-xs text-slate mt-2">
                    We'll send notifications to this email address
                  </p>
                </CardContent>
              </Card>

              {/* Frequency Settings */}
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal" />
                    Notification Frequency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={settings.frequency} onValueChange={(value) => setSettings(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Price Range Settings */}
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal" />
                    Price Range Filter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={settings.priceRange} onValueChange={(value) => setSettings(prev => ({ ...prev, priceRange: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priceRangeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {settings.priceRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-price">Minimum Price</Label>
                        <Input
                          id="min-price"
                          type="number"
                          value={settings.minPrice}
                          onChange={(e) => setSettings(prev => ({ ...prev, minPrice: e.target.value }))}
                          placeholder="e.g., 200000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-price">Maximum Price</Label>
                        <Input
                          id="max-price"
                          type="number"
                          value={settings.maxPrice}
                          onChange={(e) => setSettings(prev => ({ ...prev, maxPrice: e.target.value }))}
                          placeholder="e.g., 800000"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Areas */}
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-teal" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {settings.serviceAreas.map((area, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-deep-navy/50 rounded">
                        <MapPin className="h-4 w-4 text-teal" />
                        <span className="text-lightest-slate">{area}</span>
                      </div>
                    ))}
                    <p className="text-xs text-slate">
                      Based on your profile settings. Update your service areas in Settings to change these.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="bg-teal/10 border-teal/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-teal" />
                    Alert Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate">
                    <p>You'll receive {settings.frequency} notifications about:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>New listings in {settings.serviceAreas.join(', ')}</li>
                      <li>Properties in the {settings.priceRange === 'all' ? 'all price ranges' : settings.priceRange} range</li>
                      <li>Delivered to {settings.email}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || (settings.enabled && !settings.email)}
            className="bg-teal text-deep-navy hover:bg-teal/90"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailAlertsSettings;
