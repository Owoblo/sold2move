import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { getSiteUrl } from '@/lib/customSupabaseClient';

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
    // Ensure session is fully loaded before setting loading to false
    if (session !== undefined) {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [session]);

  // Handle auth state changes and session persistence
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Session will be automatically updated by useSession hook
      } else if (event === 'SIGNED_OUT') {
        // Clear any stored intended destination
        localStorage.removeItem('intendedDestination');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed successfully
      } else if (event === 'PASSWORD_RECOVERY') {
        // Password recovery initiated
      } else if (event === 'SIGNED_OUT' && !session) {
        // Clear any stored intended destination on session expiry
        localStorage.removeItem('intendedDestination');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
      const siteUrl = getSiteUrl();
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      const oauthOptions = {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      };

      // Add mobile-specific options
      if (isMobile) {
        // For mobile, use different prompts and ensure proper redirect handling
        oauthOptions.queryParams.prompt = 'select_account';
        
        // For iOS, add additional parameters to help with redirect issues
        if (isIOS) {
          oauthOptions.queryParams.include_granted_scopes = 'true';
        }
        
        // For Android, ensure proper redirect handling
        if (isAndroid) {
          oauthOptions.queryParams.response_type = 'code';
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: oauthOptions,
      });

      if (error) {
        console.error('❌ Google OAuth error:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
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

  // Password Reset
  const resetPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`,
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Password Reset Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password.",
        duration: 8000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Update Password
  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      toast({
        title: "Password updated successfully",
        description: "Your password has been changed.",
        duration: 3000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Update Email
  const updateEmail = useCallback(async (newEmail) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Email Update Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      toast({
        title: "Email update initiated",
        description: "Check your new email for a confirmation link.",
        duration: 8000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Email Update Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Resend Email Verification
  const resendVerification = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/callback`
        }
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Verification Email Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      toast({
        title: "Verification email sent",
        description: "Check your email for the verification link.",
        duration: 8000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Verification Email Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Sign in with GitHub
  const signInWithGitHub = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`,
        },
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "GitHub Sign in Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "GitHub Sign in Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Sign in with LinkedIn
  const signInWithLinkedIn = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin',
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`,
        },
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "LinkedIn Sign in Failed",
          description: friendlyMessage,
        });
        return { error };
      }

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "LinkedIn Sign in Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase.auth, toast]);

  // Get User Sessions (for session management)
  const getUserSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [supabase.auth]);

  // Sign out from all devices
  const signOutAllDevices = useCallback(async () => {
    try {
      // This would require a custom function in Supabase
      // For now, we'll just sign out the current session
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign out Failed",
          description: error.message || "Something went wrong",
        });
        return { error };
      }

      toast({
        title: "Signed out from all devices",
        description: "You have been signed out from all devices.",
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

  // Delete Account
  const deleteAccount = useCallback(async () => {
    try {
      // First, we need to delete user data from our custom tables
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Then delete the auth user
      const { error } = await supabase.auth.admin.deleteUser(user?.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Account Deletion Failed",
          description: error.message || "Something went wrong",
        });
        return { error };
      }

      toast({
        title: "Account deleted successfully",
        description: "Your account and all data have been permanently deleted.",
        duration: 5000,
      });

      return { error: null };
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Account Deletion Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error: err };
    }
  }, [supabase, user?.id, toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isInitialized,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    resendVerification,
    getUserSessions,
    signOutAllDevices,
    deleteAccount,
  }), [
    user, 
    session, 
    loading, 
    isInitialized, 
    signUp, 
    signIn, 
    signInWithGoogle,
    signInWithGitHub,
    signInWithLinkedIn,
    signOut, 
    resetPassword,
    updatePassword,
    updateEmail,
    resendVerification,
    getUserSessions,
    signOutAllDevices,
    deleteAccount
  ]);

  return (
    <AuthContext.Provider value={value}>
      {isInitialized ? children : (
        <div className="flex items-center justify-center min-h-screen bg-deep-navy">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal"></div>
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