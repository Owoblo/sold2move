import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Target, Mail, BarChart, XCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Features from '@/components/Features';
import CallToAction from '@/components/CallToAction';
import VideoDemo from '@/components/VideoDemo';

const HomePage = () => {
  const problems = [
    {
      icon: <XCircle className="h-8 w-8 text-primary" />,
      title: 'Low-Quality Leads',
      description: 'Moving companies struggle with reliable data sources and high customer acquisition costs.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-primary" />,
      title: 'Missing Canadian Market',
      description: 'You\'re missing out on the entire Canadian market - inaccessible data your competitors can\'t reach.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-primary" />,
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
      {/* Hero Section */}
      <Hero />

      {/* Problem Section */}
      <section className="py-20 bg-secondary/30 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              How Sold2Move Helps Ontario Moving Companies Win More Jobs
            </h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">
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
                <Card className="h-full text-center bg-card border-primary/20 hover:border-primary/50 transition-colors duration-300 transform hover:-translate-y-2 shadow-lg shadow-black/20">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">{problem.icon}</div>
                    <CardTitle className="font-heading text-primary">{problem.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{problem.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section (formerly Benefits) */}
      <Features />

      {/* Demo Video Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              See Sold2Move in Action
            </h2>
            <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">
              Watch how our platform delivers real-time sold listings and leads for moving companies across North America.
              Get a feel for the platform before you sign up.
            </p>
          </div>
          <VideoDemo
            title="Platform Demo"
            description="Experience the power of real-time sold listings data"
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">Trusted by Industry Leaders</h2>
            <p className="text-lg text-muted-foreground mt-2">See how Sold2Move delivers guaranteed growth and competitive advantage.</p>
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
                <Card className="h-full bg-secondary/50 border-border shadow-md">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg mr-4 font-mono">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.author}</p>
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
      <section className="py-20 bg-secondary/30 border-y border-border/50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-heading tracking-tight">
            Ready to Dominate Your Market?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Get the exclusive data that drives your fleet and lands you the business. See your ROI in 30 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-brand-gradient hover:brightness-110 text-white shadow-lg hover:shadow-glow-lg transition-all duration-300">
              <Link to="/request-demo">
                <Calendar className="mr-2 h-5 w-5" />
                Book a Demo
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50">
              <Link to="/faq">
                View All FAQs <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-background">
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