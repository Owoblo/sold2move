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
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

// Mini sparkline component for trends (Theme-aware)
const Sparkline = ({ data, color, isLight = false }) => {
  if (!data || data.length < 2) return null;

  // Use emerald for light mode, electric green for dark mode
  const defaultColor = isLight ? '#0F9D58' : '#00FF88';
  const strokeColor = color || defaultColor;

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
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Property thumbnail - larger for HD feel (Theme-aware)
const PropertyThumbnail = ({ src, alt, size = 'default', isLight = false }) => {
  const [error, setError] = useState(false);
  const sizes = {
    default: 'w-14 h-14',
    large: 'w-16 h-16',
  };
  const sizeClass = sizes[size] || sizes.default;

  if (!src || error) {
    return (
      <div className={`${sizeClass} rounded-xl flex items-center justify-center flex-shrink-0 ${
        isLight
          ? 'bg-slate-100 border border-slate-200'
          : 'bg-charcoal-700/80 border border-white/[0.06]'
      }`}>
        <MapPin className={`w-5 h-5 ${isLight ? 'text-slate-400' : 'text-slate'}`} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={`${sizeClass} rounded-xl object-cover flex-shrink-0 ${
        isLight
          ? 'border border-slate-200'
          : 'border border-white/[0.06]'
      }`}
    />
  );
};

// Status tag component with glow effects (Theme-aware)
const StatusTag = ({ type, isLight = false }) => {
  const darkStyles = {
    new: 'bg-primary/20 text-primary shadow-badge-new',
    hot: 'bg-amber-500/20 text-amber-400 shadow-badge-hot',
    sold: 'bg-blue-500/20 text-blue-400 shadow-badge-sold'
  };

  const lightStyles = {
    new: 'bg-emerald-50 text-emerald-700',
    hot: 'bg-amber-50 text-amber-700',
    sold: 'bg-blue-50 text-blue-700'
  };

  const styles = isLight ? lightStyles : darkStyles;

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // State for dashboard data
  const [todaysLeads, setTodaysLeads] = useState({ justListed: [], sold: [], justListedCount: 0, soldCount: 0, todayOnlyCount: 0 });
  const [highValueLeads, setHighValueLeads] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalLeads: 0,
    thisWeekLeads: 0,
    lastWeekLeads: 0,
    weekOverWeekChange: 0
  });
  const [serviceAreaHealth, setServiceAreaHealth] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch today's fresh leads (Just Listed) and recent sold listings
  const fetchTodaysLeads = useCallback(async () => {
    if (!profile) return;

    const cityNames = getCityNames();
    if (cityNames.length === 0) return;

    // Last 24 hours for "Today's Leads" count
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

    // For sold listings display, show recent sales (last 7 days) to ensure there's always data
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentISO = recentDate.toISOString();

    // For just listed display, show last 3 days to ensure there's data to show
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoISO = threeDaysAgo.toISOString();

    try {
      // Get the TRUE count for "Today's Leads" - last 24 hours only
      const { count: todayJustListedCount } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', twentyFourHoursAgoISO);

      const { count: todaySoldCount } = await supabase
        .from('listings')
        .select('zpid', { count: 'exact', head: true })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', twentyFourHoursAgoISO);

      const todayOnlyCount = (todayJustListedCount || 0) + (todaySoldCount || 0);

      // Fetch just listed for display (last 3 days for better UX)
      const { data: justListedData, count: justListedCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext, imgsrc', { count: 'exact' })
        .eq('status', 'just_listed')
        .in('lastcity', cityNames)
        .gte('lastseenat', threeDaysAgoISO)
        .order('lastseenat', { ascending: false })
        .limit(6);

      // Fetch recent sold listings (last 7 days) for display
      const { data: soldData, count: soldCount } = await supabase
        .from('listings')
        .select('zpid, addressstreet, lastseenat, unformattedprice, beds, baths, area, lastcity, statustext, imgsrc', { count: 'exact' })
        .eq('status', 'sold')
        .in('lastcity', cityNames)
        .gte('lastseenat', recentISO)
        .order('lastseenat', { ascending: false })
        .limit(6);

      // Map zpid to id for consistency
      const mappedJustListed = (justListedData || []).map(item => ({ ...item, id: item.zpid }));
      const mappedSold = (soldData || []).map(item => ({ ...item, id: item.zpid }));

      setTodaysLeads({
        justListed: mappedJustListed,
        sold: mappedSold,
        justListedCount: justListedCount || 0,
        soldCount: soldCount || 0,
        todayOnlyCount
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

      const totalLeads = (monthlyJustListed || 0) + (monthlySold || 0);
      const thisWeekLeads = (thisWeekJustListed || 0) + (thisWeekSold || 0);
      const lastWeekLeads = (lastWeekJustListed || 0) + (lastWeekSold || 0);

      const weekOverWeekChange = lastWeekLeads > 0
        ? Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100)
        : thisWeekLeads > 0 ? 100 : 0;

      setMonthlyStats({
        totalLeads,
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
        fetchMonthlyStats(),
        fetchServiceAreaHealth()
      ]);
      setLoading(false);
    };

    if (!profileLoading) {
      loadDashboardData();
    }
  }, [profile, profileLoading, fetchTodaysLeads, fetchHighValueLeads, fetchMonthlyStats, fetchServiceAreaHealth]);

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

  // Use the 24-hour count for "Today's Leads" hero metric
  const totalTodaysLeads = todaysLeads.todayOnlyCount;

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
      <div className={`flex flex-col items-center justify-center h-full gap-4 min-h-screen ${isLight ? 'bg-slate-50' : 'bg-mesh-gradient-subtle'}`}>
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>Profile Not Found</h3>
        <p className={`text-center ${isLight ? 'text-slate-500' : 'text-slate'}`}>Unable to load your profile. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()} className={isLight
          ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm'
        }>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Page
        </Button>
      </div>
    );
  }

  // Onboarding not complete
  if (!profile?.onboarding_complete) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-4 min-h-screen ${isLight ? 'bg-slate-50' : 'bg-mesh-gradient-subtle'}`}>
        <Truck className={`h-16 w-16 ${isLight ? 'text-emerald-600' : 'text-primary'}`} />
        <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>Welcome to Sold2Move!</h3>
        <p className={`text-center max-w-md ${isLight ? 'text-slate-500' : 'text-slate'}`}>
          Complete your profile setup to start receiving moving leads in your service areas.
        </p>
        <Button asChild className={isLight
          ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm'
        }>
          <Link to="/onboarding">Complete Setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 min-h-screen ${isLight ? 'bg-slate-50' : 'bg-mesh-gradient-subtle'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>
            {profile?.company_name || 'Dashboard'}
          </h1>
          <p className={`text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate'}`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Hero Metric - Today's Leads (spans 4 cols, larger) */}
        <div
          className="col-span-12 md:col-span-4 rounded-2xl p-6"
          style={{
            background: isLight
              ? 'linear-gradient(to bottom right, #ecfdf5, #ffffff)'
              : 'linear-gradient(to bottom right, rgba(0, 255, 136, 0.2), rgba(0, 255, 136, 0.05))',
            border: isLight ? 'none' : '1px solid rgba(0, 255, 136, 0.3)',
            boxShadow: isLight
              ? '0 4px 8px rgba(0,0,0,0.02), 0 12px 32px rgba(0,0,0,0.06)'
              : '0 10px 40px rgba(0, 255, 136, 0.1)'
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p style={{ color: isLight ? '#047857' : '#00FF88' }} className="text-sm font-medium mb-1">Today's Leads</p>
              <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-hero-stat tabular-nums">{totalTodaysLeads}</p>
              <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-sm mt-2">New opportunities waiting</p>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor: isLight ? '#d1fae5' : 'rgba(0, 255, 136, 0.2)',
                border: isLight ? '1px solid #a7f3d0' : 'none'
              }}
            >
              <Sparkles style={{ color: isLight ? '#059669' : '#00FF88' }} className="h-6 w-6" />
            </div>
          </div>
          <Button
            asChild
            className="w-full mt-4 transition-all"
            style={{
              backgroundColor: isLight ? '#111827' : undefined,
              color: isLight ? '#ffffff' : undefined,
              boxShadow: isLight ? '0 4px 14px rgba(17,24,39,0.2)' : undefined
            }}
          >
            <Link to="/dashboard/listings/just-listed">
              View All Leads
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* This Week */}
        <div
          className="col-span-6 md:col-span-2 rounded-2xl p-4 transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <p style={{ color: isLight ? '#6b7280' : '#94a3b8' }} className="text-xs font-medium uppercase tracking-wide mb-1">This Week</p>
          <div className="flex items-baseline gap-1">
            <p style={{ color: isLight ? '#111827' : '#e2e8f0' }} className="text-3xl font-bold tabular-nums tracking-tight">{monthlyStats.thisWeekLeads}</p>
            {monthlyStats.weekOverWeekChange !== 0 && (
              <span style={{ color: monthlyStats.weekOverWeekChange > 0 ? (isLight ? '#059669' : '#00FF88') : '#f87171' }} className="text-xs font-semibold">
                {monthlyStats.weekOverWeekChange > 0 ? '+' : ''}{monthlyStats.weekOverWeekChange}%
              </span>
            )}
          </div>
          <div className="mt-1">
            <Sparkline data={weeklyTrend} isLight={isLight} color={monthlyStats.weekOverWeekChange >= 0 ? (isLight ? '#1F9D55' : '#00FF88') : '#f87171'} />
          </div>
        </div>

        {/* This Month */}
        <div
          className="col-span-6 md:col-span-2 rounded-2xl p-4 transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <p style={{ color: isLight ? '#6b7280' : '#94a3b8' }} className="text-xs font-medium uppercase tracking-wide mb-1">This Month</p>
          <p style={{ color: isLight ? '#111827' : '#e2e8f0' }} className="text-3xl font-bold tabular-nums tracking-tight">{monthlyStats.totalLeads}</p>
          <p style={{ color: isLight ? '#6b7280' : '#94a3b8' }} className="text-xs mt-1">Total leads</p>
        </div>

        {/* Just Listed Feed - Tall card (spans 6 cols, full height) */}
        <div
          className="col-span-12 lg:col-span-6 rounded-2xl overflow-hidden transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: isLight ? '1px solid #f3f4f6' : '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Just Listed</h3>
              <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">New opportunities in your areas</p>
            </div>
            <span style={{ color: isLight ? '#059669' : '#00FF88' }} className="text-2xl font-mono font-bold tabular-nums">{todaysLeads.justListedCount}</span>
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
                    className="group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                    style={{
                      backgroundColor: isLight ? '#f9fafb' : 'rgba(13, 15, 18, 0.6)',
                      border: isLight ? 'none' : '1px solid rgba(255,255,255,0.04)'
                    }}
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm font-medium truncate">{lead.lastcity}</p>
                        <StatusTag type={isHotLead(lead) ? 'hot' : 'new'} isLight={isLight} />
                      </div>
                      <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ color: isLight ? '#059669' : '#00FF88' }} className="font-mono text-sm font-semibold tabular-nums">{formatPrice(lead.unformattedprice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(34, 39, 46, 0.5)' }}
                >
                  <Search style={{ color: isLight ? '#94a3b8' : '#64748b' }} className="h-8 w-8" />
                </div>
                <p style={{ color: isLight ? '#475569' : '#94a3b8' }} className="font-medium">No new listings today</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs mt-1 mb-4">Check neighboring areas for more opportunities</p>
                <Button asChild variant="outline" size="sm" style={{ borderColor: isLight ? '#a7f3d0' : undefined, color: isLight ? '#047857' : undefined }}>
                  <Link to="/dashboard/settings">Expand Service Areas</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" style={{ color: isLight ? '#059669' : '#00FF88' }} className="w-full">
              <Link to="/dashboard/listings/just-listed">
                View all listings
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Just Sold Feed */}
        <div
          className="col-span-12 lg:col-span-6 rounded-2xl overflow-hidden transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: isLight ? '1px solid #f3f4f6' : '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Recently Sold</h3>
              <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">High-intent movers - act fast</p>
            </div>
            <span style={{ color: isLight ? '#059669' : '#00FF88' }} className="text-2xl font-mono font-bold tabular-nums">{todaysLeads.soldCount}</span>
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
                    className="group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                    style={{
                      backgroundColor: isLight ? '#f9fafb' : 'rgba(13, 15, 18, 0.6)',
                      border: isLight ? 'none' : '1px solid rgba(255,255,255,0.04)'
                    }}
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm font-medium truncate">{lead.lastcity}</p>
                        <StatusTag type="sold" isLight={isLight} />
                      </div>
                      <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ color: isLight ? '#059669' : '#00FF88' }} className="font-mono text-sm font-semibold tabular-nums">{formatPrice(lead.unformattedprice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(34, 39, 46, 0.5)' }}
                >
                  <Clock style={{ color: isLight ? '#94a3b8' : '#64748b' }} className="h-8 w-8" />
                </div>
                <p style={{ color: isLight ? '#475569' : '#94a3b8' }} className="font-medium">No recent sales in your areas</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs mt-1 mb-4">Check back soon for new opportunities</p>
                <Button asChild variant="outline" size="sm" style={{ borderColor: isLight ? '#a7f3d0' : undefined, color: isLight ? '#047857' : undefined }}>
                  <Link to="/dashboard/listings/sold">View Past Sales</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" style={{ color: isLight ? '#059669' : '#00FF88' }} className="w-full">
              <Link to="/dashboard/listings/sold">
                View all sold
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="col-span-12 md:col-span-6 lg:col-span-3 rounded-2xl p-4 transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard/mailing')}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              style={{ backgroundColor: isLight ? '#f9fafb' : 'rgba(13, 15, 18, 0.6)' }}
            >
              <Mail style={{ color: isLight ? '#059669' : '#00FF88' }} className="h-5 w-5" />
              <div>
                <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm font-medium">Send Mail</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">Direct mail campaign</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/listings/just-listed')}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              style={{ backgroundColor: isLight ? '#f9fafb' : 'rgba(13, 15, 18, 0.6)' }}
            >
              <Download style={{ color: isLight ? '#059669' : '#00FF88' }} className="h-5 w-5" />
              <div>
                <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm font-medium">Export Leads</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">Download CSV</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              style={{ backgroundColor: isLight ? '#f9fafb' : 'rgba(13, 15, 18, 0.6)' }}
            >
              <MapPin style={{ color: isLight ? '#059669' : '#00FF88' }} className="h-5 w-5" />
              <div>
                <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm font-medium">Service Areas</p>
                <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">Manage cities</p>
              </div>
            </button>
          </div>
        </div>

        {/* Service Areas */}
        <div
          className="col-span-12 md:col-span-6 lg:col-span-4 rounded-2xl p-4 transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">Service Areas</h3>
            <Link to="/dashboard/settings" style={{ color: isLight ? '#059669' : '#00FF88' }} className="text-xs hover:underline">Manage</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <SkeletonLoader key={i} className="h-12" />)}
            </div>
          ) : serviceAreaHealth.length > 0 ? (
            <div className="space-y-2">
              {serviceAreaHealth.slice(0, 4).map((area) => (
                <div
                  key={area.city}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : 'rgba(13, 15, 18, 0.6)',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.04)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: area.status === 'high' ? (isLight ? '#10b981' : '#00FF88') :
                          area.status === 'moderate' ? '#f59e0b' : (isLight ? '#94a3b8' : '#64748b')
                      }}
                    />
                    <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm">{area.city}</span>
                  </div>
                  <span style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-sm font-mono font-semibold tabular-nums">{area.leadsThisWeek} leads</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-sm mb-3">No service areas configured</p>
              <Button asChild size="sm" style={{ backgroundColor: isLight ? '#0f172a' : undefined, color: isLight ? '#ffffff' : undefined }}>
                <Link to="/dashboard/settings">Add Areas</Link>
              </Button>
            </div>
          )}
        </div>

        {/* High Value Leads */}
        <div
          className="col-span-12 lg:col-span-5 rounded-2xl p-4 transition-all"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Flame style={{ color: isLight ? '#f59e0b' : '#fbbf24' }} className="h-5 w-5" />
            <h3 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="font-semibold">High-Value Leads</h3>
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
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : 'rgba(13, 15, 18, 0.6)',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.04)'
                  }}
                  onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                >
                  <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-sm truncate">{lead.lastcity}</p>
                    <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-xs">{lead.beds}bd • {lead.baths}ba</p>
                  </div>
                  <span style={{ color: isLight ? '#059669' : '#00FF88' }} className="font-mono text-sm font-bold tabular-nums">{formatPrice(lead.unformattedprice)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: isLight ? '#64748b' : '#94a3b8' }} className="text-sm text-center py-6">No high-value leads this week</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
