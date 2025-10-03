import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  Zap, 
  Settings, 
  User,
  Bell,
  Filter,
  Download,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.jsx';

const MobileLayout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsFilterOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'listings', label: 'Listings', icon: Search, path: '/dashboard/listings' },
    { id: 'billing', label: 'Billing', icon: Zap, path: '/dashboard/billing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  const quickActions = [
    { id: 'bulk-reveal', label: 'Bulk Reveal', icon: Zap, action: () => {} },
    { id: 'export', label: 'Export', icon: Download, action: () => {} },
    { id: 'saved', label: 'Saved', icon: Star, action: () => {} },
    { id: 'filters', label: 'Filters', icon: Filter, action: () => setIsFilterOpen(true) },
  ];

  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => location.pathname.startsWith(item.path));
    return currentItem?.label || 'Dashboard';
  };

  const getCurrentPageIcon = () => {
    const currentItem = menuItems.find(item => location.pathname.startsWith(item.path));
    return currentItem?.icon || Home;
  };

  const CurrentPageIcon = getCurrentPageIcon();

  return (
    <div className="min-h-screen bg-deep-navy text-lightest-slate">
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-light-navy border-b border-lightest-navy/20"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CurrentPageIcon className="h-5 w-5 text-green" />
              <h1 className="text-lg font-semibold">{getCurrentPageTitle()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Credits Display */}
            <div className="flex items-center gap-1 px-2 py-1 bg-green/10 rounded-full">
              <Zap className="h-4 w-4 text-green" />
              <span className="text-sm font-medium text-green">
                {profile?.unlimited ? '∞' : (profile?.credits_remaining || 0)}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="p-2"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className="flex items-center gap-1 whitespace-nowrap border-lightest-navy/20 text-lightest-slate hover:bg-lightest-navy/10"
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="pb-20">
        {children}
      </div>

      {/* Bottom Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-light-navy border-t border-lightest-navy/20"
      >
        <div className="flex items-center justify-around py-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 p-2 h-auto ${
                  isActive 
                    ? 'text-green bg-green/10' 
                    : 'text-slate hover:text-lightest-slate'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-light-navy border-r border-lightest-navy/20"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-lightest-slate">Menu</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* User Profile */}
                <Card className="bg-deep-navy/30 border-lightest-navy/20 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green" />
                      </div>
                      <div>
                        <p className="font-medium text-lightest-slate">
                          {profile?.company_name || 'User'}
                        </p>
                        <p className="text-sm text-slate">
                          {profile?.business_email || 'user@example.com'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-green" />
                        <span className="text-sm text-slate">Credits:</span>
                        <span className="text-sm font-medium text-green">
                          {profile?.unlimited ? 'Unlimited' : (profile?.credits_remaining || 0)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {profile?.plan_tier || 'Free'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Menu Items */}
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => {
                          navigate(item.path);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full justify-start gap-3 h-12 ${
                          isActive 
                            ? 'bg-green/10 text-green border border-green/20' 
                            : 'text-lightest-slate hover:bg-lightest-navy/50'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Quick Stats */}
                <Card className="bg-deep-navy/30 border-lightest-navy/20 mt-6">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-lightest-slate mb-3">
                      Quick Stats
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate">Listings Viewed</span>
                        <span className="text-lightest-slate">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">Credits Used Today</span>
                        <span className="text-lightest-slate">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">Saved Searches</span>
                        <span className="text-lightest-slate">0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-deep-navy"
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold text-lightest-slate">Search</h2>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate" />
                  <input
                    type="text"
                    placeholder="Search listings, addresses, or cities..."
                    className="w-full pl-10 pr-4 py-3 bg-light-navy border border-lightest-navy/20 rounded-lg text-lightest-slate placeholder-slate focus:outline-none focus:ring-2 focus:ring-green/50"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate">Recent Searches</h3>
                  <div className="space-y-1">
                    <div className="p-3 bg-light-navy rounded-lg text-sm text-lightest-slate">
                      No recent searches
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileLayout;
