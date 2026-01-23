import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import { storeIntendedDestination, isProtectedRoute, isPublicRoute, getDefaultAuthenticatedPath } from '@/utils/authUtils';

const LOADING_TIMEOUT = 10000; // 10 seconds before redirecting to post-auth

export default function RouteGuard({ children }) {
  const { session, loading: authLoading, isInitialized } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const location = useLocation();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Set up a timeout to prevent infinite loading
  useEffect(() => {
    let timeoutId;
    if (!isInitialized || authLoading || profileLoading) {
      timeoutId = setTimeout(() => {
        console.log('⚠️ RouteGuard: Loading timed out, will redirect to post-auth');
        setLoadingTimedOut(true);
      }, LOADING_TIMEOUT);
    } else {
      setLoadingTimedOut(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isInitialized, authLoading, profileLoading]);

  // If loading timed out and we have a session, redirect to post-auth for recovery
  if (loadingTimedOut && session) {
    console.log('⚠️ RouteGuard: Redirecting to post-auth due to timeout');
    return <Navigate to="/post-auth" replace />;
  }

  // If there's a profile error and we have a session, let post-auth handle recovery
  if (profileError && session) {
    console.log('⚠️ RouteGuard: Profile error, redirecting to post-auth');
    return <Navigate to="/post-auth" replace />;
  }

  // Show loading while auth is initializing or profile is loading
  if (!isInitialized || authLoading || profileLoading) {
    return (
      <div className="h-screen grid place-items-center bg-deep-navy">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  // If no session, store intended destination and redirect to login
  if (!session) {
    // Store the intended destination for post-authentication redirect
    if (isProtectedRoute(location.pathname)) {
      storeIntendedDestination(location.pathname + location.search);
    }
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