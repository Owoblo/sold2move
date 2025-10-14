import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = async (data) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);
    
    if (!error) {
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
        <Helmet>
          <title>Check Your Email | Sold2Move</title>
          <meta name="description" content="Password reset email sent. Check your inbox for instructions." />
        </Helmet>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="bg-light-navy border-border">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-lightest-slate mb-2">
                  Check Your Email
                </h1>
                <p className="text-slate">
                  We've sent you a password reset link. Please check your inbox and spam folder.
                </p>
              </div>
              
              <div className="space-y-4">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Link>
                </Button>
                
                <p className="text-sm text-slate">
                  Didn't receive the email?{' '}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-teal hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
      <Helmet>
        <title>Forgot Password | Sold2Move</title>
        <meta name="description" content="Reset your password to regain access to your account." />
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-light-navy border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-lightest-slate">
              Forgot Password?
            </CardTitle>
            <p className="text-slate mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-lightest-slate">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
