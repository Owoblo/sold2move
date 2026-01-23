import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Globe, Home, Mail, Search, Sparkles, CheckCircle2 } from 'lucide-react';

const UniqueFeatures = () => {
  const features = [
    {
      icon: Brain,
      title: "AI Furniture Detection",
      description: "Our AI scans listing photos to identify furniture, helping you estimate move size and value before reaching out.",
      highlights: ["Automatic inventory estimation", "Identify high-value moves", "Better quote preparation"],
      badge: "Exclusive Feature",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Globe,
      title: "Canada + USA Coverage",
      description: "The only platform with verified cross-border listings. Access exclusive Canadian data your competitors can't reach.",
      highlights: ["All major Canadian markets", "Complete USA coverage", "Cross-border opportunities"],
      badge: "North America",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Home,
      title: "Active, Listed & Sold",
      description: "Track properties through their entire lifecycle. Get leads at every stage from listing to sale.",
      highlights: ["Active listings alert", "Just listed notifications", "Sold property leads"],
      badge: "Full Pipeline",
      gradient: "from-teal-500 to-emerald-500"
    },
    {
      icon: Search,
      title: "Homeowner Lookup",
      description: "Get homeowner contact information instantly. Skip the middlemen and reach decision-makers directly.",
      highlights: ["Verified contact info", "Property owner data", "Direct outreach ready"],
      badge: "Direct Access",
      gradient: "from-orange-500 to-amber-500"
    },
    {
      icon: Mail,
      title: "Direct Mail Integration",
      description: "Design and send professional postcards directly from the platform. No printing, no stamps, no hassle.",
      highlights: ["Custom mailer templates", "One-click campaigns", "Track delivery & response"],
      badge: "Built-In",
      gradient: "from-rose-500 to-red-500"
    },
    {
      icon: Sparkles,
      title: "Smart Filters",
      description: "Filter leads by price range, location, property type, and more to find your ideal customers.",
      highlights: ["Price range filters", "Neighborhood targeting", "Property type selection"],
      badge: "Precision",
      gradient: "from-indigo-500 to-violet-500"
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-secondary/20 to-background">
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
            <Sparkles className="h-4 w-4 text-brand-primary" />
            <span className="text-brand-primary font-medium text-sm">Why Moving Companies Choose Us</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-white">Features That </span>
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              Set Us Apart
            </span>
          </h2>
          <p className="text-lg text-slate max-w-2xl mx-auto">
            We built Sold2Move specifically for moving companies. Every feature is designed to help you win more jobs.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full hover:border-brand-primary/30 transition-all duration-300 group-hover:-translate-y-2">
                {/* Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${feature.gradient} text-white`}>
                    {feature.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${feature.gradient} mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Highlights */}
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-center gap-2 text-sm text-light-slate">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UniqueFeatures;
