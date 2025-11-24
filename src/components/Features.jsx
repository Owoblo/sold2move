import React from 'react';
import { motion } from 'framer-motion';
import { Target, Shield, Cpu, Globe, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Features = () => {
  const features = [
    {
      icon: Target,
      title: "Exclusive Canadian Data",
      description: "The only platform with verified cross-border listings. Access the entire North American market your competitors can't reach.",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: Shield,
      title: "99% Data Accuracy",
      description: "Guaranteed verified, timely, and geo-targeted listings. No more cold calling - get warm leads delivered daily.",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: Cpu,
      title: "Predictable Revenue",
      description: "Optimized operations with AI-powered filters targeting high-value homes and specific neighborhoods for maximum ROI.",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: Globe,
      title: "Dominant Regional Footprint",
      description: "Expand your reach across the entire North American moving market with comprehensive data from all major markets.",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: TrendingUp,
      title: "Competitive Advantage",
      description: "See your ROI in 30 days. Get the exclusive data that drives your fleet and lands you the business.",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      description: "Monitor your campaign's effectiveness with detailed analytics and optimize for guaranteed growth.",
      gradient: "from-teal to-navy-accent"
    }
  ];

  const handleFeatureClick = (title) => {
    toast({
      title: `🚀 ${title}`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      duration: 3000,
    });
  };

  return (
    <section className="px-4 sm:px-6 py-16 md:py-20 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-teal to-navy-accent bg-clip-text text-transparent">
              We Find the Moves. You Land the Business.
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate max-w-2xl sm:max-w-3xl mx-auto">
            The exclusive, indispensable source of qualified leads and growth in a highly competitive industry.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, scale: 1.02 }}
              onClick={() => handleFeatureClick(feature.title)}
              className="group cursor-pointer"
            >
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-teal/20 rounded-2xl p-6 sm:p-8 h-full shadow-xl hover:shadow-2xl hover:shadow-teal/10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-navy-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className={`inline-flex p-3 sm:p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-5 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white group-hover:text-teal transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-sm sm:text-base text-slate leading-relaxed group-hover:text-light-slate transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-teal/10 to-navy-accent/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;