import React, { useState } from 'react';
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

const LoginPage = () => {
  const supabase = useSupabaseClient();
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/post-auth";

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;

  const signInWithPassword = async (values) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    } else {
      navigate(from, { replace: true });
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setGoogleLoading(false);
      toast({
        variant: "destructive",
        title: "Google Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }
  };

  return (
    <PageWrapper
      title="Sign In"
      description="Access your Sold2Move dashboard."
    >
      <div className="container mx-auto px-6 py-20 flex justify-center items-center">
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
                <LoadingButton type="submit" className="w-full bg-green text-deep-navy hover:bg-green/90" isLoading={isSubmitting} disabled={googleLoading}>
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
            <LoadingButton variant="outline" className="w-full flex items-center justify-center gap-2" onClick={signInWithGoogle} isLoading={googleLoading} disabled={isSubmitting}>
              <GoogleIcon />
              <span>Google</span>
            </LoadingButton>
            <div className="mt-6 text-center text-sm">
              <p className="text-slate">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-green hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default LoginPage;