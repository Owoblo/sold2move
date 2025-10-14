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
  Star,
  Flag
} from 'lucide-react';

const USASoldListings = () => {
  const majorStates = [
    { 
      name: 'California', 
      cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'], 
      listings: '25,000+',
      avgPrice: '$750K',
      color: 'text-blue-400'
    },
    { 
      name: 'Texas', 
      cities: ['Houston', 'Dallas', 'Austin', 'San Antonio'], 
      listings: '18,500+',
      avgPrice: '$350K',
      color: 'text-red-400'
    },
    { 
      name: 'Florida', 
      cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'], 
      listings: '15,200+',
      avgPrice: '$400K',
      color: 'text-orange-400'
    },
    { 
      name: 'New York', 
      cities: ['New York City', 'Buffalo', 'Rochester', 'Albany'], 
      listings: '12,800+',
      avgPrice: '$550K',
      color: 'text-purple-400'
    },
    { 
      name: 'Illinois', 
      cities: ['Chicago', 'Aurora', 'Rockford', 'Joliet'], 
      listings: '8,900+',
      avgPrice: '$280K',
      color: 'text-green-400'
    },
    { 
      name: 'Washington', 
      cities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver'], 
      listings: '7,400+',
      avgPrice: '$650K',
      color: 'text-cyan-400'
    }
  ];

  const benefits = [
    {
      icon: <Globe className="h-6 w-6 text-teal" />,
      title: "50-State Coverage",
      description: "Access sold listings from Alaska to Florida, covering all major US markets."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "Real-Time Market Data",
      description: "Get instant notifications when properties sell anywhere in the United States."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Cross-Border Expansion",
      description: "Expand your Canadian moving business into lucrative US markets."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Higher Revenue Potential",
      description: "Tap into larger US markets with higher average property values."
    }
  ];

  const stats = [
    { label: "States Covered", value: "50", icon: <Flag className="h-5 w-5" /> },
    { label: "Cities Monitored", value: "500+", icon: <MapPin className="h-5 w-5" /> },
    { label: "Daily Listings", value: "5,000+", icon: <Home className="h-5 w-5" /> },
    { label: "Success Rate", value: "98%", icon: <Star className="h-5 w-5" /> }
  ];

  return (
    <PageWrapper
      title="USA Sold Listings for Moving Companies | Cross-Border Property Data"
      description="Get real-time sold property listings across all US states. Perfect for Canadian moving companies expanding south. Find new customers from California to New York."
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
                <Flag className="h-5 w-5 text-teal" />
                <span className="text-teal font-medium">US Market Expansion</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                USA Sold Listings for Moving Companies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Expand your moving business into the United States with real-time sold property listings. From California to New York, access the largest property market in North America.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Access US Market Data
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View US Plans</Link>
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

        {/* Major States Section */}
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
                Major US States We Cover
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                From the Pacific to the Atlantic, we provide comprehensive coverage of all major US markets.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {majorStates.map((state, index) => (
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
                        <MapPin className={`h-5 w-5 ${state.color}`} />
                        {state.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-slate">Active Listings:</span>
                          <span className="text-teal font-medium">{state.listings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Avg Price:</span>
                          <span className="text-lightest-slate">{state.avgPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate text-sm">Major Cities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {state.cities.map((city, cityIndex) => (
                              <span key={cityIndex} className="text-xs bg-light-navy px-2 py-1 rounded text-slate">
                                {city}
                              </span>
                            ))}
                          </div>
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
                Why Expand to the US Market?
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                The US market offers massive opportunities for Canadian moving companies looking to scale.
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
                Ready to Expand to the US Market?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join Canadian moving companies who are already using our platform to find new customers across the United States.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Start Your US Expansion
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

export default USASoldListings;

