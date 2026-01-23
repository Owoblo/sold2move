import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (item) => {
    toast({
      title: "🚧 Navigation Feature",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      duration: 3000,
    });
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative z-50 px-6 py-4"
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center"
        >
          <Link to="/">
            <img
              src="/images/logos/logo-green-on-light.jpg"
              alt="Sold2Move"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-slate hover:text-teal transition-colors duration-300 font-medium">Home</Link>
          <Link to="/how-it-works" className="text-slate hover:text-teal transition-colors duration-300 font-medium">How It Works</Link>
          <Link to="/pricing" className="text-slate hover:text-teal transition-colors duration-300 font-medium">Pricing</Link>
          <Link to="/sample-mailers" className="text-slate hover:text-teal transition-colors duration-300 font-medium">Sample Mailers</Link>
          <Link to="/faq" className="text-slate hover:text-teal transition-colors duration-300 font-medium">FAQ</Link>
          <Link to="/contact" className="text-slate hover:text-teal transition-colors duration-300 font-medium">Contact</Link>
        </div>

        <div className="hidden md:block">
          <Button
            asChild
            className="bg-gradient-to-r from-navy-accent to-teal hover:from-navy-accent/90 hover:to-teal/90 text-white px-6 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden mt-4 bg-white/10 backdrop-blur-lg rounded-xl p-6"
        >
          <div className="flex flex-col space-y-4">
            <Link to="/" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">Home</Link>
            <Link to="/how-it-works" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">How It Works</Link>
            <Link to="/pricing" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">Pricing</Link>
            <Link to="/sample-mailers" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">Sample Mailers</Link>
            <Link to="/faq" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">FAQ</Link>
            <Link to="/contact" className="text-left text-slate hover:text-teal transition-colors duration-300 font-medium py-2">Contact</Link>
            <Button
              asChild
              className="bg-gradient-to-r from-navy-accent to-teal hover:from-navy-accent/90 hover:to-teal/90 text-white px-6 py-2 rounded-full font-semibold mt-4"
            >
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;