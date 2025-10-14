
import React, { Suspense, lazy, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Bell, Globe, Shield, Settings as SettingsIcon } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ProfileSettings = lazy(() => import('@/components/dashboard/settings/ProfileSettings'));
const BillingSettings = lazy(() => import('@/components/dashboard/settings/BillingSettings'));
const NotificationsSettings = lazy(() => import('@/components/dashboard/settings/NotificationsSettings'));
const MultiCitySettings = lazy(() => import('@/components/dashboard/settings/MultiCitySettings'));
const AccountManagement = lazy(() => import('@/components/dashboard/settings/AccountManagement'));
const SessionManagement = lazy(() => import('@/components/dashboard/settings/SessionManagement'));

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading text-lightest-slate">Settings</h1>
        <p className="text-slate">Manage your account, billing, and notification preferences.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 max-w-4xl">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="service-areas">
            <Globe className="mr-2 h-4 w-4" />
            Service Areas
          </TabsTrigger>
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
        </TabsList>
        <Suspense fallback={<div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>}>
          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
          <TabsContent value="service-areas">
            <MultiCitySettings />
          </TabsContent>
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
        </Suspense>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
