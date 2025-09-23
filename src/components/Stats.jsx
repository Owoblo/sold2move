import React from 'react';
import { motion } from 'framer-motion';
import { Users, Award, Zap, Globe } from 'lucide-react';

const Stats = () => {
  const stats = [
    {
      icon: Users,
      number: "50K+",
      label: "Homeowners Reached",
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      icon: Award,
      number: "99%",
      label: "Data Accuracy",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Zap,
      number: "24/7",
      label: "Real-time Updates",
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Globe,
      number: "50+",
      label: "States Covered",
      gradient: "from-green-400 to-teal-500"
    }
  ];

  return (
    <section className="px-6 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Why Movers Trust Sold2Move
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We provide the most accurate and timely data to help you connect with new customers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1, delay: index * 0.2 + 0.5 }}
                    viewport={{ once: true }}
                    className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent"
                  >
                    {stat.number}
                  </motion.div>
                  
                  <p className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors duration-300">
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