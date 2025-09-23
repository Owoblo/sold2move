import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Loader2 } from 'lucide-react';
import OnboardingPage from '@/pages/OnboardingPage';

const OnboardingGate = () => {
  const { profile, loading: profileLoading } = useProfile();

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-deep-navy">
        <Loader2 className="h-8 w-8 animate-spin text-green" />
      </div>
    );
  }

  if (profile && profile.onboarding_complete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingPage />;
};

export default OnboardingGate;