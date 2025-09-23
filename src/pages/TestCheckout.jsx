import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getStripe } from '@/lib/getStripe';
import { useToast } from '@/components/ui/use-toast';

const TEST_PRICE_ID = 'price_1S5AbjCUfCzyitr0NYlWzdhJ'; 

export default function TestCheckout() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const { toast } = useToast();

  async function startCheckout() {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: TEST_PRICE_ID },
      });

      if (error) throw new Error(error.message || 'Edge function failed');

      if (!data?.sessionId) throw new Error('No sessionId returned');

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }
      const { error: redirectErr } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectErr) throw new Error(redirectErr.message);
    } catch (e) {
      const errorMessage = e?.message || 'Checkout error';
      setErr(errorMessage);
      toast({
        variant: "destructive",
        title: "Checkout Error",
        description: errorMessage,
      });
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '64px auto', padding: 24, color: 'white', backgroundColor: '#0A192F', borderRadius: '8px' }}>
      <h1 style={{color: '#64FFDA', borderBottom: '1px solid #112240', paddingBottom: '10px' }}>Test Stripe Checkout</h1>
      <p style={{ marginTop: 12, color: '#8892B0' }}>Click the button to create a Checkout session and pay in test mode.</p>
      <button onClick={startCheckout} disabled={loading} style={{ padding: '12px 16px', fontSize: 16, backgroundColor: '#64FFDA', color: '#0A192F', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}>
        {loading ? 'Redirecting…' : 'Pay Monthly'}
      </button>
      {err ? <p style={{ color: 'tomato', marginTop: 12 }}>{err}</p> : null}
      <p style={{ marginTop: 12, color: '#8892B0', fontSize: '14px' }}>
        Use test card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </div>
  );
}