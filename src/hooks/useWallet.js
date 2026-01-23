import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook for managing user wallet operations
 */
export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If wallet doesn't exist, that's okay - it will be created on first funding
        if (fetchError.code === 'PGRST116') {
          setWallet({ balance: 0, currency: 'USD' });
        } else {
          throw fetchError;
        }
      } else {
        setWallet(data);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch transaction history
  const fetchTransactions = useCallback(async (limit = 20) => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [user?.id]);

  // Add funds - initiates Stripe checkout
  const addFunds = async (amount, preset = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-wallet-funds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ amount, preset }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      }

      return result;
    } catch (err) {
      console.error('Error adding funds:', err);
      throw err;
    }
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = (amount) => {
    if (!wallet) return false;
    return parseFloat(wallet.balance) >= amount;
  };

  // Format balance for display
  const formatBalance = (balance = wallet?.balance) => {
    if (balance === null || balance === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD',
    }).format(balance);
  };

  // Initial fetch
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Subscribe to wallet changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wallet_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Wallet updated:', payload);
          if (payload.new) {
            setWallet(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    wallet,
    balance: wallet?.balance || 0,
    formattedBalance: formatBalance(),
    transactions,
    loading,
    error,
    addFunds,
    hasSufficientBalance,
    formatBalance,
    refetch: fetchWallet,
    fetchTransactions,
  };
}

export default useWallet;
