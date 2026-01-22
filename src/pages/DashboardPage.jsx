import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Mail,
  AlertTriangle,
  MapPin,
  ArrowRight,
  Target,
  Truck,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
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
    <div className="space-y-8">
      {/* Header - Clean and minimal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-lightest-slate">
            {profile?.company_name || 'Dashboard'}
          </h1>
          <p className="text-slate text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-light-navy rounded-lg">
            <span className="text-sm text-slate">Credits:</span>
            <span className="text-lg font-semibold text-lightest-slate">
              {isUnlimited ? 'Unlimited' : creditsRemaining}
            </span>
          </div>
          <Button asChild size="sm" className="bg-teal text-deep-navy hover:bg-teal/90">
            <Link to="/pricing#top-up">Buy Credits</Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-light-navy rounded-xl p-5">
          <p className="text-sm text-slate mb-1">Today's Leads</p>
          <p className="text-3xl font-semibold text-lightest-slate">{totalTodaysLeads}</p>
          <p className="text-xs text-teal mt-1">New opportunities</p>
        </div>
        <div className="bg-light-navy rounded-xl p-5">
          <p className="text-sm text-slate mb-1">This Week</p>
          <p className="text-3xl font-semibold text-lightest-slate">{monthlyStats.thisWeekLeads}</p>
          {monthlyStats.weekOverWeekChange !== 0 && (
            <p className={`text-xs mt-1 ${monthlyStats.weekOverWeekChange > 0 ? 'text-teal' : 'text-red-400'}`}>
              {monthlyStats.weekOverWeekChange > 0 ? '+' : ''}{monthlyStats.weekOverWeekChange}% vs last week
            </p>
          )}
        </div>
        <div className="bg-light-navy rounded-xl p-5">
          <p className="text-sm text-slate mb-1">This Month</p>
          <p className="text-3xl font-semibold text-lightest-slate">{monthlyStats.totalLeads}</p>
          <p className="text-xs text-slate mt-1">Total leads</p>
        </div>
        <div className="bg-light-navy rounded-xl p-5">
          <p className="text-sm text-slate mb-1">Revealed</p>
          <p className="text-3xl font-semibold text-lightest-slate">{monthlyStats.revealedCount}</p>
          <p className="text-xs text-slate mt-1">Addresses unlocked</p>
        </div>
      </div>

      {/* Today's Leads - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Just Listed */}
        <Card className="bg-light-navy border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-lightest-slate">Just Listed</CardTitle>
                <p className="text-sm text-slate">New listings in your areas</p>
              </div>
              <span className="text-2xl font-semibold text-lightest-slate">{todaysLeads.justListedCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
              </div>
            ) : todaysLeads.justListed.length > 0 ? (
              <div className="space-y-2">
                {todaysLeads.justListed.slice(0, 4).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg hover:bg-deep-navy transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-lightest-slate truncate">{lead.lastcity}</p>
                      <p className="text-xs text-slate">{lead.beds}bd • {lead.baths}ba</p>
                    </div>
                    <span className="text-sm font-semibold text-teal ml-4">{formatPrice(lead.unformattedprice)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate text-sm text-center py-8">No new listings today</p>
            )}
            <Button asChild variant="ghost" className="w-full mt-4 text-teal hover:text-teal hover:bg-teal/10">
              <Link to="/dashboard/listings/just-listed">
                View all listings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Just Sold */}
        <Card className="bg-light-navy border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-lightest-slate">Just Sold</CardTitle>
                <p className="text-sm text-slate">Ready to move soon</p>
              </div>
              <span className="text-2xl font-semibold text-lightest-slate">{todaysLeads.soldCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
              </div>
            ) : todaysLeads.sold.length > 0 ? (
              <div className="space-y-2">
                {todaysLeads.sold.slice(0, 4).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg hover:bg-deep-navy transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-lightest-slate truncate">{lead.lastcity}</p>
                      <p className="text-xs text-slate">{lead.beds}bd • {lead.baths}ba</p>
                    </div>
                    <span className="text-sm font-semibold text-teal ml-4">{formatPrice(lead.unformattedprice)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate text-sm text-center py-8">No sales today</p>
            )}
            <Button asChild variant="ghost" className="w-full mt-4 text-teal hover:text-teal hover:bg-teal/10">
              <Link to="/dashboard/listings/sold">
                View all sold
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/dashboard/mailing')}
          className="flex flex-col items-center gap-3 p-5 bg-light-navy rounded-xl hover:bg-lightest-navy/10 transition-colors text-center"
        >
          <Mail className="h-6 w-6 text-teal" />
          <div>
            <p className="text-sm font-medium text-lightest-slate">Send Mail</p>
            <p className="text-xs text-slate">Direct mail campaign</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/listings/just-listed')}
          className="flex flex-col items-center gap-3 p-5 bg-light-navy rounded-xl hover:bg-lightest-navy/10 transition-colors text-center"
        >
          <Download className="h-6 w-6 text-teal" />
          <div>
            <p className="text-sm font-medium text-lightest-slate">Export Leads</p>
            <p className="text-xs text-slate">Download CSV</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/listings/sold')}
          className="flex flex-col items-center gap-3 p-5 bg-light-navy rounded-xl hover:bg-lightest-navy/10 transition-colors text-center"
        >
          <Target className="h-6 w-6 text-teal" />
          <div>
            <p className="text-sm font-medium text-lightest-slate">Sold Leads</p>
            <p className="text-xs text-slate">Definite movers</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex flex-col items-center gap-3 p-5 bg-light-navy rounded-xl hover:bg-lightest-navy/10 transition-colors text-center"
        >
          <MapPin className="h-6 w-6 text-teal" />
          <div>
            <p className="text-sm font-medium text-lightest-slate">Service Areas</p>
            <p className="text-xs text-slate">Manage cities</p>
          </div>
        </button>
      </div>

      {/* High Value Leads & Service Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High-Value Leads */}
        <Card className="bg-light-navy border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-lightest-slate">High-Value Leads</CardTitle>
            <p className="text-sm text-slate">Bigger homes, bigger moving jobs</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
              </div>
            ) : highValueLeads.length > 0 ? (
              <div className="space-y-2">
                {highValueLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg hover:bg-deep-navy transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-lightest-slate truncate">{lead.lastcity}</p>
                      <p className="text-xs text-slate">
                        {lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-teal ml-4">{formatPrice(lead.unformattedprice)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate text-sm text-center py-8">No high-value leads this week</p>
            )}
          </CardContent>
        </Card>

        {/* Service Area Health */}
        <Card className="bg-light-navy border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-lightest-slate">Service Areas</CardTitle>
                <p className="text-sm text-slate">Lead activity (past 7 days)</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-teal hover:bg-teal/10">
                <Link to="/dashboard/settings">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonLoader key={i} className="h-14" />)}
              </div>
            ) : serviceAreaHealth.length > 0 ? (
              <div className="space-y-2">
                {serviceAreaHealth.map((area) => (
                  <div key={area.city} className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        area.status === 'high' ? 'bg-teal' :
                        area.status === 'moderate' ? 'bg-yellow-500' :
                        'bg-slate'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-lightest-slate">{area.city}</p>
                        <p className="text-xs text-slate">{area.justListed} listed • {area.sold} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-lightest-slate">{area.leadsThisWeek}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate text-sm">No service areas configured</p>
                <Button asChild className="mt-4 bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/dashboard/settings">Add Service Areas</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revealed Leads */}
      {revealedLeads.length > 0 && (
        <Card className="bg-light-navy border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-lightest-slate">Recently Revealed</CardTitle>
                <p className="text-sm text-slate">Addresses you've unlocked</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-teal hover:bg-teal/10">
                <Link to="/dashboard/account">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {revealedLeads.slice(0, 6).map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 bg-deep-navy/50 rounded-lg hover:bg-deep-navy transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                >
                  <p className="text-sm font-medium text-lightest-slate truncate">{lead.addressstreet}</p>
                  <p className="text-xs text-slate mt-1">{lead.lastcity} • {formatPrice(lead.unformattedprice)}</p>
                  <p className="text-xs text-teal mt-2">Revealed {formatDate(lead.revealed_at)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State for New Users */}
      {!loading && revealedLeads.length === 0 && totalTodaysLeads === 0 && (
        <Card className="bg-light-navy border-0">
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 text-teal mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-lightest-slate mb-2">Welcome to your dashboard</h3>
            <p className="text-slate max-w-md mx-auto mb-6">
              Start exploring leads in your service areas. Browse listings, reveal contact info, and reach out to homeowners who need moving services.
            </p>
            <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
              <Link to="/dashboard/listings/just-listed">
                Browse Leads
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
