import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/lib/validationSchemas';
import { useProfile } from '@/hooks/useProfile.jsx';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { MultiCitySelector } from '@/components/ui/multi-city-selector';
import { useToast } from '@/components/ui/use-toast';
import { Country, State, City } from 'country-state-city';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Save, 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Settings as SettingsIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAnalytics } from '@/services/analytics.jsx';

const SettingsEnhanced = () => {
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const { toast } = useToast();
  const { trackAction, trackFormEvent } = useAnalytics();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    newListings: true,
    weeklyReports: false,
    marketing: false,
  });

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      company_name: '',
      phone: '',
      business_email: '',
      country_code: '',
      state_code: '',
      city_name: '',
      // selected_cities: [] // Column doesn't exist in database
    },
  });

  const { watch, setValue } = form;
  const countryCode = watch('country_code');
  const stateCode = watch('state_code');

  const countries = Country.getAllCountries()
    .filter(c => ['US', 'CA'].includes(c.isoCode))
    .map(c => ({ label: c.name, value: c.isoCode }));
  
  const states = State.getStatesOfCountry(countryCode).map(s => ({ label: s.name, value: s.isoCode }));
  const cities = City.getCitiesOfState(countryCode, stateCode).map(c => ({ label: c.name, value: c.name }));

  useEffect(() => {
    if (profile) {
      form.reset({
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        business_email: profile.business_email || session?.user?.email || '',
        country_code: profile.country_code || '',
        state_code: profile.state_code || '',
        city_name: profile.city_name || '',
        // selected_cities: profile.selected_cities || [] // Column doesn't exist in database
      });
    }
  }, [profile, session, form]);

  const handleUpdateProfile = async (values) => {
    if (!session?.user) return;
    
    setIsSubmitting(true);
    trackFormEvent('profile_update', 'start', { values });
    
    try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            company_name: values.company_name,
            phone: values.phone,
            business_email: values.business_email,
            country_code: values.country_code,
            state_code: values.state_code,
            city_name: values.city_name,
            // selected_cities: values.selected_cities, // Column doesn't exist in database
          });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      trackAction('profile_update', 'success', { 
        fields: Object.keys(values).filter(key => values[key])
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Something went wrong. Please try again.",
      });
      trackFormEvent('profile_update', 'error', { error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationChange = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    trackAction('notification_setting_changed', { setting: key, value });
  };

  const handleExportData = () => {
    trackAction('data_export', { type: 'profile' });
    toast({
      title: "Export Started",
      description: "Your profile data is being prepared for download.",
    });
  };

  const handleDeleteAccount = async () => {
    trackAction('account_deletion', 'initiated');
    // Implement account deletion logic
    toast({
      variant: "destructive",
      title: "Account Deletion",
      description: "Account deletion is not yet implemented. Please contact support.",
    });
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonLoader className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <SkeletonLoader className="h-32 w-full" />
            <SkeletonLoader className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-green" />
            Settings
          </h1>
          <p className="text-slate mt-1">
            Manage your account settings and preferences.
          </p>
        </div>
        <Badge variant="secondary" className="text-green border-green/20">
          {profile?.onboarding_complete ? 'Complete' : 'Incomplete'}
        </Badge>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal and business information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Company Name
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter company name" 
                                {...field} 
                                className="bg-light-navy border-lightest-navy/20 text-lightest-slate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(555) 123-4567" 
                                {...field} 
                                className="bg-light-navy border-lightest-navy/20 text-lightest-slate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="business_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Business Email
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="business@company.com" 
                                {...field} 
                                className="bg-light-navy border-lightest-navy/20 text-lightest-slate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Country
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                options={countries}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select country"
                                searchPlaceholder="Search countries..."
                                emptyText="No countries found"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              State/Province
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                options={states}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select state"
                                searchPlaceholder="Search states..."
                                emptyText="No states found"
                                disabled={!countryCode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              City
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                options={cities}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select city"
                                searchPlaceholder="Search cities..."
                                emptyText="No cities found"
                                disabled={!stateCode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* selected_cities field removed - column doesn't exist in database */}
                      {/* <FormField
                        control={form.control}
                        name="selected_cities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-slate flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Additional Cities (Optional)
                            </FormLabel>
                            <FormControl>
                              <MultiCitySelector
                                options={cities}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select additional cities"
                                searchPlaceholder="Search cities..."
                                emptyText="No cities found"
                                disabled={!stateCode}
                                maxSelections={5}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      /> */}
                    </div>

                    <div className="flex justify-end">
                      <LoadingButton
                        type="submit"
                        isLoading={isSubmitting}
                        className="bg-green text-deep-navy hover:bg-green/90"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </LoadingButton>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-green" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about new listings and updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-lightest-slate font-medium">Email Alerts</div>
                      <div className="text-sm text-slate">Receive email notifications for important updates</div>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(value) => handleNotificationChange('emailAlerts', value)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-lightest-slate font-medium">New Listings</div>
                      <div className="text-sm text-slate">Get notified when new listings appear in your area</div>
                    </div>
                    <Switch
                      checked={notifications.newListings}
                      onCheckedChange={(value) => handleNotificationChange('newListings', value)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-lightest-slate font-medium">Weekly Reports</div>
                      <div className="text-sm text-slate">Receive weekly summaries of your activity</div>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(value) => handleNotificationChange('weeklyReports', value)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-lightest-slate font-medium">Marketing Updates</div>
                      <div className="text-sm text-slate">Receive updates about new features and tips</div>
                    </div>
                    <Switch
                      checked={notifications.marketing}
                      onCheckedChange={(value) => handleNotificationChange('marketing', value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green" />
                  Data & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your data and privacy settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-lightest-slate font-medium">Export My Data</div>
                    <div className="text-sm text-slate">Download a copy of all your data</div>
                  </div>
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    className="border-green text-green hover:bg-green/10"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-lightest-slate font-medium">Delete Account</div>
                    <div className="text-sm text-slate">Permanently delete your account and all data</div>
                  </div>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showDeleteConfirm && (
              <Card className="border-red-200 bg-red-50/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lightest-slate">Are you sure?</h4>
                      <p className="text-sm text-slate">
                        This action cannot be undone. This will permanently delete your account 
                        and remove all your data from our servers.
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={handleDeleteAccount}
                          variant="destructive"
                          size="sm"
                        >
                          Yes, Delete Account
                        </Button>
                        <Button
                          onClick={() => setShowDeleteConfirm(false)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green" />
                  Billing & Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 text-slate mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                    Billing Coming Soon
                  </h3>
                  <p className="text-slate mb-4">
                    Subscription management and billing features will be available soon.
                  </p>
                  <Badge variant="secondary" className="text-green border-green/20">
                    Free Plan Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsEnhanced;
