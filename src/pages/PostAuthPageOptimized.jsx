import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';

const PostAuthPageOptimized = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = useSupabaseClient();
  const session = useSession();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState('Finalizing your session...');

  // Check if profile exists and handle accordingly
  const handleProfileCheck = async () => {
    console.log('🔍 PostAuthPage: Checking profile status');
    console.log('🔍 Current state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasProfile: !!profile,
      profileLoading,
      isProcessing
    });

    if (!session?.user) {
      console.log('❌ No session/user found, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    if (profileLoading) {
      console.log('⏳ Profile is loading, waiting...');
      return;
    }

    if (profile) {
      console.log('✅ Profile exists, checking onboarding status');
      if (profile.onboarding_complete) {
        const from = location.state?.from?.pathname || '/dashboard';
        console.log('✅ Onboarding complete, redirecting to:', from);
        navigate(from, { replace: true });
      } else {
        console.log('🔄 Onboarding not complete, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // Profile doesn't exist, but user is authenticated
    // This should be handled by the database trigger, but let's check
    console.log('⚠️ Profile not found for authenticated user, checking database...');
    setStatus('Setting up your account...');
    
    try {
      // Wait a moment for any database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh profile to see if it was created by trigger
      await refreshProfile();
      
      if (profile) {
        console.log('✅ Profile created by trigger, continuing...');
        return;
      }
      
      // If still no profile, there might be an issue with the trigger
      console.log('⚠️ Profile still not found, this might indicate a database issue');
      toast({
        variant: "destructive",
        title: "Account Setup Issue",
        description: "There was an issue setting up your account. Please contact support.",
      });
      
      // Redirect to login to try again
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('❌ Error checking profile:', error);
      toast({
        variant: "destructive",
        title: "Account Setup Failed",
        description: "There was an error setting up your account. Please try again.",
      });
      navigate('/login', { replace: true });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    console.log('🔍 PostAuthPage: useEffect triggered');
    
    if (session?.user && !profileLoading && !isProcessing) {
      handleProfileCheck();
    }
  }, [session, profile, profileLoading, isProcessing]);

  // Handle profile changes
  useEffect(() => {
    if (!profileLoading && profile) {
      console.log('✅ Profile loaded:', profile);
      setIsProcessing(false);
      
      if (profile.onboarding_complete) {
        const from = location.state?.from?.pathname || '/dashboard';
        console.log('✅ Redirecting to dashboard:', from);
        navigate(from, { replace: true });
      } else {
        console.log('🔄 Redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      }
    }
  }, [profile, profileLoading, navigate, location.state]);

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isProcessing) {
        console.log('⏰ PostAuthPage timeout, redirecting to login');
        toast({
          variant: "destructive",
          title: "Session Timeout",
          description: "Authentication is taking too long. Please try again.",
        });
        navigate('/login', { replace: true });
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [isProcessing, navigate, toast]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
      <LoadingSpinner size="xl" />
      <p className="text-light-slate mt-4 text-center max-w-md">
        {status}
      </p>
      <p className="text-slate mt-2 text-sm text-center max-w-md">
        Please wait while we set up your account and prepare your dashboard.
      </p>
    </div>
  );
};

export default PostAuthPageOptimized;
