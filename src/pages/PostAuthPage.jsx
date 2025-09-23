
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PostAuthPage = () => {
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!profileLoading) {
      if (profile?.onboarding_complete) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else if (profile) {
        navigate('/onboarding', { replace: true });
      }
      // If profile is null and not loading, it might be a fresh user, wait for profile creation.
    }
  }, [profile, profileLoading, navigate, location.state]);

  return (
    <div className="flex justify-center items-center h-screen bg-deep-navy">
      <LoadingSpinner size="xl" />
      <p className="text-light-slate ml-4">Finalizing your session...</p>
    </div>
  );
};

export default PostAuthPage;
