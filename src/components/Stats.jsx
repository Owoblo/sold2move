import React from 'react';
import { motion } from 'framer-motion';
import { Target, Shield, TrendingUp, Globe } from 'lucide-react';

const Stats = () => {
  const stats = [
    {
      icon: Target,
      number: "100%",
      label: "Exclusive Canadian Data",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: Shield,
      number: "99%",
      label: "Data Accuracy Guaranteed",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: TrendingUp,
      number: "300%",
      label: "ROI in 30 Days",
      gradient: "from-teal to-navy-accent"
    },
    {
      icon: Globe,
      number: "2",
      label: "Countries Covered",
      gradient: "from-teal to-navy-accent"
    }
  ];

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
              The Only Moving Data You Can't Afford to Compete Without
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate max-w-2xl sm:max-w-3xl mx-auto">
            Guaranteed growth and competitive advantage with verified, timely, and geo-targeted listings.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="text-center group"
            >
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-teal/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:shadow-teal/10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-navy-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1, delay: index * 0.2 + 0.5 }}
                    viewport={{ once: true }}
                    className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-teal bg-clip-text text-transparent"
                  >
                    {stat.number}
                  </motion.div>
                  
                  <p className="text-slate font-medium group-hover:text-light-slate transition-colors duration-300">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;