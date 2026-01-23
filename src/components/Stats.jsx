import React from 'react';
import { motion } from 'framer-motion';
import { Home, MapPin, Users, Truck, TrendingUp, BarChart3 } from 'lucide-react';

const Stats = () => {
  const stats = [
    {
      icon: Home,
      number: "10M+",
      label: "Listings Processed",
      description: "Properties tracked across North America",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: MapPin,
      number: "500+",
      label: "Cities Covered",
      description: "Markets in Canada & USA",
      gradient: "from-teal-500 to-emerald-500"
    },
    {
      icon: Users,
      number: "500+",
      label: "Moving Companies",
      description: "Trust Sold2Move daily",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      number: "3x",
      label: "Average ROI",
      description: "Within the first 30 days",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-brand-primary/5 to-background" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-6">
            <BarChart3 className="h-4 w-4 text-brand-primary" />
            <span className="text-brand-primary font-medium text-sm">By The Numbers</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">The Platform </span>
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              Movers Trust
            </span>
          </h2>
          <p className="text-lg text-slate max-w-2xl mx-auto">
            Delivering verified, real-time data to help moving companies grow their business.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center group"
            >
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 h-full hover:border-brand-primary/30 transition-all duration-300 group-hover:-translate-y-2">
                {/* Icon */}
                <div className={`inline-flex p-3 md:p-4 rounded-xl bg-gradient-to-r ${stat.gradient} mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>

                {/* Number */}
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-brand-primary bg-clip-text text-transparent">
                  {stat.number}
                </div>

                {/* Label */}
                <p className="text-white font-semibold mb-1">
                  {stat.label}
                </p>

                {/* Description */}
                <p className="text-sm text-slate hidden md:block">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;