import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingCart, MessageSquare, CreditCard, Archive, Package, List, Mail, BarChart2, Book, Image, Video, Settings } from 'lucide-react';

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', icon: Home, path: '/dashboard' },
        { name: 'Listings', icon: List, path: '/dashboard/listings' },
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
  const activeLinkClasses = "bg-green/10 text-green font-semibold";

  return (
    <>
      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-light-navy border-r border-border transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 px-2">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-deep-navy rounded-md">
                <Home className="h-6 w-6 text-green" />
              </div>
              <span className="text-xl font-bold text-lightest-slate font-heading">Sold2Move</span>
            </Link>
          </div>
          <ul className="space-y-4">
            {menuItems.map((group) => (
              <li key={group.title}>
                <h3 className="px-2 mb-2 text-xs font-semibold tracking-wider text-slate/50 uppercase">{group.title}</h3>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={() => isSidebarOpen && toggleSidebar()}
                        className={({ isActive }) => {
                          const isListingsActive = item.name === 'Listings' && location.pathname.startsWith('/dashboard/listings');
                          return `${baseLinkClasses} ${isActive || isListingsActive ? activeLinkClasses : inactiveLinkClasses}`
                        }}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleSidebar}></div>}
    </>
  );
};

export default Sidebar;