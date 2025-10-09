import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Loader2 } from 'lucide-react';

export default function RouteGuard({ children }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen grid place-items-center bg-deep-navy">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isOnboarding = location.pathname.startsWith('/onboarding');
  if (profile && profile.onboarding_complete !== true && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (profile && profile.onboarding_complete === true && isOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}