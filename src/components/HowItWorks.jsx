import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Filter, Send, TrendingUp } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: MapPin,
      title: "Select Your Areas",
      description: "Choose your service areas across Canada and the USA. Our platform covers every major market.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: "02",
      icon: Filter,
      title: "Set Your Filters",
      description: "Filter by price range, property type, and more. Our AI detects furniture to identify high-value moves.",
      color: "from-teal-500 to-emerald-500"
    },
    {
      number: "03",
      icon: Send,
      title: "Get Daily Leads",
      description: "Receive fresh sold listings with homeowner contact info. Send direct mail or reach out directly.",
      color: "from-purple-500 to-pink-500"
    },
    {
      number: "04",
      icon: TrendingUp,
      title: "Win More Jobs",
      description: "Convert warm leads into booked moves. Track your ROI and scale your business.",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-6">
            <span className="text-brand-primary font-medium text-sm">Simple 4-Step Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">How </span>
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              Sold2Move
            </span>
            <span className="text-white"> Works</span>
          </h2>
          <p className="text-lg text-slate max-w-2xl mx-auto">
            Start getting mover-ready leads in minutes. No complicated setup required.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="relative group"
            >
              {/* Connector Line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-brand-primary/50 to-transparent z-0" />
              )}

              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full hover:border-brand-primary/30 transition-all duration-300 group-hover:-translate-y-2 z-10">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${step.color} mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="h-7 w-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-slate text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
