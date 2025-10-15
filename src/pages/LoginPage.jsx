import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validationSchemas';
import PageWrapper from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import GoogleIcon from '@/components/icons/GoogleIcon';
import LoadingButton from '@/components/ui/LoadingButton';
import AuthErrorDisplay from '@/components/ui/AuthErrorDisplay';
import { getSiteUrl } from '@/lib/customSupabaseClient';
import { getAndClearIntendedDestination, getDefaultAuthenticatedPath } from '@/utils/authUtils';
import { useOffline } from '@/hooks/useOffline';
import { debugAuthFlow, debugSupabaseError, debugNavigationFlow } from '@/utils/authDebugger';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const LoginPage = () => {
  const supabase = useSupabaseClient();
  const { signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isOffline, wasOffline, setWasOffline } = useOffline();

  // Get intended destination from localStorage or location state (don't clear it yet)
  const intendedDestination = localStorage.getItem('intendedDestination');
  const from = intendedDestination || location.state?.from?.pathname || "/dashboard";

  // Handle URL error parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    if (error) {
      setAuthError(error);
    }
  }, [location.search]);

  // Handle offline/online state changes
  useEffect(() => {
    if (wasOffline && !isOffline) {
      toast({
        title: "Connection Restored",
        description: "You're back online. You can now sign in.",
        duration: 3000,
      });
      setWasOffline(false);
    }
  }, [isOffline, wasOffline, toast]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;

  const signInWithPassword = async (values) => {
    debugAuthFlow('LOGIN_ATTEMPT', { email: values.email, from });
    
    // Check for offline state
    if (isOffline) {
      toast({
        variant: "destructive",
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      debugAuthFlow('LOGIN_RESPONSE', { 
        hasData: !!data, 
        hasError: !!error, 
        userEmail: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at 
      });

      if (error) {
        debugSupabaseError(error, 'Login Password');
        
        // Enhanced error handling
        let errorMessage = "Something went wrong";
        let errorTitle = "Sign in Failed";
        
        if (error.message.includes('Invalid login credentials')) {
          errorTitle = "Invalid Credentials";
          errorMessage = "The email or password you entered is incorrect. Please check your credentials and try again.";
        } else if (error.message.includes('Email not confirmed')) {
          errorTitle = "Email Not Confirmed";
          errorMessage = "Please check your email and click the confirmation link before signing in.";
        } else if (error.message.includes('Too many requests')) {
          errorTitle = "Too Many Attempts";
          errorMessage = "You've made too many sign-in attempts. Please wait a few minutes before trying again.";
        } else {
          errorMessage = error.message;
        }

        toast({
          variant: "destructive",
          title: errorTitle,
          description: errorMessage,
        });
      } else {
        debugNavigationFlow('LoginPage', from, 'Successful Login');
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };


  const handleRetry = () => {
    setIsRetrying(true);
    setAuthError(null);
    // Clear URL parameters
    navigate('/login', { replace: true });
    setTimeout(() => setIsRetrying(false), 1000);
  };

  const handleMobileFallback = () => {
    // For mobile users having OAuth issues, show a message to use email/password
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      toast({
        title: "Mobile Sign-in Tip",
        description: "If Google sign-in isn't working on your mobile device, please use the email and password form below for a more reliable experience.",
        duration: 8000,
      });
    } else {
      toast({
        title: "Sign-in Tip",
        description: "If Google sign-in isn't working, please use the email and password form below.",
        duration: 5000,
      });
    }
  };

  const handleGoBack = () => {
    setAuthError(null);
    navigate('/login', { replace: true });
  };

  return (
    <PageWrapper
      title="Sign In"
      description="Access your Sold2Move dashboard."
    >
      <div className="container mx-auto px-6 py-20 flex justify-center items-center">
        {authError ? (
          <AuthErrorDisplay
            error={authError}
            onRetry={handleRetry}
            onGoBack={handleGoBack}
            isRetrying={isRetrying}
          />
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-heading">Sign In to Your Account</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(signInWithPassword)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-light-slate">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@company.com" {...field} disabled={isSubmitting || googleLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-light-slate">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting || googleLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <LoadingButton type="submit" className="w-full bg-teal text-deep-navy hover:bg-teal/90" isLoading={isSubmitting} disabled={googleLoading}>
                  Sign In
                </LoadingButton>
              </form>
            </Form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-lightest-navy/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-light-navy px-2 text-slate">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <LoadingButton 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2" 
                onClick={signInWithGoogle} 
                isLoading={googleLoading} 
                disabled={isSubmitting}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </LoadingButton>
              
            </div>
            <div className="mt-6 text-center text-sm space-y-2">
              <p className="text-slate">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-teal hover:underline">
                  Sign up
                </Link>
              </p>
              <p className="text-slate">
                Forgot your password?{' '}
                <Link to="/forgot-password" className="font-medium text-teal hover:underline">
                  Reset it here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </PageWrapper>
  );
};

export default LoginPage;