import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { Menu, X, Home, LogOut, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile.jsx';
import { supabase } from '@/lib/customSupabaseClient';
import { useTheme } from '@/contexts/ThemeContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useProfile();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'FAQ', path: '/faq' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const activeLinkClass = "text-green";
  const inactiveLinkClass = "text-lightest-slate hover:text-green transition-colors duration-300";

  return (
    <motion.header
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-light-navy/80 shadow-lg backdrop-blur-sm' : 'bg-deep-navy'}`}
    >
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="p-2 bg-light-navy rounded-md group-hover:bg-lightest-navy transition-colors">
            <Home className="h-6 w-6 text-green" />
          </div>
          <span className="text-xl font-bold text-lightest-slate group-hover:text-green transition-colors font-heading">
            Sold2Move
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} font-medium`}
            >
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-lightest-slate hover:text-green">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {session ? (
            <>
              <span className="text-light-slate">Welcome, {session.user.user_metadata?.full_name || session.user.email}!</span>
              <Button asChild className="bg-green text-deep-navy hover:bg-green/90">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-lightest-slate hover:text-green">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="bg-green text-deep-navy hover:bg-green/90">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-green">
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-light-navy shadow-xl"
        >
          <div className="flex flex-col items-center space-y-4 p-8">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} text-lg`}
              >
                {item.name}
              </NavLink>
            ))}
            <div className="flex flex-col space-y-4 w-full pt-4 border-t border-lightest-navy/20 mt-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-lightest-slate hover:text-green w-full">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="ml-2">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              {session ? (
                 <>
                  <Button asChild className="bg-green text-deep-navy hover:bg-green/90 w-full">
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button onClick={handleLogout} variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green w-full">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green w-full">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-green text-deep-navy hover:bg-green/90 w-full">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;