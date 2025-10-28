import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Eye } from 'lucide-react';

const movingCompanyMailers = [
  {
    id: 1,
    name: 'Andrews Moving & Storage',
    description: 'Official Mover of The Guardians - Baseball themed moving services with special offers',
    image: '/api/placeholder/600/400',
    features: ['Baseball partnership', 'Special offers', 'Professional branding', 'Customer testimonials']
  },
  {
    id: 2,
    name: 'Happy Helpers Moving Co.',
    description: 'Veteran owned business with patriotic theme and comprehensive moving services',
    image: '/api/placeholder/600/400',
    features: ['Veteran owned', 'Patriotic design', 'Multiple service offerings', 'Community focused']
  },
  {
    id: 3,
    name: 'Varsity Movers',
    description: 'Clean, professional design emphasizing strength, agility, and precision in moving',
    image: '/api/placeholder/600/400',
    features: ['Professional design', 'Service highlights', 'Discount offers', 'Modern layout']
  },
  {
    id: 4,
    name: 'Florida Moving Pros',
    description: 'Bear mascot branding with family-friendly approach and local expertise',
    image: '/api/placeholder/600/400',
    features: ['Mascot branding', 'Family friendly', 'Local expertise', 'Clear pricing']
  },
  {
    id: 5,
    name: 'Dearman Moving & Storage',
    description: 'Emotional connection focused design emphasizing care and family values',
    image: '/api/placeholder/600/400',
    features: ['Emotional appeal', 'Family values', 'Customer testimonials', 'Service guarantees']
  },
  {
    id: 6,
    name: 'Move Indy Moving and Storage',
    description: 'Local family-owned business with community partnerships and personal touch',
    image: '/api/placeholder/600/400',
    features: ['Family owned', 'Community partnerships', 'Personal testimonials', 'Local focus']
  },
  {
    id: 7,
    name: 'Texas Best Moving & Storage',
    description: 'Texas pride with professional service offerings and customer satisfaction focus',
    image: '/api/placeholder/600/400',
    features: ['Texas branding', 'Professional services', 'Customer testimonials', 'Local expertise']
  },
  {
    id: 8,
    name: 'LaBarbera Movers',
    description: 'Professional team showcase with service variety and customer testimonials',
    image: '/api/placeholder/600/400',
    features: ['Team showcase', 'Service variety', 'Professional image', 'Customer reviews']
  },
  {
    id: 9,
    name: 'Moving Team Six',
    description: 'Mission-focused branding with comprehensive services and veteran connections',
    image: '/api/placeholder/600/400',
    features: ['Mission focused', 'Comprehensive services', 'Veteran connections', 'Professional team']
  },
  {
    id: 10,
    name: 'Meridian Moving & Storage',
    description: 'Clean, modern design with compass branding and customer satisfaction focus',
    image: '/api/placeholder/600/400',
    features: ['Modern design', 'Compass branding', 'Customer satisfaction', 'Professional services']
  },
  {
    id: 11,
    name: 'College H.U.N.K.S. Hauling Junk & Moving',
    description: 'Personal letter format with owner introduction and service explanation',
    image: '/api/placeholder/600/400',
    features: ['Personal approach', 'Owner introduction', 'Service explanation', 'Veteran background']
  },
  {
    id: 12,
    name: '2 College Brothers',
    description: 'Purple and gold branding with comprehensive moving and storage services',
    image: '/api/placeholder/600/400',
    features: ['College theme', 'Comprehensive services', 'Discount offers', 'Professional branding']
  },
  {
    id: 13,
    name: 'Blue Men Moving LLC',
    description: 'Blue theme with professional team showcase and customer testimonials',
    image: '/api/placeholder/600/400',
    features: ['Blue branding', 'Team showcase', 'Customer testimonials', 'Professional services']
  },
  {
    id: 14,
    name: 'Slattery Moving & Storage',
    description: 'Personal letter format with family business values and service guarantees',
    image: '/api/placeholder/600/400',
    features: ['Personal letter', 'Family values', 'Service guarantees', 'Professional approach']
  },
  {
    id: 15,
    name: 'Kinetic Movers LLC',
    description: 'Professional letter format with owner introduction and service principles',
    image: '/api/placeholder/600/400',
    features: ['Professional letter', 'Owner introduction', 'Service principles', 'Local expertise']
  },
  {
    id: 16,
    name: 'Palm Paradise Moving',
    description: 'Tropical theme with comprehensive moving services and local expertise',
    image: '/api/placeholder/600/400',
    features: ['Tropical theme', 'Comprehensive services', 'Local expertise', 'Professional branding']
  },
  {
    id: 17,
    name: 'HaulMen Moving Company',
    description: 'Clean design with personal touch and service offerings',
    image: '/api/placeholder/600/400',
    features: ['Clean design', 'Personal touch', 'Service offerings', 'Professional approach']
  },
  {
    id: 18,
    name: 'Haulin\' Assets Moving & Storage',
    description: 'Dynamic branding with comprehensive services and customer testimonials',
    image: '/api/placeholder/600/400',
    features: ['Dynamic branding', 'Comprehensive services', 'Customer testimonials', 'Professional team']
  },
  {
    id: 19,
    name: 'Moo Moo Moving',
    description: 'Unique cow mascot branding with friendly, approachable design',
    image: '/api/placeholder/600/400',
    features: ['Unique mascot', 'Friendly design', 'Approachable branding', 'Professional services']
  },
  {
    id: 20,
    name: 'Movegreen',
    description: 'Eco-friendly branding with sustainability focus and comprehensive services',
    image: '/api/placeholder/600/400',
    features: ['Eco-friendly', 'Sustainability focus', 'Comprehensive services', 'Professional approach']
  }
];

const SampleMailersPage = () => {
  const [selectedMailer, setSelectedMailer] = useState(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-deep-navy via-navy-accent to-deep-navy"
    >
      <Helmet>
        <title>Sample Moving Company Mailers | Sold2Move</title>
        <meta name="description" content="Browse our collection of professionally designed moving company mailers for inspiration. See real examples from successful moving companies across North America." />
        <meta name="keywords" content="moving company mailers, direct mail marketing, moving company advertising, sample mailers, moving company design" />
      </Helmet>

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Button
              asChild
              variant="outline"
              className="mb-6 border-teal text-teal hover:bg-teal hover:text-white"
            >
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-white mb-4"
          >
            Sample Moving Company Mailers
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate max-w-3xl mx-auto leading-relaxed"
          >
            Get inspired by real moving company mailers from successful businesses across North America. 
            These examples showcase effective design strategies, compelling offers, and professional branding.
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="bg-light-navy/50 border-teal/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-teal mb-2">20+</div>
              <div className="text-slate">Real Mailer Examples</div>
            </CardContent>
          </Card>
          <Card className="bg-light-navy/50 border-teal/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-teal mb-2">100%</div>
              <div className="text-slate">Professional Designs</div>
            </CardContent>
          </Card>
          <Card className="bg-light-navy/50 border-teal/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-teal mb-2">Free</div>
              <div className="text-slate">Inspiration Gallery</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mailers Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-light-navy/30 border-teal/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl text-teal text-center">Professional Moving Company Mailers</CardTitle>
              <CardDescription className="text-center text-slate text-lg">
                Click on any mailer to view a larger version and learn about the design strategies used.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {movingCompanyMailers.map((mailer) => (
                    <DialogTrigger asChild key={mailer.id} onClick={() => setSelectedMailer(mailer)}>
                      <motion.div
                        className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-teal transition-all duration-300 bg-white/5 backdrop-blur-sm"
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="aspect-[4/3] bg-gradient-to-br from-teal/20 to-navy-accent/20 flex items-center justify-center">
                          <div className="text-center p-4">
                            <div className="text-2xl mb-2">📦</div>
                            <div className="text-white font-semibold text-sm mb-1">{mailer.name}</div>
                            <div className="text-slate text-xs">{mailer.description}</div>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <Eye className="h-4 w-4 text-white" />
                            <span className="text-white font-semibold text-sm">View Sample</span>
                          </div>
                        </div>
                      </motion.div>
                    </DialogTrigger>
                  ))}
                </div>
                
                {selectedMailer && (
                  <DialogContent className="max-w-4xl bg-light-navy border-teal">
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-teal mb-2">{selectedMailer.name}</h3>
                        <p className="text-slate">{selectedMailer.description}</p>
                      </div>
                      
                      <div className="aspect-[4/3] bg-gradient-to-br from-teal/20 to-navy-accent/20 rounded-lg flex items-center justify-center">
                        <div className="text-center p-8">
                          <div className="text-6xl mb-4">📦</div>
                          <div className="text-white font-semibold text-xl mb-2">{selectedMailer.name}</div>
                          <div className="text-slate text-lg mb-4">{selectedMailer.description}</div>
                          <div className="text-sm text-slate">
                            <em>Sample mailer image would be displayed here</em>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-teal mb-2">Key Features:</h4>
                          <ul className="space-y-1">
                            {selectedMailer.features.map((feature, index) => (
                              <li key={index} className="text-slate text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-teal rounded-full"></div>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-teal mb-2">Design Elements:</h4>
                          <ul className="space-y-1 text-slate text-sm">
                            <li>• Professional branding</li>
                            <li>• Clear call-to-action</li>
                            <li>• Contact information</li>
                            <li>• Service highlights</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <Card className="bg-gradient-to-r from-teal/20 to-navy-accent/20 border-teal/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Create Your Own Mailers?</h3>
              <p className="text-slate mb-6 max-w-2xl mx-auto">
                Join Sold2Move to access our comprehensive database of sold listings and create targeted direct mail campaigns 
                that convert prospects into customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-teal hover:bg-teal/90 text-white">
                  <Link to="/signup">Get Started Free</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-teal text-teal hover:bg-teal hover:text-white">
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SampleMailersPage;
