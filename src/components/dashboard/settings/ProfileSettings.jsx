import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Country, State } from 'country-state-city';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

// Simple schema for company profile only
const companyProfileSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  phone: z.string().optional(),
  business_email: z.string().email('Invalid email address'),
  country_code: z.string().min(1, 'Country is required'),
  state_code: z.string().min(1, 'Province/State is required'),
});

const ProfileSettings = () => {
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      company_name: '',
      phone: '',
      business_email: '',
      country_code: '',
      state_code: '',
    },
  });

  const { isSubmitting, watch, setValue } = form;
  const countryCode = watch('country_code');

  const countries = Country.getAllCountries()
    .filter(c => ['US', 'CA'].includes(c.isoCode))
    .map(c => ({ label: c.name, value: c.isoCode }));

  const states = State.getStatesOfCountry(countryCode).map(s => ({ label: s.name, value: s.isoCode }));

  useEffect(() => {
    if (profile) {
      form.reset({
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        business_email: profile.business_email || session?.user?.email || '',
        country_code: profile.country_code || '',
        state_code: profile.state_code || '',
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
        <CardDescription>Update your company information. Manage your service cities in the "Service Areas" tab.</CardDescription>
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
              <p className="text-lg font-semibold text-lightest-slate mb-2">Primary Location</p>
              <p className="text-sm text-slate mb-4">Select your primary country and state/province.</p>
            </div>

            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); setValue('state_code', ''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Country..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {countries.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={!countryCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province/state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {states.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 mt-4">
              <LoadingButton type="submit" className="w-full md:w-auto bg-teal text-deep-navy hover:bg-teal/90" isLoading={isSubmitting}>
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
