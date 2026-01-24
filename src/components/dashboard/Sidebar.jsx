import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingCart, MessageSquare, CreditCard, Archive, Package, List, Mail, Book, Image, Video, Settings, ChevronLeft, ChevronRight, Building, TrendingUp, Link2, Wallet, PlusCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import WalletBalance from './WalletBalance';

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [expandedSections, setExpandedSections] = useState({
    listings: location.pathname.startsWith('/dashboard/listings')
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuItems = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', icon: Home, path: '/dashboard' },
        { 
          name: 'Listings', 
          icon: List, 
          path: '/dashboard/listings',
          hasSubmenu: true,
          submenu: [
            { name: 'Just Listed', icon: Building, path: '/dashboard/listings/just-listed' },
            { name: 'Active', icon: Home, path: '/dashboard/listings/active' },
            { name: 'Sold', icon: TrendingUp, path: '/dashboard/listings/sold' },
            { name: 'Chain Leads', icon: Link2, path: '/dashboard/chain-leads' },
          ]
        },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'Account Hub', icon: User, path: '/dashboard/account' },
        { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
        { name: 'Orders', icon: ShoppingCart, path: '/dashboard/orders' },
        { name: 'Billing', icon: CreditCard, path: '/dashboard/billing' },
        { name: 'Support Ticket', icon: MessageSquare, path: '/dashboard/support' },
      ],
    },
    {
      title: 'Campaigns',
      items: [
        { name: 'Create Campaign', icon: PlusCircle, path: '/dashboard/campaigns/new', highlight: true },
        { name: 'Wallet', icon: Wallet, path: '/dashboard/wallet' },
        { name: 'Mailing', icon: Mail, path: '/dashboard/mailing' },
        { name: 'Products', icon: Package, path: '/dashboard/products' },
        { name: 'Mailing Assets', icon: Archive, path: '/dashboard/assets' },
      ],
    },
    {
      title: 'Help',
      items: [
        { name: 'Resources', icon: Book, path: '/dashboard/resources' },
        { name: 'Sample Mailers', icon: Image, path: '/dashboard/sample-mailers' },
        { name: 'Video Tutorials & FAQ', icon: Video, path: '/dashboard/tutorials' },
      ],
    },
  ];

  const baseLinkClasses = "flex items-center p-2 rounded-lg transition-all duration-200";

  // Theme-aware link classes - Premium light mode styling
  const inactiveLinkClasses = isLight
    ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    : "text-slate hover:bg-charcoal-700/50 hover:text-lightest-slate";

  const activeLinkClasses = isLight
    ? "bg-emerald-50/80 text-emerald-700 font-semibold border-l-[3px] border-l-emerald-500 rounded-l-none"
    : "bg-primary/10 text-primary font-semibold shadow-badge-new/30";

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className={`fixed inset-0 z-30 lg:hidden ${
            isLight ? 'bg-slate-900/20 backdrop-blur-sm' : 'bg-black/50'
          }`}
          onClick={toggleSidebar}
        ></div>
      )}

      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
        isLight
          ? 'bg-white border-r border-black/[0.04] shadow-[4px_0_30px_rgba(0,0,0,0.03)]'
          : 'bg-charcoal-800 border-r border-white/[0.06]'
      } ${
        isSidebarOpen
          ? 'w-64 translate-x-0'
          : 'w-16 -translate-x-48 lg:translate-x-0'
      }`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 px-2">
            <Link to="/" className="flex items-center group">
              <img
                src="/images/logos/logo-transparent.png"
                alt="Sold2Move"
                className={`object-contain ${isSidebarOpen ? 'h-10 w-auto max-w-[180px]' : 'h-8 w-8'}`}
              />
            </Link>
            {isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className={`p-1 rounded-lg transition-colors ${
                  isLight ? 'hover:bg-slate-100' : 'hover:bg-charcoal-700/50'
                }`}
                title="Collapse sidebar"
              >
                <ChevronLeft className={`h-4 w-4 ${isLight ? 'text-slate-500' : 'text-slate'}`} />
              </button>
            )}
          </div>
          {/* Wallet Balance - shown when sidebar is open */}
          {isSidebarOpen && <WalletBalance variant="sidebar" />}

          <ul className="space-y-4">
            {menuItems.map((group) => (
              <li key={group.title}>
                {isSidebarOpen && (
                  <h3 className={`px-2 mb-2 text-xs font-semibold tracking-wider uppercase ${
                    isLight ? 'text-slate-400' : 'text-slate/50'
                  }`}>{group.title}</h3>
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      {item.hasSubmenu ? (
                        <div>
                          <button
                            onClick={() => isSidebarOpen ? toggleSection(item.name.toLowerCase()) : toggleSidebar()}
                            className={`${baseLinkClasses} ${inactiveLinkClasses} w-full ${
                              !isSidebarOpen ? 'justify-center' : 'justify-between'
                            }`}
                            title={!isSidebarOpen ? item.name : undefined}
                          >
                            <div className="flex items-center">
                              <item.icon className="w-5 h-5" />
                              {isSidebarOpen && <span className="ml-3">{item.name}</span>}
                            </div>
                            {isSidebarOpen && (
                              expandedSections[item.name.toLowerCase()] ? 
                                <ChevronRight className="w-4 h-4 rotate-90" /> : 
                                <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          {isSidebarOpen && expandedSections[item.name.toLowerCase()] && item.submenu && (
                            <ul className="ml-6 mt-1 space-y-1">
                              {item.submenu.map((subItem) => (
                                <li key={subItem.name}>
                                  <NavLink
                                    to={subItem.path}
                                    onClick={() => {
                                      // Close sidebar on mobile after navigation
                                      if (window.innerWidth < 1024) {
                                        toggleSidebar();
                                      }
                                    }}
                                    className={({ isActive }) =>
                                      `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                                    }
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span className="ml-3 text-sm">{subItem.name}</span>
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <NavLink
                          to={item.path}
                          end={item.path === '/dashboard'}
                          onClick={() => {
                            // Close sidebar on mobile after navigation
                            if (window.innerWidth < 1024) {
                              toggleSidebar();
                            }
                          }}
                          className={({ isActive }) => {
                            return `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses} ${
                              !isSidebarOpen ? 'justify-center' : ''
                            }`
                          }}
                          title={!isSidebarOpen ? item.name : undefined}
                        >
                          <item.icon className="w-5 h-5" />
                          {isSidebarOpen && <span className="ml-3">{item.name}</span>}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Expand button when sidebar is collapsed - only on desktop */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className={`fixed top-4 left-4 z-50 p-2 border rounded-lg transition-all hidden lg:block ${
            isLight
              ? 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm hover:shadow'
              : 'bg-light-navy border-border hover:bg-lightest-navy/10'
          }`}
          title="Expand sidebar"
        >
          <ChevronRight className={`h-4 w-4 ${isLight ? 'text-slate-600' : 'text-slate'}`} />
        </button>
      )}
    </>
  );
};

export default Sidebar;