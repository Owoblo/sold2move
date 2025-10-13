import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const SessionExpiredModal = ({ onRetry, onGoToLogin }) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - refresh the page
      window.location.reload();
    }
  };

  const handleGoToLogin = () => {
    if (onGoToLogin) {
      onGoToLogin();
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-light-navy border-orange-500/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
          <CardTitle className="text-xl text-orange-400">Session Expired</CardTitle>
          <CardDescription className="text-slate">
            Your session has expired. Please sign in again to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-deep-navy/50 rounded-lg p-3">
            <p className="text-sm text-lightest-slate">
              <strong>What happened?</strong> Your authentication session has timed out for security reasons.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              className="w-full bg-teal text-deep-navy hover:bg-teal/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              onClick={handleGoToLogin}
              variant="outline"
              className="w-full border-slate text-slate hover:bg-slate/10"
            >
              Sign In Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionExpiredModal;
