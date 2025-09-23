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

const pricingPlans = [
  {
    title: 'Free Trial',
    description: 'Get inside, click around, and see fresh leads.',
    prices: {
      monthly: { id: null, amount: 0, interval: '/30 days' },
      yearly: { id: null, amount: 0, interval: '/30 days' },
    },
    credits: '100 Credits',
    features: ['100 credits', 'CSV export', 'Email alerts', 'Full dashboard'],
    cta: 'Get Started Free',
    popular: false,
    delay: 0,
  },
  {
    title: 'Starter',
    description: 'Perfect for small operators who just need steady leads.',
    prices: {
      monthly: { id: 'price_1PgKAbCUfCzyitr0LwS2VTmE', amount: 99, interval: '/month' },
      yearly: { id: 'price_1PgKAbCUfCzyitr0m8rPZ4nO', amount: 999, interval: '/year' },
    },
    credits: '2,000 Credits/month',
    features: ['2,000 credits', 'CSV export', 'Email alerts', 'Standard filters', 'Extra credits: $0.06'],
    cta: 'Choose Plan',
    popular: false,
    delay: 1,
  },
  {
    title: 'Growth',
    description: 'For serious marketers who want to scale their business.',
    prices: {
      monthly: { id: 'price_1PgKBaCUfCzyitr0o3L0Y1xP', amount: 299, interval: '/month' },
      yearly: { id: 'price_1PgKBaCUfCzyitr02i3oW1pC', amount: 2999, interval: '/year' },
    },
    credits: '10,000 Credits/month',
    features: ['10,000 credits', 'Mover Special Listings', 'Priority Access (24 hours early)', 'Mailing discounts', 'Extra credits: $0.05'],
    cta: 'Choose Plan',
    popular: true,
    delay: 2,
  },
  {
    title: 'Enterprise',
    description: 'For large teams and franchises that need it all.',
    prices: {
      monthly: { id: 'price_1PgKCUCUfCzyitr0tA2mFfT1', amount: 999, interval: '/month' },
      yearly: { id: 'price_1PgKCUCUfCzyitr08p8xW7E3', amount: 9999, interval: '/year' },
    },
    credits: 'Unlimited Credits',
    features: ['Unlimited credits', 'Vacancy AI + Furniture AI filters', 'Dedicated support', 'Biggest mailing discounts', 'API access'],
    cta: 'Choose Plan',
    popular: false,
    delay: 3,
  },
];

const topUpPacks = [
    {
        name: 'Booster Pack',
        credits: 200,
        price: 120,
        priceId: 'price_1PgfArCUfCzyitr0qW2f5Nop',
        description: "A quick boost to get you through the month."
    },
    {
        name: 'Pro Pack',
        credits: 1000,
        price: 500,
        priceId: 'price_1PgfBGCUfCzyitr0H5a2xW3E',
        description: "Best value for high-volume mailers."
    }
];

const valueProps = [
  { icon: BarChart, title: "Fresh, Verified Data", description: "Real-time Just Listed & Sold data for a first-mover advantage." },
  { icon: Mail, title: "Done-for-You Mailings", description: "We design, print, and mail for you at discounted rates." },
  { icon: Filter, title: "Advanced Filtering", description: "Target high-value homes, furniture-heavy homes, and more." },
  { icon: Handshake, title: "Scales With You", description: "From a free trial to an enterprise plan with unlimited leads." },
];

const TopUpCard = ({ pack, onPurchase, loadingPriceId }) => {
    const isLoading = loadingPriceId === pack.priceId;
    return (
        <Card className="bg-light-navy border-lightest-navy/20 flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl text-green font-heading flex items-center gap-2"><Package/> {pack.name}</CardTitle>
                <CardDescription className="text-slate">{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow text-center">
                <p className="text-5xl font-bold text-lightest-slate">{pack.credits} <span className="text-2xl text-slate">Credits</span></p>
                <p className="text-3xl font-bold text-green mt-2">${pack.price}</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full bg-green text-deep-navy hover:bg-green/90" onClick={() => onPurchase(pack.priceId)} disabled={isLoading}>
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
  
  const { loading: subscriptionLoading, activePriceId } = useActiveSubscription();

  const isPaid = profile && ['active', 'trialing', 'past_due'].includes(profile.subscription_status);
  
  const isCurrentPlan = (planPriceId) => Boolean(activePriceId && planPriceId && activePriceId === planPriceId);

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
        const { error } = await supabase.functions.invoke('grant-free-trial', { body: { credits: 100 } });
        if (error) throw error;
        toast({ title: 'Free trial activated!', description: '100 credits have been added to your account.' });
        navigate('/dashboard');
      } catch (e) {
        toast({ variant: 'destructive', title: 'Could not activate trial', description: e.message || 'Please try again.' });
      } finally {
        setLoadingPriceId(null);
      }
      return;
    }

    const functionName = mode === 'subscription' ? 'create-checkout-session' : 'create-topup-session';
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { priceId: price.id },
      });
      if (error) throw error;
      const stripe = await getStripe();
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Checkout Error', description: error.message || 'Could not redirect to checkout.' });
      setLoadingPriceId(null);
    }
  };

  const handleTopUp = (priceId) => handleCheckout({ id: priceId }, 'payment');

  if (subscriptionLoading) {
    return (
      <PageWrapper title="Pricing" description="Plans for every stage of your business.">
        <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-green" /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Pricing Plans" description="Flexible, credit-based plans for your growth.">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading">
            Flexible Plans for Ambitious Movers
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-lg text-slate mt-4 max-w-3xl mx-auto">
            Choose a plan that scales with you. All subscriptions come with credits to unlock exclusive, real-time leads.
          </motion.p>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex justify-center items-center gap-4 mb-12">
          <span className={`font-semibold transition-colors ${!isYearly ? 'text-green' : 'text-slate'}`}>Monthly</span>
          <ToggleGroup type="single" value={isYearly ? 'yearly' : 'monthly'} onValueChange={(value) => setIsYearly(value === 'yearly')}>
            <ToggleGroupItem value="monthly" aria-label="Toggle monthly">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="yearly" aria-label="Toggle yearly">Yearly</ToggleGroupItem>
          </ToggleGroup>
          <span className={`font-semibold transition-colors ${isYearly ? 'text-green' : 'text-slate'}`}>Yearly</span>
          <span className="ml-2 bg-green/20 text-green text-xs font-bold px-2 py-1 rounded-full">SAVE 20%</span>
        </motion.div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 items-stretch">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.title} plan={plan} isYearly={isYearly} handleCheckout={handleCheckout} loadingPriceId={loadingPriceId} isPaid={isPaid} isCurrentPlan={isCurrentPlan(isYearly ? plan.prices.yearly.id : plan.prices.monthly.id)} navigate={navigate} />
          ))}
        </div>
        
        <div id="top-up" className="mt-24 pt-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading flex items-center justify-center gap-3"><Sparkles className="text-green"/> One-Time Credit Packs</h2>
            <p className="text-lg text-slate mt-3 max-w-2xl mx-auto">Need more leads before your next renewal? Top up your credits anytime.</p>
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
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green/10 mx-auto mb-4"><prop.icon className="h-8 w-8 text-green" /></div>
                        <h3 className="text-xl font-bold text-lightest-slate mb-2">{prop.title}</h3>
                        <p className="text-slate">{prop.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>

        <div className="text-center mt-20">
            <p className="text-slate text-lg">Have questions or need a custom solution?</p>
            <Button asChild variant="link" className="text-green text-lg font-semibold"><Link to="/contact">Contact Sales</Link></Button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default PricingPage;