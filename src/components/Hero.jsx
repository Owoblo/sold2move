import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import VideoDemo from '@/components/VideoDemo';

const Hero = () => {
  return (
    <section className="relative px-4 sm:px-6 py-16 md:py-20 lg:py-32">
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
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 sm:mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
            Real-Time Sold Listings for Movers in Canada & the U.S.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg sm:text-xl lg:text-2xl text-slate mb-10 sm:mb-12 max-w-2xl sm:max-w-3xl mx-auto leading-relaxed"
        >
          Guaranteed growth and competitive advantage. Verified, timely, and geo-targeted listings opening up the entire North American moving market, including inaccessible Canadian data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16"
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-navy-accent to-teal hover:from-navy-accent/90 hover:to-teal/90 text-white px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg shadow-2xl hover:shadow-teal/25 transition-all duration-300 group w-full sm:w-auto"
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
            className="border-2 border-teal/50 text-teal hover:bg-teal/10 px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg backdrop-blur-sm w-full sm:w-auto"
          >
            <Link to="/request-demo">See Your ROI in 30 Days</Link>
          </Button>
        </motion.div>

        <VideoDemo 
          title="See Sold2Move in Action"
          description="Watch how our platform delivers real-time sold listings and leads for moving companies across North America"
          className="mt-8 sm:mt-12"
        />
      </div>
    </section>
  );
};

export default Hero;