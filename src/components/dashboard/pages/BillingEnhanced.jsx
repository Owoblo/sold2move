import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Crown,
  Building,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { getStripe } from '@/lib/getStripe';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAnalytics } from '@/services/analytics.jsx';

const BillingEnhanced = () => {
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { toast } = useToast();
  const { trackAction } = useAnalytics();
  
  const [loading, setLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  // Subscription plans
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small moving companies',
      price: { monthly: 29, yearly: 290 },
      credits: 100,
      features: [
        '100 credits per month',
        'Just Listed properties',
        'Sold properties',
        'Basic filtering',
        'CSV export',
        'Email support'
      ],
      popular: false,
      icon: Building
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Ideal for growing moving companies',
      price: { monthly: 79, yearly: 790 },
      credits: 500,
      features: [
        '500 credits per month',
        'Just Listed properties',
        'Sold properties',
        'Advanced filtering',
        'Bulk operations',
        'CSV export',
        'Priority support',
        'Multiple service areas'
      ],
      popular: true,
      icon: TrendingUp
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large moving companies',
      price: { monthly: 199, yearly: 1990 },
      credits: -1, // Unlimited
      features: [
        'Unlimited credits',
        'Just Listed properties',
        'Sold properties',
        'Advanced filtering',
        'Bulk operations',
        'CSV export',
        'Dedicated support',
        'Unlimited service areas',
        'API access',
        'Custom integrations'
      ],
      popular: false,
      icon: Crown
    }
  ];

  // Credit packages
  const creditPackages = [
    { credits: 50, price: 15, savings: 0 },
    { credits: 100, price: 25, savings: 17 },
    { credits: 250, price: 50, savings: 33 },
    { credits: 500, price: 90, savings: 40 }
  ];

  useEffect(() => {
    if (profile) {
      fetchBillingHistory();
      fetchSubscriptionDetails();
    }
  }, [profile]);

  const fetchBillingHistory = async () => {
    if (!profile?.stripe_customer_id) return;
    
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error) {
      console.error('Error fetching billing history:', error);
    }
  };

  const fetchSubscriptionDetails = async () => {
    if (!profile?.stripe_subscription_id) return;
    
    try {
      // This would typically call a backend endpoint to get subscription details
      // For now, we'll use the profile data
      setSubscriptionDetails({
        id: profile.stripe_subscription_id,
        status: profile.subscription_status,
        plan: profile.subscription_plan,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Mock date
        cancel_at_period_end: false
      });
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  };

  const handleSubscribe = async (planId, billingInterval = 'monthly') => {
    setLoading(true);
    
    try {
      trackAction('subscription_attempt', { plan: planId, interval: billingInterval });
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: `price_${planId}_${billingInterval}`, // This would be the actual Stripe price ID
          billingInterval
        }
      });
      
      if (error) throw error;
      
      const stripe = await getStripe();
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
      
      if (stripeError) throw stripeError;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        variant: "destructive",
        title: "Subscription Failed",
        description: error.message || "Failed to start subscription process"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async (credits, price) => {
    setLoading(true);
    
    try {
      trackAction('credit_purchase_attempt', { credits, price });
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: `price_credits_${credits}`, // This would be the actual Stripe price ID
          type: 'credit_package'
        }
      });
      
      if (error) throw error;
      
      const stripe = await getStripe();
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
      
      if (stripeError) throw stripeError;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error.message || "Failed to start purchase process"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          returnUrl: window.location.href
        }
      });
      
      if (error) throw error;
      
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open billing portal"
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-teal" />;
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'past_due':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-teal/10 text-teal border-teal/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-slate/10 text-slate border-slate/20';
    }
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-8 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <SkeletonLoader key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-lightest-slate">Billing & Subscription</h1>
          <p className="text-slate mt-2">Manage your subscription and billing information</p>
        </div>
        {profile?.stripe_subscription_id && (
          <Button
            onClick={handleManageSubscription}
            variant="outline"
            className="border-teal text-teal hover:bg-teal/10"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Subscription
          </Button>
        )}
      </motion.div>

      {/* Current Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(profile?.subscription_status)}
                  <span className="text-sm font-medium">Subscription</span>
                </div>
                <Badge className={getStatusColor(profile?.subscription_status)}>
                  {profile?.subscription_status || 'inactive'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-teal" />
                  <span className="text-sm font-medium">Credits Remaining</span>
                </div>
                <div className="text-2xl font-bold text-lightest-slate">
                  {profile?.credits_remaining || 0}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate" />
                  <span className="text-sm font-medium">Plan</span>
                </div>
                <div className="text-lg font-semibold text-lightest-slate">
                  {profile?.subscription_plan || 'Free'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Plans */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-lightest-slate">Choose Your Plan</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrentPlan = profile?.subscription_plan === plan.id;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className={`relative ${plan.popular ? 'ring-2 ring-teal' : ''} ${isCurrentPlan ? 'bg-teal/5' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-teal text-deep-navy">Most Popular</Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 right-4">
                        <Badge className="bg-teal/20 text-teal border-teal/30">Current Plan</Badge>
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-light-navy rounded-lg">
                          <Icon className="h-6 w-6 text-teal" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-lightest-slate">
                          ${plan.price.monthly}
                          <span className="text-lg text-slate">/month</span>
                        </div>
                        <div className="text-sm text-slate">
                          or ${plan.price.yearly}/year (save 17%)
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-teal flex-shrink-0" />
                            <span className="text-sm text-lightest-slate">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button
                        onClick={() => handleSubscribe(plan.id, 'monthly')}
                        disabled={loading || isCurrentPlan}
                        className={`w-full ${plan.popular ? 'bg-teal text-deep-navy hover:bg-teal/90' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {isCurrentPlan ? 'Current Plan' : `Start ${plan.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Credit Packages */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Buy Additional Credits
            </CardTitle>
            <CardDescription>
              Need more credits? Purchase additional credits to continue revealing properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.credits}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-lightest-slate mb-2">
                        {pkg.credits} Credits
                      </div>
                      <div className="text-3xl font-bold text-teal mb-2">
                        ${pkg.price}
                      </div>
                      {pkg.savings > 0 && (
                        <Badge variant="secondary" className="mb-4">
                          Save {pkg.savings}%
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleBuyCredits(pkg.credits, pkg.price)}
                        disabled={loading}
                        className="w-full"
                        variant="outline"
                      >
                        Buy Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-light-navy rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-lightest-navy/20 rounded-md">
                        <DollarSign className="h-4 w-4 text-teal" />
                      </div>
                      <div>
                        <div className="font-medium text-lightest-slate">{item.description}</div>
                        <div className="text-sm text-slate">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lightest-slate">
                        ${item.amount}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default BillingEnhanced;
