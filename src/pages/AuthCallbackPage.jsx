import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🔍 AuthCallbackPage: Starting auth callback handling');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Current session:', session ? 'exists' : 'none');
      
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
          setError(`Authentication failed: ${errorDescription || error}`);
          setIsProcessing(false);
          setTimeout(() => {
            navigate('/login?error=auth_failed', { replace: true });
          }, 3000);
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
            setError(`Session exchange failed: ${exchangeError.message}`);
            setIsProcessing(false);
            setTimeout(() => {
              navigate('/login?error=session_failed', { replace: true });
            }, 3000);
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
        setError('No authentication code received');
        setIsProcessing(false);
        setTimeout(() => {
          navigate('/login?error=no_code', { replace: true });
        }, 3000);

      } catch (err) {
        console.error('Auth callback error:', err);
        setError(`Unexpected error: ${err.message}`);
        setIsProcessing(false);
        setTimeout(() => {
          navigate('/login?error=unexpected', { replace: true });
        }, 3000);
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
        setError('Sign in failed');
        setIsProcessing(false);
        setTimeout(() => {
          navigate('/login?error=auth_failed', { replace: true });
        }, 3000);
      }
    });

    // Set a timeout to handle cases where auth doesn't complete
    const timeout = setTimeout(() => {
      console.log('Auth callback timeout');
      if (!session && !error) {
        setError('Authentication timed out');
        setIsProcessing(false);
        setTimeout(() => {
          navigate('/login?error=timeout', { replace: true });
        }, 3000);
      }
    }, 15000); // 15 second timeout

    // Process the callback
    handleAuthCallback();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase, navigate, location, session]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green mb-4"></div>
          <h1 className="text-2xl font-bold font-heading">Finalizing sign in...</h1>
          <p className="text-slate">Please wait while we securely connect to your account.</p>
        </>
      ) : (
        <>
          <div className="rounded-full h-32 w-32 border-2 border-red-500 mb-4 flex items-center justify-center">
            <span className="text-red-500 text-4xl">⚠</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-red-400">Authentication Error</h1>
          <p className="text-slate text-center max-w-md">{error}</p>
          <p className="text-slate text-sm mt-2">Redirecting to login page...</p>
        </>
      )}
    </div>
  );
};

export default AuthCallbackPage;