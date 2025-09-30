import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

// Enhanced error handling with user-friendly messages
const getAuthErrorMessage = (error) => {
  const errorMap = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please check your email and click the confirmation link.',
    'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Invalid email': 'Please enter a valid email address.',
  };
  
  return errorMap[error.message] || error.message || 'Something went wrong. Please try again.';
};

export const AuthProvider = ({ children }) => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  const user = session?.user ?? null;
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (session !== undefined) {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [session]);

  const signUp = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Sign up Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please check your inbox and spam folder.",
          duration: 8000,
        });
      }

      return { data, error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Sign in Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: `Signed in as ${data.user.email}`,
          duration: 3000,
        });
      }

      return { data, error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Google Sign in Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Google Sign in Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign out Failed",
          description: error.message || "Something went wrong",
        });
        return { error };
      }

      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
        duration: 3000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isInitialized,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }), [user, session, loading, isInitialized, signUp, signIn, signInWithGoogle, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {isInitialized ? children : (
        <div className="flex items-center justify-center min-h-screen bg-deep-navy">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};