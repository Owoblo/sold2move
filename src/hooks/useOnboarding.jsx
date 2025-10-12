import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useOnboarding = () => {
  const { session } = useAuth();
  const { profile } = useProfile();
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  useEffect(() => {
    // Only proceed if user is authenticated AND has a profile
    if (session?.user && profile) {
      // Check if user is new (hasn't completed onboarding yet)
      const isNewUser = !profile.onboarding_complete;
      
      // Check if user has never seen the welcome message for THIS specific user
      const userWelcomeKey = `sold2move_welcome_seen_${session.user.id}`;
      const hasNeverSeenWelcome = !localStorage.getItem(userWelcomeKey);
      
      // Only show welcome message for authenticated new users who haven't seen it
      if (isNewUser && hasNeverSeenWelcome) {
        setShowWelcomeMessage(true);
      }
    } else {
      // Reset states when user is not authenticated
      setShowWelcomeMessage(false);
      setShowTour(false);
      
      // Clean up any old localStorage entries that might cause issues
      // This ensures the welcome modal doesn't show for unauthenticated users
      if (!session?.user) {
        // Remove old global keys that might be causing the issue
        localStorage.removeItem('sold2move_welcome_seen');
        localStorage.removeItem('sold2move_tour_completed');
      }
    }
  }, [session, profile]);

  const startTour = () => {
    setShowWelcomeMessage(false);
    setShowTour(true);
    if (session?.user) {
      const userWelcomeKey = `sold2move_welcome_seen_${session.user.id}`;
      localStorage.setItem(userWelcomeKey, 'true');
    }
  };

  const completeTour = () => {
    setShowTour(false);
    setHasCompletedTour(true);
    if (session?.user) {
      const userTourKey = `sold2move_tour_completed_${session.user.id}`;
      localStorage.setItem(userTourKey, 'true');
    }
    
    // Update profile to mark tour as completed
    // This would typically be done via an API call
    if (profile) {
      // You would call an API here to update the user's tour_completed status
      console.log('Tour completed for user:', profile.id);
    }
  };

  const skipTour = () => {
    setShowTour(false);
    setShowWelcomeMessage(false);
    setHasCompletedTour(true);
    if (session?.user) {
      const userTourKey = `sold2move_tour_completed_${session.user.id}`;
      const userWelcomeKey = `sold2move_welcome_seen_${session.user.id}`;
      localStorage.setItem(userTourKey, 'true');
      localStorage.setItem(userWelcomeKey, 'true');
    }
  };

  const resetTour = () => {
    if (session?.user) {
      const userTourKey = `sold2move_tour_completed_${session.user.id}`;
      const userWelcomeKey = `sold2move_welcome_seen_${session.user.id}`;
      localStorage.removeItem(userTourKey);
      localStorage.removeItem(userWelcomeKey);
    }
    setHasCompletedTour(false);
    setShowTour(false);
    setShowWelcomeMessage(false);
  };

  return {
    showTour,
    showWelcomeMessage,
    hasCompletedTour,
    startTour,
    completeTour,
    skipTour,
    resetTour,
  };
};
