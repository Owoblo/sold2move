import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AuthErrorDisplay from '@/components/ui/AuthErrorDisplay';
import { useOffline } from '@/hooks/useOffline';
import { debugAuthFlow, debugSupabaseError, debugAuthCallback, debugNavigationFlow } from '@/utils/authDebugger';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const supabase = useSupabaseClient();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { isOffline } = useOffline();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      
      // Check for offline state
      if (isOffline) {
        console.warn('⚠️ Device is offline during auth callback');
        setError('offline');
        setIsProcessing(false);
        return;
      }

      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        debugAuthCallback(urlParams, 'OAuth Callback');

        // Handle OAuth errors
        if (error) {
          console.error('❌ OAuth error detected:', { error, errorDescription });
          
          // Provide more specific error messages for mobile users
          if (isMobile) {
            if (error === 'access_denied') {
              setError('mobile_access_denied');
            } else if (error === 'popup_closed_by_user') {
              setError('mobile_popup_closed');
            } else {
              setError('mobile_auth_failed');
            }
          } else {
            setError('auth_failed');
          }
          
          setIsProcessing(false);
          return;
        }

        // If we have a code, exchange it for a session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            // Provide mobile-specific error handling
            if (isMobile) {
              if (exchangeError.message.includes('invalid_grant') || exchangeError.message.includes('code_expired')) {
                setError('mobile_code_expired');
              } else {
                setError('mobile_session_failed');
              }
            } else {
              setError('session_failed');
            }
            setIsProcessing(false);
            return;
          }

          if (data.session) {
            // Add a longer delay for mobile devices to ensure session is fully established
            const delay = isMobile ? 500 : 100;
            setTimeout(() => {
              navigate('/post-auth', { replace: true });
            }, delay);
            return;
          } else {
            console.warn('⚠️ Code exchange succeeded but no session returned');
            if (isMobile) {
              setError('mobile_session_failed');
            } else {
              setError('session_failed');
            }
            setIsProcessing(false);
            return;
          }
        }

        // If we already have a session, redirect
        if (session) {
          navigate('/post-auth', { replace: true });
          return;
        }

        // If no code and no session, something went wrong
        setError('no_code');
        setIsProcessing(false);

      } catch (err) {
        console.error('Auth callback error:', err);
        setError('unexpected');
        setIsProcessing(false);
      }
    };

    // Listen for auth state changes as a fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        navigate('/post-auth', { replace: true });
      } else if (event === 'SIGN_IN_ERROR') {
        subscription.unsubscribe();
        setError('auth_failed');
        setIsProcessing(false);
      }
    });

    // Set a timeout to handle cases where auth doesn't complete
    const timeoutId = setTimeout(() => {
      setError('timeout');
      setIsProcessing(false);
    }, 10000); // 10 second timeout

    // Process the callback
    handleAuthCallback();

    // Clean up timeout when component unmounts or auth completes
    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, navigate, location, session]);

  const handleRetry = () => {
    setIsRetrying(true);
    setError(null);
    setIsProcessing(true);
    // Retry the auth callback
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal mb-4"></div>
          <h1 className="text-2xl font-bold font-heading">Finalizing sign in...</h1>
          <p className="text-slate">Please wait while we securely connect to your account.</p>
        </>
      ) : (
        <AuthErrorDisplay
          error={error}
          onRetry={handleRetry}
          onGoBack={handleGoBack}
          isRetrying={isRetrying}
        />
      )}
    </div>
  );
};

export default AuthCallbackPage;