import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CallToAction = ({ text, link, ctaText }) => {
  return (
    <motion.div
      className='text-center'
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <p className='text-xl text-lightest-slate max-w-2xl mx-auto mb-8'>
        {text}
      </p>
      <Button asChild size="lg" className="bg-gradient-to-r from-navy-accent to-teal text-white hover:from-navy-accent/90 hover:to-teal/90">
        <Link to={link}>
          {ctaText} <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </motion.div>
  );
};

export default CallToAction;