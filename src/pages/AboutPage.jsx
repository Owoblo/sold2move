import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion } from 'framer-motion';
import { Users, Target, Rocket } from 'lucide-react';

const AboutPage = () => {
  return (
    <PageWrapper
      title="About Us"
      description="Learn about Sold2Move's mission to empower moving companies with the best real-time data and marketing tools to fuel their growth."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-lightest-slate font-heading"
          >
            Connecting Movers with Movers
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate mt-4 max-w-3xl mx-auto"
          >
            We're a team of data scientists, engineers, and marketing experts passionate about helping local businesses thrive.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img 
              className="rounded-lg shadow-lg"
              alt="Team of professionals collaborating in a modern office"
             src="https://images.unsplash.com/photo-1637622124152-33adfabcc923" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-lightest-slate mb-4 font-heading">Our Mission</h2>
            <p className="text-slate mb-4">
              Our mission is simple: to give moving companies a competitive edge. The moving industry is tough, and timing is everything. We saw that small and medium-sized movers were struggling to compete with large corporations that had access to expensive data.
            </p>
            <p className="text-slate">
              Sold2Move was created to level the playing field. By providing affordable, real-time access to sold property data, we empower local moving companies to be the first to reach new homeowners, turning a stressful time for them into a business opportunity for you.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-light-navy p-8 rounded-lg"
          >
            <Rocket className="h-12 w-12 text-green mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-lightest-slate mb-2 font-heading">Innovation</h3>
            <p className="text-slate">We constantly refine our technology to deliver the fastest, most accurate data in the industry.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-light-navy p-8 rounded-lg"
          >
            <Users className="h-12 w-12 text-green mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-lightest-slate mb-2 font-heading">Customer Focus</h3>
            <p className="text-slate">Your success is our success. We're dedicated to providing tools and support that drive real results.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-light-navy p-8 rounded-lg"
          >
            <Target className="h-12 w-12 text-green mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-lightest-slate mb-2 font-heading">Integrity</h3>
            <p className="text-slate">We believe in transparent pricing and honest practices. No hidden fees, no long-term contracts.</p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AboutPage;