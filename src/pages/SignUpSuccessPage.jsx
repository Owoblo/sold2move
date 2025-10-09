import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';

const SignUpSuccessPage = () => {
  return (
    <PageWrapper
      title="Check Your Email"
      description="Account created successfully. Please verify your email."
    >
      <div className="container mx-auto px-6 py-20 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-teal/10 rounded-full p-3 w-fit">
              <MailCheck className="h-10 w-10 text-teal" />
            </div>
            <CardTitle className="text-3xl font-heading mt-4">Check your inbox!</CardTitle>
            <CardDescription className="text-slate text-base mt-2">
              We've sent a verification link to your email address. Please click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-slate">
              Once verified, you can sign in to your account.
            </p>
            <Button asChild className="w-full bg-teal text-deep-navy hover:bg-teal/90">
              <Link to="/login">Go to Sign In</Link>
            </Button>
            <p className="text-xs text-muted-foreground pt-4">
              Didn't receive the email? Check your spam folder or try signing up again.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default SignUpSuccessPage;