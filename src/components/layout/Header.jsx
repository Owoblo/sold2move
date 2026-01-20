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

  const activeLinkClass = "text-primary";
  const inactiveLinkClass = "text-muted-foreground hover:text-primary transition-colors duration-300";

  return (
    <motion.header
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/80 shadow-lg backdrop-blur-md border-b border-border/40' : 'bg-background border-b border-transparent'}`}
    >
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="p-2 bg-secondary/50 rounded-lg group-hover:bg-secondary transition-colors">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors font-heading tracking-tight">
            Sold2Move
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} font-medium text-sm tracking-wide`}
            >
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {session ? (
            <>
              <span className="text-muted-foreground text-sm">Welcome, {session.user.user_metadata?.full_name || session.user.email}!</span>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold px-6">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md p-1"
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
          className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl shadow-2xl border-b border-border"
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col items-center space-y-4 p-8">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} text-lg font-medium`}
              >
                {item.name}
              </NavLink>
            ))}
            <div className="flex flex-col space-y-4 w-full pt-4 border-t border-border mt-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary w-full justify-center">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="ml-2">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              {session ? (
                <>
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 w-full shadow-lg shadow-primary/20">
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button onClick={handleLogout} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/50 w-full">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary w-full border border-transparent hover:border-border">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 w-full shadow-lg shadow-primary/20">
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