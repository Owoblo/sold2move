import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';

export const useOnboarding = () => {
  const { profile } = useProfile();
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  useEffect(() => {
    if (profile) {
      // Check if user is new (just completed onboarding)
      const isNewUser = profile.onboarding_complete && !profile.tour_completed;
      
      // Check if user has never seen the tour
      const hasNeverSeenTour = !localStorage.getItem('sold2move_tour_completed');
      
      // Show tour for new users or users who haven't seen it
      if (isNewUser || hasNeverSeenTour) {
        setShowWelcomeMessage(true);
        // Show tour after a short delay to let the welcome message show
        setTimeout(() => {
          setShowWelcomeMessage(false);
          setShowTour(true);
        }, 2000);
      }
    }
  }, [profile]);

  const startTour = () => {
    setShowTour(true);
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
    setHasCompletedTour(true);
    localStorage.setItem('sold2move_tour_completed', 'true');
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
