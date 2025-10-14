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
  Building2
} from 'lucide-react';

const TorontoSoldListings = () => {
  const neighborhoods = [
    { name: 'Downtown Toronto', avgPrice: '$1.2M', listings: '450+', growth: '+12%' },
    { name: 'North York', avgPrice: '$950K', listings: '380+', growth: '+8%' },
    { name: 'Scarborough', avgPrice: '$750K', listings: '320+', growth: '+15%' },
    { name: 'Etobicoke', avgPrice: '$850K', listings: '290+', growth: '+10%' },
    { name: 'East York', avgPrice: '$800K', listings: '180+', growth: '+7%' },
    { name: 'York', avgPrice: '$700K', listings: '160+', growth: '+9%' }
  ];

  const benefits = [
    {
      icon: <Building2 className="h-6 w-6 text-teal" />,
      title: "Toronto Market Expertise",
      description: "Deep insights into Toronto's unique real estate market and moving patterns."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "High-Value Properties",
      description: "Access to Toronto's premium property market with higher average values."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Neighborhood Targeting",
      description: "Target specific Toronto neighborhoods based on property values and demographics."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "Premium Service Opportunities",
      description: "Higher-value properties mean customers can afford premium moving services."
    }
  ];

  const stats = [
    { label: "Active Listings", value: "2,847", icon: <Home className="h-5 w-5" /> },
    { label: "Avg Property Value", value: "$1.1M", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Monthly Sales", value: "1,200+", icon: <TrendingUp className="h-5 w-5" /> },
    { label: "Market Growth", value: "+11%", icon: <BarChart3 className="h-5 w-5" /> }
  ];

  return (
    <PageWrapper
      title="Toronto Sold Listings for Moving Companies | GTA Property Data"
      description="Get real-time sold property listings in Toronto and the GTA. Perfect for moving companies targeting Canada's largest market. Find new customers in downtown, North York, Scarborough, and all Toronto neighborhoods."
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
                <Building2 className="h-5 w-5 text-teal" />
                <span className="text-teal font-medium">Toronto Moving Companies</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                Toronto Sold Listings for Moving Companies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Dominate Canada's largest real estate market with real-time sold property listings in Toronto and the GTA. Find high-value customers in downtown, North York, Scarborough, and all major Toronto neighborhoods.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Access Toronto Data
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Toronto Plans</Link>
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

        {/* Neighborhoods Section */}
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
                Toronto Neighborhoods We Cover
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                From downtown condos to suburban homes, we provide comprehensive coverage of all Toronto neighborhoods.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {neighborhoods.map((neighborhood, index) => (
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
                        {neighborhood.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate">Avg Price:</span>
                          <span className="text-lightest-slate">{neighborhood.avgPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Active Listings:</span>
                          <span className="text-teal font-medium">{neighborhood.listings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Growth:</span>
                          <span className="text-green-400 font-medium">{neighborhood.growth}</span>
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
                Why Toronto Moving Companies Choose Sold2Move
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Toronto's competitive market requires the best tools to stay ahead of the competition.
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
                Ready to Dominate the Toronto Market?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join Toronto moving companies who are already using our platform to find new customers in Canada's largest real estate market.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Start in Toronto Today
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

export default TorontoSoldListings;

