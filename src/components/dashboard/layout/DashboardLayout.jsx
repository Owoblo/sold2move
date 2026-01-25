import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useTheme } from '@/contexts/ThemeContext';

const DashboardLayout = ({ children }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Start with sidebar collapsed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Open on lg screens and above
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on mobile, auto-open on desktop
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: isLight ? '#F4F5F7' : '#0D0F12' }}
    >
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area - Add left margin when sidebar is open on desktop */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        {/* Dashboard Header */}
        <DashboardHeader isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Page Content - Soft pearl grey background in light mode */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ backgroundColor: isLight ? '#F4F5F7' : 'transparent' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
