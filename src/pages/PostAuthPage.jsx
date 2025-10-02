
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const PostAuthPage = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = useSupabaseClient();
  const session = useSession();
  const { toast } = useToast();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Create profile if it doesn't exist
  const createProfileIfNeeded = async () => {
    console.log('🔍 PostAuthPage: Checking if profile creation is needed');
    console.log('🔍 Current state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasProfile: !!profile,
      profileLoading,
      isCreatingProfile
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

    console.log('🔄 Creating profile for user:', session.user.id);
    console.log('🔄 User details:', {
      id: session.user.id,
      email: session.user.email,
      created_at: session.user.created_at,
      last_sign_in_at: session.user.last_sign_in_at
    });
    setIsCreatingProfile(true);

    try {
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

      // Create new profile with all required fields
      const profileData = {
        id: session.user.id,
        business_email: session.user.email,
        credits_remaining: 100, // Give 100 free credits on signup
        trial_granted: true,
        onboarding_complete: false,
        unlimited: false,
        subscription_status: 'inactive',
        service_cities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('🔄 Inserting profile data:', profileData);

      const { error } = await supabase
        .from('profiles')
        .insert(profileData);

      if (error) {
        console.error('❌ Error creating profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If it's a duplicate key error, the profile was created by another process
        if (error.code === '23505') {
          console.log('✅ Profile was created by another process, refreshing...');
          await refreshProfile();
        } else {
          throw error;
        }
      } else {
        console.log('✅ Profile created successfully!');
        await refreshProfile();
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
      
      // Handle specific database errors
      let errorMessage = "There was an error setting up your account. Please try again.";
      
      if (error.message?.includes('permission denied')) {
        errorMessage = "Database permission error. Please contact support.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "Account already exists. Redirecting to login...";
        // Try to refresh profile in case it was created by another process
        await refreshProfile();
        return;
      } else if (error.message?.includes('foreign key')) {
        errorMessage = "User authentication error. Please try logging in again.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }
      
      toast({
        variant: "destructive",
        title: "Profile Creation Failed",
        description: errorMessage,
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  useEffect(() => {
    console.log('🔍 PostAuthPage: useEffect triggered', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      profileLoading,
      hasProfile: !!profile,
      isCreatingProfile
    });

    if (session?.user && !profileLoading && !profile && !isCreatingProfile) {
      console.log('🔄 PostAuthPage: Conditions met, calling createProfileIfNeeded');
      createProfileIfNeeded();
    } else {
      console.log('🔍 PostAuthPage: Conditions not met, skipping profile creation', {
        reason: !session?.user ? 'no session/user' : 
                profileLoading ? 'profile loading' : 
                profile ? 'profile exists' : 
                'already creating'
      });
    }
  }, [session, profile, profileLoading, isCreatingProfile]);

  useEffect(() => {
    if (!profileLoading && profile) {
      console.log('Profile loaded:', profile);
      if (profile.onboarding_complete) {
        const from = location.state?.from?.pathname || '/dashboard';
        console.log('Redirecting to dashboard:', from);
        navigate(from, { replace: true });
      } else {
        console.log('Redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      }
    }
  }, [profile, profileLoading, navigate, location.state]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      <LoadingSpinner size="xl" />
      <p className="text-light-slate mt-4">
        {isCreatingProfile ? 'Setting up your account...' : 'Finalizing your session...'}
      </p>
    </div>
  );
};

export default PostAuthPage;
