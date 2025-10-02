import React, { useState, useEffect, useCallback } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const LOW_CREDIT_THRESHOLD = 50;

export const useProfile = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const { toast } = useToast();
  const [lowCreditNotified, setLowCreditNotified] = useState(false);

  const fetchProfile = useCallback(async () => {
    console.log('🔍 useProfile: fetchProfile called');
    console.log('🔍 Session state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id
    });

    if (session?.user) {
      console.log('🔄 Fetching profile for user:', session.user.id);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      console.log('🔍 Profile fetch result:', {
        hasData: !!data,
        errorCode: error?.code,
        errorMessage: error?.message,
        profileData: data ? {
          id: data.id,
          company_name: data.company_name,
          credits_remaining: data.credits_remaining,
          onboarding_complete: data.onboarding_complete,
          trial_granted: data.trial_granted
        } : null
      });
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching profile:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
      }
      
      setProfile(data);

      if (data && !data.unlimited && data.credits_remaining > 0 && data.credits_remaining <= LOW_CREDIT_THRESHOLD && !lowCreditNotified) {
        const lastShown = localStorage.getItem('lowCreditToastLastShown');
        const now = new Date().getTime();
        if (!lastShown || now - parseInt(lastShown, 10) > 3600000) { // 1 hour cooldown
            toast({
              title: "Your credits are running low!",
              description: `You have ${data.credits_remaining} credits left. Top up now to avoid interruptions.`,
              duration: 10000,
              action: (
                <div className="flex gap-2">
                  <Button asChild size="sm"><Link to="/pricing#top-up">Buy Credits</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link to="/pricing">Upgrade</Link></Button>
                </div>
              ),
            });
            localStorage.setItem('lowCreditToastLastShown', now.toString());
            setLowCreditNotified(true);
        }
      } else if (data && data.credits_remaining > LOW_CREDIT_THRESHOLD && lowCreditNotified) {
        setLowCreditNotified(false);
      }

      setLoading(false);
    } else {
      console.log('🔍 No session/user, clearing profile');
      setLoading(false);
      setProfile(null);
    }
  }, [session, supabase, toast, lowCreditNotified]);

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

  return { loading, profile, setProfile, refreshProfile: fetchProfile, session };
};