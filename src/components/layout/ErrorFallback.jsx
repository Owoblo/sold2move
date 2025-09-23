import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-deep-navy p-4">
      <Card className="w-full max-w-lg bg-light-navy border-red-500/50 text-lightest-slate">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-400 font-heading">Oops! Something went wrong.</CardTitle>
          <CardDescription className="text-slate">
            We've encountered an unexpected issue. Please try again, or return to the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-deep-navy p-3 rounded-md text-xs text-slate overflow-auto max-h-32">
            <pre>
              <code>{error.message}</code>
            </pre>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button onClick={resetErrorBoundary} className="bg-green text-deep-navy hover:bg-green/90">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ErrorFallback;