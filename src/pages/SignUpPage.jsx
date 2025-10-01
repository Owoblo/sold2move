import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@/lib/validationSchemas';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import PageWrapper from '@/components/layout/PageWrapper';
import GoogleIcon from '@/components/icons/GoogleIcon';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingButton from '@/components/ui/LoadingButton';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;

  const signUpWithPassword = async (values) => {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    } else if (data.user) {
      // Grant free credits via Edge Function
      const { error: functionError } = await supabase.functions.invoke('grant-signup-bonus', {
        body: JSON.stringify({ user_id: data.user.id }),
      });

      if (functionError) {
        console.error('Failed to grant signup bonus:', functionError);
        // Don't block user flow, but log the error. The bonus can be granted later.
        toast({
          variant: "destructive",
          title: "Bonus Credit Error",
          description: "Could not grant signup bonus. Please contact support.",
        });
      }
      
      navigate('/signup-success');
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast({
          variant: "destructive",
          title: "Google Sign in Failed",
          description: error.message || "Something went wrong. Please try again.",
        });
      }
      // Don't set loading to false here - let the redirect handle it
    } catch (err) {
      console.error('Google OAuth exception:', err);
      setGoogleLoading(false);
      toast({
        variant: "destructive",
        title: "Google Sign in Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <PageWrapper title="Sign Up" description="Create an account to get started with Sold2Move.">
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading">Create an Account</CardTitle>
            <CardDescription>Join our network and start finding leads today.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(signUpWithPassword)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@company.com" {...field} disabled={isSubmitting || googleLoading} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} disabled={isSubmitting || googleLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <LoadingButton type="submit" className="w-full bg-green text-deep-navy hover:bg-green/90" isLoading={isSubmitting} disabled={googleLoading}>
                  Sign Up
                </LoadingButton>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-lightest-navy/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-light-navy px-2 text-slate">Or continue with</span>
              </div>
            </div>

            <LoadingButton variant="outline" className="w-full" onClick={signInWithGoogle} isLoading={googleLoading} disabled={isSubmitting}>
              <GoogleIcon className="mr-2 h-4 w-4" />
              Google
            </LoadingButton>

            <p className="mt-6 text-center text-sm text-slate">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-green hover:text-green/90">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default SignUpPage;