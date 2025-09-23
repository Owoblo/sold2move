import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export function useActiveSubscription() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [activePriceId, setActivePriceId] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
        if (!session) {
            setLoading(false);
            return;
        };
        
        setLoading(true);
        const { data, error } = await supabase
            .from('subscriptions')
            .select('status, prices(id)')
            .eq('user_id', session.user.id)
            .in('status', ['active','trialing'])
            .order('current_period_end', { ascending: false })
            .limit(1);

        if (!error) {
            const activeSub = data?.[0];
            setActivePriceId(activeSub?.prices?.id ?? null);
            setStatus(activeSub?.status ?? null);
        }
        setLoading(false);
    };
    
    fetchSubscription();
  }, [session, supabase]);

  return { loading, activePriceId, status };
}