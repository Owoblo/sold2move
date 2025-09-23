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
      navigate('/post-auth', { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    // This effect handles the case where the session is not immediately available
    // by listening for the SIGNED_IN event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        navigate('/post-auth', { replace: true });
      } else if (event === 'SIGN_IN_ERROR') {
        subscription.unsubscribe();
        navigate('/login', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green mb-4"></div>
      <h1 className="text-2xl font-bold font-heading">Finalizing sign in...</h1>
      <p className="text-slate">Please wait while we securely connect to your account.</p>
    </div>
  );
};

export default AuthCallbackPage;