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
  RefreshCw,
  TrendingUp,
  Eye,
  Sparkles,
  Flame,
  Clock,
  Search,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAnalytics } from '@/services/analytics.jsx';
import { supabase } from '@/lib/customSupabaseClient';

// Mini sparkline component for trends (Electric Emerald)
const Sparkline = ({ data, color = '#00FF88' }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block ml-2">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Property thumbnail - larger for HD feel
const PropertyThumbnail = ({ src, alt, size = 'default' }) => {
  const [error, setError] = useState(false);
  const sizes = {
    default: 'w-14 h-14',
    large: 'w-16 h-16',
  };
  const sizeClass = sizes[size] || sizes.default;

  if (!src || error) {
    return (
      <div className={`${sizeClass} rounded-xl bg-charcoal-700/80 border border-white/[0.06] flex items-center justify-center flex-shrink-0`}>
        <MapPin className="w-5 h-5 text-slate" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={`${sizeClass} rounded-xl object-cover flex-shrink-0 border border-white/[0.06]`}
    />
  );
};

// Status tag component with glow effects
const StatusTag = ({ type }) => {
  const styles = {
    new: 'bg-primary/20 text-primary shadow-badge-new',
    hot: 'bg-amber-500/20 text-amber-400 shadow-badge-hot',
    sold: 'bg-blue-500/20 text-blue-400 shadow-badge-sold'
  };

  const labels = {
    new: 'New',
    hot: 'Hot',
    sold: 'Sold'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[type] || styles.new}`}>
      {labels[type] || type}
    </span>
  );
};

const DashboardPage = () => {
  const { toast } = useToast();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();

  // State for dashboard data
  const [todaysLeads, setTodaysLeads] = useState({ justListed: [], sold: [], justListedCount: 0, soldCount: 0 });
  const [highValueLeads, setHighValueLeads] = useState([]);
  const [revealedLeads, setRevealedLeads] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
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
  const [hoveredLead, setHoveredLead] = useState(null);

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
      // Fetch today's just listed from unified listings table - include imgsrc
      const { data: justListedData, count: justListedCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext, imgsrc', { count: 'exact' })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', todayISO)
        .order('lastseenat', { ascending: false })
        .limit(6);

      // Fetch today's sold from unified listings table
      const { data: soldData, count: soldCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext, imgsrc', { count: 'exact' })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', todayISO)
        .order('lastseenat', { ascending: false })
        .limit(6);

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

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      const { data } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext, imgsrc')
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekAgo.toISOString())
        .not('unformattedprice', 'is', null)
        .order('unformattedprice', { ascending: false })
        .limit(5);

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

      const listingIds = reveals.map(r => r.listing_id);

      const { data: listingsData } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, lastcity, status, imgsrc')
        .in('zpid', listingIds);

      if (!listingsData) {
        setRevealedLeads([]);
        return;
      }

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
          imgsrc: listing.imgsrc,
          revealed_at: reveal?.created_at
        };
      }).sort((a, b) => new Date(b.revealed_at) - new Date(a.revealed_at));

      setRevealedLeads(enrichedListings.slice(0, 8));
    } catch (error) {
      console.error('Error fetching revealed leads:', error);
    }
  }, [profile]);

  // Fetch monthly stats and lead velocity with daily breakdown for sparkline
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
      // Fetch daily counts for the past 7 days for sparkline
      const dailyCounts = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { count } = await supabase
          .from('listings')
          .select('zpid', { count: 'exact', head: true })
          .in('status', ['just_listed', 'sold'])
          .in('lastcity', cityNames)
          .gte('lastseenat', dayStart.toISOString())
          .lt('lastseenat', dayEnd.toISOString());

        dailyCounts.push(count || 0);
      }
      setWeeklyTrend(dailyCounts);

      // This month's total leads
      const { count: monthlyJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', monthStart.toISOString());

      const { count: monthlySold } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', monthStart.toISOString());

      // This week's leads
      const { count: thisWeekJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekStart.toISOString());

      const { count: thisWeekSold } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', weekStart.toISOString());

      // Last week's leads
      const { count: lastWeekJustListed } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', twoWeeksAgo.toISOString())
        .lt('lastseenat', weekStart.toISOString());

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
  const handleReveal = async (e, listingId) => {
    e.stopPropagation();
    setRevealingId(listingId);

    try {
      trackAction('listing_reveal_attempt', { listingId });

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
    const num = Number(price);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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

  // Determine if a lead is "hot" (high value)
  const isHotLead = (lead) => {
    return lead.unformattedprice && lead.unformattedprice > 800000;
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
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-mesh-gradient-subtle min-h-screen">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-lightest-slate">Profile Not Found</h3>
        <p className="text-slate text-center">Unable to load your profile. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Page
        </Button>
      </div>
    );
  }

  // Onboarding not complete
  if (!profile?.onboarding_complete) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-mesh-gradient-subtle min-h-screen">
        <Truck className="h-16 w-16 text-primary" />
        <h3 className="text-2xl font-bold text-lightest-slate">Welcome to Sold2Move!</h3>
        <p className="text-slate text-center max-w-md">
          Complete your profile setup to start receiving moving leads in your service areas.
        </p>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm">
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-mesh-gradient-subtle">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-lightest-slate">
            {profile?.company_name || 'Dashboard'}
          </h1>
          <p className="text-slate text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-charcoal-800/80 border-luminous rounded-lg">
            <span className="text-sm text-slate">Credits: </span>
            <span className="text-lg font-mono font-semibold text-lightest-slate tabular-nums">
              {isUnlimited ? '∞' : creditsRemaining}
            </span>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm">
            <Link to="/pricing#top-up">Buy Credits</Link>
          </Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Hero Metric - Today's Leads (spans 4 cols, larger) */}
        <div className="col-span-12 md:col-span-4 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6 shadow-lg shadow-primary/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-primary font-medium mb-1">Today's Leads</p>
              <p className="text-hero-stat text-lightest-slate tabular-nums">{totalTodaysLeads}</p>
              <p className="text-sm text-slate mt-2">New opportunities waiting</p>
            </div>
            <div className="p-3 bg-primary/20 rounded-xl shadow-glow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <Button asChild className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm hover:shadow-glow">
            <Link to="/dashboard/listings/just-listed">
              View All Leads
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* This Week */}
        <div className="col-span-6 md:col-span-2 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <p className="text-xs text-slate mb-1">This Week</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-mono font-bold text-lightest-slate tabular-nums">{monthlyStats.thisWeekLeads}</p>
            {monthlyStats.weekOverWeekChange !== 0 && (
              <span className={`text-xs font-medium ${monthlyStats.weekOverWeekChange > 0 ? 'text-primary' : 'text-red-400'}`}>
                {monthlyStats.weekOverWeekChange > 0 ? '+' : ''}{monthlyStats.weekOverWeekChange}%
              </span>
            )}
          </div>
          <div className="mt-1">
            <Sparkline data={weeklyTrend} color={monthlyStats.weekOverWeekChange >= 0 ? '#00FF88' : '#f87171'} />
          </div>
        </div>

        {/* This Month */}
        <div className="col-span-6 md:col-span-2 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <p className="text-xs text-slate mb-1">This Month</p>
          <p className="text-2xl font-mono font-bold text-lightest-slate tabular-nums">{monthlyStats.totalLeads}</p>
          <p className="text-xs text-slate mt-1">Total leads</p>
        </div>

        {/* Revealed - Gold accent with glow */}
        <div className="col-span-6 md:col-span-2 bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 rounded-xl p-4 shadow-badge-hot/30">
          <p className="text-xs text-amber-400 mb-1">Revealed</p>
          <p className="text-2xl font-mono font-bold text-lightest-slate tabular-nums">{monthlyStats.revealedCount}</p>
          <p className="text-xs text-slate mt-1">Unlocked</p>
        </div>

        {/* Credits */}
        <div className="col-span-6 md:col-span-2 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <p className="text-xs text-slate mb-1">Credits Left</p>
          <p className="text-2xl font-mono font-bold text-lightest-slate tabular-nums">{isUnlimited ? '∞' : creditsRemaining}</p>
          <Link to="/pricing#top-up" className="text-xs text-primary hover:underline mt-1 inline-block">
            Buy more →
          </Link>
        </div>

        {/* Just Listed Feed - Tall card (spans 6 cols, full height) */}
        <div className="col-span-12 lg:col-span-6 bg-charcoal-800/80 border-luminous rounded-xl overflow-hidden hover-glow">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lightest-slate">Just Listed</h3>
              <p className="text-xs text-slate">New opportunities in your areas</p>
            </div>
            <span className="text-2xl font-mono font-bold text-primary tabular-nums">{todaysLeads.justListedCount}</span>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <SkeletonLoader key={i} className="h-16" />)}
              </div>
            ) : todaysLeads.justListed.length > 0 ? (
              <div className="space-y-2">
                {todaysLeads.justListed.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="group flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg transition-all cursor-pointer relative"
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                    onMouseEnter={() => setHoveredLead(lead.id)}
                    onMouseLeave={() => setHoveredLead(null)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-lightest-slate truncate">{lead.lastcity}</p>
                        <StatusTag type={isHotLead(lead) ? 'hot' : 'new'} />
                      </div>
                      <p className="text-xs text-slate">{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-primary tabular-nums">{formatPrice(lead.unformattedprice)}</p>
                    </div>
                    {/* Hover actions */}
                    {hoveredLead === lead.id && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 bg-charcoal-900/95 border border-white/[0.1] rounded-lg p-1 shadow-xl">
                        <button
                          onClick={(e) => handleReveal(e, lead.id)}
                          disabled={revealingId === lead.id}
                          className="px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Reveal
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/dashboard/mailing'); }}
                          className="px-2 py-1 text-xs bg-charcoal-700 hover:bg-charcoal-600 text-lightest-slate rounded transition-colors flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          Mail
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-charcoal-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate" />
                </div>
                <p className="text-slate font-medium">No new listings today</p>
                <p className="text-xs text-slate mt-1 mb-4">Check neighboring areas for more opportunities</p>
                <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                  <Link to="/dashboard/settings">Expand Service Areas</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/10">
              <Link to="/dashboard/listings/just-listed">
                View all listings
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Just Sold Feed */}
        <div className="col-span-12 lg:col-span-6 bg-charcoal-800/80 border-luminous rounded-xl overflow-hidden hover-glow">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lightest-slate">Just Sold</h3>
              <p className="text-xs text-slate">Definite movers - act fast</p>
            </div>
            <span className="text-2xl font-mono font-bold text-primary tabular-nums">{todaysLeads.soldCount}</span>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <SkeletonLoader key={i} className="h-16" />)}
              </div>
            ) : todaysLeads.sold.length > 0 ? (
              <div className="space-y-2">
                {todaysLeads.sold.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="group flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg transition-all cursor-pointer relative"
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                    onMouseEnter={() => setHoveredLead(`sold-${lead.id}`)}
                    onMouseLeave={() => setHoveredLead(null)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-lightest-slate truncate">{lead.lastcity}</p>
                        <StatusTag type="sold" />
                      </div>
                      <p className="text-xs text-slate">{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-primary tabular-nums">{formatPrice(lead.unformattedprice)}</p>
                    </div>
                    {/* Hover actions */}
                    {hoveredLead === `sold-${lead.id}` && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 bg-charcoal-900/95 border border-white/[0.1] rounded-lg p-1 shadow-xl">
                        <button
                          onClick={(e) => handleReveal(e, lead.id)}
                          disabled={revealingId === lead.id}
                          className="px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Reveal
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/dashboard/mailing'); }}
                          className="px-2 py-1 text-xs bg-charcoal-700 hover:bg-charcoal-600 text-lightest-slate rounded transition-colors flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          Mail
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-charcoal-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-slate" />
                </div>
                <p className="text-slate font-medium">No sales in your areas today</p>
                <p className="text-xs text-slate mt-1 mb-4">Sold leads are high-intent movers</p>
                <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                  <Link to="/dashboard/listings/sold">View Past Sales</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/10">
              <Link to="/dashboard/listings/sold">
                View all sold
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <h3 className="font-semibold text-lightest-slate mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard/mailing')}
              className="w-full flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg transition-all text-left"
            >
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">Send Mail</p>
                <p className="text-xs text-slate">Direct mail campaign</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/listings/just-listed')}
              className="w-full flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg transition-all text-left"
            >
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">Export Leads</p>
                <p className="text-xs text-slate">Download CSV</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="w-full flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg transition-all text-left"
            >
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">Service Areas</p>
                <p className="text-xs text-slate">Manage cities</p>
              </div>
            </button>
          </div>
        </div>

        {/* Service Areas */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lightest-slate">Service Areas</h3>
            <Link to="/dashboard/settings" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <SkeletonLoader key={i} className="h-12" />)}
            </div>
          ) : serviceAreaHealth.length > 0 ? (
            <div className="space-y-2">
              {serviceAreaHealth.slice(0, 4).map((area) => (
                <div key={area.city} className="flex items-center justify-between p-2 bg-charcoal-900/60 border border-white/[0.04] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      area.status === 'high' ? 'bg-primary shadow-badge-new' :
                      area.status === 'moderate' ? 'bg-amber-400 shadow-badge-hot' :
                      'bg-slate'
                    }`} />
                    <span className="text-sm text-lightest-slate">{area.city}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate tabular-nums">{area.leadsThisWeek} leads</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate mb-3">No service areas configured</p>
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/dashboard/settings">Add Areas</Link>
              </Button>
            </div>
          )}
        </div>

        {/* High Value Leads */}
        <div className="col-span-12 lg:col-span-5 bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-lightest-slate">High-Value Leads</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <SkeletonLoader key={i} className="h-12" />)}
            </div>
          ) : highValueLeads.length > 0 ? (
            <div className="space-y-2">
              {highValueLeads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-2 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg cursor-pointer transition-all"
                  onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                >
                  <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-lightest-slate truncate">{lead.lastcity}</p>
                    <p className="text-xs text-slate">{lead.beds}bd • {lead.baths}ba</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary tabular-nums">{formatPrice(lead.unformattedprice)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate text-center py-6">No high-value leads this week</p>
          )}
        </div>
      </div>

      {/* Recently Revealed */}
      {revealedLeads.length > 0 && (
        <div className="bg-charcoal-800/80 border-luminous rounded-xl p-4 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-lightest-slate">Recently Revealed</h3>
            </div>
            <Link to="/dashboard/account" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {revealedLeads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08] rounded-lg cursor-pointer transition-all"
                onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
              >
                <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-lightest-slate truncate">{lead.addressstreet}</p>
                  <p className="text-xs text-slate">{lead.lastcity}</p>
                  <p className="text-xs text-amber-400 mt-1">{formatDate(lead.revealed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
