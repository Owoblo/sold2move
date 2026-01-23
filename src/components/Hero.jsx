import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Sparkles, CheckCircle2, Truck, MapPin, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  const highlights = [
    { icon: Brain, text: "AI Furniture Detection" },
    { icon: MapPin, text: "Canada + USA Coverage" },
    { icon: Truck, text: "Mover-Ready Leads" },
  ];

  return (
    <section className="relative px-6 py-16 lg:py-24 overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="inline-flex items-center space-x-2 bg-brand-gradient-subtle backdrop-blur-sm border border-brand-primary/30 rounded-full px-5 py-2.5">
              <Sparkles className="h-4 w-4 text-brand-primary" />
              <span className="text-brand-primary font-medium text-sm">AI-Powered Moving Leads Platform</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Turn </span>
            <span className="bg-gradient-to-r from-brand-primary via-teal-400 to-brand-secondary bg-clip-text text-transparent">
              Sold Listings
            </span>
            <span className="text-white"> Into</span>
            <br />
            <span className="bg-gradient-to-r from-brand-secondary via-brand-primary to-teal-400 bg-clip-text text-transparent">
              Profitable Moves
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-slate max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            The <span className="text-brand-primary font-semibold">only platform</span> with AI-powered furniture detection and exclusive Canadian data.
            Get real-time sold listings, homeowner info, and move-ready leads delivered daily.
          </motion.p>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {highlights.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2"
              >
                <item.icon className="h-4 w-4 text-brand-primary" />
                <span className="text-sm text-light-slate font-medium">{item.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
          >
            <Button
              asChild
              size="lg"
              className="bg-brand-gradient hover:brightness-110 text-white px-8 py-6 rounded-full font-semibold text-lg shadow-xl hover:shadow-glow-lg transition-all duration-300 group min-w-[220px]"
            >
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10 px-8 py-6 rounded-full font-semibold text-lg backdrop-blur-sm transition-all min-w-[220px]"
            >
              <Link to="/request-demo">Book a Demo</Link>
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Real-time data updates</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;