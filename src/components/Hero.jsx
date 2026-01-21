import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import VideoDemo from '@/components/VideoDemo';

const Hero = () => {
  return (
    <section className="relative px-6 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="inline-flex items-center space-x-2 bg-brand-gradient-subtle backdrop-blur-sm border border-brand-primary/30 rounded-full px-6 py-3 mb-8">
            <Shield className="h-5 w-5 text-brand-primary" />
            <span className="text-brand-primary font-medium">The Only Moving Data You Can't Afford to Compete Without</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-display-xl lg:text-display-2xl mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-white via-brand-primary to-brand-secondary bg-clip-text text-transparent">
            Real-Time Sold Listings for Movers in Canada & the U.S.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-body-lg lg:text-heading-sm text-content-secondary mb-12 max-w-3xl mx-auto leading-relaxed font-normal"
        >
          Guaranteed growth and competitive advantage. Verified, timely, and geo-targeted listings opening up the entire North American moving market, including inaccessible Canadian data.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
        >
          <Button
            asChild
            size="lg"
            className="bg-brand-gradient hover:brightness-110 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-glow-lg transition-all duration-slow group"
          >
            <Link to="/signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-normal" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10 px-8 py-4 rounded-full font-semibold text-lg backdrop-blur-sm transition-all duration-normal"
          >
            <Link to="/request-demo">Book a Demo</Link>
          </Button>
        </motion.div>

        <VideoDemo
          title="See Sold2Move in Action"
          description="Watch how our platform delivers real-time sold listings and leads for moving companies across North America"
        />
      </div>
    </section>
  );
};

export default Hero;