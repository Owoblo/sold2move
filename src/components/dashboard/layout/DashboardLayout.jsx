import React, { Suspense, lazy, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const SupportChatWidget = lazy(() => import('@/components/dashboard/SupportChatWidget'));

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-deep-navy text-lightest-slate">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-16'
      }`}>
        <DashboardHeader isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-deep-navy p-6">
          <Suspense fallback={<div className="flex justify-center items-center h-full"><LoadingSpinner size="lg" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Suspense fallback={null}>
        <SupportChatWidget />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;