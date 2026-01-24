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
  const [todaysLeads, setTodaysLeads] = useState({ justListed: [], sold: [], justListedCount: 0, soldCount: 0 });
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // For sold listings, show recent sales (last 7 days) to ensure there's always data
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentISO = recentDate.toISOString();

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

      // Fetch recent sold listings (last 7 days) - more useful than just today
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
        <div className={`col-span-12 md:col-span-4 rounded-2xl p-6 ${
          isLight
            ? 'bg-gradient-to-br from-emerald-50 to-white shadow-[0_4px_8px_rgb(0_0_0/0.02),0_12px_32px_rgb(0_0_0/0.06)]'
            : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg shadow-primary/10'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-medium mb-1 ${isLight ? 'text-emerald-700' : 'text-primary'}`}>Today's Leads</p>
              <p className={`text-hero-stat tabular-nums ${isLight ? 'text-slate-900' : 'text-lightest-slate'}`}>{totalTodaysLeads}</p>
              <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-slate'}`}>New opportunities waiting</p>
            </div>
            <div className={`p-3 rounded-xl ${
              isLight
                ? 'bg-emerald-100 border border-emerald-200'
                : 'bg-primary/20 shadow-glow-sm'
            }`}>
              <Sparkles className={`h-6 w-6 ${isLight ? 'text-emerald-600' : 'text-primary'}`} />
            </div>
          </div>
          <Button asChild className={`w-full mt-4 ${
            isLight
              ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-[0_4px_14px_rgba(17,24,39,0.2)] hover:shadow-[0_6px_20px_rgba(17,24,39,0.3)] hover:-translate-y-0.5 transition-all'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm hover:shadow-glow'
          }`}>
            <Link to="/dashboard/listings/just-listed">
              View All Leads
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* This Week */}
        <div className={cn(
          "col-span-6 md:col-span-2 rounded-2xl p-4 transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <p className={cn("text-xs font-medium uppercase tracking-wide mb-1", isLight ? "text-gray-500" : "text-slate")}>This Week</p>
          <div className="flex items-baseline gap-1">
            <p className={cn("text-3xl font-bold tabular-nums tracking-tight", isLight ? "text-gray-900" : "text-lightest-slate")}>{monthlyStats.thisWeekLeads}</p>
            {monthlyStats.weekOverWeekChange !== 0 && (
              <span className={cn("text-xs font-semibold", monthlyStats.weekOverWeekChange > 0 ? (isLight ? "text-emerald-600" : "text-primary") : "text-red-500")}>
                {monthlyStats.weekOverWeekChange > 0 ? '+' : ''}{monthlyStats.weekOverWeekChange}%
              </span>
            )}
          </div>
          <div className="mt-1">
            <Sparkline data={weeklyTrend} isLight={isLight} color={monthlyStats.weekOverWeekChange >= 0 ? (isLight ? '#1F9D55' : '#00FF88') : '#f87171'} />
          </div>
        </div>

        {/* This Month */}
        <div className={cn(
          "col-span-6 md:col-span-2 rounded-2xl p-4 transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <p className={cn("text-xs font-medium uppercase tracking-wide mb-1", isLight ? "text-gray-500" : "text-slate")}>This Month</p>
          <p className={cn("text-3xl font-bold tabular-nums tracking-tight", isLight ? "text-gray-900" : "text-lightest-slate")}>{monthlyStats.totalLeads}</p>
          <p className={cn("text-xs mt-1", isLight ? "text-gray-500" : "text-slate")}>Total leads</p>
        </div>

        {/* Just Listed Feed - Tall card (spans 6 cols, full height) */}
        <div className={cn(
          "col-span-12 lg:col-span-6 rounded-2xl overflow-hidden transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <div className={cn("p-4 flex items-center justify-between", isLight ? "border-b border-gray-100" : "border-b border-white/[0.06]")}>
            <div>
              <h3 className={cn("font-semibold", isLight ? "text-slate-900" : "text-lightest-slate")}>Just Listed</h3>
              <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>New opportunities in your areas</p>
            </div>
            <span className={cn("text-2xl font-mono font-bold tabular-nums", isLight ? "text-emerald-600" : "text-primary")}>{todaysLeads.justListedCount}</span>
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
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                      isLight
                        ? "bg-gray-50/50 hover:bg-gray-100/80 rounded-xl"
                        : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
                    )}
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium truncate", isLight ? "text-slate-900" : "text-lightest-slate")}>{lead.lastcity}</p>
                        <StatusTag type={isHotLead(lead) ? 'hot' : 'new'} isLight={isLight} />
                      </div>
                      <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-semibold tabular-nums", isLight ? "text-emerald-600" : "text-primary")}>{formatPrice(lead.unformattedprice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", isLight ? "bg-slate-100" : "bg-charcoal-700/50")}>
                  <Search className={cn("h-8 w-8", isLight ? "text-slate-400" : "text-slate")} />
                </div>
                <p className={cn("font-medium", isLight ? "text-slate-600" : "text-slate")}>No new listings today</p>
                <p className={cn("text-xs mt-1 mb-4", isLight ? "text-slate-500" : "text-slate")}>Check neighboring areas for more opportunities</p>
                <Button asChild variant="outline" size="sm" className={cn(isLight ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-primary/30 text-primary hover:bg-primary/10")}>
                  <Link to="/dashboard/settings">Expand Service Areas</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" className={cn("w-full", isLight ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-primary hover:text-primary hover:bg-primary/10")}>
              <Link to="/dashboard/listings/just-listed">
                View all listings
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Just Sold Feed */}
        <div className={cn(
          "col-span-12 lg:col-span-6 rounded-2xl overflow-hidden transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <div className={cn("p-4 flex items-center justify-between", isLight ? "border-b border-gray-100" : "border-b border-white/[0.06]")}>
            <div>
              <h3 className={cn("font-semibold", isLight ? "text-slate-900" : "text-lightest-slate")}>Recently Sold</h3>
              <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>High-intent movers - act fast</p>
            </div>
            <span className={cn("text-2xl font-mono font-bold tabular-nums", isLight ? "text-emerald-600" : "text-primary")}>{todaysLeads.soldCount}</span>
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
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                      isLight
                        ? "bg-gray-50/50 hover:bg-gray-100/80 rounded-xl"
                        : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
                    )}
                    onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                  >
                    <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium truncate", isLight ? "text-slate-900" : "text-lightest-slate")}>{lead.lastcity}</p>
                        <StatusTag type="sold" isLight={isLight} />
                      </div>
                      <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>{lead.beds}bd • {lead.baths}ba • {lead.area ? `${lead.area.toLocaleString()} sqft` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-semibold tabular-nums", isLight ? "text-emerald-600" : "text-primary")}>{formatPrice(lead.unformattedprice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", isLight ? "bg-slate-100" : "bg-charcoal-700/50")}>
                  <Clock className={cn("h-8 w-8", isLight ? "text-slate-400" : "text-slate")} />
                </div>
                <p className={cn("font-medium", isLight ? "text-slate-600" : "text-slate")}>No recent sales in your areas</p>
                <p className={cn("text-xs mt-1 mb-4", isLight ? "text-slate-500" : "text-slate")}>Check back soon for new opportunities</p>
                <Button asChild variant="outline" size="sm" className={cn(isLight ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-primary/30 text-primary hover:bg-primary/10")}>
                  <Link to="/dashboard/listings/sold">View Past Sales</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="p-3 pt-0">
            <Button asChild variant="ghost" className={cn("w-full", isLight ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-primary hover:text-primary hover:bg-primary/10")}>
              <Link to="/dashboard/listings/sold">
                View all sold
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={cn(
          "col-span-12 md:col-span-6 lg:col-span-3 rounded-2xl p-4 transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <h3 className={cn("font-semibold mb-3", isLight ? "text-slate-900" : "text-lightest-slate")}>Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard/mailing')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                isLight
                  ? "bg-gray-50/80 hover:bg-gray-100 rounded-xl"
                  : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
              )}
            >
              <Mail className={cn("h-5 w-5", isLight ? "text-emerald-600" : "text-primary")} />
              <div>
                <p className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-lightest-slate")}>Send Mail</p>
                <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>Direct mail campaign</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/listings/just-listed')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                isLight
                  ? "bg-gray-50/80 hover:bg-gray-100 rounded-xl"
                  : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
              )}
            >
              <Download className={cn("h-5 w-5", isLight ? "text-emerald-600" : "text-primary")} />
              <div>
                <p className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-lightest-slate")}>Export Leads</p>
                <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>Download CSV</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                isLight
                  ? "bg-gray-50/80 hover:bg-gray-100 rounded-xl"
                  : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
              )}
            >
              <MapPin className={cn("h-5 w-5", isLight ? "text-emerald-600" : "text-primary")} />
              <div>
                <p className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-lightest-slate")}>Service Areas</p>
                <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>Manage cities</p>
              </div>
            </button>
          </div>
        </div>

        {/* Service Areas */}
        <div className={cn(
          "col-span-12 md:col-span-6 lg:col-span-4 rounded-2xl p-4 transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn("font-semibold", isLight ? "text-slate-900" : "text-lightest-slate")}>Service Areas</h3>
            <Link to="/dashboard/settings" className={cn("text-xs hover:underline", isLight ? "text-emerald-600" : "text-primary")}>Manage</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <SkeletonLoader key={i} className="h-12" />)}
            </div>
          ) : serviceAreaHealth.length > 0 ? (
            <div className="space-y-2">
              {serviceAreaHealth.slice(0, 4).map((area) => (
                <div key={area.city} className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  isLight ? "bg-slate-50 border border-slate-200" : "bg-charcoal-900/60 border border-white/[0.04]"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      area.status === 'high' ? (isLight ? "bg-emerald-500" : "bg-primary shadow-badge-new") :
                      area.status === 'moderate' ? (isLight ? "bg-amber-500" : "bg-amber-400 shadow-badge-hot") :
                      (isLight ? "bg-slate-400" : "bg-slate")
                    )} />
                    <span className={cn("text-sm", isLight ? "text-slate-900" : "text-lightest-slate")}>{area.city}</span>
                  </div>
                  <span className={cn("text-sm font-mono font-semibold tabular-nums", isLight ? "text-slate-500" : "text-slate")}>{area.leadsThisWeek} leads</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className={cn("text-sm mb-3", isLight ? "text-slate-500" : "text-slate")}>No service areas configured</p>
              <Button asChild size="sm" className={cn(isLight ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                <Link to="/dashboard/settings">Add Areas</Link>
              </Button>
            </div>
          )}
        </div>

        {/* High Value Leads */}
        <div className={cn(
          "col-span-12 lg:col-span-5 rounded-2xl p-4 transition-all",
          isLight
            ? "bg-white border border-gray-200 shadow-sm hover:shadow-md"
            : "bg-charcoal-800/80 border-luminous hover-glow"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className={cn("h-5 w-5", isLight ? "text-amber-500" : "text-amber-400")} />
            <h3 className={cn("font-semibold", isLight ? "text-slate-900" : "text-lightest-slate")}>High-Value Leads</h3>
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
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                    isLight
                      ? "bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
                      : "bg-charcoal-900/60 hover:bg-charcoal-700/60 border border-white/[0.04] hover:border-white/[0.08]"
                  )}
                  onClick={() => navigate(`/dashboard/listings/property/${lead.id}`)}
                >
                  <PropertyThumbnail src={lead.imgsrc} alt={lead.addressstreet} isLight={isLight} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", isLight ? "text-slate-900" : "text-lightest-slate")}>{lead.lastcity}</p>
                    <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate")}>{lead.beds}bd • {lead.baths}ba</p>
                  </div>
                  <span className={cn("font-mono text-sm font-bold tabular-nums", isLight ? "text-emerald-600" : "text-primary")}>{formatPrice(lead.unformattedprice)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={cn("text-sm text-center py-6", isLight ? "text-slate-500" : "text-slate")}>No high-value leads this week</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
