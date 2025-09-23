import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion } from 'framer-motion';
import { MapPin, Filter, Database, Mail, BarChart } from 'lucide-react';

const HowItWorksPage = () => {
  const steps = [
    {
      icon: <MapPin className="h-10 w-10 text-green" />,
      title: 'Step 1: Define Your Territory',
      description: 'Select the cities, zip codes, or counties where you operate. Our platform covers the entire US and Canada.',
    },
    {
      icon: <Filter className="h-10 w-10 text-green" />,
      title: 'Step 2: Set Your Filters',
      description: 'Narrow down your leads by property type, sale price, and date of sale to find your ideal customers.',
    },
    {
      icon: <Database className="h-10 w-10 text-green" />,
      title: 'Step 3: Get Real-Time Leads',
      description: 'As soon as a home is sold in your territory, the lead appears in your dashboard. No more waiting for outdated lists.',
    },
    {
      icon: <Mail className="h-10 w-10 text-green" />,
      title: 'Step 4: Launch Direct Mail Campaigns',
      description: 'With one click, generate and send professionally designed postcards or letters to your new leads.',
    },
    {
      icon: <BarChart className="h-10 w-10 text-green" />,
      title: 'Step 5: Track and Optimize',
      description: 'Use our built-in analytics to monitor your campaign performance, track your ROI, and refine your strategy.',
    },
  ];

  return (
    <PageWrapper
      title="How It Works"
      description="Learn how Sold2Move provides real-time moving leads in 5 simple steps, from defining your territory to launching direct mail campaigns."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading">Simple, Powerful, Effective</h1>
          <p className="text-lg text-slate mt-4 max-w-3xl mx-auto">
            Follow these five easy steps to start connecting with new homeowners and growing your moving business.
          </p>
        </div>

        <div className="relative">
          {/* Dotted line for desktop */}
          <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-lightest-navy/30 border-l-2 border-dashed"></div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex md:items-center mb-12 md:mb-0"
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <div className={`flex md:w-1/2 ${index % 2 === 0 ? 'md:justify-end md:pr-8' : 'md:justify-start md:pl-8 md:order-2'}`}>
                <div className="bg-light-navy p-8 rounded-lg shadow-lg max-w-md">
                  <div className="flex items-center mb-4">
                    <div className="bg-lightest-navy p-3 rounded-full mr-4">{step.icon}</div>
                    <h2 className="text-2xl font-bold text-lightest-slate font-heading">{step.title}</h2>
                  </div>
                  <p className="text-slate">{step.description}</p>
                </div>
              </div>
              <div className="hidden md:flex w-1/2 items-center justify-center">
                <div className="w-6 h-6 bg-green rounded-full z-10"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
};

export default HowItWorksPage;