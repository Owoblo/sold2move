import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Target, Mail, BarChart, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Features from '@/components/Features';
import CallToAction from '@/components/CallToAction';

const HomePage = () => {
  // Debug logging for mobile issues
  console.log('🏠 HomePage: Component rendering', {
    userAgent: navigator.userAgent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });

  const problems = [
    {
      icon: <XCircle className="h-8 w-8 text-teal" />,
      title: 'Low-Quality Leads',
      description: 'Moving companies struggle with unreliable data sources and high customer acquisition costs.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-teal" />,
      title: 'Missing Canadian Market',
      description: 'You\'re missing out on the entire Canadian market - inaccessible data your competitors can\'t reach.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-teal" />,
      title: 'No Competitive Advantage',
      description: 'Without exclusive, verified data, you can\'t predict revenue or optimize operations effectively.',
    },
  ];

  const testimonials = [
    {
      quote: "Sold2Move is the only platform with verified cross-border listings. We're dominating the North American market.",
      author: 'John Doe, CEO of MoveItNow',
      avatar: 'JD',
    },
    {
      quote: '99% data accuracy and guaranteed growth. Our ROI increased 300% in the first 30 days.',
      author: 'Jane Smith, Marketing Director at Swift Movers',
      avatar: 'JS',
    },
    {
      quote: 'The exclusive Canadian data gives us the competitive advantage we needed. Predictable revenue, optimized operations.',
      author: 'Mike Johnson, Owner of Elite Relocations',
      avatar: 'MJ',
    },
  ];

  return (
    <PageWrapper
      title="Real-Time Sold Listings & Leads for Moving Companies in Canada & USA"
      description="Get mover-ready sold listings and real-time leads in Ontario, Canada, and the U.S. Filter by price, location, and more. Perfect for moving companies."
    >
      {/* Debug: Simple test div for mobile */}
      <div className="bg-red-500 text-white p-4 text-center">
        <h1>Mobile Test - HomePage is rendering!</h1>
        <p>If you can see this, the component is working.</p>
      </div>
      
      {/* Hero Section */}
      <Hero />

      {/* Problem Section */}
      <section className="py-20 bg-light-navy">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">
              How Sold2Move Helps Ontario Moving Companies Win More Jobs
            </h2>
            <p className="text-lg text-slate mt-2 max-w-3xl mx-auto">
              Moving companies struggle with low-quality leads, high customer acquisition costs, and missing out on the entire Canadian market.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <Card className="h-full text-center bg-deep-navy border-teal/20 hover:border-teal/50 transition-colors duration-300 transform hover:-translate-y-2">
                  <CardHeader>
                    <div className="mx-auto bg-teal/10 p-4 rounded-full w-fit mb-4">{problem.icon}</div>
                    <CardTitle className="font-heading text-teal">{problem.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate">{problem.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section (formerly Benefits) */}
      <Features />

      {/* Testimonials Section */}
      <section className="py-20 bg-deep-navy">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">Trusted by Industry Leaders</h2>
            <p className="text-lg text-slate mt-2">See how Sold2Move delivers guaranteed growth and competitive advantage.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <Card className="h-full bg-light-navy">
                  <CardContent className="pt-6">
                    <p className="text-light-slate italic mb-4">"{testimonial.quote}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-teal/20 text-teal flex items-center justify-center font-bold text-lg mr-4 font-mono">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-lightest-slate">{testimonial.author}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section (Social Proof) */}
      <Stats />

      {/* FAQ Link Section */}
      <section className="py-20 bg-light-navy">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate mb-4 font-heading">
            Ready to Dominate Your Market?
          </h2>
          <p className="text-lg text-slate max-w-2xl mx-auto mb-8">
            Get the exclusive data that drives your fleet and lands you the business. See your ROI in 30 days.
          </p>
          <Button asChild size="lg" variant="outline" className="border-teal text-teal hover:bg-teal/10 hover:text-teal">
            <Link to="/faq">
              View All FAQs <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-deep-navy">
        <div className="container mx-auto px-6 text-center">
          <CallToAction
            text="Ready to get the exclusive North American moving data your competitors can't access?"
            link="/signup"
            ctaText="Start Your Free Trial"
          />
        </div>
      </section>
    </PageWrapper>
  );
};

export default HomePage;