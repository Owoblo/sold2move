import { useState, useEffect, useCallback } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import React from 'react';

const LOW_CREDIT_THRESHOLD = 50;

export const useProfile = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const { toast } = useToast();
  const [lowCreditNotified, setLowCreditNotified] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (session?.user) {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      setProfile(data);

      if (data && !data.unlimited && data.credits_remaining <= LOW_CREDIT_THRESHOLD && !lowCreditNotified) {
        toast({
          title: "Your credits are running low!",
          description: "Don't miss out on new leads. Top up or upgrade your plan.",
          duration: 10000,
          action: (
            <div className="flex gap-2">
              <Button asChild size="sm"><Link to="/pricing#top-up">Buy Credits</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/pricing">Upgrade</Link></Button>
            </div>
          ),
        });
        setLowCreditNotified(true);
      } else if (data && data.credits_remaining > LOW_CREDIT_THRESHOLD && lowCreditNotified) {
        setLowCreditNotified(false);
      }

      setLoading(false);
    } else {
      setLoading(false);
      setProfile(null);
    }
  }, [session, supabase, toast, lowCreditNotified]);

  useEffect(() => {
    fetchProfile();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          fetchProfile();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };

  }, [supabase, fetchProfile]);

  return { loading, profile, setProfile, refreshProfile: fetchProfile, session };
};