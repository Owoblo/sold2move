import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';

export const useOnboarding = () => {
  const { profile } = useProfile();
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  useEffect(() => {
    if (profile) {
      // Check if user is new (hasn't completed onboarding yet)
      const isNewUser = !profile.onboarding_complete;
      
      // Check if user has never seen the welcome message
      const hasNeverSeenWelcome = !localStorage.getItem('sold2move_welcome_seen');
      
      // Only show welcome message for new users who haven't seen it
      if (isNewUser && hasNeverSeenWelcome) {
        setShowWelcomeMessage(true);
      }
    }
  }, [profile]);

  const startTour = () => {
    setShowWelcomeMessage(false);
    setShowTour(true);
    localStorage.setItem('sold2move_welcome_seen', 'true');
  };

  const completeTour = () => {
    setShowTour(false);
    setHasCompletedTour(true);
    localStorage.setItem('sold2move_tour_completed', 'true');
    
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
    localStorage.setItem('sold2move_tour_completed', 'true');
    localStorage.setItem('sold2move_welcome_seen', 'true');
  };

  const resetTour = () => {
    localStorage.removeItem('sold2move_tour_completed');
    setHasCompletedTour(false);
    setShowTour(false);
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
