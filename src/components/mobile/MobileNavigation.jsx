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

  if (!location.pathname.startsWith('/dashboard')) {
    return null;
  }

  const navItems = [
    {
      icon: Home,
      label: 'Overview',
      path: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      icon: List,
      label: 'Listings',
      path: '/dashboard/listings',
      active: location.pathname.startsWith('/dashboard/listings')
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/dashboard/settings',
      active: location.pathname.startsWith('/dashboard/settings')
    },
    {
      icon: User,
      label: 'Account',
      path: '/dashboard/account',
      active: location.pathname.startsWith('/dashboard/account')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-deep-navy/95 backdrop-blur border-t border-teal/20 md:hidden z-50">
      <div className="flex justify-around py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={item.active ? 'page' : undefined}
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

