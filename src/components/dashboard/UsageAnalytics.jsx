import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Calendar, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useProfile } from '@/hooks/useProfile.jsx';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const UsageAnalytics = ({ profile, refreshProfile }) => {
  const supabase = useSupabaseClient();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (profile?.id) {
      fetchUsageAnalytics();
    }
  }, [profile?.id, timeRange]);

  const fetchUsageAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Fetch listing reveals
      const { data: reveals, error: revealsError } = await supabase
        .from('listing_reveals')
        .select('*')
        .eq('user_id', profile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (revealsError) throw revealsError;

      // Calculate analytics
      const totalReveals = reveals.length;
      const totalCreditsUsed = reveals.reduce((sum, reveal) => sum + (reveal.credit_cost || 0), 0);
      
      // Group by day for trend analysis
      const revealsByDay = reveals.reduce((acc, reveal) => {
        const date = new Date(reveal.created_at).toDateString();
        if (!acc[date]) {
          acc[date] = { count: 0, credits: 0 };
        }
        acc[date].count += 1;
        acc[date].credits += reveal.credit_cost || 0;
        return acc;
      }, {});

      // Calculate trends
      const days = Object.keys(revealsByDay).length;
      const avgRevealsPerDay = days > 0 ? totalReveals / days : 0;
      const avgCreditsPerDay = days > 0 ? totalCreditsUsed / days : 0;

      // Calculate projected usage
      const daysInMonth = new Date().getDate();
      const projectedMonthlyReveals = avgRevealsPerDay * 30;
      const projectedMonthlyCredits = avgCreditsPerDay * 30;

      // Get current credits
      const currentCredits = profile?.credits_remaining || 0;
      const daysUntilCreditsRunOut = avgCreditsPerDay > 0 ? Math.floor(currentCredits / avgCreditsPerDay) : null;

      setAnalytics({
        totalReveals,
        totalCreditsUsed,
        avgRevealsPerDay: Math.round(avgRevealsPerDay * 10) / 10,
        avgCreditsPerDay: Math.round(avgCreditsPerDay * 10) / 10,
        projectedMonthlyReveals: Math.round(projectedMonthlyReveals),
        projectedMonthlyCredits: Math.round(projectedMonthlyCredits),
        daysUntilCreditsRunOut,
        revealsByDay,
        currentCredits,
        timeRange
      });

    } catch (err) {
      console.error('Error fetching usage analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCreditStatus = () => {
    if (!analytics) return null;
    
    const { currentCredits, daysUntilCreditsRunOut, avgCreditsPerDay } = analytics;
    
    if (profile?.unlimited) {
      return {
        status: 'unlimited',
        message: 'Unlimited credits',
        color: 'text-green',
        icon: CheckCircle
      };
    }
    
    if (daysUntilCreditsRunOut === null) {
      return {
        status: 'no-usage',
        message: 'No recent usage',
        color: 'text-slate',
        icon: Clock
      };
    }
    
    if (daysUntilCreditsRunOut <= 3) {
      return {
        status: 'critical',
        message: `Credits will run out in ${daysUntilCreditsRunOut} days`,
        color: 'text-red-400',
        icon: AlertTriangle
      };
    }
    
    if (daysUntilCreditsRunOut <= 7) {
      return {
        status: 'warning',
        message: `Credits will run out in ${daysUntilCreditsRunOut} days`,
        color: 'text-amber-400',
        icon: AlertTriangle
      };
    }
    
    return {
      status: 'good',
      message: `Credits will last ${daysUntilCreditsRunOut} days`,
      color: 'text-green',
      icon: CheckCircle
    };
  };

  if (loading) {
    return (
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <SkeletonLoader className="h-6 w-1/3" />
          <SkeletonLoader className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonLoader key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-light-navy border-red-500/20">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-lightest-slate mb-2">
            Unable to Load Analytics
          </h3>
          <p className="text-slate text-sm mb-4">{error}</p>
          <Button onClick={fetchUsageAnalytics} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const creditStatus = getCreditStatus();
  const StatusIcon = creditStatus?.icon || CheckCircle;

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
            <BarChart3 className="h-5 w-5 text-green" />
            Usage Analytics
          </h3>
          <p className="text-slate text-sm">
            Track your credit usage and optimize your lead generation
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-green text-deep-navy' : ''}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Credit Status Alert */}
      {creditStatus && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className={`border-l-4 ${
            creditStatus.status === 'critical' ? 'border-red-500 bg-red-500/5' :
            creditStatus.status === 'warning' ? 'border-amber-500 bg-amber-500/5' :
            creditStatus.status === 'unlimited' ? 'border-green bg-green/5' :
            'border-slate bg-slate/5'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-5 w-5 ${creditStatus.color}`} />
                <div>
                  <p className={`font-medium ${creditStatus.color}`}>
                    {creditStatus.message}
                  </p>
                  {creditStatus.status !== 'unlimited' && (
                    <p className="text-sm text-slate">
                      Current credits: {analytics?.currentCredits || 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reveals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-deep-navy/30 border-lightest-navy/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate">Total Reveals</p>
                  <p className="text-2xl font-bold text-lightest-slate">
                    {analytics?.totalReveals || 0}
                  </p>
                </div>
                <div className="p-2 bg-green/10 rounded-lg">
                  <Zap className="h-5 w-5 text-green" />
                </div>
              </div>
              <p className="text-xs text-slate mt-2">
                {analytics?.avgRevealsPerDay || 0} per day
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credits Used */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-deep-navy/30 border-lightest-navy/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate">Credits Used</p>
                  <p className="text-2xl font-bold text-lightest-slate">
                    {analytics?.totalCreditsUsed || 0}
                  </p>
                </div>
                <div className="p-2 bg-amber-400/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <p className="text-xs text-slate mt-2">
                {analytics?.avgCreditsPerDay || 0} per day
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projected Monthly Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-deep-navy/30 border-lightest-navy/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate">Projected Monthly</p>
                  <p className="text-2xl font-bold text-lightest-slate">
                    {analytics?.projectedMonthlyCredits || 0}
                  </p>
                </div>
                <div className="p-2 bg-blue-400/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate mt-2">
                {analytics?.projectedMonthlyReveals || 0} reveals
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Efficiency Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-deep-navy/30 border-lightest-navy/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate">Efficiency</p>
                  <p className="text-2xl font-bold text-lightest-slate">
                    {analytics?.totalReveals > 0 ? 
                      Math.round((analytics.totalReveals / analytics.totalCreditsUsed) * 100) / 100 : 0
                    }
                  </p>
                </div>
                <div className="p-2 bg-green/10 rounded-lg">
                  <Target className="h-5 w-5 text-green" />
                </div>
              </div>
              <p className="text-xs text-slate mt-2">
                Reveals per credit
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader>
              <CardTitle className="text-lg text-lightest-slate flex items-center gap-2">
                <Target className="h-5 w-5 text-green" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.avgCreditsPerDay > 10 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">
                        High Usage Detected
                      </p>
                      <p className="text-xs text-slate">
                        You're using {analytics.avgCreditsPerDay} credits per day. Consider upgrading to an unlimited plan for better value.
                      </p>
                    </div>
                  </div>
                )}
                
                {analytics.daysUntilCreditsRunOut && analytics.daysUntilCreditsRunOut <= 7 && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        Low Credit Warning
                      </p>
                      <p className="text-xs text-slate">
                        You have {analytics.currentCredits} credits remaining. Consider purchasing more credits or upgrading your plan.
                      </p>
                    </div>
                  </div>
                )}
                
                {analytics.totalReveals === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Clock className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-400">
                        Get Started
                      </p>
                      <p className="text-xs text-slate">
                        You haven't revealed any listings yet. Start by exploring the listings page to find potential leads.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default UsageAnalytics;
