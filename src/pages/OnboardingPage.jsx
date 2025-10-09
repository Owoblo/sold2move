
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema } from '@/lib/validationSchemas';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Country, State, City } from 'country-state-city';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import DatabaseCitySelector from '@/components/ui/DatabaseCitySelector';
import { useToast } from '@/components/ui/use-toast';
import { Building, Mail, Phone, MapPin, Globe, CheckCircle, Plus } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingButton from '@/components/ui/LoadingButton';
import CongratulationsDialog from '@/components/ui/CongratulationsDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const OnboardingPage = () => {
  const supabase = useSupabaseClient();
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      phone: '',
      countryCode: 'US',
      stateCode: '',
      cityName: '',
      serviceCities: [],
    },
  });

  const { isSubmitting, watch, setValue } = form;
  const countryCode = watch('countryCode');
  const stateCode = watch('stateCode');
  const [showCongratulations, setShowCongratulations] = useState(false);

  const countries = Country.getAllCountries()
    .filter(c => ['US', 'CA'].includes(c.isoCode))
    .map(c => ({ label: c.name, value: c.isoCode }));
  
  const states = State.getStatesOfCountry(countryCode).map(s => ({ label: s.name, value: s.isoCode }));
  const cities = City.getCitiesOfState(countryCode, stateCode).map(c => ({ label: c.name, value: c.name }));

  useEffect(() => {
    if (!profileLoading) {
      if (profile?.onboarding_complete) {
        navigate('/dashboard', { replace: true });
      } else if (profile) {
        form.reset({
          companyName: profile.company_name || '',
          phone: profile.phone || '',
          countryCode: profile.country_code || 'US',
          stateCode: profile.state_code || '',
          cityName: profile.city_name || '',
          serviceCities: profile.service_cities || [],
        });
      }
    }
  }, [profile, profileLoading, navigate, form]);

  const handleUpdateProfile = async (values) => {
    try {
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session.user.id,
        company_name: values.companyName,
        phone: values.phone,
        country_code: values.countryCode,
        state_code: values.stateCode,
        city_name: values.cityName,
        service_cities: values.serviceCities,
        onboarding_complete: true,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      if (!profile?.trial_granted) {
          const { error: bonusError } = await supabase.functions.invoke('grant-signup-bonus', {
            body: JSON.stringify({ user_id: session.user.id }),
          });
          if (bonusError) {
              console.error("Could not grant bonus credits on onboarding:", bonusError.message);
          }
      }

      await refreshProfile();
      
      // Show congratulations dialog
      setShowCongratulations(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message,
      });
    }
  };

  const handleCongratulationsClose = () => {
    setShowCongratulations(false);
    navigate('/dashboard', { replace: true });
  };

  if (profileLoading || !session) {
    return (
      <div className="flex justify-center items-center h-screen bg-deep-navy">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <PageWrapper title="Welcome!" description="Let's get your account set up.">
      <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-2xl bg-light-navy border-lightest-navy/20 text-lightest-slate">
          <CardHeader className="text-center">
            <div className="mx-auto bg-teal/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-teal" />
            </div>
            <CardTitle className="text-3xl font-bold font-heading">Just a few more details...</CardTitle>
            <CardDescription className="text-slate">
              Tell us about your business to unlock your personalized lead dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><Building className="inline-block mr-2 h-4 w-4 text-teal" />Company Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Acme Moving Co." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormItem>
                    <FormLabel><Mail className="inline-block mr-2 h-4 w-4 text-teal" />Business Email</FormLabel>
                    <FormControl><Input type="email" value={session.user.email} disabled className="bg-deep-navy/50" /></FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><Phone className="inline-block mr-2 h-4 w-4 text-teal" />Phone Number</FormLabel>
                        <FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4 rounded-lg border border-lightest-navy/20 p-4">
                  <h3 className="font-semibold text-lightest-slate flex items-center"><MapPin className="inline-block mr-2 h-4 w-4 text-teal" />Primary Service Area</h3>
                  <p className="text-sm text-slate">We'll use this to find leads in your main operational area.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel><Globe className="inline-block mr-2 h-4 w-4 text-teal" />Country</FormLabel>
                          <FormControl>
                            <Combobox options={countries} value={field.value} onChange={(val) => { field.onChange(val); setValue('stateCode', ''); setValue('cityName', ''); }} placeholder="Select Country..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stateCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Province</FormLabel>
                          <FormControl>
                            <Combobox options={states} value={field.value} onChange={(val) => { field.onChange(val); setValue('cityName', ''); }} placeholder="Select State..." disabled={!countryCode} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Combobox options={cities} value={field.value} onChange={field.onChange} placeholder="Select City..." disabled={!stateCode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Service Cities Selection */}
                <FormField
                  control={form.control}
                  name="serviceCities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-teal" />
                        Service Areas (Cities from your listings)
                      </FormLabel>
                      <FormControl>
                        <DatabaseCitySelector
                          selectedCities={field.value}
                          onCitiesChange={field.onChange}
                          placeholder="Select cities where you provide services..."
                          maxSelections={10}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-slate">
                        Select the cities where you want to see listings and provide moving services. 
                        These are the actual cities from your property database.
                      </p>
                    </FormItem>
                  )}
                />
                <CardFooter className="p-0 pt-6">
                  <LoadingButton type="submit" className="w-full bg-teal text-deep-navy hover:bg-teal/90" isLoading={isSubmitting}>
                    Complete Setup & Enter Dashboard
                  </LoadingButton>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <CongratulationsDialog 
        isOpen={showCongratulations}
        onClose={handleCongratulationsClose}
        credits={100}
      />
    </PageWrapper>
  );
};

export default OnboardingPage;
