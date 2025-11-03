import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Twitter, Linkedin, Github } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Footer = () => {
  const handleSocialClick = (platform) => {
    toast({
      title: `Navigating to ${platform}`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const quickLinks = [
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'FAQ', path: '/faq' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms of Service', path: '/terms' },
  ];

  const socialLinks = [
    { icon: Twitter, name: 'Twitter' },
    { icon: Linkedin, name: 'LinkedIn' },
    { icon: Github, name: 'GitHub' },
  ];

  return (
    <footer className="bg-light-navy text-slate">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-lightest-navy rounded-md">
                <Home className="h-6 w-6 text-teal" />
              </div>
              <span className="text-xl font-bold text-lightest-slate font-heading">Sold2Move</span>
            </Link>
            <p className="text-sm">Real-time sold listing leads for moving companies.</p>
          </div>

          <div>
            <p className="font-semibold text-lightest-slate mb-4 font-heading">Quick Links</p>
            <ul className="space-y-2 text-sm sm:text-base">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="hover:text-teal transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-lightest-slate mb-4 font-heading">Legal</p>
            <ul className="space-y-2 text-sm sm:text-base">
              {legalLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="hover:text-teal transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-lightest-slate mb-4 font-heading">Follow Us</p>
            <div className="flex space-x-4">
              {socialLinks.map(social => (
                <button key={social.name} onClick={() => handleSocialClick(social.name)} className="hover:text-teal transition-colors">
                  <social.icon size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-lightest-navy/20 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Sold2Move. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;