
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/lib/validationSchemas';
import { useProfile } from '@/hooks/useProfile.jsx';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/components/ui/use-toast';
import { Country, State, City } from 'country-state-city';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const ProfileSettings = () => {
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      company_name: '',
      phone: '',
      business_email: '',
      country_code: '',
      state_code: '',
      city_name: ''
    },
  });

  const { isSubmitting, watch, setValue } = form;
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
        city_name: profile.city_name || ''
      });
    }
  }, [profile, session, form]);

  const handleSubmit = async (values) => {
    const payload = {
      id: session.user.id,
      ...values
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error saving profile', description: error.message });
    } else {
      await refreshProfile();
      toast({ title: '✅ Profile Updated!', description: 'Your changes have been saved.' });
    }
  };

  if (profileLoading) {
      return (
          <Card>
              <CardHeader>
                  <SkeletonLoader className="h-8 w-1/3" />
                  <SkeletonLoader className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-6">
                  <SkeletonLoader className="h-10" />
                  <SkeletonLoader className="h-10" />
                  <SkeletonLoader className="h-10" />
                  <SkeletonLoader className="h-10" />
                  <SkeletonLoader className="h-10 mt-4" />
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-heading">Company Profile</CardTitle>
        <CardDescription>Update your company information and primary service area.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input type="tel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="business_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="md:col-span-2 border-t border-lightest-navy/20 pt-6 mt-2">
               <p className="text-lg font-semibold text-lightest-slate mb-2">Service Area</p>
               <p className="text-sm text-slate mb-4">Select the primary area you service. This will be used to filter your leads.</p>
            </div>

            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Combobox options={countries} value={field.value} onChange={(val) => { field.onChange(val); setValue('state_code', ''); setValue('city_name', ''); }} placeholder="Select Country..." />
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
                  <FormLabel>Province / State</FormLabel>
                  <FormControl>
                    <Combobox options={states} value={field.value} onChange={(val) => { field.onChange(val); setValue('city_name', ''); }} placeholder="Select province/state" disabled={!countryCode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="city_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Combobox options={cities} value={field.value} onChange={field.onChange} placeholder="Select city" disabled={!stateCode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <LoadingButton type="submit" className="w-full md:w-auto bg-green text-deep-navy hover:bg-green/90" isLoading={isSubmitting}>
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
