import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

/**
 * Hook to fetch the current user's subscription status from their profile.
 * Subscription data is stored directly in the profiles table after Stripe webhook processing.
 *
 * Returns:
 * - loading: boolean - true while fetching
 * - status: string | null - subscription_status ('active', 'trialing', 'canceled', 'past_due', etc.)
 * - isActive: boolean - true if status is 'active' or 'trialing'
 * - subscription: object | null - full subscription details from profile
 * - activePriceId: string | null - deprecated, kept for backward compatibility (always null)
 */
export function useActiveSubscription() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setSubscription(null);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          subscription_status,
          subscription_plan,
          subscription_tier,
          subscription_tier_name,
          stripe_subscription_id,
          stripe_customer_id,
          next_billing_date,
          current_period_start,
          current_period_end,
          city_limit,
          unlimited,
          credits_remaining
        `)
        .eq('id', session.user.id)
        .single();

      if (!error && profile) {
        setSubscription({
          status: profile.subscription_status,
          plan: profile.subscription_plan,
          tier: profile.subscription_tier,
          tierName: profile.subscription_tier_name,
          stripeSubscriptionId: profile.stripe_subscription_id,
          stripeCustomerId: profile.stripe_customer_id,
          nextBillingDate: profile.next_billing_date,
          currentPeriodStart: profile.current_period_start,
          currentPeriodEnd: profile.current_period_end,
          cityLimit: profile.city_limit,
          unlimited: profile.unlimited,
          creditsRemaining: profile.credits_remaining,
        });
      } else {
        setSubscription(null);
      }

      setLoading(false);
    };

    fetchSubscription();
  }, [session, supabase]);

  const status = subscription?.status ?? null;
  const isActive = status === 'active' || status === 'trialing';

  return {
    loading,
    status,
    isActive,
    subscription,
    // Deprecated - kept for backward compatibility with PricingPage
    // The new tier-based system doesn't use Stripe price IDs directly
    activePriceId: null,
  };
}