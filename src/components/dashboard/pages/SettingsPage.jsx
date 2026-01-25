
import React, { Suspense, lazy, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Bell, Globe, Shield, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';

const ProfileSettings = lazy(() => import('@/components/dashboard/settings/ProfileSettings'));
const BillingSettings = lazy(() => import('@/components/dashboard/settings/BillingSettings'));
const NotificationsSettings = lazy(() => import('@/components/dashboard/settings/NotificationsSettings'));
const MultiCitySettings = lazy(() => import('@/components/dashboard/settings/MultiCitySettings'));
const AccountManagement = lazy(() => import('@/components/dashboard/settings/AccountManagement'));
const SessionManagement = lazy(() => import('@/components/dashboard/settings/SessionManagement'));
const SupportTickets = lazy(() => import('@/components/dashboard/settings/SupportTickets'));
// AI components temporarily disabled for production deployment
// const AISettings = lazy(() => import('@/components/dashboard/settings/AISettings'));
// const AITestPanel = lazy(() => import('@/components/dashboard/AITestPanel'));
// const AIUploadDemo = lazy(() => import('@/components/dashboard/AIUploadDemo'));

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ color: isLight ? '#0f172a' : '#e2e8f0' }} className="text-3xl font-bold font-heading">Settings</h1>
        <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Manage your account, billing, and notification preferences.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 max-w-6xl">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="service-areas">
            <Globe className="mr-2 h-4 w-4" />
            Service Areas
          </TabsTrigger>
          {/* AI Features tab temporarily disabled for production deployment */}
          {/* <TabsTrigger value="ai">
            <Brain className="mr-2 h-4 w-4" />
            AI Features
          </TabsTrigger> */}
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="support">
            <MessageSquare className="mr-2 h-4 w-4" />
            Support
          </TabsTrigger>
        </TabsList>
        <Suspense fallback={<div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>}>
          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
          <TabsContent value="service-areas">
            <MultiCitySettings />
          </TabsContent>
          {/* AI Features content temporarily disabled for production deployment */}
          {/* <TabsContent value="ai">
            <div className="space-y-6">
              <AISettings />
              <AIUploadDemo />
              <AITestPanel />
            </div>
          </TabsContent> */}
          <TabsContent value="billing">
            <BillingSettings />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsSettings />
          </TabsContent>
          <TabsContent value="account">
            <AccountManagement />
          </TabsContent>
          <TabsContent value="security">
            <SessionManagement />
          </TabsContent>
          <TabsContent value="support">
            <SupportTickets />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
