import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AuthErrorDisplay from '@/components/ui/AuthErrorDisplay';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const supabase = useSupabaseClient();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      
      console.log('🔍 AuthCallbackPage: Starting auth callback handling');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Current session:', session ? 'exists' : 'none');
      console.log('🔍 Device info:', {
        isMobile,
        isPWA,
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search
      });
      
      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        console.log('🔍 URL Parameters:', {
          code: code ? 'present' : 'missing',
          error: error || 'none',
          errorDescription: errorDescription || 'none',
          fullSearch: location.search
        });

        // Handle OAuth errors
        if (error) {
          console.error('❌ OAuth error detected:', { error, errorDescription });
          
          // Provide more specific error messages for mobile users
          if (isMobile) {
            console.log('📱 Mobile OAuth error detected');
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
          console.log('🔄 Exchanging OAuth code for session...');
          console.log('🔄 Code length:', code.length);
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('❌ Code exchange error:', {
              message: exchangeError.message,
              status: exchangeError.status,
              code: exchangeError.code,
              details: exchangeError
            });
            setError(`session_failed`);
            setIsProcessing(false);
            return;
          }

          console.log('✅ Code exchange successful:', {
            hasSession: !!data.session,
            hasUser: !!data.user,
            sessionId: data.session?.access_token?.substring(0, 20) + '...',
            userId: data.user?.id
          });

          if (data.session) {
            console.log('🎉 Session created successfully, redirecting to post-auth');
            // Add a small delay to ensure the session is fully established
            setTimeout(() => {
              navigate('/post-auth', { replace: true });
            }, 100);
            return;
          } else {
            console.warn('⚠️ Code exchange succeeded but no session returned');
          }
        }

        // If we already have a session, redirect
        if (session) {
          console.log('✅ Session already exists, redirecting to post-auth');
          console.log('✅ Session details:', {
            userId: session.user?.id,
            email: session.user?.email,
            expiresAt: session.expires_at
          });
          navigate('/post-auth', { replace: true });
          return;
        }

        // If no code and no session, something went wrong
        console.warn('⚠️ No code or session found in callback');
        console.warn('⚠️ This might indicate a redirect issue or missing OAuth configuration');
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
      console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in successfully, redirecting to post-auth');
        subscription.unsubscribe();
        navigate('/post-auth', { replace: true });
      } else if (event === 'SIGN_IN_ERROR') {
        console.error('Sign in error occurred');
        subscription.unsubscribe();
        setError('auth_failed');
        setIsProcessing(false);
      }
    });

    // Set a timeout to handle cases where auth doesn't complete
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Auth callback timeout - redirecting to login');
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