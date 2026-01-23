import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useProfile = () => {
  const { session } = useAuth();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Update profile function for settings pages
  const updateProfile = useCallback(async (updates) => {
    if (!session?.user?.id) {
      throw new Error('No user session');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    // Update local state with new profile data
    setProfile(data);
    return data;
  }, [session?.user?.id, supabase]);

  const fetchProfile = useCallback(async () => {
    // Only log in development to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 useProfile: fetchProfile called');
      console.log('🔍 Session state:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      });
    }

    if (session?.user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Fetching profile for user:', session.user.id);
      }
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*, service_cities, main_service_city, service_area_cluster')
          .eq('id', session.user.id)
          .single();

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Profile fetch result:', {
            hasData: !!data,
            errorCode: fetchError?.code,
            errorMessage: fetchError?.message,
            profileData: data ? {
              id: data.id,
              company_name: data.company_name,
              credits_remaining: data.credits_remaining,
              onboarding_complete: data.onboarding_complete,
              trial_granted: data.trial_granted
            } : null
          });
        }

        // PGRST116 = "not found" - not an error, just no profile yet
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('❌ Error fetching profile:', {
            code: fetchError.code,
            message: fetchError.message,
            details: fetchError.details
          });
          setError(fetchError);
        }

        setProfile(data);
      } catch (err) {
        console.error('❌ Unexpected error fetching profile:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 No session/user, clearing profile');
      }
      setLoading(false);
      setProfile(null);
      setError(null);
    }
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    fetchProfile();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          fetchProfile();
        } else if (event === 'SIGNED_OUT') {
            setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };

  }, [supabase, fetchProfile]);

  return { loading, profile, setProfile, refreshProfile: fetchProfile, updateProfile, session, error };
};