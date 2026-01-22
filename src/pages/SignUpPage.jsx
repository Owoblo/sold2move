import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@/lib/validationSchemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import PageWrapper from '@/components/layout/PageWrapper';
import { supabase, getSiteUrl } from '@/lib/customSupabaseClient';
import LoadingButton from '@/components/ui/LoadingButton';
import { useAvailableCities, getStateName } from '@/hooks/useAvailableCities';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Building2,
  MapPin,
  Globe,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Service area state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);

  // Fetch cities from database based on selected country
  const { data: availableCities, isLoading: citiesLoading } = useAvailableCities(selectedCountry || null);

  // Get unique states from available cities
  const availableStates = useMemo(() => {
    if (!availableCities) return [];
    const stateMap = new Map();
    availableCities.forEach(city => {
      if (!stateMap.has(city.state)) {
        stateMap.set(city.state, { state: city.state, count: city.count });
      } else {
        stateMap.get(city.state).count += city.count;
      }
    });
    return Array.from(stateMap.values()).sort((a, b) => b.count - a.count);
  }, [availableCities]);

  // Get cities filtered by selected state
  const citiesInState = useMemo(() => {
    if (!availableCities || !selectedState) return [];
    return availableCities.filter(city => city.state === selectedState);
  }, [availableCities, selectedState]);

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

  // Handle country change - reset state and city selections
  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setSelectedState('');
    setSelectedCity('');
    setSelectedCities([]);
  };

  // Handle state change - reset city selection
  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedCity('');
  };

  // Handle primary city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    // Add to selected cities if not already there
    const cityString = `${city}, ${selectedState}`;
    if (!selectedCities.includes(cityString)) {
      setSelectedCities([cityString, ...selectedCities.filter(c => c !== cityString)]);
    }
  };

  // Add additional service city
  const addServiceCity = (city) => {
    const cityString = `${city}, ${selectedState}`;
    if (!selectedCities.includes(cityString) && selectedCities.length < 10) {
      setSelectedCities([...selectedCities, cityString]);
    }
  };

  // Remove service city
  const removeServiceCity = (cityToRemove) => {
    setSelectedCities(selectedCities.filter(c => c !== cityToRemove));
    // If removing the primary city, clear it
    const [cityName] = cityToRemove.split(', ');
    if (cityName === selectedCity) {
      setSelectedCity('');
    }
  };

  const signUpWithPassword = async (values) => {
    // Validate service area selection
    if (!selectedCountry) {
      toast({
        variant: "destructive",
        title: "Service Area Required",
        description: "Please select your country.",
      });
      return;
    }
    if (!selectedState) {
      toast({
        variant: "destructive",
        title: "Service Area Required",
        description: "Please select your state/province.",
      });
      return;
    }
    if (!selectedCity) {
      toast({
        variant: "destructive",
        title: "Service Area Required",
        description: "Please select your primary city.",
      });
      return;
    }
    if (selectedCities.length === 0) {
      toast({
        variant: "destructive",
        title: "Service Area Required",
        description: "Please select at least one service city.",
      });
      return;
    }

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
        // Create profile record with initial credits AND service area
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            company_name: values.companyName,
            business_email: data.user.email,
            phone: values.phone,
            credits_remaining: 100, // Grant 100 free credits on signup
            trial_granted: true,
            onboarding_complete: false, // Still need to complete onboarding for credits info
            unlimited: false,
            subscription_status: 'inactive',
            // Service area fields
            country_code: selectedCountry,
            state_code: selectedState,
            city_name: selectedCity,
            service_cities: selectedCities,
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
            // Still proceed with verification
          }
        }

        // Send verification code email
        const { data: codeData, error: codeError } = await supabase.functions.invoke('send-verification-code', {
          body: { email: values.email },
        });

        console.log('Verification code response:', { codeData, codeError });

        if (codeError || !codeData?.success) {
          console.error('Error sending verification code:', codeError || codeData?.error);
          toast({
            variant: "destructive",
            title: "Verification Email Failed",
            description: codeData?.error || "Account created but we couldn't send the verification email. Please try resending from the verification page.",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "We've sent a verification code to your email.",
          });
        }

        // Navigate to verification page with email
        navigate('/verify-email', { state: { email: values.email } });
      }
    } catch (error) {
      throw error;
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
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email address"
                              className="bg-white/90 border-white/30 text-deep-navy placeholder:text-slate/60 focus:bg-white focus:border-teal"
                              {...field}
                            />
                          </FormControl>
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

                  {/* Service Area Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-lightest-slate border-b border-white/10 pb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Service Area
                    </h3>
                    <p className="text-xs text-slate">Select the areas where you operate. You'll only see listings from your selected country.</p>

                    {/* Country Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-lightest-slate flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Country
                      </label>
                      <Select value={selectedCountry} onValueChange={handleCountryChange}>
                        <SelectTrigger className="bg-white/90 border-white/30 text-deep-navy">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">
                            <span className="flex items-center gap-2">🇨🇦 Canada</span>
                          </SelectItem>
                          <SelectItem value="US">
                            <span className="flex items-center gap-2">🇺🇸 United States</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* State/Province Selection */}
                    {selectedCountry && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-lightest-slate">
                          {selectedCountry === 'CA' ? 'Province' : 'State'}
                        </label>
                        <Select value={selectedState} onValueChange={handleStateChange} disabled={citiesLoading}>
                          <SelectTrigger className="bg-white/90 border-white/30 text-deep-navy">
                            <SelectValue placeholder={citiesLoading ? "Loading..." : `Select ${selectedCountry === 'CA' ? 'province' : 'state'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStates.map((state) => (
                              <SelectItem key={state.state} value={state.state}>
                                <span className="flex items-center justify-between w-full">
                                  {getStateName(state.state, selectedCountry)}
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {state.count.toLocaleString()} listings
                                  </Badge>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableStates.length === 0 && !citiesLoading && (
                          <p className="text-xs text-amber-400">No listings available for this country yet.</p>
                        )}
                      </div>
                    )}

                    {/* Primary City Selection */}
                    {selectedState && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-lightest-slate">
                          Primary City
                        </label>
                        <Select value={selectedCity} onValueChange={handleCitySelect}>
                          <SelectTrigger className="bg-white/90 border-white/30 text-deep-navy">
                            <SelectValue placeholder="Select your primary city" />
                          </SelectTrigger>
                          <SelectContent>
                            {citiesInState.map((city) => (
                              <SelectItem key={`${city.city}-${city.state}`} value={city.city}>
                                <span className="flex items-center justify-between w-full">
                                  {city.city}
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {city.count.toLocaleString()} listings
                                  </Badge>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Additional Service Cities */}
                    {selectedCity && citiesInState.length > 1 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-lightest-slate">
                          Add More Service Cities (Optional)
                        </label>
                        <Select onValueChange={addServiceCity}>
                          <SelectTrigger className="bg-white/90 border-white/30 text-deep-navy">
                            <SelectValue placeholder="Add another city" />
                          </SelectTrigger>
                          <SelectContent>
                            {citiesInState
                              .filter(city => !selectedCities.includes(`${city.city}, ${selectedState}`))
                              .map((city) => (
                                <SelectItem key={`add-${city.city}-${city.state}`} value={city.city}>
                                  <span className="flex items-center justify-between w-full">
                                    {city.city}
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {city.count.toLocaleString()}
                                    </Badge>
                                  </span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selected Cities Display */}
                    {selectedCities.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-lightest-slate">
                          Your Service Cities ({selectedCities.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {selectedCities.map((city, index) => (
                            <Badge
                              key={city}
                              variant={index === 0 ? "default" : "secondary"}
                              className={`flex items-center gap-1 ${index === 0 ? 'bg-teal text-deep-navy' : 'bg-white/20 text-lightest-slate'}`}
                            >
                              {index === 0 && <span className="text-xs">Primary:</span>}
                              {city}
                              <button
                                type="button"
                                onClick={() => removeServiceCity(city)}
                                className="ml-1 hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate">
                      You can change your service area later in Settings.
                    </p>
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
                              </Link>,{' '}
                              <Link to="/privacy-policy" className="text-teal hover:underline">
                                Privacy Policy
                              </Link>, and{' '}
                              <Link to="/data-use-agreement" className="text-teal hover:underline">
                                Data Use Agreement
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