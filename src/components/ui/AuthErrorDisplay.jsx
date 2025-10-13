import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AuthErrorDisplay = ({ error, onRetry, onGoBack, isRetrying = false }) => {
  const getErrorDetails = (error) => {
    if (error.includes('auth_failed')) {
      return {
        title: 'Authentication Failed',
        description: 'We couldn\'t verify your identity. This might be due to a temporary issue with the authentication provider.',
        suggestion: 'Please try signing in again or use a different method.',
        icon: '🔐'
      };
    }
    
    if (error.includes('session_failed')) {
      return {
        title: 'Session Creation Failed',
        description: 'Your authentication was successful, but we couldn\'t create your session.',
        suggestion: 'Please try signing in again. If the problem persists, contact support.',
        icon: '⚠️'
      };
    }
    
    if (error.includes('no_code')) {
      return {
        title: 'Authentication Code Missing',
        description: 'We didn\'t receive the authentication code from the provider.',
        suggestion: 'Please try signing in again. Make sure you\'re not blocking popups or redirects.',
        icon: '🔑'
      };
    }
    
    if (error.includes('timeout')) {
      return {
        title: 'Authentication Timed Out',
        description: 'The authentication process took too long to complete.',
        suggestion: 'Please try again. Check your internet connection and try signing in.',
        icon: '⏱️'
      };
    }
    
    if (error.includes('mobile_access_denied')) {
      return {
        title: 'Access Denied on Mobile',
        description: 'Google sign-in was cancelled or denied on your mobile device.',
        suggestion: 'Please try again or use the email and password form below for a more reliable mobile experience.',
        icon: '📱'
      };
    }
    
    if (error.includes('mobile_popup_closed')) {
      return {
        title: 'Sign-in Window Closed',
        description: 'The Google sign-in window was closed before completing authentication.',
        suggestion: 'Please try again or use the email and password form below for a more reliable mobile experience.',
        icon: '📱'
      };
    }
    
    if (error.includes('mobile_auth_failed')) {
      return {
        title: 'Mobile Sign-in Failed',
        description: 'Google sign-in encountered an issue on your mobile device.',
        suggestion: 'Please try the email and password form below for a more reliable mobile experience.',
        icon: '📱'
      };
    }
    
    if (error.includes('offline')) {
      return {
        title: 'No Internet Connection',
        description: 'You need an internet connection to sign in.',
        suggestion: 'Please check your internet connection and try again.',
        icon: '📶'
      };
    }
    
    if (error.includes('unexpected')) {
      return {
        title: 'Unexpected Error',
        description: 'Something went wrong during the authentication process.',
        suggestion: 'Please try again. If the problem continues, contact our support team.',
        icon: '❌'
      };
    }
    
    // Default error
    return {
      title: 'Authentication Error',
      description: error || 'An unknown error occurred during authentication.',
      suggestion: 'Please try signing in again or contact support if the problem persists.',
      icon: '⚠️'
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <Card className="w-full max-w-md bg-light-navy border-red-500/20">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">{errorDetails.icon}</span>
        </div>
        <CardTitle className="text-xl text-red-400">{errorDetails.title}</CardTitle>
        <CardDescription className="text-slate">
          {errorDetails.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-deep-navy/50 rounded-lg p-3">
          <p className="text-sm text-lightest-slate">
            <strong>Suggestion:</strong> {errorDetails.suggestion}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full bg-teal text-deep-navy hover:bg-teal/90"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
          
          {onGoBack && (
            <Button
              onClick={onGoBack}
              variant="outline"
              className="w-full border-slate text-slate hover:bg-slate/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-slate">
            Still having trouble?{' '}
            <a 
              href="mailto:support@sold2move.com" 
              className="text-teal hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthErrorDisplay;
