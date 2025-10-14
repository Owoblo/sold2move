import React, { Suspense, lazy, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const SupportChatWidget = lazy(() => import('@/components/dashboard/SupportChatWidget'));

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="flex h-screen bg-deep-navy text-lightest-slate">
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Sidebar 
          isSidebarOpen={isSidebarOpen || isHovered} 
          toggleSidebar={toggleSidebar} 
        />
      </div>
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        (isSidebarOpen || isHovered) ? 'ml-64' : 'ml-16'
      }`}>
        <DashboardHeader isSidebarOpen={isSidebarOpen || isHovered} toggleSidebar={toggleSidebar} />
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