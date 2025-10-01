
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
    if (!session?.user || profile || profileLoading || isCreatingProfile) return;

    console.log('Creating profile for user:', session.user.id);
    setIsCreatingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          business_email: session.user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating profile:', error);
        // If it's a duplicate key error, the profile already exists
        if (error.code === '23505') {
          console.log('Profile already exists, refreshing...');
          await refreshProfile();
        } else {
          throw error;
        }
      } else {
        console.log('Profile created successfully');
        await refreshProfile();
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast({
        variant: "destructive",
        title: "Profile Creation Failed",
        description: "There was an error setting up your account. Please try again.",
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  useEffect(() => {
    if (session?.user && !profileLoading && !profile && !isCreatingProfile) {
      createProfileIfNeeded();
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
