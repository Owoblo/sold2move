import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Gift,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile.jsx';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const CreditManagementDashboard = ({ profile, refreshProfile }) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [creditHistory, setCreditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState(null);

  const topUpOptions = [
    { amount: 50, price: 25, credits: 50, popular: false },
    { amount: 100, price: 45, credits: 100, popular: true },
    { amount: 250, price: 100, credits: 250, popular: false },
    { amount: 500, price: 180, credits: 500, popular: false },
    { amount: 1000, price: 300, credits: 1000, popular: false },
  ];

  useEffect(() => {
    if (profile?.id) {
      fetchCreditHistory();
    }
  }, [profile?.id]);

  const fetchCreditHistory = async () => {
    setLoading(true);
    try {
      // Fetch credit transactions
      const { data: transactions, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCreditHistory(transactions || []);
    } catch (error) {
      console.error('Error fetching credit history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load credit history.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (option) => {
    setSelectedTopUpAmount(option);
    setIsProcessingTopUp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-topup-session', {
        body: { 
          priceId: `price_${option.amount}_credits`, // This would be your actual Stripe price ID
          amount: option.amount,
          credits: option.credits
        },
      });

      if (error) throw error;
      
      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback to Stripe.js redirect
        const stripe = await getStripe();
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast({
        variant: "destructive",
        title: "Top-up Failed",
        description: error.message || "Could not process top-up. Please try again.",
      });
    } finally {
      setIsProcessingTopUp(false);
      setShowTopUpModal(false);
    }
  };

  const getCreditStatus = () => {
    const currentCredits = profile?.credits_remaining || 0;
    const maxCredits = 1000; // Assuming max display credits
    
    if (profile?.unlimited) {
      return {
        status: 'unlimited',
        message: 'Unlimited Credits',
        color: 'text-teal',
        icon: CheckCircle,
        progress: 100
      };
    }
    
    if (currentCredits === 0) {
      return {
        status: 'empty',
        message: 'No Credits Remaining',
        color: 'text-red-400',
        icon: AlertTriangle,
        progress: 0
      };
    }
    
    if (currentCredits <= 10) {
      return {
        status: 'low',
        message: 'Low Credits',
        color: 'text-amber-400',
        icon: AlertTriangle,
        progress: (currentCredits / maxCredits) * 100
      };
    }
    
    if (currentCredits <= 50) {
      return {
        status: 'medium',
        message: 'Credits Available',
        color: 'text-blue-400',
        icon: CheckCircle,
        progress: (currentCredits / maxCredits) * 100
      };
    }
    
    return {
      status: 'good',
      message: 'Plenty of Credits',
      color: 'text-teal',
      icon: CheckCircle,
      progress: (currentCredits / maxCredits) * 100
    };
  };

  const getUsageProjection = () => {
    if (!creditHistory.length) return null;
    
    // Calculate average daily usage from last 7 days
    const last7Days = creditHistory.filter(transaction => {
      const transactionDate = new Date(transaction.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return transactionDate >= sevenDaysAgo && transaction.type === 'used';
    });
    
    const totalUsed = last7Days.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    const avgDailyUsage = totalUsed / 7;
    const daysRemaining = avgDailyUsage > 0 ? Math.floor((profile?.credits_remaining || 0) / avgDailyUsage) : null;
    
    return {
      avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
      daysRemaining,
      totalUsed
    };
  };

  const creditStatus = getCreditStatus();
  const usageProjection = getUsageProjection();
  const StatusIcon = creditStatus?.icon || CheckCircle;

  if (loading) {
    return (
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <SkeletonLoader className="h-6 w-1/3" />
          <SkeletonLoader className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SkeletonLoader className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonLoader key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-lightest-slate flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal" />
            Credit Management
          </h3>
          <p className="text-slate text-sm">
            Monitor and manage your credit usage and purchases
          </p>
        </div>
        <Button
          onClick={() => setShowTopUpModal(true)}
          className="bg-teal text-deep-navy hover:bg-teal/90"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy Credits
        </Button>
      </div>

      {/* Credit Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lg text-lightest-slate flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${creditStatus.color}`} />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Credit Balance */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate">Available Credits</p>
                  <p className={`text-3xl font-bold ${creditStatus.color}`}>
                    {profile?.unlimited ? '∞' : (profile?.credits_remaining || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate">Status</p>
                  <p className={`font-semibold ${creditStatus.color}`}>
                    {creditStatus.message}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {!profile?.unlimited && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate">Credit Level</span>
                    <span className="text-lightest-slate">
                      {profile?.credits_remaining || 0} / 1000
                    </span>
                  </div>
                  <Progress 
                    value={creditStatus.progress} 
                    className="h-2"
                  />
                </div>
              )}

              {/* Usage Projection */}
              {usageProjection && (
                <div className="bg-deep-navy/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-slate">Avg Daily Usage</p>
                      <p className="text-lg font-semibold text-lightest-slate">
                        {usageProjection.avgDailyUsage}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate">Credits Used (7d)</p>
                      <p className="text-lg font-semibold text-lightest-slate">
                        {usageProjection.totalUsed}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate">Days Remaining</p>
                      <p className={`text-lg font-semibold ${
                        usageProjection.daysRemaining && usageProjection.daysRemaining <= 3 
                          ? 'text-red-400' 
                          : usageProjection.daysRemaining && usageProjection.daysRemaining <= 7
                          ? 'text-amber-400'
                          : 'text-teal'
                      }`}>
                        {usageProjection.daysRemaining ? `${usageProjection.daysRemaining} days` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-teal/10 rounded-lg w-fit mx-auto mb-2">
              <Gift className="h-5 w-5 text-teal" />
            </div>
            <p className="text-sm text-slate">Free Trial</p>
            <p className="text-xs text-slate">Get 100 free credits</p>
          </CardContent>
        </Card>

        <Card className="bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-blue-400/10 rounded-lg w-fit mx-auto mb-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-sm text-slate">Usage Analytics</p>
            <p className="text-xs text-slate">View detailed reports</p>
          </CardContent>
        </Card>

        <Card className="bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-amber-400/10 rounded-lg w-fit mx-auto mb-2">
              <Target className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm text-slate">Optimize Usage</p>
            <p className="text-xs text-slate">Get recommendations</p>
          </CardContent>
        </Card>

        <Card className="bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50 transition-colors cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-purple-400/10 rounded-lg w-fit mx-auto mb-2">
              <RefreshCw className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-sm text-slate">Auto-Refill</p>
            <p className="text-xs text-slate">Set up automatic top-ups</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Credit History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lg text-lightest-slate flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creditHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-slate mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-lightest-slate mb-2">
                  No Transactions Yet
                </h3>
                <p className="text-slate text-sm">
                  Your credit transactions will appear here once you start using the platform.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditHistory.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-deep-navy/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'purchased' ? 'bg-teal/10' :
                        transaction.type === 'used' ? 'bg-amber-400/10' :
                        'bg-blue-400/10'
                      }`}>
                        {transaction.type === 'purchased' ? (
                          <ShoppingCart className="h-4 w-4 text-teal" />
                        ) : transaction.type === 'used' ? (
                          <Zap className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Gift className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-lightest-slate">
                          {transaction.description || `${transaction.type} credits`}
                        </p>
                        <p className="text-xs text-slate">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        transaction.type === 'purchased' ? 'text-teal' :
                        transaction.type === 'used' ? 'text-amber-400' :
                        'text-blue-400'
                      }`}>
                        {transaction.type === 'purchased' ? '+' : '-'}{transaction.amount || 0}
                      </p>
                      <p className="text-xs text-slate">credits</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top-up Modal */}
      <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
        <DialogContent className="max-w-2xl bg-light-navy border-lightest-navy/20">
          <DialogHeader>
            <DialogTitle className="text-lightest-slate flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-teal" />
              Buy Credits
            </DialogTitle>
            <DialogDescription className="text-slate">
              Choose a credit package that fits your needs. All packages include bonus credits.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topUpOptions.map((option) => (
              <motion.div
                key={option.amount}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className={`cursor-pointer transition-all duration-200 ${
                  selectedTopUpAmount?.amount === option.amount 
                    ? 'bg-teal/10 border-teal/50' 
                    : 'bg-deep-navy/30 border-lightest-navy/20 hover:bg-deep-navy/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      {option.popular && (
                        <Badge className="mb-2 bg-teal text-deep-navy">
                          Most Popular
                        </Badge>
                      )}
                      <div className="text-2xl font-bold text-lightest-slate mb-1">
                        {option.credits} Credits
                      </div>
                      <div className="text-3xl font-bold text-teal mb-2">
                        ${option.price}
                      </div>
                      <div className="text-sm text-slate mb-4">
                        ${(option.price / option.credits).toFixed(2)} per credit
                      </div>
                      <Button
                        onClick={() => handleTopUp(option)}
                        disabled={isProcessingTopUp}
                        className="w-full bg-teal text-deep-navy hover:bg-teal/90"
                      >
                        {isProcessingTopUp ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-deep-navy border-t-transparent" />
                        ) : (
                          'Buy Now'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTopUpModal(false)}
              disabled={isProcessingTopUp}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CreditManagementDashboard;
