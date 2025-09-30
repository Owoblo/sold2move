import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getStripe } from '@/lib/getStripe';
import { useToast } from '@/components/ui/use-toast';

const TEST_PRICE_ID = 'price_1SCBwSCUfCzyitr0nf5Hu5Cg'; // Your live Starter price ID ($9.99 CAD/month)

export default function SimpleTestCheckout() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const { toast } = useToast();

  async function startCheckout() {
    setErr(null);
    setLoading(true);
    try {
      console.log('🚀 Starting checkout with price ID:', TEST_PRICE_ID);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: TEST_PRICE_ID },
      });

      console.log('📡 Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Edge function failed');
      }

      if (!data?.sessionId) {
        console.error('❌ No sessionId returned:', data);
        throw new Error('No sessionId returned');
      }

      console.log('✅ Got session ID:', data.sessionId);
      console.log('✅ Got checkout URL:', data.url);

      // Use direct URL redirect instead of Stripe.js
      if (data.url) {
        console.log('🔄 Redirecting to Stripe checkout URL...');
        window.location.href = data.url;
        return;
      }

      // Fallback to Stripe.js redirect
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      console.log('🔄 Using Stripe.js redirect...');
      const { error: redirectErr } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectErr) {
        console.error('❌ Stripe redirect error:', redirectErr);
        throw new Error(redirectErr.message);
      }

      console.log('✅ Redirect successful');
    } catch (e) {
      console.error('💥 Checkout error:', e);
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
      <h1 style={{color: '#64FFDA', borderBottom: '1px solid #112240', paddingBottom: '10px' }}>Live Stripe Checkout</h1>
      <p style={{ marginTop: 12, color: '#8892B0' }}>Click the button to create a Checkout session and pay with your real card.</p>
      <button onClick={startCheckout} disabled={loading} style={{ padding: '12px 16px', fontSize: 16, backgroundColor: '#64FFDA', color: '#0A192F', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}>
        {loading ? 'Redirecting…' : 'Pay $9.99 CAD Monthly (Live)'}
      </button>
      {err ? <p style={{ color: 'tomato', marginTop: 12 }}>{err}</p> : null}
      <p style={{ marginTop: 12, color: '#8892B0', fontSize: '14px' }}>
        This will charge your real card $9.99 CAD/month for the Starter plan.
      </p>
    </div>
  );
}
