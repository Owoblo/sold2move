import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Zap, FileText, AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const Billing = () => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const [portalLoading, setPortalLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('topup') === 'success') {
      toast({
        title: "Purchase Successful!",
        description: "Your credits have been added to your account.",
      });
      refreshProfile();
    }
  }, [location, toast, refreshProfile]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      if (error) throw error;
      window.location.assign(data.url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not open the customer portal. Please try again.',
      });
    } finally {
      setPortalLoading(false);
    }
  };
  
  const PlanDisplay = () => {
      if (!profile) return null;
      
      const { plan_tier, subscription_status, current_period_end } = profile;
      
      const hasSubscription = plan_tier && plan_tier !== 'free';

      return (
        <CardContent>
          {hasSubscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-deep-navy rounded-lg">
                <span className="font-bold text-lg text-green">{plan_tier.charAt(0).toUpperCase() + plan_tier.slice(1)} Plan</span>
                <span className="capitalize font-semibold text-green">{subscription_status}</span>
              </div>
              <div className="text-sm text-slate">
                <p>Your plan renews on: {new Date(current_period_end).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-deep-navy rounded-lg">
              <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
              <h3 className="mt-2 text-lg font-medium text-lightest-slate">No Active Subscription</h3>
              <p className="mt-1 text-sm text-slate">You are currently on the Free plan with {profile.credits_remaining} credits.</p>
              <LoadingButton asChild className="mt-4 bg-green text-deep-navy hover:bg-green/90">
                <Link to="/pricing">Upgrade Plan</Link>
              </LoadingButton>
            </div>
          )}
        </CardContent>
      );
  };
  
  if (profileLoading) {
    return (
        <div>
            <SkeletonLoader className="h-10 w-1/3 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="bg-light-navy border-lightest-navy/20">
                        <CardHeader><SkeletonLoader className="h-8 w-1/4" /></CardHeader>
                        <CardContent><SkeletonLoader className="h-24 w-full" /></CardContent>
                    </Card>
                </div>
                <div>
                    <Card className="bg-light-navy border-lightest-navy/20">
                        <CardHeader><SkeletonLoader className="h-8 w-1/2" /></CardHeader>
                        <CardContent><SkeletonLoader className="h-32 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
            <Card className="mt-6 bg-light-navy border-lightest-navy/20">
              <CardHeader><SkeletonLoader className="h-8 w-1/3" /></CardHeader>
              <CardContent><SkeletonLoader className="h-20 w-full" /></CardContent>
            </Card>
        </div>
    );
  }

  const hasSubscription = profile?.plan_tier && profile.plan_tier !== 'free';

  return (
    <div>
      <h1 className="text-3xl font-bold text-lightest-slate mb-6 font-heading">Billing & Subscription</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-xl text-lightest-slate">Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing details.</CardDescription>
            </CardHeader>
            <PlanDisplay />
            {hasSubscription && (
              <CardFooter className="flex justify-between">
                <LoadingButton onClick={handleManageSubscription} variant="outline" isLoading={portalLoading}>
                  Manage Subscription
                </LoadingButton>
                <LoadingButton asChild variant="link" className="text-green">
                    <Link to="/pricing">Change Plan</Link>
                </LoadingButton>
              </CardFooter>
            )}
          </Card>
        </div>

        <div>
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
                <Zap className="text-green" /> Your Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className={`text-6xl font-bold ${profile?.unlimited ? 'text-green' : 'text-lightest-slate'} font-heading`}>{profile?.unlimited ? '∞' : (profile?.credits_remaining || 0)}</p>
              <p className="text-slate">{profile?.unlimited ? 'Unlimited Credits' : 'credits remaining'}</p>
              <LoadingButton asChild className="mt-4 w-full bg-green text-deep-navy hover:bg-green/90">
                <Link to="/pricing">Buy More Credits</Link>
              </LoadingButton>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
            <FileText className="text-green" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate">
            <p>No payment history found.</p>
            <p className="text-sm">Your invoices will appear here once you subscribe.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;