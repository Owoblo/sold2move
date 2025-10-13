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
  Mountain
} from 'lucide-react';

const VancouverSoldListings = () => {
  const neighborhoods = [
    { name: 'Downtown Vancouver', avgPrice: '$1.4M', listings: '320+', growth: '+15%' },
    { name: 'West End', avgPrice: '$1.1M', listings: '180+', growth: '+12%' },
    { name: 'Kitsilano', avgPrice: '$1.3M', listings: '150+', growth: '+18%' },
    { name: 'Burnaby', avgPrice: '$950K', listings: '280+', growth: '+10%' },
    { name: 'Richmond', avgPrice: '$1.0M', listings: '220+', growth: '+8%' },
    { name: 'Surrey', avgPrice: '$750K', listings: '350+', growth: '+14%' }
  ];

  const benefits = [
    {
      icon: <Mountain className="h-6 w-6 text-teal" />,
      title: "West Coast Market Expertise",
      description: "Deep understanding of Vancouver's unique real estate market and lifestyle patterns."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-teal" />,
      title: "Premium Property Market",
      description: "Access to Vancouver's high-value property market with some of Canada's highest prices."
    },
    {
      icon: <Target className="h-6 w-6 text-teal" />,
      title: "Diverse Neighborhoods",
      description: "Target everything from downtown condos to suburban family homes across the Lower Mainland."
    },
    {
      icon: <DollarSign className="h-6 w-6 text-teal" />,
      title: "High-Value Opportunities",
      description: "Higher property values mean customers can afford premium moving and storage services."
    }
  ];

  const stats = [
    { label: "Active Listings", value: "1,500+", icon: <Home className="h-5 w-5" /> },
    { label: "Avg Property Value", value: "$1.2M", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Monthly Sales", value: "650+", icon: <TrendingUp className="h-5 w-5" /> },
    { label: "Market Growth", value: "+13%", icon: <BarChart3 className="h-5 w-5" /> }
  ];

  return (
    <PageWrapper
      title="Vancouver Sold Listings for Moving Companies | Lower Mainland Property Data"
      description="Get real-time sold property listings in Vancouver and the Lower Mainland. Perfect for moving companies targeting BC's largest market. Find new customers in downtown, Burnaby, Richmond, Surrey, and all Vancouver neighborhoods."
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
                <Mountain className="h-5 w-5 text-teal" />
                <span className="text-teal font-medium">Vancouver Moving Companies</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl lg:text-6xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-teal to-navy-accent bg-clip-text text-transparent">
                Vancouver Sold Listings for Moving Companies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Dominate British Columbia's largest real estate market with real-time sold property listings in Vancouver and the Lower Mainland. Find high-value customers in downtown, Burnaby, Richmond, Surrey, and all major Vancouver neighborhoods.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/signup">
                  Access Vancouver Data
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal/10">
                <Link to="/pricing">View Vancouver Plans</Link>
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
                Vancouver & Lower Mainland Areas
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                From downtown Vancouver to the Fraser Valley, we provide comprehensive coverage of all Lower Mainland markets.
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
                Why Vancouver Moving Companies Choose Sold2Move
              </h2>
              <p className="text-xl text-slate max-w-3xl mx-auto">
                Vancouver's competitive market requires the best tools to stay ahead of the competition.
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
                Ready to Dominate the Vancouver Market?
              </h2>
              <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
                Join Vancouver moving companies who are already using our platform to find new customers in BC's largest real estate market.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal text-deep-navy hover:bg-teal/90">
                  <Link to="/signup">
                    Start in Vancouver Today
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

export default VancouverSoldListings;
