import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Loader2 } from 'lucide-react';

export default function RouteGuard({ children }) {
  const { session, loading: authLoading, isInitialized } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  // Show loading while auth is initializing or profile is loading
  if (!isInitialized || authLoading || profileLoading) {
    return (
      <div className="h-screen grid place-items-center bg-deep-navy">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have a session but no profile yet, let PostAuthPage handle it
  if (session && !profile) {
    return <Navigate to="/post-auth" replace />;
  }

  // Handle onboarding flow
  const isOnboarding = location.pathname.startsWith('/onboarding');
  const isWelcome = location.pathname.startsWith('/welcome');
  
  if (profile) {
    if (profile.onboarding_complete !== true && !isOnboarding && !isWelcome) {
      return <Navigate to="/onboarding" replace />;
    }
    
    if (profile.onboarding_complete === true && (isOnboarding || isWelcome)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}