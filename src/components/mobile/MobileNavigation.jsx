import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, List, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Safe mobile navigation component
 * Only renders on mobile devices, doesn't affect desktop navigation
 */
const MobileNavigation = () => {
  const location = useLocation();

  const navItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      icon: List,
      label: 'Leads',
      path: '/listings',
      active: location.pathname.includes('/listings') || location.pathname.includes('/sold')
    },
    {
      icon: User,
      label: 'Profile',
      path: '/settings',
      active: location.pathname.includes('/settings')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-deep-navy border-t border-teal/20 md:hidden z-50">
      <div className="flex justify-around py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors",
                "min-h-[44px] min-w-[44px]", // Ensure touch target size
                item.active
                  ? "text-teal bg-teal/10"
                  : "text-slate hover:text-lightest-slate hover:bg-lightest-navy/20"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;

