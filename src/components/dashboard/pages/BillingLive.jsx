import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, Zap, ArrowRight, MapPin, Users, Calculator, Info, Clock, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import { useCalculatedPrice } from '@/hooks/useCalculatedPrice';
import { formatPrice, formatPopulation, TIERS } from '@/lib/pricingUtils';

// Calculate days remaining in trial (30 days from account creation)
const calculateTrialDaysRemaining = (createdAt) => {
  if (!createdAt) return 30;
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
};

const getTrialEndDate = (createdAt) => {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  return trialEnd;
};

const BillingLive = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState(null);

  // Extract city names from service_cities (format: "CityName, StateCode")
  const serviceCityNames = useMemo(() => {
    if (!profile?.service_cities || profile.service_cities.length === 0) {
      return profile?.city_name ? [profile.city_name] : [];
    }
    return profile.service_cities.map(cityState => cityState.split(', ')[0]);
  }, [profile?.service_cities, profile?.city_name]);

  // Get calculated prices based on user's service areas
  const {
    loading: priceLoading,
    prices,
    totalPopulation,
    cityPopulations,
    citiesWithoutData,
  } = useCalculatedPrice(serviceCityNames);

  const isOnFreeTrial = profile?.subscription_status === 'trialing' ||
    (!profile?.subscription_status && profile?.onboarding_complete) ||
    profile?.trial_granted;

  // Calculate trial info
  const trialDaysRemaining = useMemo(() =>
    calculateTrialDaysRemaining(profile?.created_at),
    [profile?.created_at]
  );

  const trialEndDate = useMemo(() =>
    getTrialEndDate(profile?.created_at),
    [profile?.created_at]
  );

  // Handle payment success/cancellation from URL parameters
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Welcome aboard!",
        duration: 5000,
      });
      // Refresh profile to get updated subscription status
      refreshProfile();
      // Clean up URL parameters
      navigate('/dashboard/billing', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        duration: 3000,
      });
      // Clean up URL parameters
      navigate('/dashboard/billing', { replace: true });
    }
  }, [searchParams, toast, refreshProfile, navigate]);

  // Handle dynamic subscription checkout based on calculated price
  const handleDynamicSubscription = async (tier) => {
    setLoadingPackageId(`dynamic-${tier}`);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-dynamic-subscription', {
        body: JSON.stringify({ tier }),
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (!data.sessionId) {
        throw new Error('No session ID returned from checkout function');
      }

      const stripe = await getStripe();
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) throw stripeError;
    } catch (error) {
      console.error('Dynamic subscription error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message || 'Could not initiate subscription. Please try again.',
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

  return (
    <PageWrapper title="Billing & Plans" description="Manage your subscription and billing details.">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 p-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-lightest-slate font-heading mb-4">Billing & Plans</h1>
          <p className="text-slate">Manage your subscription and billing details</p>
        </div>

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
                  profile?.subscription_status === 'active' ? 'bg-teal/20 text-teal' :
                  isOnFreeTrial ? 'bg-teal/20 text-teal' : 'bg-slate/20 text-slate'
                }`}
              >
                {profile?.subscription_status === 'active' ? 'ACTIVE' :
                 isOnFreeTrial ? 'FREE TRIAL' : 'FREE'}
              </Badge>
              <span className="text-2xl font-semibold text-lightest-slate capitalize">
                {currentPlan} Plan
              </span>
            </div>
            <p className="text-slate mb-2">
              {isOnFreeTrial ? (
                "You have full access during your 1-month free trial."
              ) : profile?.subscription_status === 'active' ? (
                "You have full access to all features."
              ) : (
                "Subscribe to get full access to all property listings."
              )}
            </p>
            {/* Trial countdown display */}
            {isOnFreeTrial && trialDaysRemaining > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-teal/10 to-deep-navy rounded-lg border border-teal/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal/20 rounded-full p-2">
                      <Clock className="h-5 w-5 text-teal" />
                    </div>
                    <div>
                      <p className="text-lightest-slate font-semibold">
                        {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                      </p>
                      <p className="text-slate text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Trial ends {trialEndDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate">After trial</p>
                    <p className="text-teal font-bold">
                      {priceLoading ? '...' : formatPrice(prices.moversSpecial)}/mo
                    </p>
                  </div>
                </div>
              </div>
            )}
            {profile?.subscription_status === 'active' && (
              <p className="text-sm text-slate mt-2">
                Next billing date: {profile?.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Your Calculated Price Based on Service Areas */}
        <Card className="bg-gradient-to-br from-light-navy to-deep-navy border-teal/30">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-lightest-slate flex items-center gap-2">
              <Calculator className="h-6 w-6 text-teal" />
              Your Price Based on Service Areas
            </CardTitle>
            <p className="text-slate text-sm mt-1">
              Your monthly price is calculated based on the total population of your selected service cities.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {priceLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <>
                {/* Service Areas Summary */}
                <div className="bg-deep-navy/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-teal" />
                    <h3 className="font-semibold text-lightest-slate">Your Service Areas</h3>
                  </div>
                  {cityPopulations.length > 0 ? (
                    <div className="space-y-2">
                      {cityPopulations.map((city) => (
                        <div key={city.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate">{city.city_name}, {city.state_province_code}</span>
                          <span className="text-lightest-slate font-medium">
                            <Users className="h-3 w-3 inline mr-1" />
                            {formatPopulation(city.population)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-lightest-navy/20 pt-2 mt-2 flex items-center justify-between">
                        <span className="text-slate font-medium">Total Population</span>
                        <span className="text-teal font-bold text-lg">{formatPopulation(totalPopulation)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate text-sm">
                      No service areas selected.{' '}
                      <Link to="/dashboard/settings" className="text-teal hover:underline">
                        Add service areas
                      </Link>
                    </p>
                  )}
                  {citiesWithoutData.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 text-amber-400 text-sm">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {citiesWithoutData.length} city(ies) not found in our database: {citiesWithoutData.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Calculated Prices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Tier */}
                  <div className="bg-deep-navy/30 rounded-lg p-4 border border-lightest-navy/20">
                    <h4 className="font-semibold text-lightest-slate mb-1">Basic Plan</h4>
                    <p className="text-slate text-xs mb-3">{TIERS.basic.description}</p>
                    <p className="text-3xl font-bold text-teal mb-3">
                      {formatPrice(prices.basic)}
                      <span className="text-sm text-slate font-normal">/month</span>
                    </p>
                    {!isOnFreeTrial && cityPopulations.length > 0 && (
                      <Button
                        onClick={() => handleDynamicSubscription('basic')}
                        disabled={loadingPackageId === 'dynamic-basic' || profile?.subscription_status === 'active'}
                        className="w-full bg-lightest-navy/50 text-lightest-slate hover:bg-lightest-navy/70"
                      >
                        {loadingPackageId === 'dynamic-basic' ? 'Processing...' : 'Subscribe to Basic'}
                      </Button>
                    )}
                  </div>

                  {/* Movers Special Tier */}
                  <div className="bg-deep-navy/30 rounded-lg p-4 border border-teal/50 relative">
                    <Badge className="absolute -top-2 -right-2 bg-teal text-deep-navy">Recommended</Badge>
                    <h4 className="font-semibold text-lightest-slate mb-1">Movers Special</h4>
                    <p className="text-slate text-xs mb-3">{TIERS.moversSpecial.description}</p>
                    <p className="text-3xl font-bold text-teal mb-3">
                      {formatPrice(prices.moversSpecial)}
                      <span className="text-sm text-slate font-normal">/month</span>
                    </p>
                    {!isOnFreeTrial && cityPopulations.length > 0 && (
                      <Button
                        onClick={() => handleDynamicSubscription('moversSpecial')}
                        disabled={loadingPackageId === 'dynamic-moversSpecial' || profile?.subscription_status === 'active'}
                        className="w-full bg-teal text-deep-navy hover:bg-teal/90"
                      >
                        {loadingPackageId === 'dynamic-moversSpecial' ? 'Processing...' : 'Subscribe to Movers Special'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Free Trial Notice with Pricing Breakdown */}
                {isOnFreeTrial && (
                  <div className="bg-teal/10 border border-teal/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-teal flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-lightest-slate">
                          You're on your free trial - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left!
                        </p>
                        <p className="text-slate text-sm">
                          Enjoy full access until {trialEndDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                          After your trial ends, you'll pay based on your selected service areas.
                        </p>
                      </div>
                    </div>

                    {/* Pricing Breakdown After Trial */}
                    <div className="border-t border-teal/20 pt-4">
                      <p className="text-sm font-medium text-lightest-slate mb-3">
                        Your pricing after trial ends:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-deep-navy/50 rounded-lg p-3">
                          <p className="text-xs text-slate mb-1">Basic Plan</p>
                          <p className="text-xl font-bold text-lightest-slate">{formatPrice(prices.basic)}<span className="text-sm font-normal text-slate">/mo</span></p>
                          <p className="text-xs text-slate mt-1">{TIERS.basic.description}</p>
                        </div>
                        <div className="bg-deep-navy/50 rounded-lg p-3 border border-teal/30">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate">Movers Special</p>
                            <Badge className="bg-teal/20 text-teal text-xs">Recommended</Badge>
                          </div>
                          <p className="text-xl font-bold text-teal">{formatPrice(prices.moversSpecial)}<span className="text-sm font-normal text-slate">/mo</span></p>
                          <p className="text-xs text-slate mt-1">{TIERS.moversSpecial.description}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate mt-3 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Based on {formatPopulation(totalPopulation)} total population across {cityPopulations.length} service {cityPopulations.length === 1 ? 'area' : 'areas'}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pricing Info */}
                <div className="text-xs text-slate bg-deep-navy/30 rounded-lg p-3">
                  <p className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <strong>How pricing works:</strong> Your price is based on the total population of your service areas.
                    Larger cities = more leads = higher price. Minimum price is $25/month.
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              asChild
              variant="outline"
              className="border-teal text-teal hover:bg-teal/10"
            >
              <Link to="/dashboard/settings">
                <MapPin className="h-4 w-4 mr-2" />
                Manage Service Areas
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </PageWrapper>
  );
};

export default BillingLive;
