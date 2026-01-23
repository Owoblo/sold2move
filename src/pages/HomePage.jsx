import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Star, Quote, CheckCircle2, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import PainPoints from '@/components/PainPoints';
import HowItWorks from '@/components/HowItWorks';
import UniqueFeatures from '@/components/UniqueFeatures';
import CallToAction from '@/components/CallToAction';
import VideoDemo from '@/components/VideoDemo';

const HomePage = () => {
  const testimonials = [
    {
      quote: "Sold2Move completely transformed our lead generation. The AI furniture detection helps us prepare accurate quotes before we even call. We've tripled our closing rate.",
      author: 'Michael Torres',
      role: 'Owner, Swift Relocations',
      avatar: 'MT',
      rating: 5,
      result: "3x closing rate"
    },
    {
      quote: "The Canadian data is a game-changer. We were missing an entire market our competitors couldn't reach. Now we're the go-to mover in our region.",
      author: 'Sarah Chen',
      role: 'CEO, NorthStar Moving Co.',
      avatar: 'SC',
      rating: 5,
      result: "40% more revenue"
    },
    {
      quote: "Finally, a platform built for movers! The direct mail integration saves us hours every week. We send postcards with one click and the leads just keep coming.",
      author: 'James Wilson',
      role: 'Marketing Director, Elite Movers',
      avatar: 'JW',
      rating: 5,
      result: "15 new jobs/month"
    },
  ];

  const trustedBy = [
    "500+ Moving Companies",
    "North America Wide",
    "10M+ Listings Processed"
  ];

  return (
    <PageWrapper
      title="Real-Time Sold Listings & Leads for Moving Companies in Canada & USA"
      description="Get mover-ready sold listings with AI furniture detection and homeowner contact info. The only platform with exclusive Canadian data for moving companies."
    >
      {/* Hero Section */}
      <Hero />

      {/* Trusted By Banner */}
      <section className="py-8 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {trustedBy.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 text-slate"
              >
                <CheckCircle2 className="h-5 w-5 text-brand-primary" />
                <span className="font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <PainPoints />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Video Demo Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-6">
              <Play className="h-4 w-4 text-brand-primary" />
              <span className="text-brand-primary font-medium text-sm">See It In Action</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-white">Watch </span>
              <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                Sold2Move
              </span>
              <span className="text-white"> in Action</span>
            </h2>
            <p className="text-lg text-slate max-w-2xl mx-auto">
              See how easy it is to find mover-ready leads and grow your business.
            </p>
          </motion.div>
          <VideoDemo
            title="Platform Demo"
            description="Experience the power of real-time sold listings data"
          />
        </div>
      </section>

      {/* Unique Features Section */}
      <UniqueFeatures />

      {/* Testimonials Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 text-brand-primary fill-brand-primary" />
              <span className="text-brand-primary font-medium text-sm">Success Stories</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-white">Trusted by </span>
              <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                Industry Leaders
              </span>
            </h2>
            <p className="text-lg text-slate max-w-2xl mx-auto">
              See how moving companies are growing their business with Sold2Move.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="group"
              >
                <Card className="h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10 hover:border-brand-primary/30 transition-all duration-300 group-hover:-translate-y-2">
                  <CardContent className="p-6">
                    {/* Result Badge */}
                    <div className="mb-4">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary">
                        {testimonial.result}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>

                    {/* Quote */}
                    <Quote className="h-8 w-8 text-brand-primary/30 mb-3" />
                    <p className="text-light-slate mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{testimonial.author}</p>
                        <p className="text-sm text-slate">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <Stats />

      {/* Final CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-brand-primary/20 rounded-3xl p-8 md:p-12 lg:p-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                <span className="text-white">Ready to </span>
                <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                  Win More Moves
                </span>
                <span className="text-white">?</span>
              </h2>
              <p className="text-lg text-slate max-w-2xl mx-auto mb-8">
                Join hundreds of moving companies using Sold2Move to find better leads, close more jobs, and grow their business.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button
                  asChild
                  size="lg"
                  className="bg-brand-gradient hover:brightness-110 text-white px-8 py-6 rounded-full font-semibold text-lg shadow-xl hover:shadow-glow-lg transition-all group min-w-[220px]"
                >
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10 px-8 py-6 rounded-full font-semibold text-lg min-w-[220px]"
                >
                  <Link to="/request-demo">
                    <Calendar className="mr-2 h-5 w-5" />
                    Book a Demo
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Free onboarding support</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
};

export default HomePage;
