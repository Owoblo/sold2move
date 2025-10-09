import React, { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, DollarSign, CreditCard, RefreshCw, Zap, ArrowRight, Star, TrendingUp, Package, Info, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

// Test pricing plans (these will be replaced with real Stripe price IDs)
const testPricingPlans = [
  {
    id: 'starter_monthly',
    name: 'Starter',
    price: '$49',
    interval: 'month',
    features: ['500 credits/month', 'Basic filters', 'Email support'],
    description: 'Perfect for new movers getting started with lead generation.',
    badge: 'Popular',
    stripePriceId: 'price_starter_monthly_placeholder', // Will be replaced with real ID
  },
  {
    id: 'professional_monthly',
    name: 'Professional',
    price: '$99',
    interval: 'month',
    features: ['2000 credits/month', 'Advanced filters', 'Priority support', 'CRM integration'],
    description: 'For growing businesses needing more leads and deeper insights.',
    badge: 'Best Value',
    stripePriceId: 'price_professional_monthly_placeholder', // Will be replaced with real ID
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    price: '$299',
    interval: 'month',
    features: ['Unlimited credits', 'All features', 'Dedicated account manager', 'Custom integrations'],
    description: 'Scalable solution for large operations and high-volume lead generation.',
    badge: 'Premium',
    stripePriceId: 'price_enterprise_monthly_placeholder', // Will be replaced with real ID
  },
];

const testCreditPackages = [
  { id: 'credit_pack_100', name: '100 Credits', price: '$20', credits: 100, savings: '0%', stripePriceId: 'price_credit_100_placeholder' },
  { id: 'credit_pack_500', name: '500 Credits', price: '$80', credits: 500, savings: '20%', stripePriceId: 'price_credit_500_placeholder' },
  { id: 'credit_pack_1000', name: '1000 Credits', price: '$140', credits: 1000, savings: '30%', stripePriceId: 'price_credit_1000_placeholder' },
  { id: 'credit_pack_2500', name: '2500 Credits', price: '$300', credits: 2500, savings: '40%', stripePriceId: 'price_credit_2500_placeholder' },
];

const BillingTestPage = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [stripeConfig, setStripeConfig] = useState(null);

  // Test Stripe configuration
  useEffect(() => {
    const testStripeConfig = async () => {
      try {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          setTestResults(prev => ({
            ...prev,
            stripeConfig: { status: 'error', message: 'Stripe publishable key not found' }
          }));
          return;
        }

        const stripe = await getStripe();
        if (stripe) {
          setTestResults(prev => ({
            ...prev,
            stripeConfig: { status: 'success', message: 'Stripe client loaded successfully' }
          }));
          setStripeConfig({
            publishableKey: publishableKey.substring(0, 20) + '...',
            isLive: publishableKey.startsWith('pk_live_'),
            isTest: publishableKey.startsWith('pk_test_')
          });
        }
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          stripeConfig: { status: 'error', message: `Stripe client error: ${error.message}` }
        }));
      }
    };

    testStripeConfig();
  }, []);

  // Test edge functions
  const testEdgeFunctions = async () => {
    const functions = [
      'create-checkout-session-fixed',
      'create-portal-session',
      'create-topup-session'
    ];

    for (const func of functions) {
      try {
        const response = await fetch(`https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/${func}`, {
          method: 'OPTIONS'
        });
        
        setTestResults(prev => ({
          ...prev,
          [func]: { 
            status: response.ok ? 'success' : 'error', 
            message: response.ok ? 'Function accessible' : `Status: ${response.status}` 
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [func]: { status: 'error', message: `Error: ${error.message}` }
        }));
      }
    }
  };

  const handleCheckout = async (priceId, mode = 'subscription') => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session-fixed', {
        body: JSON.stringify({ priceId, mode }),
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const stripe = await getStripe();
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-teal" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-teal/20 text-teal">PASS</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-500">FAIL</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-500">PENDING</Badge>;
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
    <PageWrapper title="Billing Test Page" description="Test Stripe billing integration and components.">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 p-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-lightest-slate font-heading mb-4">Billing Test Page</h1>
          <p className="text-slate">Test your Stripe billing integration and components</p>
        </div>

        {/* Test Results */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate flex items-center gap-2">
              <Info className="h-5 w-5 text-teal" />
              System Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Button onClick={testEdgeFunctions} variant="outline" className="border-teal text-teal hover:bg-teal/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Edge Functions
              </Button>
            </div>
            
            {Object.keys(testResults).length === 0 ? (
              <p className="text-slate text-center py-8">No tests run yet. Click "Test Edge Functions" to start testing.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(testResults).map(([testName, result]) => (
                  <div key={testName} className="flex items-center justify-between p-3 bg-deep-navy/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="text-lightest-slate font-medium">{testName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate text-sm">{result.message}</span>
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe Configuration */}
        {stripeConfig && (
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-lightest-slate">Stripe Configuration</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <p className="text-teal font-semibold">CONFIGURED</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan Status */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-teal" />
              Current Plan
            </CardTitle>
            <Button
              onClick={handleManageSubscription}
              disabled={isSubmitting || !profile?.stripe_customer_id}
              variant="outline"
              className="border-teal text-teal hover:bg-teal/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 mb-4">
              <Badge
                className={`text-lg px-4 py-1 ${
                  profile?.subscription_status === 'active' ? 'bg-teal/20 text-teal' : 'bg-red-500/20 text-red-400'
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
          </CardContent>
        </Card>

        {/* Test Subscription Plans */}
        <h2 className="text-3xl font-bold text-lightest-slate font-heading mt-12 mb-6">Test Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testPricingPlans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`h-full flex flex-col bg-light-navy border-lightest-navy/20 ${currentPlan === plan.name.toLowerCase() ? 'border-teal ring-2 ring-teal/50' : ''}`}>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-3xl font-bold text-lightest-slate flex items-center justify-center gap-2">
                    {plan.name}
                    {plan.badge && <Badge variant="secondary" className="bg-teal/20 text-teal">{plan.badge}</Badge>}
                  </CardTitle>
                  <p className="text-slate mt-2">{plan.description}</p>
                  <p className="text-5xl font-extrabold text-teal mt-4">
                    {plan.price}<span className="text-xl text-slate font-medium">/{plan.interval}</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2 text-slate">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-teal" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  {currentPlan === plan.name.toLowerCase() ? (
                    <Button className="w-full bg-teal/10 text-teal cursor-not-allowed" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(plan.stripePriceId, 'subscription')}
                      disabled={isSubmitting}
                      className="w-full bg-teal text-deep-navy hover:bg-teal/90"
                    >
                      {isSubmitting ? 'Processing...' : `Test ${plan.name}`} <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Test Credit Packages */}
        <h2 className="text-3xl font-bold text-lightest-slate font-heading mt-12 mb-6">Test Credit Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testCreditPackages.map((pack) => (
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
                    disabled={isSubmitting}
                    className="w-full bg-yellow-400 text-deep-navy hover:bg-yellow-400/90"
                  >
                    {isSubmitting ? 'Processing...' : 'Test Purchase'} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Instructions */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">Before Testing:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Set up your Stripe secret key</li>
                  <li>• Create products and prices in Stripe</li>
                  <li>• Deploy edge functions to Supabase</li>
                  <li>• Set up webhooks in Stripe Dashboard</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">Test Steps:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Click "Test Edge Functions" to verify setup</li>
                  <li>• Try upgrading to a subscription plan</li>
                  <li>• Test purchasing credit packages</li>
                  <li>• Test the customer portal</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageWrapper>
  );
};

export default BillingTestPage;
