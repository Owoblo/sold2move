import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import PageWrapper from '@/components/layout/PageWrapper';
import PricingCard from '@/components/PricingCard';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/stripeClient';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { useActiveSubscription } from '@/hooks/useActiveSubscription.jsx';
import { BarChart, Mail, Filter, HeartHandshake as Handshake, Loader2, Package, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

// Production pricing plans with real Stripe price IDs
const pricingPlans = [
  {
    title: 'Free Trial',
    description: 'Get inside, click around, and see fresh leads.',
    prices: {
      monthly: { id: null, amount: 0, interval: '/30 days' },
      yearly: { id: null, amount: 0, interval: '/30 days' },
    },
    credits: '1 Month Free',
    features: ['Worth over $500', 'Full access', 'Email alerts', 'Full dashboard'],
    cta: 'Get Started Free',
    popular: false,
    delay: 0,
  },
  {
    title: 'Starter',
    description: 'Perfect for small operators who just need steady leads.',
    prices: {
      monthly: { id: 'price_1SFrRDCUfCzyitr0gM80TZwJ', amount: 49, interval: '/month', currency: 'CAD' },
      yearly: { id: 'price_1SFrRDCUfCzyitr0gM80TZwJ', amount: 49, interval: '/month', currency: 'CAD' },
    },
    credits: '500 Credits/month',
    features: ['500 credits monthly', 'CSV export', 'Email alerts', 'Basic filters', 'Email support'],
    cta: 'Choose Plan',
    popular: false,
    delay: 1,
  },
  {
    title: 'Professional',
    description: 'For serious marketers who want to scale their business.',
    prices: {
      monthly: { id: 'price_1SFrRECUfCzyitr0ONdOzHLp', amount: 99, interval: '/month', currency: 'CAD' },
      yearly: { id: 'price_1SFrRECUfCzyitr0ONdOzHLp', amount: 99, interval: '/month', currency: 'CAD' },
    },
    credits: '2000 Credits/month',
    features: ['2000 credits monthly', 'Advanced filters', 'Priority support', 'CRM integration', 'Extra credits available'],
    cta: 'Choose Plan',
    popular: true,
    delay: 2,
  },
  {
    title: 'Enterprise',
    description: 'For large teams and franchises that need it all.',
    prices: {
      monthly: { id: 'price_1SFrRGCUfCzyitr0Jrm1ui5K', amount: 299, interval: '/month', currency: 'CAD' },
      yearly: { id: 'price_1SFrRGCUfCzyitr0Jrm1ui5K', amount: 299, interval: '/month', currency: 'CAD' },
    },
    credits: 'Unlimited Credits',
    features: ['Unlimited credits', 'All features', 'Dedicated account manager', 'Custom integrations', 'API access'],
    cta: 'Choose Plan',
    popular: false,
    delay: 3,
  },
];

const topUpPacks = [
    {
        name: '100 Credits',
        credits: 100,
        price: 20,
        priceId: 'price_1SFrRtCUfCzyitr0ftw8x63q',
        description: "Perfect for trying out extra features",
        currency: 'CAD'
    },
    {
        name: '500 Credits',
        credits: 500,
        price: 80,
        priceId: 'price_1SFrRtCUfCzyitr0Wg2k0Cx9',
        description: "Great for regular users",
        currency: 'CAD',
        popular: true
    },
    {
        name: '1000 Credits',
        credits: 1000,
        price: 140,
        priceId: 'price_1SFrRuCUfCzyitr0aXuAPESw',
        description: "Best value for power users",
        currency: 'CAD'
    },
    {
        name: '2500 Credits',
        credits: 2500,
        price: 300,
        priceId: 'price_1SFrRuCUfCzyitr0gtxAJWJ6',
        description: "Maximum value for high-volume users",
        currency: 'CAD'
    }
];

const valueProps = [
  { icon: BarChart, title: "Exclusive Canadian Data", description: "The only platform with verified cross-border listings for North American dominance." },
  { icon: Mail, title: "99% Data Accuracy", description: "Guaranteed verified, timely, and geo-targeted listings delivered daily." },
  { icon: Filter, title: "Predictable Revenue", description: "Optimized operations with AI-powered filters for maximum ROI." },
  { icon: Handshake, title: "Competitive Advantage", description: "See your ROI in 30 days with the exclusive data that drives your fleet." },
];

const TopUpCard = ({ pack, onPurchase, loadingPriceId }) => {
    const isLoading = loadingPriceId === pack.priceId;
    return (
        <Card className="bg-light-navy border-lightest-navy/20 flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl text-teal font-heading flex items-center gap-2"><Package/> {pack.name}</CardTitle>
                <CardDescription className="text-slate">{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow text-center">
                <p className="text-5xl font-bold text-lightest-slate">{pack.credits} <span className="text-2xl text-slate">Credits</span></p>
                <p className="text-3xl font-bold text-teal mt-2">${pack.price}</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full bg-teal text-deep-navy hover:bg-teal/90" onClick={() => onPurchase(pack.priceId)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Purchase Now'}
                </Button>
            </CardFooter>
        </Card>
    );
};

const PricingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, profile } = useProfile();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState(null);
  
  const { loading: subscriptionLoading, isActive, subscription } = useActiveSubscription();

  const isPaid = profile && ['active', 'trialing', 'past_due'].includes(profile.subscription_status);

  // Check if a plan matches the user's current subscription
  // Compares plan title (case-insensitive) with subscription_plan or subscription_tier_name
  const isCurrentPlan = (planTitle) => {
    if (!isActive || !subscription) return false;
    const currentPlan = (subscription.plan || subscription.tierName || '').toLowerCase();
    return currentPlan === planTitle.toLowerCase();
  };

  const handleCheckout = async (price, mode = 'subscription') => {
    const priceId = price?.id || (mode === 'subscription' ? 'free_trial' : null);
    if (!priceId && mode !== 'subscription') return;

    setLoadingPriceId(priceId);

    if (!session) {
      navigate('/signup');
      setLoadingPriceId(null);
      return;
    }
    
    if (priceId === 'free_trial') {
      try {
        const { error } = await supabase.functions.invoke('grant-free-trial', { body: { credits: 500 } });
        if (error) throw error;
        toast({ title: 'Free trial activated!', description: '500 credits have been added to your account.' });
        navigate('/dashboard');
      } catch (e) {
        toast({ variant: 'destructive', title: 'Could not activate trial', description: e.message || 'Please try again.' });
      } finally {
        setLoadingPriceId(null);
      }
      return;
    }

    // Use the working checkout function
    try {
      console.log('Creating checkout session for:', { priceId: price.id, mode });
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session-fixed', {
        body: JSON.stringify({ priceId: price.id, mode }),
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
      toast({ variant: 'destructive', title: 'Checkout Error', description: error.message || 'Could not redirect to checkout.' });
      setLoadingPriceId(null);
    }
  };

  const handleTopUp = (priceId) => handleCheckout({ id: priceId }, 'payment');

  if (subscriptionLoading) {
    return (
      <PageWrapper title="Pricing" description="Plans for every stage of your business.">
        <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-teal" /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Moving Company Data Plans & Pricing | Sold2Move" description="Affordable pricing plans for moving companies to access real-time sold listings data in Canada and USA. Start with free credits and scale as you grow.">
      
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading">
            Affordable Data Plans for Moving Companies in Canada & USA
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-lg text-slate mt-4 max-w-3xl mx-auto">
            From a free trial to an enterprise plan with unlimited leads. Get the exclusive North American data that drives your fleet.
          </motion.p>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex justify-center items-center gap-4 mb-12">
          <span className={`font-semibold transition-colors ${!isYearly ? 'text-teal' : 'text-slate'}`}>Monthly</span>
          <ToggleGroup type="single" value={isYearly ? 'yearly' : 'monthly'} onValueChange={(value) => setIsYearly(value === 'yearly')}>
            <ToggleGroupItem value="monthly" aria-label="Toggle monthly">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="yearly" aria-label="Toggle yearly">Yearly</ToggleGroupItem>
          </ToggleGroup>
          <span className={`font-semibold transition-colors ${isYearly ? 'text-teal' : 'text-slate'}`}>Yearly</span>
          <span className="ml-2 bg-teal/20 text-teal text-xs font-bold px-2 py-1 rounded-full">SAVE 20%</span>
        </motion.div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 items-stretch">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.title} plan={plan} isYearly={isYearly} handleCheckout={handleCheckout} loadingPriceId={loadingPriceId} isPaid={isPaid} isCurrentPlan={isCurrentPlan(plan.title)} navigate={navigate} />
          ))}
        </div>
        
        <div id="top-up" className="mt-24 pt-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading flex items-center justify-center gap-3"><Sparkles className="text-teal"/> One-Time Credit Packs</h2>
            <p className="text-lg text-slate mt-3 max-w-2xl mx-auto">Need more exclusive leads before your next renewal? Top up your credits anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {topUpPacks.map((pack) => (
                <TopUpCard key={pack.name} pack={pack} onPurchase={() => handleTopUp(pack.priceId)} loadingPriceId={loadingPriceId} />
            ))}
          </div>
        </div>

        <div className="mt-24">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">Included in Every Plan</h2>
                <p className="text-lg text-slate mt-3 max-w-2xl mx-auto">Get the tools you need to turn leads into loyal customers.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {valueProps.map((prop, index) => (
                    <motion.div key={prop.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="text-center p-6 rounded-lg bg-light-navy border border-lightest-navy/20">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-teal/10 mx-auto mb-4"><prop.icon className="h-8 w-8 text-teal" /></div>
                        <h3 className="text-xl font-bold text-lightest-slate mb-2">{prop.title}</h3>
                        <p className="text-slate">{prop.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>

        <div className="text-center mt-20">
            <p className="text-slate text-lg">Have questions or need a custom solution?</p>
            <Button asChild variant="link" className="text-teal text-lg font-semibold"><Link to="/contact">Contact Sales</Link></Button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default PricingPage;