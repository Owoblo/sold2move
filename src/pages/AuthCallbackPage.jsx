import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const session = useSession();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // The session is automatically handled by SessionContextProvider.
    // We just need to wait for it to be available and then redirect.
    if (session) {
      console.log('Session found, redirecting to post-auth');
      navigate('/post-auth', { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    // This effect handles the case where the session is not immediately available
    // by listening for the SIGNED_IN event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in successfully, redirecting to post-auth');
        subscription.unsubscribe();
        navigate('/post-auth', { replace: true });
      } else if (event === 'SIGN_IN_ERROR') {
        console.error('Sign in error occurred');
        subscription.unsubscribe();
        navigate('/login?error=auth_failed', { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed, redirecting to post-auth');
        subscription.unsubscribe();
        navigate('/post-auth', { replace: true });
      }
    });

    // Set a timeout to handle cases where auth state change doesn't fire
    const timeout = setTimeout(() => {
      console.log('Auth callback timeout, checking session manually');
      if (session) {
        navigate('/post-auth', { replace: true });
      } else {
        navigate('/login?error=timeout', { replace: true });
      }
    }, 10000); // 10 second timeout

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase, navigate, session]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green mb-4"></div>
      <h1 className="text-2xl font-bold font-heading">Finalizing sign in...</h1>
      <p className="text-slate">Please wait while we securely connect to your account.</p>
    </div>
  );
};

export default AuthCallbackPage;