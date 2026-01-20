
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema } from '@/lib/validationSchemas';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useProfile } from '@/hooks/useProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Building, Mail, Phone, CheckCircle, Zap, TrendingUp, Target, ArrowRight, Sparkles, DollarSign, Home, Search } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingButton from '@/components/ui/LoadingButton';
import CongratulationsDialog from '@/components/ui/CongratulationsDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

const OnboardingPage = () => {
  const supabase = useSupabaseClient();
  const { session, profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCongratulations, setShowCongratulations] = useState(false);

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      phone: '',
    },
  });

  const { isSubmitting } = form;

  useEffect(() => {
    if (!profileLoading) {
      if (profile?.onboarding_complete) {
        navigate('/dashboard', { replace: true });
      } else if (profile) {
        form.reset({
          companyName: profile.company_name || '',
          phone: profile.phone || '',
        });
      }
    }
  }, [profile, profileLoading, navigate, form]);

  const handleUpdateProfile = async (values) => {
    try {
      if (!session?.user) throw new Error('No user on the session!');

      // Only update company info - service area was set during signup
      const updates = {
        id: session.user.id,
        company_name: values.companyName,
        phone: values.phone,
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

  const nextStep = () => {
    if (currentStep < 2) { // Now only 3 steps (0, 1, 2)
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToStep3 = () => {
    return true; // Welcome and credit explanation don't need validation
  };

  if (profileLoading || !session) {
    return (
      <div className="flex justify-center items-center h-screen bg-deep-navy">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const totalSteps = 3; // Simplified: Welcome, Credits, Company Details
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <PageWrapper title="Welcome!" description="Let's get your account set up.">
      <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-2xl bg-light-navy border-lightest-navy/20 text-lightest-slate">

          {/* Progress Indicator */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate">Step {currentStep + 1} of {totalSteps}</span>
              <span className="text-sm text-teal font-medium">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-deep-navy/50 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-teal to-teal/60 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between mt-4">
              {['Welcome', 'Credits', 'Company'].map((label, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    index < currentStep ? 'bg-teal text-deep-navy' :
                    index === currentStep ? 'bg-teal text-deep-navy ring-4 ring-teal/20' :
                    'bg-deep-navy/50 text-slate'
                  }`}>
                    {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={`text-xs mt-1 transition-colors duration-300 ${
                    index === currentStep ? 'text-teal font-medium' : 'text-slate'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >

                {/* Step 1: Welcome */}
                {currentStep === 0 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto bg-gradient-to-br from-teal/20 to-teal/5 w-20 h-20 rounded-full flex items-center justify-center mb-6"
                      >
                        <Sparkles className="w-10 h-10 text-teal" />
                      </motion.div>
                      <h2 className="text-3xl font-bold font-heading text-lightest-slate mb-3">
                        Welcome to Sold2Move!
                      </h2>
                      <p className="text-lg text-slate max-w-md mx-auto">
                        Your exclusive platform for finding high-value moving leads from real estate sales
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-deep-navy to-deep-navy/50 p-5 rounded-lg border border-teal/20"
                      >
                        <div className="w-12 h-12 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                          <Target className="w-6 h-6 text-teal" />
                        </div>
                        <h3 className="font-semibold text-lightest-slate mb-2">Exclusive Leads</h3>
                        <p className="text-sm text-slate">Access sold properties and new listings before your competitors</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-deep-navy to-deep-navy/50 p-5 rounded-lg border border-teal/20"
                      >
                        <div className="w-12 h-12 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                          <TrendingUp className="w-6 h-6 text-teal" />
                        </div>
                        <h3 className="font-semibold text-lightest-slate mb-2">99% Accuracy</h3>
                        <p className="text-sm text-slate">Verified cross-border data from Canada and the USA</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-deep-navy to-deep-navy/50 p-5 rounded-lg border border-teal/20"
                      >
                        <div className="w-12 h-12 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                          <Zap className="w-6 h-6 text-teal" />
                        </div>
                        <h3 className="font-semibold text-lightest-slate mb-2">Real-Time</h3>
                        <p className="text-sm text-slate">Get notified immediately when properties match your criteria</p>
                      </motion.div>
                    </div>

                    <div className="bg-teal/5 border border-teal/20 rounded-lg p-4 mt-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Zap className="w-5 h-5 text-teal" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-teal mb-1">500 Free Credits to Get Started!</h4>
                          <p className="text-sm text-slate">
                            We'll give you 500 trial credits when you complete setup. That's enough to reveal 250-500 properties and start closing deals!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Credit System Explanation */}
                {currentStep === 1 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center">
                      <div className="mx-auto bg-gradient-to-br from-amber-400/20 to-amber-400/5 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <DollarSign className="w-10 h-10 text-amber-400" />
                      </div>
                      <h2 className="text-2xl font-bold font-heading text-lightest-slate mb-3">
                        How Credits Work
                      </h2>
                      <p className="text-slate max-w-md mx-auto">
                        Credits unlock property details so you can reach out to potential customers
                      </p>
                    </div>

                    <div className="space-y-4 mt-8">
                      <div className="bg-deep-navy/50 p-5 rounded-lg border border-lightest-navy/20">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Home className="w-6 h-6 text-teal" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lightest-slate mb-1">Just Listed Properties</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-teal font-bold text-lg">1 Credit</span>
                              <span className="text-slate text-sm">per reveal</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate">
                          New properties entering the market. Homeowners preparing to move.
                        </p>
                      </div>

                      <div className="bg-deep-navy/50 p-5 rounded-lg border border-amber-400/20">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-amber-400/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-6 h-6 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lightest-slate mb-1">Recently Sold Properties</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold text-lg">2 Credits</span>
                              <span className="text-slate text-sm">per reveal</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate">
                          <strong className="text-amber-400">Best ROI!</strong> Properties that just sold. Homeowners actively moving soon.
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-teal/10 to-purple-500/10 p-5 rounded-lg border border-teal/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Search className="w-5 h-5 text-teal" />
                          <h4 className="font-semibold text-lightest-slate">Example: How Far 500 Credits Go</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-slate">500 Just Listed properties</span>
                            <span className="text-teal font-medium">500 reveals</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate">250 Sold properties (best leads)</span>
                            <span className="text-amber-400 font-medium">250 reveals</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate">Or mix and match!</span>
                            <span className="text-purple-400 font-medium">Your choice</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-400 mb-1">Pro Tip</h4>
                          <p className="text-sm text-slate">
                            Focus on recently sold properties first - they have the highest conversion rate because homeowners need to move within 30-60 days!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Company Details */}
                {currentStep === 2 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center mb-6">
                      <div className="mx-auto bg-gradient-to-br from-teal/20 to-teal/5 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Building className="w-8 h-8 text-teal" />
                      </div>
                      <h2 className="text-2xl font-bold font-heading text-lightest-slate mb-2">
                        Tell Us About Your Business
                      </h2>
                      <p className="text-slate">
                        We'll use this to personalize your experience
                      </p>
                    </div>

                    <Form {...form}>
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lightest-slate">
                                <Building className="inline-block mr-2 h-4 w-4 text-teal" />
                                Company Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Acme Moving Co."
                                  {...field}
                                  className="bg-deep-navy/50 border-lightest-navy/30 text-lightest-slate"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormItem>
                            <FormLabel className="text-lightest-slate">
                              <Mail className="inline-block mr-2 h-4 w-4 text-teal" />
                              Business Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                value={session.user.email}
                                disabled
                                className="bg-deep-navy/30 border-lightest-navy/20 text-slate"
                              />
                            </FormControl>
                            <p className="text-xs text-slate mt-1">This is your login email</p>
                          </FormItem>

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lightest-slate">
                                  <Phone className="inline-block mr-2 h-4 w-4 text-teal" />
                                  Phone Number
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder="(555) 123-4567"
                                    {...field}
                                    className="bg-deep-navy/50 border-lightest-navy/30 text-lightest-slate"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="bg-teal/5 border border-teal/20 rounded-lg p-4 mt-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-teal mt-0.5" />
                            <div>
                              <p className="text-sm text-slate">
                                Your information is secure and will never be shared with third parties
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Form>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-lightest-navy/20">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="border-lightest-navy/30 text-slate hover:text-lightest-slate"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentStep < 2 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-teal text-deep-navy hover:bg-teal/90 flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <LoadingButton
                    type="button"
                    onClick={form.handleSubmit(handleUpdateProfile)}
                    className="bg-gradient-to-r from-teal to-teal/80 text-deep-navy hover:from-teal/90 hover:to-teal/70 flex items-center gap-2"
                    isLoading={isSubmitting}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Setup & Get 500 Credits
                  </LoadingButton>
                )}
              </div>
            </div>
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
