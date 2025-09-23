import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Rocket, Star } from 'lucide-react';
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
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-full px-6 py-3 mb-8">
            <Sparkles className="h-5 w-5 text-green-400" />
            <span className="text-green-300 font-medium">Trusted by 5,000+ Moving Companies</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl lg:text-7xl font-bold mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent">
            Get New Moving Leads Daily
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl lg:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Reach homeowners *before* your competition. Real-time sold listing data + automated direct mail.
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
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-green-500/25 transition-all duration-300 group"
          >
            <Link to="/signup">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-green-400/50 text-green-300 hover:bg-green-500/10 px-8 py-4 rounded-full font-semibold text-lg backdrop-blur-sm"
          >
            <Link to="/request-demo">Request Demo</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="relative"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-green-500/20 rounded-3xl p-8 shadow-2xl">
              <img  
                className="w-full h-64 lg:h-96 object-cover rounded-2xl shadow-2xl" 
                alt="Dashboard showing real-time listing data and mailer designs"
                src="https://images.unsplash.com/photo-1556740738-b6a63e62c1d5?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
              
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-3 shadow-lg">
                <Rocket className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;