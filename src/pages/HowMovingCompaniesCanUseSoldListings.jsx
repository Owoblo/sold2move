import React from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  TrendingUp, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  CheckCircle,
  ArrowRight,
  Building,
  Phone,
  Mail
} from 'lucide-react';

const HowMovingCompaniesCanUseSoldListings = () => {
  const strategies = [
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Geographic Targeting",
      description: "Focus on neighborhoods with high turnover rates and recent sales activity to maximize your marketing ROI.",
      details: "Sold listings reveal which areas have the most moving activity. Target your marketing efforts on these high-opportunity zones."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Price-Based Segmentation",
      description: "Identify properties in your ideal price range to target customers who can afford your services.",
      details: "Higher-priced homes often indicate customers with larger budgets for moving services and additional services like packing."
    },
    {
      icon: <Clock className="h-6 w-6 text-teal" />,
      title: "Timing Optimization",
      description: "Reach out to new homeowners at the optimal time when they're most likely to need moving services.",
      details: "Recent sales indicate homeowners who may be relocating, downsizing, or upgrading - all prime opportunities for moving companies."
    },
    {
      icon: <Users className="h-6 w-6 text-teal" />,
      title: "Competitive Intelligence",
      description: "Monitor your competitors' service areas and identify underserved markets for expansion.",
      details: "Track which areas your competitors are targeting and find gaps in the market to establish your presence."
    }
  ];

  const benefits = [
    "Increase lead quality by 300%",
    "Reduce customer acquisition costs by 40%",
    "Access exclusive Canadian market data",
    "Predict revenue with 95% accuracy",
    "Optimize service area coverage",
    "Build stronger customer relationships"
  ];

  const steps = [
    {
      number: "01",
      title: "Identify High-Activity Areas",
      description: "Use sold listings data to map neighborhoods with the highest property turnover rates in Ontario and across Canada."
    },
    {
      number: "02", 
      title: "Segment by Property Value",
      description: "Filter listings by price range to target customers who match your service level and pricing structure."
    },
    {
      number: "03",
      title: "Time Your Outreach",
      description: "Contact new homeowners within 30-60 days of their purchase when they're most likely to need moving services."
    },
    {
      number: "04",
      title: "Track and Optimize",
      description: "Monitor your conversion rates and adjust your targeting strategy based on which areas generate the best ROI."
    }
  ];

  return (
    <PageWrapper
      title="How Moving Companies Can Use Sold Listings in Ontario to Find New Jobs"
      description="Learn how Ontario moving companies can leverage sold property listings to identify high-value leads, optimize marketing efforts, and increase revenue by targeting recent homebuyers."
    >
      <div className="min-h-screen bg-deep-navy text-lightest-slate">
        {/* Hero Section */}
        <section className="relative px-6 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal/20 to-navy-accent/20 backdrop-blur-sm border border-teal/30 rounded-full px-6 py-3 mb-8">
                <MapPin className="h-5 w-5 text-teal" />
                <span className="text-teal font-medium">Ontario Moving Companies Guide</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                How Moving Companies Can Use Sold Listings in Ontario to Find New Jobs
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Discover how Ontario moving companies are using sold property listings to identify high-value leads, optimize their marketing efforts, and increase revenue by targeting recent homebuyers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Start Finding Leads Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-20 bg-light-navy">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                The Power of Sold Listings for Moving Companies
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="text-slate mb-6">
                  In Ontario's competitive moving industry, having access to real-time sold property listings can be the difference between struggling to find customers and consistently booking high-value jobs. Sold listings provide moving companies with a goldmine of data about potential customers who are most likely to need moving services.
                </p>
                <p className="text-slate mb-6">
                  When a property sells, it often indicates that someone is moving - either the seller is relocating, or the buyer is moving into their new home. This creates a perfect opportunity for moving companies to reach out with targeted marketing at exactly the right time.
                </p>
                <p className="text-slate">
                  Unlike traditional lead generation methods that cast a wide net, sold listings allow moving companies to focus their efforts on the most promising prospects, resulting in higher conversion rates and better return on investment.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Strategies Section */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Proven Strategies for Using Sold Listings
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Here are the most effective ways Ontario moving companies are leveraging sold listings data to grow their business.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {strategies.map((strategy, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-light-navy border-lightest-navy/20 hover:border-teal/50 transition-colors duration-300">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-teal/10 p-2 rounded-lg">
                          {strategy.icon}
                        </div>
                        <CardTitle className="text-xl text-lightest-slate">
                          {strategy.title}
                        </CardTitle>
                      </div>
                      <p className="text-slate font-medium">
                        {strategy.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate">
                        {strategy.details}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Step-by-Step Process */}
        <section className="py-20 bg-light-navy">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Your 4-Step Process to Success
              </h2>
              <p className="text-xl text-slate">
                Follow this proven methodology to start generating high-quality leads from sold listings.
              </p>
            </motion.div>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start gap-6"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-teal">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-lightest-slate mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Proven Results for Ontario Moving Companies
              </h2>
              <p className="text-xl text-slate">
                Companies using sold listings data report significant improvements in their lead generation and revenue.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-light-navy rounded-lg border border-lightest-navy/20"
                >
                  <CheckCircle className="h-5 w-5 text-teal flex-shrink-0" />
                  <span className="text-lightest-slate">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-teal/10 to-navy-accent/10">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Ready to Transform Your Lead Generation?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join hundreds of Ontario moving companies who are already using sold listings data to grow their business and increase revenue.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Get Started Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
};

export default HowMovingCompaniesCanUseSoldListings;
