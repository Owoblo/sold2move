import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  X,
  Zap,
  Building2,
  Rocket,
  Crown,
  ArrowRight,
  MapPin,
  Phone,
  Sofa,
  Link2,
  Users,
  Headphones,
  Calendar,
  Settings,
  Mail,
  Clock,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import { PRICING_TIERS, getAllTiers, formatPrice } from '@/lib/pricingTiers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageWrapper from '@/components/layout/PageWrapper';

const tierIcons = {
  solo: Building2,
  special: Rocket,
  premium: Crown,
};

const PricingCard = ({ tier, isCurrentPlan, onSelect, isLoading, isTrialing }) => {
  const Icon = tierIcons[tier.id] || Building2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card
        className={`relative h-full flex flex-col ${
          tier.highlighted
            ? 'border-2 border-primary shadow-lg shadow-primary/20 bg-gradient-to-b from-light-navy to-deep-navy'
            : 'border border-lightest-navy/20 bg-light-navy/80'
        } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
      >
        {/* Badge */}
        {tier.badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
              {tier.badge}
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <Badge className="bg-teal text-deep-navy px-3 py-1 text-xs font-semibold">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pt-8 pb-4">
          <div
            className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${
              tier.highlighted ? 'bg-primary/20' : 'bg-charcoal-700/50'
            }`}
          >
            <Icon className={`w-7 h-7 ${tier.highlighted ? 'text-primary' : 'text-slate'}`} />
          </div>
          <CardTitle className="text-2xl font-bold text-lightest-slate">{tier.name}</CardTitle>
          <p className="text-slate text-sm mt-1">{tier.description}</p>
        </CardHeader>

        <CardContent className="flex-1 space-y-6">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-5xl font-bold ${tier.highlighted ? 'text-primary' : 'text-lightest-slate'}`}>
                {formatPrice(tier.price)}
              </span>
              <span className="text-slate text-lg">/month</span>
            </div>
            {tier.cityLimit ? (
              <p className="text-slate text-sm mt-2">
                {tier.cityLimit} {tier.cityLimit === 1 ? 'city' : 'cities'} included
                {tier.extraCityPrice > 0 && (
                  <span className="block text-xs text-slate/70">
                    +{formatPrice(tier.extraCityPrice)}/city for additional
                  </span>
                )}
              </p>
            ) : (
              <p className="text-primary text-sm mt-2 font-medium">Unlimited cities</p>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3">
            {tier.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                {feature.included ? (
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-slate/40 flex-shrink-0 mt-0.5" />
                )}
                <span className={feature.included ? 'text-lightest-slate' : 'text-slate/50'}>
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

          {/* Target audience */}
          <div className="pt-4 border-t border-lightest-navy/10">
            <p className="text-xs text-slate italic">{tier.shortDescription}</p>
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          <Button
            onClick={() => onSelect(tier.id)}
            disabled={isLoading || isCurrentPlan}
            className={`w-full h-12 text-base font-semibold ${
              tier.highlighted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-charcoal-700 text-lightest-slate hover:bg-charcoal-600'
            }`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : isCurrentPlan ? (
              'Current Plan'
            ) : isTrialing ? (
              <>
                Start with {tier.name}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Upgrade to {tier.name}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const PricingPage = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);

  const tiers = getAllTiers();

  // Check for trial status
  const isTrialing =
    profile?.subscription_status === 'trialing' ||
    (!profile?.subscription_status && profile?.onboarding_complete) ||
    profile?.trial_granted;

  const currentPlan = profile?.subscription_tier || null;

  // Calculate trial days remaining
  const trialDaysRemaining = React.useMemo(() => {
    if (!profile?.created_at) return 14;
    const created = new Date(profile.created_at);
    const trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const days = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  }, [profile?.created_at]);

  // Handle payment success/cancellation
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      toast({
        title: 'Payment Successful!',
        description: 'Your subscription has been activated. Welcome aboard!',
        duration: 5000,
      });
      refreshProfile();
      navigate('/dashboard/billing', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was cancelled. You can try again anytime.',
        duration: 3000,
      });
      navigate('/dashboard/billing', { replace: true });
    }
  }, [searchParams, toast, refreshProfile, navigate]);

  const handleSelectPlan = async (tierId) => {
    setLoadingTier(tierId);
    try {
      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: JSON.stringify({ tierId }),
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (!data.sessionId) {
        throw new Error('No session ID returned');
      }

      const stripe = await getStripe();
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message || 'Could not start subscription. Please try again.',
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: JSON.stringify({}),
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not open billing portal. Please try again.',
      });
    }
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-deep-navy">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <PageWrapper title="Pricing & Plans" description="Choose the plan that fits your business">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-lightest-slate">Simple, Transparent Pricing</h1>
          <p className="text-slate text-lg max-w-2xl mx-auto">
            Choose the plan that fits your moving business. All plans include access to real-time
            listing data. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Trial Banner */}
        {isTrialing && trialDaysRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/20 to-teal/20 border border-primary/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 rounded-full p-2">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lightest-slate font-semibold">
                    Free Trial: {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}{' '}
                    remaining
                  </p>
                  <p className="text-slate text-sm">
                    You have full access to all features. Choose a plan before your trial ends.
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Zap className="w-3 h-3 mr-1" />
                Full Access
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Current Subscription Status */}
        {profile?.subscription_status === 'active' && (
          <Card className="bg-light-navy/80 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-lightest-slate font-semibold">
                      Current Plan:{' '}
                      <span className="text-primary capitalize">{currentPlan || 'Active'}</span>
                    </p>
                    <p className="text-slate text-sm">
                      Next billing:{' '}
                      {profile?.current_period_end
                        ? new Date(profile.current_period_end).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <Button onClick={handleManageSubscription} variant="outline" className="border-primary text-primary">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isCurrentPlan={currentPlan === tier.id}
              onSelect={handleSelectPlan}
              isLoading={loadingTier === tier.id}
              isTrialing={isTrialing}
            />
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <Card className="bg-light-navy/50 border-lightest-navy/10">
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-lightest-slate font-semibold mb-2">Need More Cities?</h3>
              <p className="text-slate text-sm">
                Add extra cities to Solo or Special plans for a small monthly fee. Premium includes
                unlimited cities.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-light-navy/50 border-lightest-navy/10">
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-lightest-slate font-semibold mb-2">Cancel Anytime</h3>
              <p className="text-slate text-sm">
                No long-term contracts. Cancel your subscription anytime from your billing portal.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-light-navy/50 border-lightest-navy/10">
            <CardContent className="p-6 text-center">
              <Headphones className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-lightest-slate font-semibold mb-2">Questions?</h3>
              <p className="text-slate text-sm">
                Need help choosing? Contact us at{' '}
                <a href="mailto:support@sold2move.com" className="text-primary hover:underline">
                  support@sold2move.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default PricingPage;
