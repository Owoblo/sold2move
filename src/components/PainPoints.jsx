import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, XCircle, Clock, DollarSign, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PainPoints = () => {
  const painPoints = [
    {
      icon: Clock,
      problem: "Wasting Time",
      description: "Chasing cold leads and outdated data that never convert"
    },
    {
      icon: DollarSign,
      problem: "Losing Money",
      description: "High acquisition costs with low ROI on marketing spend"
    },
    {
      icon: Users,
      problem: "Missing Leads",
      description: "Competitors are getting to homeowners before you do"
    }
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-background to-background" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Main Question */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 mb-6">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 font-medium text-sm">Sound Familiar?</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-red-400">Struggling</span>
            <span className="text-white"> to Find Quality Leads?</span>
          </h2>

          <p className="text-lg text-slate max-w-2xl mx-auto">
            Most moving companies face these exact challenges. You're not alone.
          </p>
        </motion.div>

        {/* Pain Points Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {painPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-red-950/30 to-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 h-full text-center hover:border-red-500/40 transition-all duration-300">
                <div className="inline-flex p-4 rounded-full bg-red-500/10 mb-5">
                  <point.icon className="h-8 w-8 text-red-400" />
                </div>

                <h3 className="text-2xl font-bold text-red-400 mb-3">
                  {point.problem}
                </h3>

                <p className="text-slate">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Solution Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-brand-primary/10 border border-brand-primary/20 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              There's a <span className="text-brand-primary">Better Way</span>
            </h3>
            <p className="text-slate mb-6 text-lg">
              What if you could get <span className="text-brand-primary font-semibold">pre-qualified leads</span> from homeowners who just sold their home and <span className="text-brand-primary font-semibold">need to move</span>?
            </p>
            <Button
              asChild
              className="bg-brand-gradient hover:brightness-110 text-white px-8 py-6 rounded-full font-semibold text-lg shadow-xl hover:shadow-glow-lg transition-all group"
            >
              <Link to="/signup">
                See How It Works
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PainPoints;
