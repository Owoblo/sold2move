
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogOut, Home } from 'lucide-react';
import { getAndClearIntendedDestination, getDefaultAuthenticatedPath } from '@/utils/authUtils';
import { debugAuthFlow, debugSupabaseError, debugUserState, debugProfileState, debugDatabaseOperation, debugNavigationFlow } from '@/utils/authDebugger';

const MAX_RETRIES = 3;
const TIMEOUT_DURATION = 15000; // 15 seconds before showing error state

const PostAuthPage = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = useSupabaseClient();
  const { session, signOut } = useAuth();
  const { toast } = useToast();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const timeoutRef = useRef(null);
  const hasAttemptedCreation = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Set up stuck detection timeout
  useEffect(() => {
    if (profileLoading || isCreatingProfile) {
      timeoutRef.current = setTimeout(() => {
        console.log('⚠️ PostAuthPage: Stuck detection triggered');
        setIsStuck(true);
        setErrorMessage('Taking longer than expected. You can try again or continue to dashboard.');
      }, TIMEOUT_DURATION);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [profileLoading, isCreatingProfile]);

  // Create profile if it doesn't exist
  const createProfileIfNeeded = async () => {
    debugAuthFlow('PROFILE_CREATION_CHECK', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasProfile: !!profile,
      profileLoading,
      isCreatingProfile,
      retryCount
    });

    if (!session?.user || profile || profileLoading || isCreatingProfile) {
      console.log('🔍 Profile creation skipped:', {
        reason: !session?.user ? 'no session' :
                profile ? 'profile exists' :
                profileLoading ? 'profile loading' :
                'already creating'
      });
      return;
    }

    if (retryCount >= MAX_RETRIES) {
      console.log('❌ Max retries reached, showing error state');
      setIsStuck(true);
      setErrorMessage('Unable to set up your account after multiple attempts. Please try again or contact support.');
      return;
    }

    setIsCreatingProfile(true);
    setIsStuck(false);
    setErrorMessage(null);
    hasAttemptedCreation.current = true;

    try {
      debugUserState(session.user, 'Creating Profile For');

      // First, verify the user exists in auth.users
      console.log('🔍 Verifying user exists in auth.users...');
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser.user) {
        console.error('❌ User not found in auth.users:', authError);
        // Don't throw - handle gracefully and redirect to login
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Session expired. Please log in again.",
        });
        navigate('/login', { replace: true });
        return;
      }
      console.log('✅ User verified in auth.users:', authUser.user.id);
      // First, check if profile already exists
      console.log('🔍 Checking if profile already exists...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      console.log('🔍 Profile check result:', {
        hasData: !!existingProfile,
        errorCode: checkError?.code,
        errorMessage: checkError?.message
      });

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('❌ Error checking existing profile:', checkError);
        throw checkError;
      }

      if (existingProfile) {
        console.log('✅ Profile already exists, refreshing...');
        await refreshProfile();
        return;
      }

      console.log('🔄 Profile does not exist, creating new one...');

      // Extract user metadata if available
      const userMetadata = session.user.user_metadata || {};

      // Create new profile with all required fields
      // Note: first_name, last_name are stored in auth.users metadata, not in profiles table
      const profileData = {
        id: session.user.id,
        business_email: session.user.email,
        phone: userMetadata.phone || null,
        credits_remaining: 100, // Give 100 free credits on signup
        trial_granted: true,
        onboarding_complete: false,
        unlimited: false,
        subscription_status: 'inactive',
        service_cities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      debugDatabaseOperation('INSERT', 'profiles', profileData);

      const { error } = await supabase
        .from('profiles')
        .insert(profileData);

      if (error) {
        debugSupabaseError(error, 'Profile Creation');
        debugDatabaseOperation('INSERT', 'profiles', profileData, error);
        
        // If it's a duplicate key error, the profile was created by another process
        if (error.code === '23505') {
          console.log('✅ Profile was created by another process, refreshing...');
          await refreshProfile();
        } else {
          // Log the specific database error for debugging
          console.error('❌ Database error details:', {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            errorStatus: error.status,
            errorStatusText: error.statusText
          });
          throw error;
        }
      } else {
        console.log('✅ Profile created successfully!');
        await refreshProfile();
      }
    } catch (error) {
      console.error('❌ CRITICAL: Failed to create profile:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Error stack:', error.stack);

      // Handle specific database errors
      let userMessage = "There was an error setting up your account. Please try again.";

      if (error.message?.includes('permission denied')) {
        userMessage = "Database permission error. Please contact support.";
        console.error('❌ PERMISSION DENIED ERROR - Check RLS policies');
      } else if (error.message?.includes('duplicate key')) {
        userMessage = "Account already exists. Redirecting...";
        console.log('✅ Duplicate key - profile exists, refreshing...');
        await refreshProfile();
        return;
      } else if (error.message?.includes('foreign key')) {
        userMessage = "Session issue. Please try logging in again.";
        console.error('❌ FOREIGN KEY ERROR - User not in auth.users table');
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        userMessage = "Database configuration error. Please contact support.";
        console.error('❌ TABLE MISSING ERROR - profiles table does not exist');
      } else if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        userMessage = "Database schema error. Please contact support.";
        console.error('❌ COLUMN MISSING ERROR - profiles table schema incorrect');
      } else if (error.message) {
        userMessage = `Error: ${error.message}`;
        console.error('❌ UNKNOWN DATABASE ERROR:', error.message);
      }

      // Show detailed error in console for debugging
      console.error('❌ USER-FACING ERROR MESSAGE:', userMessage);

      setRetryCount(prev => prev + 1);
      setErrorMessage(userMessage);
      setIsStuck(true);

      toast({
        variant: "destructive",
        title: "Profile Setup Issue",
        description: userMessage,
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  // Manual retry function
  const handleRetry = async () => {
    console.log('🔄 Manual retry triggered');
    setIsStuck(false);
    setErrorMessage(null);
    setRetryCount(0);
    hasAttemptedCreation.current = false;
    await refreshProfile();
  };

  // Force continue to dashboard (even without profile - will redirect to post-auth again if needed)
  const handleContinueToDashboard = () => {
    console.log('🔄 Force continue to dashboard');
    const destination = getAndClearIntendedDestination() || '/dashboard';
    navigate(destination, { replace: true });
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('🔄 User requested logout from PostAuthPage');
    await signOut();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    console.log('🔍 PostAuthPage: useEffect triggered', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      profileLoading,
      hasProfile: !!profile,
      isCreatingProfile,
      isStuck,
      retryCount
    });

    // Only attempt creation if we haven't already tried and failed
    if (session?.user && !profileLoading && !profile && !isCreatingProfile && !isStuck) {
      console.log('🔄 PostAuthPage: Conditions met, calling createProfileIfNeeded');
      createProfileIfNeeded();
    } else {
      console.log('🔍 PostAuthPage: Conditions not met, skipping profile creation', {
        reason: !session?.user ? 'no session/user' :
                profileLoading ? 'profile loading' :
                profile ? 'profile exists' :
                isStuck ? 'stuck state active' :
                'already creating'
      });
    }
  }, [session, profile, profileLoading, isCreatingProfile, isStuck]);

  useEffect(() => {
    // Redirect immediately if profile exists - no need to stay on this page
    if (!profileLoading && profile) {
      debugProfileState(profile, 'Profile Loaded');

      const destination = profile.onboarding_complete
        ? (getAndClearIntendedDestination() || location.state?.from?.pathname || getDefaultAuthenticatedPath())
        : '/welcome';

      debugNavigationFlow('PostAuthPage', destination, profile.onboarding_complete ? 'Onboarding Complete' : 'Onboarding Required');

      // Navigate immediately - delay can cause issues
      navigate(destination, { replace: true });
    }

    // If no session at all, redirect to login
    if (!profileLoading && !profile && !session) {
      console.log('🔍 PostAuthPage: No session, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [profile, profileLoading, session, navigate, location.state]);

  // Show error/stuck state with recovery options
  if (isStuck || errorMessage) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate p-4">
        <div className="bg-light-navy/30 rounded-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Session Setup Issue</h2>
          <p className="text-slate mb-6">
            {errorMessage || 'Something went wrong while setting up your account.'}
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full bg-teal text-deep-navy hover:bg-teal/90"
              disabled={isCreatingProfile}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isCreatingProfile ? 'animate-spin' : ''}`} />
              {retryCount > 0 ? `Try Again (${MAX_RETRIES - retryCount} left)` : 'Try Again'}
            </Button>

            <Button
              onClick={handleContinueToDashboard}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Continue to Dashboard
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-slate hover:text-lightest-slate"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out & Try Again
            </Button>
          </div>

          <p className="text-xs text-slate mt-6">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      <LoadingSpinner size="xl" />
      <p className="text-light-slate mt-4">
        {isCreatingProfile ? 'Setting up your account...' : 'Finalizing your session...'}
      </p>
      {retryCount > 0 && (
        <p className="text-slate text-sm mt-2">Attempt {retryCount + 1} of {MAX_RETRIES + 1}</p>
      )}
    </div>
  );
};

export default PostAuthPage;
