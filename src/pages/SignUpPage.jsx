import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@/lib/validationSchemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import PageWrapper from '@/components/layout/PageWrapper';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { supabase, getSiteUrl } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingButton from '@/components/ui/LoadingButton';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      agreeToTerms: false,
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
          },
          emailRedirectTo: `${getSiteUrl()}/auth/callback`
        }
      });

      if (error) {
        const errorMessage = error.message || "Something went wrong";
        toast({
          variant: "destructive",
          title: "Sign up Failed",
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      if (data.user) {
        // Create profile record with initial credits
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            company_name: values.companyName,
            business_email: data.user.email,
            phone: values.phone,
            credits_remaining: 100, // Grant 100 free credits on signup
            trial_granted: true,
            onboarding_complete: false,
            unlimited: false,
            subscription_status: 'inactive',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // If it's a duplicate key error, profile already exists (race condition)
          if (profileError.code !== '23505') {
            toast({
              variant: "destructive",
              title: "Profile Creation Failed",
              description: "Your account was created but there was an error setting up your profile. Please contact support.",
            });
            // Still navigate to success as user was created and can login
          }
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });

        // Navigate to success page
        navigate('/signup-success');
      }
    } catch (error) {
      throw error;
    }
  };

  const signUpWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      // Use the same OAuth function as the login page for consistency
      const { error } = await signInWithGoogle();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong with Google sign up",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (values) => {
    try {
      await signUpWithPassword(values);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "An error occurred during sign up. Please try again."
      });
    }
  };

  return (
    <PageWrapper>
      <Helmet>
        <title>Create Account - Sold2Move</title>
        <meta name="description" content="Create your Sold2Move account to access real-time property listings and leads" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-deep-navy via-navy to-light-navy py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-deep-navy" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-lightest-slate">
                Create Your Account
              </CardTitle>
              <CardDescription className="text-slate">
                Join Sold2Move and start finding the best property leads
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-lightest-slate border-b border-white/10 pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-lightest-slate">
                              <User className="h-4 w-4" />
                              First Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your first name"
                                className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
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
                            <FormLabel className="flex items-center gap-2 text-lightest-slate">
                              <User className="h-4 w-4" />
                              Last Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your last name"
                                className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Company Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-lightest-slate border-b border-white/10 pb-2">Company Information</h3>
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-lightest-slate">
                            <Building2 className="h-4 w-4" />
                            Company Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your company name"
                              className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-lightest-slate">
                            <Mail className="h-4 w-4" />
                            Business Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your business email"
                              className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-teal/80 mt-1 font-medium">⚠️ Please use your company email (not Gmail, Yahoo, etc.)</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-lightest-slate border-b border-white/10 pb-2">Contact Information</h3>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-lightest-slate">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Enter your phone number"
                              className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-lightest-slate">
                              <Lock className="h-4 w-4" />
                              Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password (min 8 characters)"
                                  className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 pr-10 focus:bg-white focus:border-teal"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-deep-navy hover:text-teal"
                                  onClick={() => setShowPassword(!showPassword)}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
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
                            <FormLabel className="flex items-center gap-2 text-lightest-slate">
                              <Lock className="h-4 w-4" />
                              Confirm Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Re-enter your password"
                                  className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 pr-10 focus:bg-white focus:border-teal"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-deep-navy hover:text-teal"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Terms and Conditions */}
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
                              className="border-white/20 data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal text-lightest-slate">
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
                  </div>

                  <LoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full bg-teal text-deep-navy hover:bg-teal/90"
                  >
                    Create Account
                  </LoadingButton>
                </form>
              </Form>

              {/* OAuth Section */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/5 px-2 text-slate">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/20 text-lightest-slate hover:bg-white/10"
                    onClick={signUpWithGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lightest-slate mr-2"></div>
                        Signing up...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <GoogleIcon className="h-4 w-4 mr-2" />
                        Sign up with Google
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate">
                  Already have an account?{' '}
                  <Link to="/login" className="text-teal hover:underline font-medium">
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