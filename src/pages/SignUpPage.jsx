import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@/lib/validationSchemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import PageWrapper from '@/components/layout/PageWrapper';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { supabase, getSiteUrl } from '@/lib/customSupabaseClient';
import LoadingButton from '@/components/ui/LoadingButton';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building, 
  Briefcase, 
  Users, 
  Eye, 
  EyeOff,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      company: '',
      jobTitle: '',
      industry: '',
      companySize: '',
      agreeToTerms: false,
      subscribeToNewsletter: false,
    },
  });

  const { isSubmitting } = form.formState;

  const signUpWithPassword = async (values) => {
    try {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
        options: {
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            full_name: `${values.firstName} ${values.lastName}`,
            phone: values.phone,
            company: values.company,
            job_title: values.jobTitle,
            industry: values.industry,
            company_size: values.companySize,
            subscribe_to_newsletter: values.subscribeToNewsletter,
          }
        }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
        return;
      }

      if (data.user) {
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: values.email,
            first_name: values.firstName,
            last_name: values.lastName,
            phone: values.phone,
            company: values.company,
            job_title: values.jobTitle,
            industry: values.industry,
            company_size: values.companySize,
            subscribe_to_newsletter: values.subscribeToNewsletter,
            onboarding_complete: false,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

      // Grant free credits via Edge Function
      const { error: functionError } = await supabase.functions.invoke('grant-signup-bonus', {
        body: JSON.stringify({ user_id: data.user.id }),
      });

      if (functionError) {
        console.error('Failed to grant signup bonus:', functionError);
        }

        toast({
          title: "Account Created Successfully!",
          description: "Please check your email to verify your account.",
        });
      
      navigate('/signup-success');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const signUpWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const siteUrl = getSiteUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Google Sign Up Failed",
          description: error.message || "Something went wrong",
        });
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast({
        variant: "destructive",
        title: "Google Sign Up Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = (values) => {
    signUpWithPassword(values);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
  return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your first name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your last name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      {...field}
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
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your company name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Real Estate Agent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="real-estate">Real Estate</SelectItem>
                        <SelectItem value="property-management">Property Management</SelectItem>
                        <SelectItem value="investment">Real Estate Investment</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companySize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Company Size
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Just me</SelectItem>
                      <SelectItem value="2-10">2-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate hover:text-lightest-slate"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm Password
                  </FormLabel>
                      <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate hover:text-lightest-slate"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        I agree to the{' '}
                        <Link to="/terms" className="text-teal hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-teal hover:underline">
                          Privacy Policy
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscribeToNewsletter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Subscribe to our newsletter for updates and tips
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-center min-h-screen py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-light-navy border-border shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-lightest-slate">
                Create Your Account
              </CardTitle>
              <CardDescription className="text-slate mt-2">
                Join thousands of real estate professionals using Sold2Move
              </CardDescription>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-center mt-6">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        i + 1 <= currentStep
                          ? 'bg-teal text-deep-navy'
                          : 'bg-lightest-navy text-slate'
                      }`}
                    >
                      {i + 1 < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < totalSteps - 1 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          i + 1 < currentStep ? 'bg-teal' : 'bg-lightest-navy'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-slate mt-2">
                Step {currentStep} of {totalSteps}: {
                  currentStep === 1 ? 'Personal Information' :
                  currentStep === 2 ? 'Company Details' :
                  'Account Security'
                }
              </div>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {renderStepContent()}

                  <div className="flex gap-4">
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="flex-1"
                      >
                        Previous
                      </Button>
                    )}
                    
                    {currentStep < totalSteps ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex-1 bg-teal text-deep-navy hover:bg-teal/90"
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <LoadingButton
                        type="submit"
                        isLoading={isSubmitting}
                        className="flex-1 bg-teal text-deep-navy hover:bg-teal/90"
                      >
                        Create Account
                </LoadingButton>
                    )}
                  </div>
              </form>
            </Form>

              {/* OAuth Section */}
              <div className="mt-8">
                <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-lightest-navy/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-light-navy px-2 text-slate">
                      Or continue with
                    </span>
              </div>
            </div>

                <div className="mt-6">
                  <LoadingButton
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={signUpWithGoogle}
                    isLoading={googleLoading}
                    disabled={isSubmitting}
                  >
                    <GoogleIcon />
                    <span>Sign up with Google</span>
            </LoadingButton>
                </div>
              </div>

              <div className="mt-6 text-center text-sm">
                <p className="text-slate">
              Already have an account?{' '}
                  <Link to="/login" className="font-medium text-teal hover:underline">
                Sign in
              </Link>
            </p>
              </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default SignUpPage;