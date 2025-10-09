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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);
  
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

  const activeLinkClass = "text-teal";
  const inactiveLinkClass = "text-lightest-slate hover:text-teal transition-colors duration-300";

  return (
    <motion.header
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-light-navy/80 shadow-lg backdrop-blur-sm' : 'bg-deep-navy'}`}
    >
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="p-2 bg-light-navy rounded-md group-hover:bg-lightest-navy transition-colors">
            <Home className="h-6 w-6 text-teal" />
          </div>
          <span className="text-xl font-bold text-lightest-slate group-hover:text-teal transition-colors font-heading">
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
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-lightest-slate hover:text-teal">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {session ? (
            <>
              <span className="text-light-slate">Welcome, {session.user.user_metadata?.full_name || session.user.email}!</span>
              <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-teal text-teal hover:bg-teal/10 hover:text-teal">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-lightest-slate hover:text-teal">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="text-teal focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:ring-offset-deep-navy rounded-md p-1"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-light-navy shadow-xl"
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
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
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-lightest-slate hover:text-teal w-full">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="ml-2">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              {session ? (
                 <>
                  <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90 w-full">
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button onClick={handleLogout} variant="outline" className="border-teal text-teal hover:bg-teal/10 hover:text-teal w-full">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="border-teal text-teal hover:bg-teal/10 hover:text-teal w-full">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-teal text-deep-navy hover:bg-teal/90 w-full">
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