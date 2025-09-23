
import React, { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Bell } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ProfileSettings = lazy(() => import('@/components/dashboard/settings/ProfileSettings'));
const BillingSettings = lazy(() => import('@/components/dashboard/settings/BillingSettings'));
const NotificationsSettings = lazy(() => import('@/components/dashboard/settings/NotificationsSettings'));

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading text-lightest-slate">Settings</h1>
        <p className="text-slate">Manage your account, billing, and notification preferences.</p>
      </div>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>
        <Suspense fallback={<div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>}>
          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
          <TabsContent value="billing">
            <BillingSettings />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsSettings />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
