import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative px-6 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal/20 to-navy-accent/20 backdrop-blur-sm border border-teal/30 rounded-full px-6 py-3 mb-8">
            <Shield className="h-5 w-5 text-teal" />
            <span className="text-teal font-medium">The Only Moving Data You Can't Afford to Compete Without</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl lg:text-7xl font-bold mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
            Real-Time Sold Listings for Movers in Canada & the U.S.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl lg:text-2xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Guaranteed growth and competitive advantage. Verified, timely, and geo-targeted listings opening up the entire North American moving market, including inaccessible Canadian data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-navy-accent to-teal hover:from-navy-accent/90 hover:to-teal/90 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-teal/25 transition-all duration-300 group"
          >
            <Link to="/signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-teal/50 text-teal hover:bg-teal/10 px-8 py-4 rounded-full font-semibold text-lg backdrop-blur-sm"
          >
            <Link to="/request-demo">See Your ROI in 30 Days</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="relative"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-to-r from-teal/20 to-navy-accent/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-teal/20 rounded-3xl p-8 shadow-2xl">
              <div className="w-full h-64 lg:h-96 bg-gradient-to-br from-deep-navy to-light-navy rounded-2xl shadow-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Target className="h-16 w-16 text-teal" />
                    <TrendingUp className="h-12 w-12 text-navy-accent ml-4" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Real-Time Data Dashboard</h3>
                  <p className="text-slate">Verified listings • Geo-targeted • 99% accuracy</p>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-navy-accent to-teal rounded-full p-3 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;