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
  Search,
  Star
} from 'lucide-react';

const OntarioSoldListings = () => {
  const majorCities = [
    { name: 'Toronto', population: '2.9M', avgPrice: '$1.1M', listings: '2,847' },
    { name: 'Ottawa', population: '1.0M', avgPrice: '$750K', listings: '1,234' },
    { name: 'Mississauga', population: '720K', avgPrice: '$950K', listings: '1,156' },
    { name: 'Brampton', population: '650K', avgPrice: '$850K', listings: '987' },
    { name: 'Hamilton', population: '580K', avgPrice: '$650K', listings: '756' },
    { name: 'London', population: '420K', avgPrice: '$550K', listings: '634' },
    { name: 'Markham', population: '350K', avgPrice: '$1.2M', listings: '523' },
    { name: 'Vaughan', population: '320K', avgPrice: '$1.3M', listings: '445' }
  ];

  const benefits = [
    {
      icon: <MapPin className="h-6 w-6 text-teal" />,
      title: "Ontario-Wide Coverage",
      description: "Access sold listings from Toronto to Thunder Bay, covering all major Ontario markets."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "Real-Time Market Data",
      description: "Get instant notifications when properties sell in your service areas across Ontario."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Precise Targeting",
      description: "Filter by price range, neighborhood, and property type to find your ideal customers."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Higher Conversion Rates",
      description: "Target recent homebuyers who are most likely to need moving services."
    }
  ];

  const stats = [
    { label: "Active Listings", value: "15,000+", icon: <Home className="h-5 w-5" /> },
    { label: "Cities Covered", value: "50+", icon: <MapPin className="h-5 w-5" /> },
    { label: "Avg Response Time", value: "< 2 hours", icon: <Clock className="h-5 w-5" /> },
    { label: "Success Rate", value: "95%", icon: <Star className="h-5 w-5" /> }
  ];

  return (
    <PageWrapper
      title="Ontario Sold Listings for Moving Companies | Real-Time Property Data"
      description="Get real-time sold property listings across Ontario. Perfect for moving companies in Toronto, Ottawa, Hamilton, and all major Ontario cities. Find new customers before your competitors."
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
                <span className="text-teal font-medium">Ontario Moving Companies</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                Ontario Sold Listings for Moving Companies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Get real-time access to sold property listings across Ontario. From Toronto to Thunder Bay, find new customers before your competitors with our exclusive moving company data platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Start Finding Ontario Leads
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Ontario Plans</Link>
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="bg-teal/10 p-2 rounded-lg">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-lightest-slate">{stat.value}</div>
                  <div className="text-sm text-slate">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Major Cities Section */}
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
                Major Ontario Cities We Cover
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                From the Greater Toronto Area to Northern Ontario, we provide comprehensive coverage of all major markets.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {majorCities.map((city, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-deep-navy border-lightest-navy/20 hover:border-teal/50 transition-colors duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl text-lightest-slate flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal" />
                        {city.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate">Population:</span>
                          <span className="text-lightest-slate">{city.population}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Avg Price:</span>
                          <span className="text-lightest-slate">{city.avgPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Active Listings:</span>
                          <span className="text-teal font-medium">{city.listings}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
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
                Why Ontario Moving Companies Choose Sold2Move
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Get the competitive advantage you need to grow your moving business across Ontario.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
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
                          {benefit.icon}
                        </div>
                        <CardTitle className="text-xl text-lightest-slate">
                          {benefit.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate">
                        {benefit.description}
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
                Ready to Dominate the Ontario Moving Market?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join hundreds of Ontario moving companies who are already using our platform to find new customers and grow their business.
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

export default OntarioSoldListings;


