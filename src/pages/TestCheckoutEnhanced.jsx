import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { getStripe } from '@/lib/getStripe';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  Package, 
  Sparkles, 
  AlertTriangle,
  TestTube,
  Zap,
  RefreshCw,
  Trash2
} from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';

    // Determine if we're in test mode based on Stripe key
    const isTestMode = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');
    
    // Test pricing plans with mode-appropriate Stripe price IDs
    const testPricingPlans = [
      {
        title: 'Starter',
        description: 'Perfect for getting started with real estate leads.',
        prices: {
          monthly: { 
            id: isTestMode ? 'price_test_starter_monthly' : 'price_1S4YXgCUfCzyitr0ECvYM6Lq', 
            amount: 9.99, 
            interval: '/month' 
          },
          yearly: { 
            id: isTestMode ? 'price_test_starter_yearly' : 'price_1S4YXgCUfCzyitr0ECvYM6Lq', 
            amount: 99.99, 
            interval: '/year' 
          },
        },
        credits: '1,000 Credits/month',
        features: ['1,000 credits', 'CSV export', 'Email alerts', 'Standard filters'],
        cta: 'Test Purchase',
        popular: false,
        testMode: isTestMode,
        uniqueId: 'starter-test',
      },
      {
        title: 'Growth',
        description: 'For growing businesses that need more leads.',
        prices: {
          monthly: { 
            id: isTestMode ? 'price_test_growth_monthly' : 'price_1S4YY0CUfCzyitr0xPamzt5d', 
            amount: 29.99, 
            interval: '/month' 
          },
          yearly: { 
            id: isTestMode ? 'price_test_growth_yearly' : 'price_1S4YY0CUfCzyitr0xPamzt5d', 
            amount: 299.99, 
            interval: '/year' 
          },
        },
        credits: '5,000 Credits/month',
        features: ['5,000 credits', 'CSV export', 'Email alerts', 'Advanced filters', 'Priority support'],
        cta: 'Test Purchase',
        popular: true,
        testMode: isTestMode,
        uniqueId: 'growth-test',
      },
      {
        title: 'Scale',
        description: 'For established businesses that need unlimited access.',
        prices: {
          monthly: { 
            id: isTestMode ? 'price_test_scale_monthly' : 'price_1S4YYKCUfCzyitr0eZwj02Is', 
            amount: 99.99, 
            interval: '/month' 
          },
          yearly: { 
            id: isTestMode ? 'price_test_scale_yearly' : 'price_1S4YYKCUfCzyitr0eZwj02Is', 
            amount: 999.99, 
            interval: '/year' 
          },
        },
        credits: 'Unlimited Credits',
        features: ['Unlimited credits', 'CSV export', 'Email alerts', 'All filters', 'Dedicated support', 'API access'],
        cta: 'Test Purchase',
        popular: false,
        testMode: isTestMode,
        uniqueId: 'scale-test',
      },
    ];

// Test credit packs - using mode-appropriate one-time prices
const testCreditPacks = [
  {
    title: 'Small Pack',
    priceId: isTestMode ? 'price_test_credit_small' : 'price_1S5AbjCUfCzyitr0NYlWzdhJ',
    amount: 4.99,
    credits: '500 Credits',
    description: 'Perfect for testing credit purchases',
    uniqueId: 'small-pack',
    isOneTime: true, // Flag to indicate this is a one-time purchase
  },
  {
    title: 'Medium Pack',
    priceId: isTestMode ? 'price_test_credit_medium' : 'price_1S5AbjCUfCzyitr0NYlWzdhJ',
    amount: 9.99,
    credits: '1,200 Credits',
    description: 'Great value for testing',
    uniqueId: 'medium-pack',
    isOneTime: true, // Flag to indicate this is a one-time purchase
  },
  {
    title: 'Large Pack',
    priceId: isTestMode ? 'price_test_credit_large' : 'price_1S5AbjCUfCzyitr0NYlWzdhJ',
    amount: 19.99,
    credits: '2,500 Credits',
    description: 'Best value for testing',
    uniqueId: 'large-pack',
    isOneTime: true, // Flag to indicate this is a one-time purchase
  },
];

const TestCheckoutEnhanced = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, session } = useProfile();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const handleTestCheckout = async (priceId, planName, amount, uniqueId) => {
    setLoadingPriceId(uniqueId);
    
    // Set a timeout to automatically reset loading state after 10 seconds
    const timeoutId = setTimeout(() => {
      setLoadingPriceId(null);
    }, 10000);
    
    try {
      // Add test result
      setTestResults(prev => [...prev, {
        id: Date.now(),
        plan: planName,
        amount: amount,
        status: 'starting',
        timestamp: new Date().toISOString()
      }]);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId },
      });

      if (error) throw new Error(error.message || 'Edge function failed');

      if (!data?.sessionId) throw new Error('No sessionId returned');

      // Update test result
      setTestResults(prev => prev.map(r => 
        r.id === Date.now() - 1000 ? { ...r, status: 'redirecting' } : r
      ));

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      const { error: redirectErr } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectErr) throw new Error(redirectErr.message);

      // Update test result
      setTestResults(prev => prev.map(r => 
        r.id === Date.now() - 2000 ? { ...r, status: 'success' } : r
      ));

      toast({
        title: "Test Checkout Started",
        description: `Redirecting to Stripe checkout for ${planName}...`,
      });

    } catch (e) {
      const errorMessage = e?.message || 'Checkout error';
      
      // Update test result
      setTestResults(prev => prev.map(r => 
        r.id === Date.now() - 1000 ? { ...r, status: 'error', error: errorMessage } : r
      ));

      toast({
        variant: "destructive",
        title: "Test Checkout Error",
        description: errorMessage,
      });
    } finally {
      // Clear timeout and reset loading state
      clearTimeout(timeoutId);
      setLoadingPriceId(null);
    }
  };

  const handleTestCreditPurchase = async (priceId, packName, amount, uniqueId) => {
    setLoadingPriceId(uniqueId);
    
    // Set a timeout to automatically reset loading state after 10 seconds
    const timeoutId = setTimeout(() => {
      setLoadingPriceId(null);
    }, 10000);
    
    try {
      setTestResults(prev => [...prev, {
        id: Date.now(),
        plan: packName,
        amount: amount,
        status: 'starting',
        timestamp: new Date().toISOString()
      }]);

      const { data, error } = await supabase.functions.invoke('create-topup-session-v2', {
        body: { priceId },
      });

      if (error) throw new Error(error.message || 'Edge function failed');

      const stripe = await getStripe();
      const { error: redirectErr } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectErr) throw new Error(redirectErr.message);

      setTestResults(prev => prev.map(r => 
        r.id === Date.now() - 1000 ? { ...r, status: 'success' } : r
      ));

      toast({
        title: "Test Credit Purchase Started",
        description: `Redirecting to Stripe checkout for ${packName}...`,
      });

    } catch (e) {
      const errorMessage = e?.message || 'Credit purchase error';
      
      setTestResults(prev => prev.map(r => 
        r.id === Date.now() - 1000 ? { ...r, status: 'error', error: errorMessage } : r
      ));

      toast({
        variant: "destructive",
        title: "Test Credit Purchase Error",
        description: errorMessage,
      });
    } finally {
      // Clear timeout and reset loading state
      clearTimeout(timeoutId);
      setLoadingPriceId(null);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const resetLoadingState = () => {
    setLoadingPriceId(null);
    toast({
      title: "Loading State Reset",
      description: "All buttons have been reset and are now clickable.",
    });
  };

  return (
    <PageWrapper title="Test Checkout" description="Test the complete checkout workflow with Stripe.">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <TestTube className="h-8 w-8 text-green" />
            <h1 className="text-3xl font-bold text-lightest-slate">Test Checkout Workflow</h1>
          </div>
          <p className="text-slate max-w-2xl mx-auto">
            Test the complete Stripe checkout integration with different pricing tiers and credit packs. 
            Use test card <code className="bg-light-navy px-2 py-1 rounded">4242 4242 4242 4242</code> for testing.
          </p>
        </motion.div>

            {/* Stripe Configuration Notice */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <div className={`${isTestMode ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'} border rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <TestTube className={`h-5 w-5 ${isTestMode ? 'text-yellow-500' : 'text-green-500'} mt-0.5`} />
                  <div>
                    <h3 className={`font-semibold ${isTestMode ? 'text-yellow-500' : 'text-green-500'} mb-2`}>
                      Stripe Configuration Status
                    </h3>
                    <div className="text-slate text-sm space-y-1">
                      <p><strong>Mode:</strong> {isTestMode ? 'Test Mode' : 'Live Mode'}</p>
                      {isTestMode ? (
                        <>
                          <p><strong>⚠️ Test Mode Issue:</strong> Using test keys but live price IDs</p>
                          <p><strong>Solution:</strong> Create test price IDs in Stripe test mode</p>
                          <p><strong>Test Price IDs Needed:</strong></p>
                          <ul className="ml-4 list-disc">
                            <li>price_test_starter_monthly</li>
                            <li>price_test_growth_monthly</li>
                            <li>price_test_scale_monthly</li>
                            <li>price_test_credit_small</li>
                            <li>price_test_credit_medium</li>
                            <li>price_test_credit_large</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p><strong>✅ Live Mode:</strong> Using live price IDs with live keys</p>
                          <p><strong>Status:</strong> Should work with your existing price IDs</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

        {/* Test Status */}
        {profile && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-light-navy border-lightest-navy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green/20 rounded-md">
                    <CheckCircle className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <p className="text-lightest-slate font-semibold">Test Environment Active</p>
                    <p className="text-slate text-sm">
                      Logged in as: {profile.business_email || 'Test User'} | 
                      Credits: {profile.credits_remaining || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-light-navy border-lightest-navy/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green" />
                    Test Results
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={clearTestResults} variant="outline" size="sm">
                      Clear Results
                    </Button>
                    {loadingPriceId && (
                      <Button
                        onClick={resetLoadingState}
                        variant="outline"
                        size="sm"
                        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Loading
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-deep-navy rounded-md">
                      <div>
                        <p className="text-lightest-slate font-medium">{result.plan}</p>
                        <p className="text-slate text-sm">${result.amount}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'starting' && (
                          <Badge variant="secondary">Starting...</Badge>
                        )}
                        {result.status === 'redirecting' && (
                          <Badge variant="default">Redirecting</Badge>
                        )}
                        {result.status === 'success' && (
                          <Badge className="bg-green text-deep-navy">Success</Badge>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Test Plans */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex justify-center items-center gap-4 mb-6">
            <span className={`font-semibold transition-colors ${!isYearly ? 'text-green' : 'text-slate'}`}>Monthly</span>
            <ToggleGroup type="single" value={isYearly ? 'yearly' : 'monthly'} onValueChange={(value) => setIsYearly(value === 'yearly')}>
              <ToggleGroupItem value="monthly" aria-label="Toggle monthly">Monthly</ToggleGroupItem>
              <ToggleGroupItem value="yearly" aria-label="Toggle yearly">Yearly</ToggleGroupItem>
            </ToggleGroup>
            <span className={`font-semibold transition-colors ${isYearly ? 'text-green' : 'text-slate'}`}>Yearly</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testPricingPlans.map((plan, index) => (
              <motion.div
                key={plan.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className={`bg-light-navy border-lightest-navy/20 h-full ${plan.popular ? 'ring-2 ring-green/50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {plan.title}
                      </CardTitle>
                      {plan.popular && (
                        <Badge className="bg-green text-deep-navy">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-slate">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-lightest-slate mb-2">{plan.credits}</p>
                      <p className="text-2xl font-bold text-green">
                        ${plan.prices[isYearly ? 'yearly' : 'monthly'].amount}
                        <span className="text-lg text-slate">{plan.prices[isYearly ? 'yearly' : 'monthly'].interval}</span>
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate">
                          <CheckCircle className="h-4 w-4 text-green flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-green text-deep-navy hover:bg-green/90" 
                      onClick={() => handleTestCheckout(
                        plan.prices[isYearly ? 'yearly' : 'monthly'].id,
                        plan.title,
                        plan.prices[isYearly ? 'yearly' : 'monthly'].amount,
                        plan.uniqueId
                      )}
                      disabled={loadingPriceId === plan.uniqueId}
                    >
                      {loadingPriceId === plan.uniqueId ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Test Credit Packs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold text-lightest-slate mb-6 text-center">Test Credit Packs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testCreditPacks.map((pack, index) => (
              <motion.div
                key={pack.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <Card className="bg-light-navy border-lightest-navy/20 h-full">
                  <CardHeader>
                    <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {pack.title}
                    </CardTitle>
                    <CardDescription className="text-slate">{pack.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-lightest-slate mb-2">{pack.credits}</p>
                      <p className="text-2xl font-bold text-green">${pack.amount}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-green text-deep-navy hover:bg-green/90" 
                      onClick={() => handleTestCreditPurchase(pack.priceId, pack.title, pack.amount, pack.uniqueId)}
                      disabled={loadingPriceId === pack.uniqueId}
                    >
                      {loadingPriceId === pack.uniqueId ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Test Purchase
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Test Instructions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-12"
        >
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Test Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lightest-slate mb-2">Test Card Information:</h4>
                  <ul className="space-y-1 text-slate">
                    <li>• Card Number: <code className="bg-deep-navy px-2 py-1 rounded">4242 4242 4242 4242</code></li>
                    <li>• Expiry: Any future date (e.g., 12/25)</li>
                    <li>• CVC: Any 3 digits (e.g., 123)</li>
                    <li>• ZIP: Any 5 digits (e.g., 12345)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-lightest-slate mb-2">What to Test:</h4>
                  <ul className="space-y-1 text-slate">
                    <li>• Subscription plans (monthly/yearly)</li>
                    <li>• Credit pack purchases</li>
                    <li>• Successful payments</li>
                    <li>• Failed payments (use 4000 0000 0000 0002)</li>
                    <li>• Webhook handling</li>
                    <li>• User profile updates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default TestCheckoutEnhanced;
