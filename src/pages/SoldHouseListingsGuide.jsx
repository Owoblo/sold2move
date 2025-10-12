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
  Mail,
  BarChart3,
  Globe,
  Home,
  Search
} from 'lucide-react';

const SoldHouseListingsGuide = () => {
  const marketInsights = [
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "Market Trends Analysis",
      description: "Understand which neighborhoods are experiencing the highest sales activity and moving demand.",
      details: "Track seasonal patterns, price fluctuations, and emerging hot spots to optimize your service area coverage."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Customer Segmentation",
      description: "Identify different customer types based on property values and locations.",
      details: "Higher-end properties often indicate customers who need premium moving services, while mid-range homes may prefer standard packages."
    },
    {
      icon: <Clock className="h-6 w-6 text-teal" />,
      title: "Timing Optimization",
      description: "Know exactly when to reach out to maximize your chances of booking the job.",
      details: "Recent sales indicate homeowners who are actively planning their move and most receptive to moving service inquiries."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Pricing Intelligence",
      description: "Set competitive rates based on local market conditions and customer demographics.",
      details: "Property values in an area can help you determine appropriate pricing for your moving services."
    }
  ];

  const dataTypes = [
    {
      title: "Property Details",
      items: ["Address and location", "Sale price and date", "Property type and size", "Bedrooms and bathrooms"]
    },
    {
      title: "Market Information", 
      items: ["Days on market", "Price changes", "Neighborhood trends", "Comparable sales"]
    },
    {
      title: "Contact Opportunities",
      items: ["Listing agent details", "Buyer information", "Transaction timeline", "Follow-up opportunities"]
    }
  ];

  const bestPractices = [
    {
      step: "1",
      title: "Data Collection",
      description: "Gather comprehensive sold listings data from reliable sources across Canada and the U.S."
    },
    {
      step: "2", 
      title: "Market Analysis",
      description: "Analyze trends, identify high-activity areas, and segment customers by property value."
    },
    {
      step: "3",
      title: "Lead Qualification",
      description: "Prioritize leads based on property value, location, and timing of the sale."
    },
    {
      step: "4",
      title: "Outreach Strategy",
      description: "Develop targeted marketing campaigns for different customer segments and neighborhoods."
    },
    {
      step: "5",
      title: "Follow-up Process",
      description: "Implement systematic follow-up procedures to convert leads into booked jobs."
    }
  ];

  const tools = [
    {
      icon: <Search className="h-6 w-6 text-teal" />,
      title: "Advanced Search Filters",
      description: "Filter by location, price range, property type, and sale date to find the most relevant leads."
    },
    {
      icon: <MapPin className="h-6 w-6 text-teal" />,
      title: "Geographic Mapping",
      description: "Visualize market activity on interactive maps to identify service area opportunities."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-teal" />,
      title: "Analytics Dashboard",
      description: "Track your lead generation performance and ROI with detailed analytics and reporting."
    },
    {
      icon: <Mail className="h-6 w-6 text-teal" />,
      title: "Automated Outreach",
      description: "Set up automated email campaigns to reach new homeowners at the optimal time."
    }
  ];

  return (
    <PageWrapper
      title="Sold House Listings in Canada: The Ultimate Guide for Movers"
      description="Complete guide to using sold house listings data for moving companies in Canada. Learn how to find leads, analyze markets, and grow your moving business with real estate data."
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
                <Globe className="h-5 w-5 text-teal" />
                <span className="text-teal font-medium">Canada Moving Industry Guide</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                Sold House Listings in Canada: The Ultimate Guide for Movers
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Master the art of lead generation using sold house listings data. This comprehensive guide shows Canadian moving companies how to leverage real estate data to find high-quality leads and grow their business.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Access Sold Listings Data
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Plans</Link>
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
                Why Sold House Listings Are a Goldmine for Moving Companies
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="text-slate mb-6">
                  In Canada's competitive moving industry, access to real-time sold house listings data can transform your business from struggling to find customers to consistently booking high-value jobs. Every property sale represents a potential moving opportunity - either the seller is relocating or the buyer is moving into their new home.
                </p>
                <p className="text-slate mb-6">
                  Unlike traditional marketing methods that rely on broad targeting, sold listings provide moving companies with precise, actionable data about people who are most likely to need moving services. This targeted approach results in higher conversion rates, better customer acquisition costs, and increased revenue.
                </p>
                <p className="text-slate">
                  From Vancouver to Toronto, Halifax to Calgary, Canadian moving companies are discovering that sold house listings data is the key to sustainable growth and competitive advantage in today's market.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Market Insights */}
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
                Key Market Insights from Sold Listings Data
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Understanding these insights will help you make smarter business decisions and target the most profitable opportunities.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {marketInsights.map((insight, index) => (
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
                          {insight.icon}
                        </div>
                        <CardTitle className="text-xl text-lightest-slate">
                          {insight.title}
                        </CardTitle>
                      </div>
                      <p className="text-slate font-medium">
                        {insight.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate">
                        {insight.details}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Types Section */}
        <section className="py-20 bg-light-navy">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Essential Data Points for Moving Companies
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                These are the key data points you need to extract maximum value from sold house listings.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {dataTypes.map((type, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-deep-navy border-lightest-navy/20">
                    <CardHeader>
                      <CardTitle className="text-xl text-lightest-slate text-center">
                        {type.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {type.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-teal flex-shrink-0" />
                            <span className="text-slate">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Best Practices */}
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
                Best Practices for Using Sold Listings Data
              </h2>
              <p className="text-xl text-slate">
                Follow this proven methodology to maximize your success with sold house listings.
              </p>
            </motion.div>

            <div className="space-y-8">
              {bestPractices.map((practice, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start gap-6"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-teal">{practice.step}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-lightest-slate mb-2">
                      {practice.title}
                    </h3>
                    <p className="text-slate">
                      {practice.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools Section */}
        <section className="py-20 bg-light-navy">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-lightest-slate mb-6">
                Essential Tools for Sold Listings Analysis
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                These tools will help you extract maximum value from sold house listings data.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {tools.map((tool, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-deep-navy border-lightest-navy/20 hover:border-teal/50 transition-colors duration-300">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-teal/10 p-2 rounded-lg">
                          {tool.icon}
                        </div>
                        <CardTitle className="text-xl text-lightest-slate">
                          {tool.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate">
                        {tool.description}
                      </p>
                    </CardContent>
                  </Card>
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
                Start Using Sold Listings Data Today
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join hundreds of Canadian moving companies who are already using sold house listings data to grow their business and increase revenue.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                  <Link to="/contact">Schedule Demo</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
};

export default SoldHouseListingsGuide;
