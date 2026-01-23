import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  X,
  Building2,
  Rocket,
  Crown,
  ArrowRight,
  Clock,
  CreditCard,
  RefreshCw,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  Calendar,
  MapPin,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import { PRICING_TIERS, getAllTiers, formatPrice, getTier } from '@/lib/pricingTiers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageWrapper from '@/components/layout/PageWrapper';

const TRIAL_DAYS = 14;

const tierIcons = {
  solo: Building2,
  special: Rocket,
  premium: Crown,
};

// Calculate trial days remaining
const calculateTrialDaysRemaining = (createdAt) => {
  if (!createdAt) return TRIAL_DAYS;
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
};

const getTrialEndDate = (createdAt) => {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  return new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
};

// Status badge colors
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-teal/20 text-teal border-teal/30';
    case 'trialing':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'past_due':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'canceled':
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-slate/20 text-slate border-slate/30';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Subscription Status Card Component
const SubscriptionStatusCard = ({ profile, isTrialing, trialDaysRemaining, trialEndDate, onManageSubscription, isLoading }) => {
  const currentTier = getTier(profile?.subscription_tier);
  const hasSubscription = profile?.subscription_status === 'active' || isTrialing;

  if (!hasSubscription) {
    return (
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 px-4 bg-deep-navy/50 rounded-lg">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-400 mb-4" />
            <h3 className="text-lg font-medium text-lightest-slate mb-2">No Active Subscription</h3>
            <p className="text-slate text-sm mb-4">
              Choose a plan below to get started with Sold2Move and access property listings in your service areas.
            </p>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Inactive
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-light-navy border-lightest-navy/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-teal" />
          Subscription Status
        </CardTitle>
        <Button
          onClick={onManageSubscription}
          disabled={isLoading || !profile?.stripe_customer_id}
          variant="outline"
          size="sm"
          className="border-teal text-teal hover:bg-teal/10"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Manage in Stripe
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Badge className={`text-sm px-3 py-1 ${getStatusBadgeClass(profile?.subscription_status)}`}>
            {isTrialing ? 'TRIALING' : profile?.subscription_status?.toUpperCase() || 'INACTIVE'}
          </Badge>
          <span className="text-xl font-semibold text-lightest-slate">
            {currentTier?.name || profile?.subscription_tier_name || 'Free'} Plan
          </span>
          {currentTier && (
            <span className="text-teal font-bold">
              {formatPrice(currentTier.price)}/mo
            </span>
          )}
        </div>

        {/* Trial countdown */}
        {isTrialing && trialDaysRemaining > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-deep-navy rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 rounded-full p-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-lightest-slate font-semibold">
                    {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining in trial
                  </p>
                  <p className="text-slate text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Trial ends {formatDate(trialEndDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active subscription details */}
        {profile?.subscription_status === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-deep-navy/50 rounded-lg p-4">
              <p className="text-slate text-sm mb-1">Next Billing Date</p>
              <p className="text-lightest-slate font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal" />
                {formatDate(profile?.next_billing_date || profile?.current_period_end)}
              </p>
            </div>
            <div className="bg-deep-navy/50 rounded-lg p-4">
              <p className="text-slate text-sm mb-1">Cities Included</p>
              <p className="text-lightest-slate font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal" />
                {profile?.city_limit === null ? 'Unlimited' : `${profile?.city_limit || currentTier?.cityLimit || 1} cities`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pricing Tier Card Component
const PricingTierCard = ({ tier, isCurrentPlan, onSelect, isLoading, isTrialing }) => {
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
            ? 'border-2 border-teal shadow-lg shadow-teal/10 bg-gradient-to-b from-light-navy to-deep-navy'
            : 'border border-lightest-navy/20 bg-light-navy/80'
        } ${isCurrentPlan ? 'ring-2 ring-teal' : ''}`}
      >
        {tier.badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-teal text-deep-navy px-4 py-1 text-sm font-semibold">
              {tier.badge}
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <Badge className="bg-teal/20 text-teal border-teal/30 px-3 py-1 text-xs font-semibold">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pt-8 pb-4">
          <div
            className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${
              tier.highlighted ? 'bg-teal/20' : 'bg-lightest-navy/20'
            }`}
          >
            <Icon className={`w-7 h-7 ${tier.highlighted ? 'text-teal' : 'text-slate'}`} />
          </div>
          <CardTitle className="text-2xl font-bold text-lightest-slate">{tier.name}</CardTitle>
          <p className="text-slate text-sm mt-1">{tier.description}</p>
        </CardHeader>

        <CardContent className="flex-1 space-y-6">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-5xl font-bold ${tier.highlighted ? 'text-teal' : 'text-lightest-slate'}`}>
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
              <p className="text-teal text-sm mt-2 font-medium">Unlimited cities</p>
            )}
          </div>

          <div className="space-y-3">
            {tier.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                {feature.included ? (
                  <Check className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-slate/40 flex-shrink-0 mt-0.5" />
                )}
                <span className={feature.included ? 'text-lightest-slate' : 'text-slate/50'}>
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

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
                ? 'bg-teal text-deep-navy hover:bg-teal/90'
                : 'bg-lightest-navy/20 text-lightest-slate hover:bg-lightest-navy/30'
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
                {tier.price > (getTier(isCurrentPlan)?.price || 0) ? 'Upgrade to' : 'Switch to'} {tier.name}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// Payment History Component
const PaymentHistoryCard = ({ invoices, isLoading, onViewAll }) => {
  return (
    <Card className="bg-light-navy border-lightest-navy/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal" />
          Payment History
        </CardTitle>
        {invoices.length > 0 && (
          <Button
            onClick={onViewAll}
            variant="ghost"
            size="sm"
            className="text-teal hover:bg-teal/10"
          >
            View All
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-slate">
            <FileText className="mx-auto h-12 w-12 text-slate/30 mb-4" />
            <p>No payment history yet.</p>
            <p className="text-sm">Your invoices will appear here once you subscribe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 bg-deep-navy/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lightest-navy/20 rounded-md">
                    <FileText className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <p className="font-medium text-lightest-slate">{invoice.description}</p>
                    <p className="text-sm text-slate">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-lightest-slate">{invoice.amountFormatted}</p>
                    <Badge
                      className={
                        invoice.status === 'paid'
                          ? 'bg-teal/20 text-teal border-teal/30'
                          : invoice.status === 'open'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate/20 text-slate border-slate/30'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  {invoice.pdfUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-teal hover:bg-teal/10"
                    >
                      <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main BillingDashboard Component
const BillingDashboard = () => {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const tiers = getAllTiers();

  // Check for trial status
  const isTrialing =
    profile?.subscription_status === 'trialing' ||
    (!profile?.subscription_status && profile?.onboarding_complete) ||
    profile?.trial_granted;

  const currentTierId = profile?.subscription_tier || null;

  // Calculate trial info
  const trialDaysRemaining = useMemo(
    () => calculateTrialDaysRemaining(profile?.created_at),
    [profile?.created_at]
  );

  const trialEndDate = useMemo(
    () => getTrialEndDate(profile?.created_at),
    [profile?.created_at]
  );

  // Handle payment success/cancellation from URL parameters
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

  // Fetch invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!profile?.stripe_customer_id) return;

      setInvoicesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-billing-history');

        if (error) throw error;
        if (data?.invoices) {
          setInvoices(data.invoices);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchInvoices();
  }, [profile?.stripe_customer_id, supabase]);

  // Handle plan selection
  const handleSelectPlan = async (tierId) => {
    setLoadingTier(tierId);
    try {
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

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = async () => {
    setPortalLoading(true);
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
    } finally {
      setPortalLoading(false);
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
    <PageWrapper title="Billing & Subscription" description="Manage your subscription and billing details.">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-lightest-slate font-heading">Billing & Subscription</h1>
          <p className="text-slate">Manage your subscription, view invoices, and change plans</p>
        </div>

        {/* Subscription Status */}
        <SubscriptionStatusCard
          profile={profile}
          isTrialing={isTrialing}
          trialDaysRemaining={trialDaysRemaining}
          trialEndDate={trialEndDate}
          onManageSubscription={handleManageSubscription}
          isLoading={portalLoading}
        />

        {/* Pricing Tiers */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-lightest-slate">
            {currentTierId ? 'Change Plan' : 'Choose Your Plan'}
          </h2>
          <p className="text-slate">
            {currentTierId
              ? 'Upgrade or switch to a different plan anytime. Changes take effect immediately.'
              : 'Select a plan to get started. All plans include a 14-day free trial.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier) => (
              <PricingTierCard
                key={tier.id}
                tier={tier}
                isCurrentPlan={currentTierId === tier.id}
                onSelect={handleSelectPlan}
                isLoading={loadingTier === tier.id}
                isTrialing={isTrialing && !currentTierId}
              />
            ))}
          </div>
        </div>

        {/* Payment History */}
        <PaymentHistoryCard
          invoices={invoices}
          isLoading={invoicesLoading}
          onViewAll={handleManageSubscription}
        />

        {/* Help Section */}
        <Card className="bg-light-navy/50 border-lightest-navy/10">
          <CardContent className="p-6 text-center">
            <h3 className="text-lightest-slate font-semibold mb-2">Need Help?</h3>
            <p className="text-slate text-sm mb-4">
              Have questions about billing or need to make changes to your subscription?
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                className="border-teal text-teal hover:bg-teal/10"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Portal
              </Button>
              <Button
                variant="outline"
                className="border-lightest-navy/30 text-lightest-slate hover:bg-lightest-navy/10"
                onClick={() => navigate('/dashboard/support')}
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default BillingDashboard;
