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
  const problems = [
    {
      icon: <XCircle className="h-8 w-8 text-green-500" />,
      title: 'Stale Leads',
      description: 'Are you tired of calling homeowners who moved months ago? Your competitors are already there.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-green-500" />,
      title: 'Wasted Marketing Spend',
      description: 'Sending mailers to random addresses or outdated lists means your budget goes nowhere.',
    },
    {
      icon: <XCircle className="h-8 w-8 text-green-500" />,
      title: 'Manual Research',
      description: 'Spending hours sifting through public records or unreliable sources for new moving leads.',
    },
  ];

  const testimonials = [
    {
      quote: "Sold2Move has been a game-changer for our business. We're reaching new homeowners before anyone else.",
      author: 'John Doe, CEO of MoveItNow',
      avatar: 'JD',
    },
    {
      quote: 'The quality of leads is unmatched. Our conversion rates have skyrocketed since we started using the platform.',
      author: 'Jane Smith, Marketing Director at Swift Movers',
      avatar: 'JS',
    },
    {
      quote: 'Finally, a tool that understands the pain of finding fresh moving leads. Sold2Move delivers!',
      author: 'Mike Johnson, Owner of Elite Relocations',
      avatar: 'MJ',
    },
  ];

  return (
    <PageWrapper
      title="Real-Time Moving Leads"
      description="Be the first to reach new homeowners with Sold2Move's real-time sold listing leads and direct mail tools for moving companies in the US & Canada."
    >
      {/* Hero Section */}
      <Hero />

      {/* Problem Section */}
      <section className="py-20 bg-light-navy">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">
              The Problem: Finding Fresh Moving Leads
            </h2>
            <p className="text-lg text-slate mt-2 max-w-3xl mx-auto">
              Traditional lead generation methods are slow, inefficient, and costly. You're missing out on prime opportunities.
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
                <Card className="h-full text-center bg-deep-navy border-green-500/20 hover:border-green-500/50 transition-colors duration-300 transform hover:-translate-y-2">
                  <CardHeader>
                    <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit mb-4">{problem.icon}</div>
                    <CardTitle className="font-heading text-green-300">{problem.title}</CardTitle>
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
            <h2 className="text-3xl md:text-4xl font-bold text-lightest-slate font-heading">Trusted by Leading Movers</h2>
            <p className="text-lg text-slate mt-2">Here's what our partners are saying.</p>
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
                      <div className="w-12 h-12 rounded-full bg-green/20 text-green flex items-center justify-center font-bold text-lg mr-4 font-mono">
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
            Got Questions? We've Got Answers.
          </h2>
          <p className="text-lg text-slate max-w-2xl mx-auto mb-8">
            From data sources to pricing, find all the information you need to get started with Sold2Move.
          </p>
          <Button asChild size="lg" variant="outline" className="border-green text-green hover:bg-green/10 hover:text-green">
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
            text="Ready to stop chasing old leads and start growing your moving business today?"
            link="/signup"
            ctaText="Start Your Free Trial"
          />
        </div>
      </section>
    </PageWrapper>
  );
};

export default HomePage;