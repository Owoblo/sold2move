import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion } from 'framer-motion';
import { InlineWidget } from 'react-calendly';
import { Calendar, Clock, Zap } from 'lucide-react';

const RequestDemoPage = () => {
  const benefits = [
    {
      icon: <Zap className="h-6 w-6 text-green" />,
      title: 'Personalized Walkthrough',
      description: 'See how Sold2Move can be tailored to your specific business needs and goals.',
    },
    {
      icon: <Calendar className="h-6 w-6 text-green" />,
      title: 'Live Q&A Session',
      description: 'Get all your questions answered in real-time by one of our product experts.',
    },
    {
      icon: <Clock className="h-6 w-6 text-green" />,
      title: 'Quick & Easy',
      description: 'The demo takes just 30 minutes and is packed with actionable insights.',
    },
  ];

  return (
    <PageWrapper
      title="Request a Demo"
      description="Schedule a live demo with one of our experts to see how Sold2Move can help you generate more leads and grow your moving business."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading"
          >
            Schedule Your Live Demo
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-slate mt-4 max-w-3xl mx-auto"
          >
            Pick a time that works for you. In just 30 minutes, we'll show you how to unlock a steady stream of high-quality moving leads.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="space-y-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-green/10 p-3 rounded-full">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-lightest-slate mb-1">{benefit.title}</h3>
                    <p className="text-slate">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-light-navy p-2 rounded-lg border border-lightest-navy/20 shadow-2xl"
          >
            <InlineWidget 
              url="https://calendly.com/d/cn3q-5s2-p5s/sold2move-demo-call"
              styles={{
                height: '650px',
                borderRadius: '0.5rem',
              }}
              pageSettings={{
                backgroundColor: '1a202c',
                hideEventTypeDetails: false,
                hideLandingPageDetails: false,
                primaryColor: '4ade80',
                textColor: 'e2e8f0',
              }}
            />
            <p className="text-xs text-center text-slate mt-2">
              Note: Please replace the Calendly URL with your own scheduling link.
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default RequestDemoPage;