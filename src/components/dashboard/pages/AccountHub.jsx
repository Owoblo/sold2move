import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  User, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Bell, 
  Shield, 
  Download, 
  Calendar,
  MapPin,
  Building,
  TrendingUp,
  Eye,
  Lock,
  Zap,
  Star,
  Clock,
  DollarSign,
  Activity,
  Target,
  Users,
  Mail,
  Phone,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@/components/ui/use-toast';
import SupportTicketAdmin from '@/components/dashboard/admin/SupportTicketAdmin';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

const AccountHub = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { profile, loading: profileLoading } = useProfile();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.email === 'johnowolabi80@gmail.com';
  const { session } = useAuth();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalReveals: 0,
    totalExports: 0,
    creditsUsed: 0,
    listingsViewed: 0,
    lastActivity: null,
    accountAge: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountStats = async () => {
      if (!profile?.id) return;
      
      try {
        setLoading(true);
        
        // Fetch revealed listings count
        const { count: revealsCount } = await supabase
          .from('listing_reveals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        // Fetch account creation date
        const accountAge = profile.created_at ? 
          Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24)) : 0;

        // Calculate credits used (if we have initial credits)
        const initialCredits = profile.trial_granted ? 100 : 0; // Assuming 100 trial credits
        const creditsUsed = initialCredits + (profile.credits_purchased || 0) - (profile.credits_remaining || 0);

        setStats({
          totalReveals: revealsCount || 0,
          totalExports: 0, // This would need to be tracked separately
          creditsUsed: Math.max(0, creditsUsed),
          listingsViewed: revealsCount || 0,
          lastActivity: profile.updated_at,
          accountAge: accountAge
        });
      } catch (error) {
        console.error('Error fetching account stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountStats();
  }, [profile, supabase]);

  const getAccountStatus = () => {
    if (profile?.unlimited) return { status: 'unlimited', color: 'bg-purple-500', text: 'Unlimited Access' };
    if (profile?.trial_granted && !profile?.onboarding_complete) return { status: 'trial', color: 'bg-blue-500', text: 'Trial Account' };
    if (profile?.credits_remaining > 0) return { status: 'active', color: 'bg-green-500', text: 'Active' };
    return { status: 'inactive', color: 'bg-red-500', text: 'No Credits' };
  };

  const accountStatus = getAccountStatus();

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Account Hub | Sold2Move</title>
        <meta name="description" content="Manage your account, view statistics, and access account settings." />
      </Helmet>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
            <User className="h-8 w-8" style={{ color: isLight ? '#059669' : '#00FF88' }} />
            Account Hub
          </h1>
          <p className="mt-1" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
            Welcome back, {profile?.company_name || session?.user?.email?.split('@')[0] || 'User'}!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${accountStatus.color} text-white`}>
            {accountStatus.text}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Credits Remaining</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                {profile?.unlimited ? '∞' : profile?.credits_remaining || 0}
              </p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: isLight ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 255, 136, 0.1)' }}>
              <Zap className="h-6 w-6" style={{ color: isLight ? '#059669' : '#00FF88' }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Listings Revealed</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{stats.totalReveals}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Eye className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Account Age</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{stats.accountAge} days</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-full">
              <Calendar className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
            border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Service Areas</p>
              <p className="text-2xl font-bold" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                {profile?.service_cities?.length || 1}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-full">
              <MapPin className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <TabsTrigger value="overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="mr-2 h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin-support">
                <MessageSquare className="mr-2 h-4 w-4" />
                Support
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account Information */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                    <User className="h-5 w-5" />
                    Account Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Company Name</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {profile?.company_name || 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Email</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {session?.user?.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Phone</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {profile?.phone || 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Primary City</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {profile?.city_name || 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Account Type</span>
                    <Badge className={accountStatus.color}>
                      {accountStatus.text}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Service Areas */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                    <MapPin className="h-5 w-5" />
                    Service Areas
                  </h3>
                </div>
                <div className="p-6">
                  {profile?.service_cities && profile.service_cities.length > 0 ? (
                    <div className="space-y-2">
                      {profile.service_cities.map((city, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isLight ? '#059669' : '#00FF88' }}></div>
                          <span style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{city}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <MapPin className="h-12 w-12 mx-auto mb-2" style={{ color: isLight ? '#64748b' : '#94a3b8' }} />
                      <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>No service areas configured</p>
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link to="/dashboard/settings">Configure Areas</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                  <Target className="h-5 w-5" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Link to="/dashboard/listings">
                      <Building className="h-6 w-6" />
                      <span>View Listings</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Link to="/dashboard/billing">
                      <CreditCard className="h-6 w-6" />
                      <span>Buy Credits</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Link to="/dashboard/settings">
                      <Settings className="h-6 w-6" />
                      <span>Account Settings</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Link to="/dashboard/support">
                      <Users className="h-6 w-6" />
                      <span>Get Support</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(22, 26, 31, 0.3)' }}
                  >
                    <div className="p-2 bg-blue-500/10 rounded-full">
                      <Eye className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Listings Revealed</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{stats.totalReveals} listings revealed</p>
                    </div>
                    <span className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                      {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(22, 26, 31, 0.3)' }}
                  >
                    <div className="p-2 bg-green-500/10 rounded-full">
                      <Download className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Data Exports</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{stats.totalExports} CSV files downloaded</p>
                    </div>
                    <span className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Recently</span>
                  </div>

                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(22, 26, 31, 0.3)' }}
                  >
                    <div className="p-2 bg-purple-500/10 rounded-full">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Credits Used</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>{stats.creditsUsed} credits consumed</p>
                    </div>
                    <span className="text-xs" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Total</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Plan Type</span>
                    <Badge className={accountStatus.color}>
                      {profile?.unlimited ? 'Unlimited' : 'Pay-per-use'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Credits Remaining</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {profile?.unlimited ? 'Unlimited' : profile?.credits_remaining || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Trial Status</span>
                    <span className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                      {profile?.trial_granted ? 'Trial Used' : 'Available'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                  border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                    <DollarSign className="h-5 w-5" />
                    Billing Actions
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  <Button asChild className="w-full">
                    <Link to="/dashboard/billing">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy Credits
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/pricing">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/dashboard/billing">
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoices
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                  <Shield className="h-5 w-5" />
                  Account Security
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Email Verified</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Your email address is verified</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    Verified
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Last Login</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                        {session?.user?.last_sign_in_at ?
                          new Date(session.user.last_sign_in_at).toLocaleString() :
                          'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>Account Created</p>
                      <p className="text-sm" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                        {profile?.created_at ?
                          new Date(profile.created_at).toLocaleDateString() :
                          'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(22, 26, 31, 0.8)',
                border: isLight ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>
                  <Settings className="h-5 w-5" />
                  Security Actions
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Security Notifications
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Data
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Admin Support Tab */}
          {isAdmin && (
            <TabsContent value="admin-support" className="space-y-6">
              <SupportTicketAdmin />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AccountHub;