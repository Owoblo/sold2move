import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const pollProfile = async () => {
      for (let i = 0; i < 5; i++) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .single();

        if (error) {
          console.error('Polling error:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (profile && ['active', 'trialing'].includes(profile.subscription_status)) {
          setStatus('success');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      setStatus('timeout');
    };

    pollProfile();
  }, [sessionId, supabase]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-12 w-12 text-green animate-spin" />
            <h1 className="text-2xl font-bold text-lightest-slate mt-4">Finalizing your subscription...</h1>
            <p className="text-slate mt-2">Please wait while we confirm your payment.</p>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green" />
            <h1 className="text-3xl font-bold text-lightest-slate mt-4">Payment Successful!</h1>
            <p className="text-slate mt-2">Your subscription is now active. Welcome aboard!</p>
            <Button asChild className="mt-6 bg-green text-deep-navy hover:bg-green/90">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        );
      case 'timeout':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green" />
            <h1 className="text-3xl font-bold text-lightest-slate mt-4">Payment Received!</h1>
            <p className="text-slate mt-2">We've confirmed your payment. Your account will be updated shortly.</p>
            <Button asChild className="mt-6 bg-green text-deep-navy hover:bg-green/90">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        );
      case 'error':
      default:
        return (
          <>
            <h1 className="text-2xl font-bold text-red-400">An Error Occurred</h1>
            <p className="text-slate mt-2">There was an issue confirming your session. Please check your billing page or contact support.</p>
            <Button asChild className="mt-6">
              <Link to="/dashboard/billing">Check My Subscription</Link>
            </Button>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto p-8 bg-light-navy rounded-lg shadow-xl">
        {renderContent()}
        {sessionId && (
          <div className="mt-8 text-xs text-slate/50 text-left bg-deep-navy p-3 rounded">
            <p className="font-mono break-all">Session ID: {sessionId}</p>
          </div>
        )}
      </div>
    </div>
  );
}