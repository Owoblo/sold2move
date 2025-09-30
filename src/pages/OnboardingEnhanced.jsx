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
import { useToast } from '@/components/ui/use-toast';
import { Building, Mail, Phone, MapPin, Globe, CheckCircle, ArrowRight, ArrowLeft, Users, Target, Zap } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalytics } from '@/services/analytics.jsx';

const OnboardingEnhanced = () => {
  const supabase = useSupabaseClient();
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackFormEvent, trackAction } = useAnalytics();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      phone: '',
      countryCode: 'US',
      stateCode: '',
      cityName: '',
    },
  });

  const { watch, setValue, trigger, formState: { errors } } = form;
  const countryCode = watch('countryCode');
  const stateCode = watch('stateCode');

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
        });
      }
    }
  }, [profile, profileLoading, navigate, form]);

  // Track form start
  useEffect(() => {
    trackFormEvent('onboarding', 'start', {});
  }, [trackFormEvent]);

  const steps = [
    {
      id: 1,
      title: "Company Information",
      description: "Tell us about your business",
      icon: Building,
      fields: ['companyName', 'phone']
    },
    {
      id: 2,
      title: "Service Area",
      description: "Where do you operate?",
      icon: MapPin,
      fields: ['countryCode', 'stateCode', 'cityName']
    },
    {
      id: 3,
      title: "Review & Complete",
      description: "Verify your information",
      icon: CheckCircle,
      fields: []
    }
  ];

  const handleNext = async () => {
    const currentStepFields = steps[currentStep - 1].fields;
    const isValid = await trigger(currentStepFields);
    
    if (isValid) {
      trackAction('onboarding_step_complete', { 
        step: currentStep, 
        fields: currentStepFields 
      });
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    } else {
      trackFormEvent('onboarding', 'error', { 
        step: currentStep, 
        errors: Object.keys(errors) 
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleUpdateProfile = async (values) => {
    if (!session?.user) return;
    
    setIsSubmitting(true);
    trackFormEvent('onboarding', 'complete', { values });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          company_name: values.companyName,
          phone: values.phone,
          country_code: values.countryCode,
          state_code: values.stateCode,
          city_name: values.cityName,
          onboarding_complete: true,
        });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "🎉 Welcome to Sold2Move!",
        description: "Your account has been set up successfully. You can now start exploring listings in your area.",
        duration: 5000,
      });

      trackAction('onboarding_complete', { 
        companyName: values.companyName,
        serviceArea: `${values.cityName}, ${values.stateCode}`
      });

      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "Something went wrong. Please try again.",
      });
      trackFormEvent('onboarding', 'error', { error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const currentStepData = steps[currentStep - 1];
  const isLastStep = currentStep === steps.length;

  return (
    <PageWrapper
      title="Complete Your Setup"
      description="Let's get your account ready to find the best moving leads."
    >
      <div className="container mx-auto px-6 py-20 max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${currentStep >= step.id 
                    ? 'bg-green border-green text-deep-navy' 
                    : 'border-slate text-slate'
                  }
                `}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-2 transition-colors
                    ${currentStep > step.id ? 'bg-green' : 'bg-slate/30'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-lightest-slate mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-slate">
              {currentStepData.description}
            </p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <currentStepData.icon className="h-5 w-5 text-green" />
              Step {currentStep} of {steps.length}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "This information helps us personalize your experience."}
              {currentStep === 2 && "We'll show you listings in your service area."}
              {currentStep === 3 && "Please review your information before completing setup."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Step 1: Company Information */}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building className="h-8 w-8 text-green" />
                          </div>
                          <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                            Tell us about your business
                          </h3>
                          <p className="text-slate text-sm">
                            This helps us customize your dashboard and recommendations.
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-slate flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Company Name
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter your company name" 
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
                      </div>
                    )}

                    {/* Step 2: Service Area */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="h-8 w-8 text-green" />
                          </div>
                          <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                            Where do you operate?
                          </h3>
                          <p className="text-slate text-sm">
                            We'll show you listings in your service area.
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name="countryCode"
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
                          name="stateCode"
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
                          name="cityName"
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
                      </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green" />
                          </div>
                          <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                            Review your information
                          </h3>
                          <p className="text-slate text-sm">
                            Please verify everything looks correct before completing setup.
                          </p>
                        </div>

                        <div className="bg-light-navy rounded-lg p-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-green" />
                            <div>
                              <div className="text-sm text-slate">Company Name</div>
                              <div className="text-lightest-slate font-medium">
                                {form.getValues('companyName')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-green" />
                            <div>
                              <div className="text-sm text-slate">Phone Number</div>
                              <div className="text-lightest-slate font-medium">
                                {form.getValues('phone')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-green" />
                            <div>
                              <div className="text-sm text-slate">Service Area</div>
                              <div className="text-lightest-slate font-medium">
                                {form.getValues('cityName')}, {form.getValues('stateCode')}, {form.getValues('countryCode')}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green/10 border border-green/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-green mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-lightest-slate mb-1">
                                You're almost ready!
                              </h4>
                              <p className="text-sm text-slate">
                                Once you complete setup, you'll have access to real-time moving leads in your area, 
                                advanced filtering options, and export capabilities.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="border-green text-green hover:bg-green/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {isLastStep ? (
              <LoadingButton
                type="submit"
                onClick={form.handleSubmit(handleUpdateProfile)}
                isLoading={isSubmitting}
                className="bg-green text-deep-navy hover:bg-green/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Setup
              </LoadingButton>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-green text-deep-navy hover:bg-green/90"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default OnboardingEnhanced;
