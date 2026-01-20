import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageWrapper from '@/components/layout/PageWrapper';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const SignUpSuccessPage = () => {
  return (
    <PageWrapper>
      <div className="flex items-center justify-center min-h-screen py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-light-navy border-border shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-teal" />
              </div>
              <CardTitle className="text-2xl font-bold text-lightest-slate">
                Account Created Successfully!
              </CardTitle>
              <CardDescription className="text-slate mt-2">
                Welcome to Sold2Move! We're excited to have you on board.
                <br />
                <span className="text-teal font-medium">If you've already verified your email, you can go directly to your dashboard!</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-slate">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm">
                    Please check your email to verify your account
                  </span>
                </div>
                
                <div className="bg-lightest-navy/30 rounded-lg p-4 text-sm text-slate">
                  <p className="font-medium mb-2">What's next?</p>
                  <ul className="space-y-1 text-left">
                    <li>• Check your email for verification code</li>
                    <li>• Enter the code to activate your account</li>
                    <li>• You'll be redirected to your dashboard</li>
                    <li>• Enjoy 1 month free - worth over $500!</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/login">
                    Go to Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full border-teal text-teal hover:bg-teal hover:text-white">
                  <Link to="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">
                    Back to Home
                  </Link>
                </Button>
              </div>

              <div className="text-center text-xs text-slate">
                <p>
                  Didn't receive the email? Check your spam folder or{' '}
                  <Link to="/contact" className="text-teal hover:underline">
                    contact support
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

export default SignUpSuccessPage;