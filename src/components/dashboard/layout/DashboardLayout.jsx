import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useResponsive } from '@/hooks/useResponsive';
import MobileNavigation from '@/components/mobile/MobileNavigation';
import { cn } from '@/lib/utils';

const SupportChatWidget = lazy(() => import('@/components/dashboard/SupportChatWidget'));

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isDesktop } = useResponsive();

  useEffect(() => {
    setIsSidebarOpen(isDesktop);
  }, [isDesktop]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleMouseEnter = () => {
    if (isDesktop) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isDesktop) {
      setIsHovered(false);
    }
  };

  const shouldShowExpandedSidebar = isDesktop ? (isSidebarOpen || isHovered) : isSidebarOpen;

  return (
    <div className="flex min-h-screen bg-deep-navy text-lightest-slate">
      <div
        onMouseEnter={isDesktop ? handleMouseEnter : undefined}
        onMouseLeave={isDesktop ? handleMouseLeave : undefined}
        className="z-40"
      >
        <Sidebar 
          isSidebarOpen={shouldShowExpandedSidebar} 
          toggleSidebar={toggleSidebar} 
          isDesktop={isDesktop}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          {
            'md:ml-64': isDesktop && shouldShowExpandedSidebar,
            'md:ml-16': isDesktop && !shouldShowExpandedSidebar,
          }
        )}
      >
        <DashboardHeader isSidebarOpen={shouldShowExpandedSidebar} toggleSidebar={toggleSidebar} isDesktop={isDesktop} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-deep-navy p-4 sm:p-6 pb-24 md:pb-8">
          <Suspense fallback={<div className="flex justify-center items-center h-full"><LoadingSpinner size="lg" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileNavigation />
      <Suspense fallback={null}>
        <SupportChatWidget />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;