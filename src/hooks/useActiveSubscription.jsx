import React, { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export function useActiveSubscription() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [activePriceId, setActivePriceId] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    };
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, prices(id)')
        .eq('user_id', session.user.id)
        .in('status', ['active','trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        setActivePriceId(data[0]?.prices?.id ?? null);
        setStatus(data[0]?.status ?? null);
      } else {
        setActivePriceId(null);
        setStatus(null);
      }
      setLoading(false);
    })();
  }, [session, supabase]);

  return { loading, activePriceId, status };
}