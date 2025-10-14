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

const CanadaSoldListings = () => {
  const provinces = [
    { 
      name: 'Ontario', 
      cities: ['Toronto', 'Ottawa', 'Hamilton', 'London'], 
      listings: '15,000+',
      avgPrice: '$850K',
      color: 'text-red-400'
    },
    { 
      name: 'British Columbia', 
      cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby'], 
      listings: '8,500+',
      avgPrice: '$1.2M',
      color: 'text-blue-400'
    },
    { 
      name: 'Alberta', 
      cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'], 
      listings: '6,200+',
      avgPrice: '$450K',
      color: 'text-green-400'
    },
    { 
      name: 'Quebec', 
      cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'], 
      listings: '7,800+',
      avgPrice: '$550K',
      color: 'text-purple-400'
    },
    { 
      name: 'Manitoba', 
      cities: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson'], 
      listings: '2,100+',
      avgPrice: '$350K',
      color: 'text-yellow-400'
    },
    { 
      name: 'Saskatchewan', 
      cities: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw'], 
      listings: '1,800+',
      avgPrice: '$320K',
      color: 'text-orange-400'
    }
  ];

  const benefits = [
    {
      icon: <Globe className="h-6 w-6 text-teal" />,
      title: "Nationwide Coverage",
      description: "Access sold listings from coast to coast, covering all major Canadian markets."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "Real-Time Updates",
      description: "Get instant notifications when properties sell anywhere in Canada."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Multi-Province Expansion",
      description: "Expand your moving business across provinces with targeted market data."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Competitive Advantage",
      description: "Be the first to contact new homeowners in any Canadian market."
    }
  ];

  const stats = [
    { label: "Provinces Covered", value: "10", icon: <Flag className="h-5 w-5" /> },
    { label: "Cities Monitored", value: "200+", icon: <MapPin className="h-5 w-5" /> },
    { label: "Daily Listings", value: "1,500+", icon: <Home className="h-5 w-5" /> },
    { label: "Success Rate", value: "97%", icon: <Star className="h-5 w-5" /> }
  ];

  return (
    <PageWrapper
      title="Canada Sold Listings for Moving Companies | Nationwide Property Data"
      description="Get real-time sold property listings across all Canadian provinces. Perfect for moving companies expanding nationwide. Find new customers from Vancouver to Halifax."
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
                <span className="text-teal font-medium">Canadian Moving Companies</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                Canada Sold Listings for Moving Companies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Expand your moving business across Canada with real-time sold property listings. From Vancouver to Halifax, find new customers in every major Canadian market.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Access Canada-Wide Data
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Canada Plans</Link>
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

        {/* Provinces Section */}
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
                Canadian Provinces We Cover
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                From the Atlantic to the Pacific, we provide comprehensive coverage of all major Canadian markets.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {provinces.map((province, index) => (
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
                        <MapPin className={`h-5 w-5 ${province.color}`} />
                        {province.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-slate">Active Listings:</span>
                          <span className="text-teal font-medium">{province.listings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Avg Price:</span>
                          <span className="text-lightest-slate">{province.avgPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate text-sm">Major Cities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {province.cities.map((city, cityIndex) => (
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
                Why Canadian Moving Companies Choose Sold2Move
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Scale your moving business across Canada with the most comprehensive property data platform.
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
                Ready to Expand Across Canada?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join Canadian moving companies who are already using our platform to find new customers from coast to coast.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Start Your Canada Expansion
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

export default CanadaSoldListings;


