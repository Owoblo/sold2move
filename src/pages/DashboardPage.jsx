import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Mail,
  AlertTriangle,
  MapPin,
  Building,
  Eye,
  Lock,
  Search,
  Calendar,
  DollarSign,
  Home,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  CreditCard,
  Phone,
  FileText,
  ArrowRight,
  Activity,
  Zap,
  CheckCircle,
  AlertCircle,
  Flame,
  Target,
  Truck,
  ExternalLink,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import LoadingButton from '@/components/ui/LoadingButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useAnalytics } from '@/services/analytics.jsx';
import { supabase } from '@/lib/customSupabaseClient';

const DashboardPage = () => {
  const { toast } = useToast();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();

  // State for dashboard data
  const [todaysLeads, setTodaysLeads] = useState({ justListed: [], sold: [], justListedCount: 0, soldCount: 0 });
  const [highValueLeads, setHighValueLeads] = useState([]);
  const [revealedLeads, setRevealedLeads] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalLeads: 0,
    revealedCount: 0,
    thisWeekLeads: 0,
    lastWeekLeads: 0,
    weekOverWeekChange: 0
  });
  const [serviceAreaHealth, setServiceAreaHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealingId, setRevealingId] = useState(null);

  // Get city names from profile
  const getCityNames = useCallback(() => {
    if (!profile) return [];
    if (profile.service_cities && profile.service_cities.length > 0) {
      return profile.service_cities.map(cityState => {
        const [cityName] = cityState.split(', ');
        return cityName;
      });
    }
    return profile.city_name ? [profile.city_name] : [];
  }, [profile]);

  // Fetch today's fresh leads (Just Listed + Sold)
  const fetchTodaysLeads = useCallback(async () => {
    if (!profile) return;

    const cityNames = getCityNames();
    if (cityNames.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    try {
      // Fetch today's just listed from unified listings table
      const { data: justListedData, count: justListedCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext', { count: 'exact' })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', todayISO)
        .order('lastseenat', { ascending: false })
        .limit(5);

      // Fetch today's sold from unified listings table
      const { data: soldData, count: soldCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext', { count: 'exact' })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', todayISO)
        .order('lastseenat', { ascending: false })
        .limit(5);

      // Map zpid to id for consistency
      const mappedJustListed = (justListedData || []).map(item => ({ ...item, id: item.zpid }));
      const mappedSold = (soldData || []).map(item => ({ ...item, id: item.zpid }));

      setTodaysLeads({
        justListed: mappedJustListed,
        sold: mappedSold,
        justListedCount: justListedCount || 0,
        soldCount: soldCount || 0
      });
    } catch (error) {
      console.error('Error fetching today\'s leads:', error);
    }
  }, [profile, getCityNames]);

  // Fetch high-value leads (sorted by price/size)
  const fetchHighValueLeads = useCallback(async () => {
    if (!profile) return;

    const cityNames = getCityNames();
    if (cityNames.length === 0) return;

    // Get leads from the last 7 days, sorted by price
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      const { data } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext')
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekAgo.toISOString())
        .not('unformattedprice', 'is', null)
        .order('unformattedprice', { ascending: false })
        .limit(5);

      // Map zpid to id for consistency
      const mappedData = (data || []).map(item => ({ ...item, id: item.zpid }));
      setHighValueLeads(mappedData);
    } catch (error) {
      console.error('Error fetching high-value leads:', error);
    }
  }, [profile, getCityNames]);

  // Fetch revealed leads that need action
  const fetchRevealedLeads = useCallback(async () => {
    if (!profile) return;

    try {
      // Get user's revealed listings with joined listing data
      const { data: reveals } = await supabase
        .from('listing_reveals')
        .select('listing_id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!reveals || reveals.length === 0) {
        setRevealedLeads([]);
        return;
      }

      // Get the listing details from unified listings table
      const listingIds = reveals.map(r => r.listing_id);

      const { data: listingsData } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, lastcity, status')
        .in('zpid', listingIds);

      if (!listingsData) {
        setRevealedLeads([]);
        return;
      }

      // Merge reveal dates with listing data
      const enrichedListings = listingsData.map(listing => {
        const reveal = reveals.find(r => r.listing_id === listing.zpid);
        return {
          id: listing.zpid,
          addressstreet: listing.addressstreet,
          lastseenat: listing.lastseenat,
          unformattedprice: listing.unformattedprice,
          beds: listing.beds,
          baths: listing.baths,
          lastcity: listing.lastcity,
          type: listing.status,
          revealed_at: reveal?.created_at
        };
      }).sort((a, b) => new Date(b.revealed_at) - new Date(a.revealed_at));

      setRevealedLeads(enrichedListings.slice(0, 8));
    } catch (error) {
      console.error('Error fetching revealed leads:', error);
    }
  }, [profile]);

  // Fetch monthly stats and lead velocity
  const fetchMonthlyStats = useCallback(async () => {
    if (!profile) return;

    const cityNames = getCityNames();
    if (cityNames.length === 0) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    try {
      // This month's total leads (just_listed)
      const { count: monthlyJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', monthStart.toISOString());

      // This month's sold
      const { count: monthlySold } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', monthStart.toISOString());

      // This week's just_listed
      const { count: thisWeekJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekStart.toISOString());

      // This week's sold
      const { count: thisWeekSold } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekStart.toISOString());

      // Last week's just_listed (for comparison)
      const { count: lastWeekJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', twoWeeksAgo.toISOString())
        .lt('lastseenat', weekStart.toISOString());

      // Last week's sold
      const { count: lastWeekSold } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', twoWeeksAgo.toISOString())
        .lt('lastseenat', weekStart.toISOString());

      // Count reveals this month
      const { count: revealedCount } = await supabase
        .from('listing_reveals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', monthStart.toISOString());

      const totalLeads = (monthlyJustListed || 0) + (monthlySold || 0);
      const thisWeekLeads = (thisWeekJustListed || 0) + (thisWeekSold || 0);
      const lastWeekLeads = (lastWeekJustListed || 0) + (lastWeekSold || 0);

      const weekOverWeekChange = lastWeekLeads > 0
        ? Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100)
        : thisWeekLeads > 0 ? 100 : 0;

      setMonthlyStats({
        totalLeads,
        revealedCount: revealedCount || 0,
        thisWeekLeads,
        lastWeekLeads,
        weekOverWeekChange
      });
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  }, [profile, getCityNames]);

  // Fetch service area health
  const fetchServiceAreaHealth = useCallback(async () => {
    if (!profile) return;

    const cityNames = getCityNames();
    if (cityNames.length === 0) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      const healthData = await Promise.all(
        cityNames.map(async (city) => {
          const { count: justListedCount } = await supabase
            .from('listings')
            .select('zpid', { count: 'exact', head: true })
            .eq('status', 'just_listed')
            .eq('lastcity', city)
            .gte('lastseenat', weekAgo.toISOString());

          const { count: soldCount } = await supabase
            .from('listings')
            .select('zpid', { count: 'exact', head: true })
            .eq('status', 'sold')
            .eq('lastcity', city)
            .gte('lastseenat', weekAgo.toISOString());

          const totalLeads = (justListedCount || 0) + (soldCount || 0);

          // Determine health status
          let status = 'low';
          if (totalLeads >= 20) status = 'high';
          else if (totalLeads >= 10) status = 'moderate';

          return {
            city,
            leadsThisWeek: totalLeads,
            justListed: justListedCount || 0,
            sold: soldCount || 0,
            status
          };
        })
      );

      setServiceAreaHealth(healthData.sort((a, b) => b.leadsThisWeek - a.leadsThisWeek));
    } catch (error) {
      console.error('Error fetching service area health:', error);
    }
  }, [profile, getCityNames]);

  // Handle reveal
  const handleReveal = async (listingId, listingType = 'just_listed') => {
    setRevealingId(listingId);

    try {
      trackAction('listing_reveal_attempt', { listingId, listingType });

      const numericListingId = Number(listingId);
      if (isNaN(numericListingId)) {
        throw new Error('Invalid listing ID');
      }

      const { data, error } = await supabase.rpc('reveal_listing', { p_listing_id: numericListingId });
      if (error) throw error;

      if (data.ok) {
        toast({
          title: "Address Revealed!",
          description: data.already_revealed ? "You've already revealed this address." : "1 credit has been deducted."
        });

        // Refresh the revealed leads
        fetchRevealedLeads();

        if (!data.already_revealed && !data.unlimited) {
          refreshProfile();
        }
      } else if (data.error === 'insufficient_credits') {
        toast({
          variant: 'destructive',
          title: "Insufficient Credits",
          description: "Please purchase more credits to reveal this address."
        });
      } else {
        throw new Error(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Reveal Failed", description: err.message });
    } finally {
      setRevealingId(null);
    }
  };

  // Load all dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile || !profile.onboarding_complete) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchTodaysLeads(),
        fetchHighValueLeads(),
        fetchRevealedLeads(),
        fetchMonthlyStats(),
        fetchServiceAreaHealth()
      ]);
      setLoading(false);
    };

    if (!profileLoading) {
      loadDashboardData();
    }
  }, [profile, profileLoading, fetchTodaysLeads, fetchHighValueLeads, fetchRevealedLeads, fetchMonthlyStats, fetchServiceAreaHealth]);

  // Format helpers
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(price));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const creditsRemaining = profile?.credits_remaining ?? 0;
  const isUnlimited = profile?.unlimited ?? false;
  const totalTodaysLeads = todaysLeads.justListedCount + todaysLeads.soldCount;

  // Loading state
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // No profile state
  if (!profile && !profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-lightest-slate">Profile Not Found</h3>
        <p className="text-slate text-center">Unable to load your profile. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()} className="bg-teal text-deep-navy hover:bg-teal/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Page
        </Button>
      </div>
    );
  }

  // Onboarding not complete
  if (!profile?.onboarding_complete) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Truck className="h-16 w-16 text-teal" />
        <h3 className="text-2xl font-bold text-lightest-slate">Welcome to Sold2Move!</h3>
        <p className="text-slate text-center max-w-md">
          Complete your profile setup to start receiving moving leads in your service areas.
        </p>
        <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">
            {profile?.company_name || 'Dashboard'}
          </h1>
          <p className="text-slate mt-1">Your moving leads command center</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-slate">Credits Available</p>
            <p className="text-2xl font-bold text-teal">
              {isUnlimited ? '∞' : creditsRemaining}
            </p>
          </div>
          <Button asChild size="sm" className="bg-teal text-deep-navy hover:bg-teal/90">
            <Link to="/pricing#top-up">
              <CreditCard className="h-4 w-4 mr-1" />
              Buy Credits
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* TODAY'S FRESH LEADS - Top Priority */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl text-lightest-slate">
                <Flame className="h-6 w-6 text-orange-500" />
                Today's Fresh Leads
                <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-400">
                  {totalTodaysLeads} new
                </Badge>
              </div>
              <p className="text-sm text-slate font-normal">Contact before your competitors!</p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Just Listed Today */}
              <div className="bg-deep-navy/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-green-400" />
                    <span className="font-semibold text-lightest-slate">Just Listed</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">{todaysLeads.justListedCount}</Badge>
                </div>
                {loading ? (
                  <SkeletonLoader className="h-20" />
                ) : todaysLeads.justListed.length > 0 ? (
                  <div className="space-y-2">
                    {todaysLeads.justListed.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between text-sm p-2 bg-light-navy/50 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-lightest-slate truncate">{lead.lastcity}</p>
                          <p className="text-teal font-semibold">{formatPrice(lead.unformattedprice)}</p>
                        </div>
                        <div className="text-right text-xs text-slate">
                          {lead.beds}bd/{lead.baths}ba
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate text-sm">No new listings today yet</p>
                )}
              </div>

              {/* Sold Today */}
              <div className="bg-deep-navy/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    <span className="font-semibold text-lightest-slate">Just Sold</span>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">{todaysLeads.soldCount}</Badge>
                </div>
                {loading ? (
                  <SkeletonLoader className="h-20" />
                ) : todaysLeads.sold.length > 0 ? (
                  <div className="space-y-2">
                    {todaysLeads.sold.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between text-sm p-2 bg-light-navy/50 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-lightest-slate truncate">{lead.lastcity}</p>
                          <p className="text-teal font-semibold">{formatPrice(lead.unformattedprice)}</p>
                        </div>
                        <div className="text-right text-xs text-slate">
                          {lead.beds}bd/{lead.baths}ba
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate text-sm">No sales today yet</p>
                )}
              </div>
            </div>

            {/* Quick Actions for Today's Leads */}
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                <Link to="/dashboard/listings/just-listed">
                  View All Today's Leads
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => navigate('/dashboard/mailing')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Mail Pack
              </Button>
              <Button
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => toast({ title: "Export", description: "Navigate to Listings to export leads" })}
              >
                <Download className="h-4 w-4 mr-2" />
                Export for Calls
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* MIDDLE SECTION: High Value + Outreach + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HIGH-VALUE LEADS QUEUE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-1"
        >
          <Card className="h-full bg-light-navy border-lightest-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-lightest-slate">
                <DollarSign className="h-5 w-5 text-green-400" />
                High-Value Moves
              </CardTitle>
              <p className="text-xs text-slate">Bigger homes = bigger jobs</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <SkeletonLoader key={i} className="h-16" />)}
                </div>
              ) : highValueLeads.length > 0 ? (
                <div className="space-y-2">
                  {highValueLeads.map((lead, index) => (
                    <div
                      key={lead.id}
                      className="p-3 bg-deep-navy/50 rounded-lg hover:bg-deep-navy/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate">#{index + 1}</span>
                            <span className="text-lg font-bold text-teal">{formatPrice(lead.unformattedprice)}</span>
                          </div>
                          <p className="text-sm text-lightest-slate truncate">{lead.lastcity}</p>
                          <p className="text-xs text-slate">
                            {lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : 'N/A'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate text-sm text-center py-8">No high-value leads this week</p>
              )}
              <Button asChild variant="ghost" className="w-full mt-3 text-teal hover:text-teal hover:bg-teal/10">
                <Link to="/dashboard/listings/just-listed">
                  View All Listings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* OUTREACH COMMAND CENTER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="h-full bg-light-navy border-lightest-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-lightest-slate">
                <Zap className="h-5 w-5 text-yellow-400" />
                Quick Outreach
              </CardTitle>
              <p className="text-xs text-slate">Reach leads faster than competitors</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start h-14 bg-teal/10 hover:bg-teal/20 border border-teal/30 text-left"
                variant="ghost"
                onClick={() => navigate('/dashboard/mailing')}
              >
                <Mail className="h-5 w-5 text-teal mr-3" />
                <div>
                  <p className="font-medium text-lightest-slate">Send Mail Pack</p>
                  <p className="text-xs text-slate">Direct mail to homeowners</p>
                </div>
              </Button>

              <Button
                className="w-full justify-start h-14 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left"
                variant="ghost"
                onClick={() => navigate('/dashboard/listings/just-listed')}
              >
                <Download className="h-5 w-5 text-blue-400 mr-3" />
                <div>
                  <p className="font-medium text-lightest-slate">Export Phone List</p>
                  <p className="text-xs text-slate">For cold calling campaigns</p>
                </div>
              </Button>

              <Button
                className="w-full justify-start h-14 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left"
                variant="ghost"
                onClick={() => navigate('/dashboard/listings/sold')}
              >
                <Target className="h-5 w-5 text-purple-400 mr-3" />
                <div>
                  <p className="font-medium text-lightest-slate">Target Sold Properties</p>
                  <p className="text-xs text-slate">They're definitely moving!</p>
                </div>
              </Button>

              <Button
                className="w-full justify-start h-14 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-left"
                variant="ghost"
                onClick={() => navigate('/dashboard/settings')}
              >
                <MapPin className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <p className="font-medium text-lightest-slate">Expand Service Areas</p>
                  <p className="text-xs text-slate">Add more cities to monitor</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* LEAD VELOCITY STATS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1"
        >
          <Card className="h-full bg-light-navy border-lightest-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-lightest-slate">
                <BarChart3 className="h-5 w-5 text-teal" />
                Your Lead Flow
              </CardTitle>
              <p className="text-xs text-slate">This month's activity</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <SkeletonLoader key={i} className="h-12" />)}
                </div>
              ) : (
                <>
                  <div className="p-3 bg-deep-navy/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate">This Month</span>
                      <span className="text-2xl font-bold text-lightest-slate">{monthlyStats.totalLeads}</span>
                    </div>
                    <p className="text-xs text-slate">total leads in your areas</p>
                  </div>

                  <div className="p-3 bg-deep-navy/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate">This Week</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-lightest-slate">{monthlyStats.thisWeekLeads}</span>
                        {monthlyStats.weekOverWeekChange !== 0 && (
                          <Badge className={monthlyStats.weekOverWeekChange > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {monthlyStats.weekOverWeekChange > 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(monthlyStats.weekOverWeekChange)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate">vs {monthlyStats.lastWeekLeads} last week</p>
                  </div>

                  <div className="p-3 bg-deep-navy/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate">Revealed</span>
                      <span className="text-xl font-bold text-teal">{monthlyStats.revealedCount}</span>
                    </div>
                    <p className="text-xs text-slate">addresses unlocked this month</p>
                  </div>

                  <div className="p-3 bg-teal/10 rounded-lg border border-teal/30">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-teal" />
                      <span className="text-sm text-lightest-slate font-medium">Speed Matters!</span>
                    </div>
                    <p className="text-xs text-slate mt-1">
                      Homeowners receive 3-5 quotes within 48hrs of listing
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* BOTTOM SECTION: Revealed Leads + Service Area Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REVEALED LEADS - NEEDS ACTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg text-lightest-slate">
                  <Eye className="h-5 w-5 text-teal" />
                  Your Revealed Leads
                  <Badge variant="secondary" className="ml-2">{revealedLeads.length}</Badge>
                </div>
                <p className="text-xs text-slate font-normal">You paid for these - act on them!</p>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
                </div>
              ) : revealedLeads.length > 0 ? (
                <div className="space-y-2">
                  {revealedLeads.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg hover:bg-deep-navy/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-lightest-slate truncate">{lead.addressstreet}</p>
                          <Badge variant="outline" className="text-xs">
                            {lead.type === 'sold' ? 'Sold' : 'Listed'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate">{lead.lastcity} • {formatPrice(lead.unformattedprice)} • Revealed {formatDate(lead.revealed_at)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-teal hover:text-teal hover:bg-teal/10"
                        onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-slate mx-auto mb-3" />
                  <p className="text-slate">No revealed leads yet</p>
                  <p className="text-xs text-slate mt-1">Reveal addresses to start building your pipeline</p>
                  <Button asChild className="mt-4 bg-teal text-deep-navy hover:bg-teal/90">
                    <Link to="/dashboard/listings/just-listed">Browse Leads</Link>
                  </Button>
                </div>
              )}
              {revealedLeads.length > 5 && (
                <Button asChild variant="ghost" className="w-full mt-3 text-teal hover:text-teal hover:bg-teal/10">
                  <Link to="/dashboard/account">
                    View All Revealed Leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* SERVICE AREA HEALTH */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg text-lightest-slate">
                  <MapPin className="h-5 w-5 text-teal" />
                  Service Area Health
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs text-slate hover:text-teal">
                  <Link to="/dashboard/settings">
                    Manage Areas
                  </Link>
                </Button>
              </CardTitle>
              <p className="text-xs text-slate">Lead activity in your markets (past 7 days)</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
                </div>
              ) : serviceAreaHealth.length > 0 ? (
                <div className="space-y-2">
                  {serviceAreaHealth.map((area) => (
                    <div
                      key={area.city}
                      className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          area.status === 'high' ? 'bg-green-500' :
                          area.status === 'moderate' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium text-lightest-slate">{area.city}</p>
                          <p className="text-xs text-slate">
                            {area.justListed} listed • {area.sold} sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-lightest-slate">{area.leadsThisWeek}</p>
                        <p className="text-xs text-slate">leads</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-slate mx-auto mb-3" />
                  <p className="text-slate">No service areas configured</p>
                  <p className="text-xs text-slate mt-1">Add cities to start monitoring</p>
                  <Button asChild className="mt-4 bg-teal text-deep-navy hover:bg-teal/90">
                    <Link to="/dashboard/settings">Add Service Areas</Link>
                  </Button>
                </div>
              )}

              {serviceAreaHealth.length > 0 && serviceAreaHealth.some(a => a.status === 'low') && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Low Activity Detected</p>
                      <p className="text-xs text-slate mt-1">
                        Some areas have few leads. Consider expanding your service radius or adding nearby cities.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* BOTTOM CTA - Urgency Driver */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-teal/10 to-blue-500/10 border-teal/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal/20 rounded-full">
                  <Truck className="h-8 w-8 text-teal" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-lightest-slate">Ready to Book More Jobs?</h3>
                  <p className="text-sm text-slate">
                    You have {totalTodaysLeads} fresh leads today. Every hour you wait, competitors are reaching out.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/dashboard/listings/just-listed">
                    Start Contacting Leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
