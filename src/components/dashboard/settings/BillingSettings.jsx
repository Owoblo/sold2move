
import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const BillingSettings = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: JSON.stringify({ return_url: window.location.href }),
      });

      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not access the billing portal. Please try again.',
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const renderPlanDetails = () => {
    if (profileLoading) {
      return <SkeletonLoader count={3} className="h-6 w-full mb-2" />;
    }

    if (!profile?.plan_tier || profile.plan_tier === 'free') {
      return <p className="text-slate">You are currently on the Free plan.</p>;
    }

    return (
      <div className="space-y-2 text-lightest-slate">
        <div className="flex justify-between items-center">
          <span className="text-slate">Plan:</span>
          <Badge variant="outline" className="capitalize bg-green/10 text-green border-green/50">{profile.plan_tier}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate">Status:</span>
          <Badge variant={profile.subscription_status === 'active' ? 'success' : 'destructive'} className="capitalize">{profile.subscription_status}</Badge>
        </div>
        {profile.current_period_end && (
          <div className="flex justify-between items-center">
            <span className="text-slate">Renews on:</span>
            <span>{format(new Date(profile.current_period_end), 'MMMM dd, yyyy')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-heading">Billing & Subscription</CardTitle>
        <CardDescription>Manage your subscription and view payment history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg border border-lightest-navy/20 bg-deep-navy">
          <h3 className="font-semibold text-lightest-slate mb-3">Current Plan</h3>
          {renderPlanDetails()}
        </div>
        <div>
          <LoadingButton
            onClick={handleManageSubscription}
            isLoading={isPortalLoading}
            disabled={profileLoading || !profile?.stripe_customer_id}
            className="w-full md:w-auto"
          >
            Manage Subscription & Payment
          </LoadingButton>
          <p className="text-xs text-slate mt-2">You will be redirected to Stripe to manage your subscription.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingSettings;
