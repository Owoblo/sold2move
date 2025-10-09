import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingCart, MessageSquare, CreditCard, Archive, Package, List, Mail, BarChart2, Book, Image, Video, Settings, ChevronLeft, ChevronRight, Building, TrendingUp } from 'lucide-react';

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
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
            { name: 'Sold', icon: TrendingUp, path: '/dashboard/listings/sold' },
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
        { name: 'Mailing', icon: Mail, path: '/dashboard/mailing' },
        { name: 'Digital Marketing', icon: BarChart2, path: '/dashboard/digital-marketing' },
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

  const baseLinkClasses = "flex items-center p-2 rounded-md transition-colors duration-200";
  const inactiveLinkClasses = "text-slate hover:bg-lightest-navy/10 hover:text-lightest-slate";
  const activeLinkClasses = "bg-teal/10 text-teal font-semibold";

  return (
    <>
      <aside className={`fixed top-0 left-0 z-40 h-screen bg-light-navy border-r border-border transition-all duration-300 ${
        isSidebarOpen 
          ? 'w-64 translate-x-0' 
          : 'w-16 -translate-x-0 md:translate-x-0'
      }`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 px-2">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-deep-navy rounded-md">
                <Home className="h-6 w-6 text-teal" />
              </div>
              {isSidebarOpen && (
                <span className="text-xl font-bold text-lightest-slate font-heading">Sold2Move</span>
              )}
            </Link>
            {isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-md hover:bg-lightest-navy/10 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-slate" />
              </button>
            )}
          </div>
          <ul className="space-y-4">
            {menuItems.map((group) => (
              <li key={group.title}>
                {isSidebarOpen && (
                  <h3 className="px-2 mb-2 text-xs font-semibold tracking-wider text-slate/50 uppercase">{group.title}</h3>
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
                          onClick={() => isSidebarOpen && toggleSidebar()}
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
      
      {/* Expand button when sidebar is collapsed */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-light-navy border border-border rounded-md hover:bg-lightest-navy/10 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4 text-slate" />
        </button>
      )}
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleSidebar}></div>}
    </>
  );
};

export default Sidebar;