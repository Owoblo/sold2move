import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Cpu, Globe, Palette, BarChart3 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "Real-time Data",
      description: "Access fresh, verified sold listing data as it happens, giving you an unbeatable head start.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Shield,
      title: "Automated Mailings",
      description: "Effortlessly send personalized direct mail campaigns to new homeowners with just a few clicks.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Cpu,
      title: "Smart Filtering",
      description: "Target high-value homes, specific neighborhoods, or properties with unique characteristics using AI-powered filters.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Globe,
      title: "Nationwide Coverage",
      description: "Expand your reach across the US & Canada with comprehensive data from all major markets.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Palette,
      title: "Customizable Templates",
      description: "Design stunning, branded mailers with our easy-to-use templates or upload your own designs.",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      description: "Monitor your campaign's effectiveness with detailed analytics and optimize for maximum ROI.",
      gradient: "from-green-400 to-emerald-500"
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
              How Sold2Move Works
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our platform simplifies lead generation and direct mail, so you can focus on growing your moving business.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-8 h-full shadow-xl hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-green-300 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;