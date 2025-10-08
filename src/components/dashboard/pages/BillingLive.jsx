import React, { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, DollarSign, CreditCard, RefreshCw, Zap, ArrowRight, Star, TrendingUp, Package, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

// Live pricing plans with real Stripe price IDs
const pricingPlans = [
  {
    id: 'starter_monthly',
    name: 'Starter',
    price: '$49',
    interval: 'month',
    features: ['500 credits/month', 'Basic filters', 'Email support'],
    stripePriceId: 'price_1SFrRDCUfCzyitr0gM80TZwJ', // Real Stripe price ID
    description: 'Perfect for new movers getting started with lead generation.',
    badge: 'Popular',
  },
  {
    id: 'professional_monthly',
    name: 'Professional',
    price: '$99',
    interval: 'month',
    features: ['2000 credits/month', 'Advanced filters', 'Priority support', 'CRM integration'],
    stripePriceId: 'price_1SFrRECUfCzyitr0ONdOzHLp', // Real Stripe price ID
    description: 'For growing businesses needing more leads and deeper insights.',
    badge: 'Best Value',
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    price: '$299',
    interval: 'month',
    features: ['Unlimited credits', 'All features', 'Dedicated account manager', 'Custom integrations'],
    stripePriceId: 'price_1SFrRGCUfCzyitr0Jrm1ui5K', // Real Stripe price ID
    description: 'Scalable solution for large operations and high-volume lead generation.',
    badge: 'Premium',
  },
];

const creditPackages = [
  { id: 'credit_pack_100', name: '100 Credits', price: '$20', credits: 100, savings: '0%', stripePriceId: 'price_1SFrRtCUfCzyitr0ftw8x63q' },
  { id: 'credit_pack_500', name: '500 Credits', price: '$80', credits: 500, savings: '20%', stripePriceId: 'price_1SFrRtCUfCzyitr0Wg2k0Cx9' },
  { id: 'credit_pack_1000', name: '1000 Credits', price: '$140', credits: 1000, savings: '30%', stripePriceId: 'price_1SFrRuCUfCzyitr0aXuAPESw' },
  { id: 'credit_pack_2500', name: '2500 Credits', price: '$300', credits: 2500, savings: '40%', stripePriceId: 'price_1SFrRuCUfCzyitr0gtxAJWJ6' },
];

const BillingLive = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState(null);
  const [stripeConfig, setStripeConfig] = useState(null);

  // Check Stripe configuration
  useEffect(() => {
    const checkStripeConfig = async () => {
      try {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          setStripeConfig({ error: 'Stripe publishable key not found' });
          return;
        }

        const stripe = await getStripe();
        if (stripe) {
          setStripeConfig({
            publishableKey: publishableKey.substring(0, 20) + '...',
            isLive: publishableKey.startsWith('pk_live_'),
            isTest: publishableKey.startsWith('pk_test_'),
            status: 'ready'
          });
        }
      } catch (error) {
        setStripeConfig({ error: `Stripe client error: ${error.message}` });
      }
    };

    checkStripeConfig();
  }, []);

  const handleCheckout = async (priceId, mode = 'subscription') => {
    setLoadingPackageId(priceId);
    setIsSubmitting(true);
    try {
      console.log('Creating checkout session for:', { priceId, mode });
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session-fixed', {
        body: JSON.stringify({ priceId, mode }),
      });

      console.log('Checkout session response:', { data, error });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (!data.sessionId) {
        throw new Error('No session ID returned from checkout function');
      }

      const stripe = await getStripe();
      console.log('Redirecting to Stripe checkout with session:', data.sessionId);
      
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Stripe checkout error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: error.message || 'Could not initiate checkout. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setLoadingPackageId(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: JSON.stringify({}),
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      window.location.href = data.url;
    } catch (error) {
      console.error('Stripe customer portal error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not open customer portal. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-deep-navy">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const currentPlan = profile?.subscription_plan || 'free';
  const isUnlimited = profile?.unlimited;
  const creditsRemaining = profile?.credits_remaining || 0;

  return (
    <PageWrapper title="Billing & Plans" description="Manage your subscription, credits, and billing details.">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 p-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-lightest-slate font-heading mb-4">Billing & Plans</h1>
          <p className="text-slate">Manage your subscription, credits, and billing details</p>
        </div>

        {/* Stripe Configuration Status */}
        {stripeConfig && (
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-lightest-slate flex items-center gap-2">
                <Info className="h-5 w-5 text-green" />
                Stripe Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stripeConfig.error ? (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span>{stripeConfig.error}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                    <p className="text-slate text-sm">Publishable Key</p>
                    <p className="text-lightest-slate font-semibold">{stripeConfig.publishableKey}</p>
                  </div>
                  <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                    <p className="text-slate text-sm">Mode</p>
                    <p className="text-lightest-slate font-semibold">
                      {stripeConfig.isLive ? 'LIVE' : stripeConfig.isTest ? 'TEST' : 'UNKNOWN'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                    <p className="text-slate text-sm">Status</p>
                    <p className="text-green font-semibold">READY</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Plan Status */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-green" />
              Current Plan
            </CardTitle>
            <Button
              onClick={handleManageSubscription}
              disabled={isSubmitting || !profile?.stripe_customer_id}
              variant="outline"
              className="border-green text-green hover:bg-green/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 mb-4">
              <Badge
                className={`text-lg px-4 py-1 ${
                  profile?.subscription_status === 'active' ? 'bg-green/20 text-green' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {profile?.subscription_status ? profile.subscription_status.toUpperCase() : 'FREE'}
              </Badge>
              <span className="text-2xl font-semibold text-lightest-slate capitalize">
                {currentPlan} Plan
              </span>
            </div>
            <p className="text-slate mb-2">
              {isUnlimited ? (
                "You have unlimited credits with your current plan."
              ) : (
                `You have ${creditsRemaining} credits remaining.`
              )}
            </p>
            {profile?.subscription_status === 'active' && (
              <p className="text-sm text-slate">
                Next billing date: {profile?.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate">
              To enable billing functionality, you need to complete the Stripe setup:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">1. Get Stripe Secret Key:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Go to: <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-green hover:underline">Stripe API Keys</a></li>
                  <li>• Copy the "Secret key" (starts with sk_live_)</li>
                  <li>• Set it as: export STRIPE_SECRET_KEY="your_secret_key"</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">2. Create Products:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Run: node scripts/setup-live-stripe.js create</li>
                  <li>• This creates subscription plans and credit packages</li>
                  <li>• Copy the generated price IDs to this component</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <h2 className="text-3xl font-bold text-lightest-slate font-heading mt-12 mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`h-full flex flex-col bg-light-navy border-lightest-navy/20 ${currentPlan === plan.name.toLowerCase() ? 'border-green ring-2 ring-green/50' : ''}`}>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-3xl font-bold text-lightest-slate flex items-center justify-center gap-2">
                    {plan.name}
                    {plan.badge && <Badge variant="secondary" className="bg-green/20 text-green">{plan.badge}</Badge>}
                  </CardTitle>
                  <p className="text-slate mt-2">{plan.description}</p>
                  <p className="text-5xl font-extrabold text-green mt-4">
                    {plan.price}<span className="text-xl text-slate font-medium">/{plan.interval}</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2 text-slate">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  {currentPlan === plan.name.toLowerCase() ? (
                    <Button className="w-full bg-green/10 text-green cursor-not-allowed" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(plan.stripePriceId, 'subscription')}
                      disabled={loadingPackageId === plan.stripePriceId}
                      className="w-full bg-green text-deep-navy hover:bg-green/90"
                    >
                      {loadingPackageId === plan.stripePriceId ? 'Processing...' : `Upgrade to ${plan.name}`} <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Credit Packages */}
        <h2 className="text-3xl font-bold text-lightest-slate font-heading mt-12 mb-6">Top Up Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creditPackages.map((pack) => (
            <motion.div
              key={pack.id}
              whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col bg-light-navy border-lightest-navy/20">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-lightest-slate flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    {pack.name}
                  </CardTitle>
                  <p className="text-slate mt-2">Get {pack.credits} property reveal credits.</p>
                  <p className="text-4xl font-extrabold text-yellow-400 mt-4">
                    {pack.price}
                  </p>
                  {pack.savings !== '0%' && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 mt-2">
                      Save {pack.savings}
                    </Badge>
                  )}
                </CardHeader>
                <CardFooter className="pt-4">
                  <Button
                    onClick={() => handleCheckout(pack.stripePriceId, 'payment')}
                    disabled={loadingPackageId === pack.stripePriceId}
                    className="w-full bg-yellow-400 text-deep-navy hover:bg-yellow-400/90"
                  >
                    {loadingPackageId === pack.stripePriceId ? 'Processing...' : 'Buy Now'} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </PageWrapper>
  );
};

export default BillingLive;
