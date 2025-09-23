import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Twitter, Github, Linkedin, Mail } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const Footer = () => {
  const handleLinkClick = (item) => {
    toast({
      title: `🚀 ${item}`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      duration: 3000,
    });
  };

  const footerLinks = {
    Product: [
      { name: 'Features', path: '/how-it-works' },
      { name: 'Pricing', path: '/pricing' },
      { name: 'Demo', path: '/demo-dashboard' },
      { name: 'FAQ', path: '/faq' }
    ],
    Company: [
      { name: 'About Us', path: '/about' },
      { name: 'Contact', path: '/contact' }
    ],
    Resources: [
      { name: 'Sample Mailers', path: '/dashboard/sample-mailers' },
      { name: 'Video Tutorials', path: '/dashboard/tutorials' }
    ],
    Legal: [
      { name: 'Privacy Policy', path: '/privacy-policy' },
      { name: 'Terms of Service', path: '/terms' }
    ]
  };

  const socialLinks = [
    { icon: Twitter, name: 'Twitter' },
    { icon: Github, name: 'GitHub' },
    { icon: Linkedin, name: 'LinkedIn' },
    { icon: Mail, name: 'Email' }
  ];

  return (
    <footer className="px-6 py-20 border-t border-purple-500/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Sold2Move
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Empowering moving companies with real-time leads and automated direct mail to grow their business.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social) => (
                  <motion.button
                    key={social.name}
                    onClick={() => handleLinkClick(social.name)}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-xl hover:border-purple-400/40 transition-all duration-300 group"
                  >
                    <social.icon className="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-300" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
            >
              <span className="text-lg font-semibold text-white mb-4 block">
                {category}
              </span>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-gray-400 hover:text-purple-400 transition-colors duration-300 text-left"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-purple-500/20 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
        >
          <p className="text-gray-400 text-center md:text-left">
            © {new Date().getFullYear()} Sold2Move. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link
              to="/privacy-policy"
              className="text-gray-400 hover:text-purple-400 transition-colors duration-300"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-gray-400 hover:text-purple-400 transition-colors duration-300"
            >
              Terms of Service
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;