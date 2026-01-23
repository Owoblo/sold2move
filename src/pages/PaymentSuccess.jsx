import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, CreditCard, Loader2, AlertCircle } from 'lucide-react';

/**
 * PaymentSuccess page - displays after successful Stripe checkout.
 *
 * Note: Profile updates are handled by the Stripe webhook (stripe-webhook edge function).
 * This page just fetches and displays the updated subscription data.
 */
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const sessionId = searchParams.get('session_id');
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000; // 2 seconds between retries

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    fetchSubscriptionData();
  }, [sessionId]);

  const fetchSubscriptionData = async () => {
    try {
      console.log('🎉 Fetching subscription data after payment success');

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Fetch profile with subscription data (set by webhook)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          subscription_status,
          subscription_plan,
          subscription_tier,
          subscription_tier_name,
          credits_remaining,
          next_billing_date,
          current_period_end
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch profile data');
      }

      // Check if webhook has processed the payment yet
      const isActive = profile.subscription_status === 'active' || profile.subscription_status === 'trialing';

      if (!isActive && retryCount < MAX_RETRIES) {
        // Webhook may not have processed yet, retry after delay
        console.log(`⏳ Subscription not active yet, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setTimeout(fetchSubscriptionData, RETRY_DELAY);
        return;
      }

      if (!isActive && retryCount >= MAX_RETRIES) {
        // Webhook still hasn't processed, but show success anyway
        // (payment was successful, webhook may be delayed)
        console.log('⚠️ Webhook may be delayed, showing pending status');
        setSubscription({
          status: 'processing',
          tierName: 'Your subscription',
          credits: profile.credits_remaining || 0,
          message: 'Your payment was successful! Your subscription is being activated.'
        });
        setLoading(false);
        startRedirectTimer();
        return;
      }

      console.log('✅ Subscription data loaded:', profile);

      setSubscription({
        status: profile.subscription_status,
        tierName: profile.subscription_tier_name || profile.subscription_plan || 'Subscription',
        tier: profile.subscription_tier,
        credits: profile.credits_remaining || 0,
        nextBillingDate: profile.next_billing_date || profile.current_period_end
      });

      setLoading(false);
      startRedirectTimer();

    } catch (err) {
      console.error('❌ Error fetching subscription data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const startRedirectTimer = () => {
    // Redirect to dashboard after 4 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 4000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {retryCount > 0 ? 'Activating Your Subscription...' : 'Processing Your Payment...'}
          </h2>
          <p className="text-slate">Please wait while we confirm your subscription</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Something Went Wrong</h2>
            <p className="text-slate mb-4">{error}</p>
            <p className="text-slate text-sm mb-4">
              Your payment may still have been successful. Please check your dashboard.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-teal text-deep-navy px-4 py-2 rounded hover:bg-teal/90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = subscription?.status === 'processing';

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-8">
          <CheckCircle className="h-16 w-16 text-teal mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-slate mb-4">
            {isProcessing
              ? subscription.message
              : `Your ${subscription?.tierName} plan has been activated`
            }
          </p>

          <div className="bg-light-navy/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-teal" />
              <span className="text-white font-semibold">Your Credits</span>
            </div>
            <div className="text-3xl font-bold text-teal">
              {subscription?.credits?.toLocaleString() || 0}
            </div>
            <p className="text-slate text-sm">Credits available</p>
          </div>

          <div className="space-y-2 text-sm text-slate">
            <p>
              <span className="text-teal">✓</span> Status:{' '}
              <span className="text-white capitalize">
                {isProcessing ? 'Activating...' : subscription?.status}
              </span>
            </p>
            <p>
              <span className="text-teal">✓</span> Plan:{' '}
              <span className="text-white">{subscription?.tierName}</span>
            </p>
            {subscription?.nextBillingDate && (
              <p>
                <span className="text-teal">✓</span> Next billing:{' '}
                <span className="text-white">{formatDate(subscription.nextBillingDate)}</span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-teal text-deep-navy px-6 py-3 rounded-lg font-semibold hover:bg-teal/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-slate mt-4">
            Redirecting to dashboard shortly...
          </p>
        </div>
      </div>
    </div>
  );
}
