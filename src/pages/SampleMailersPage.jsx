import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';

const movingCompanyMailers = [
  {
    id: 1,
    name: 'Andrews Moving & Storage',
    description: 'Official Mover of The Guardians - Baseball themed moving services',
    frontImage: '/images/mailers/67e1b8cb08c2c873a713c37d_andrews front.webp',
    backImage: '/images/mailers/67e1b42fa9f5b1fbdac7d8f5_andrews back.webp',
    features: ['Baseball partnership', 'Special offers', 'Professional branding']
  },
  {
    id: 2,
    name: 'Happy Helpers Moving Co.',
    description: 'Veteran owned business with patriotic theme',
    frontImage: '/images/mailers/67e1bb25e67a5308155c9cbe_happy front.webp',
    backImage: '/images/mailers/67e1bb24b0f27a33a6496303_happy back.webp',
    features: ['Veteran owned', 'Patriotic design', 'Community focused']
  },
  {
    id: 3,
    name: 'Varsity Movers',
    description: 'Clean, professional design emphasizing strength and precision',
    frontImage: '/images/mailers/67e1c494d7ee0390699f097f_varsity front.webp',
    backImage: '/images/mailers/67e1c494e08c7f8303c6ee67_varsity back.webp',
    features: ['Professional design', 'Service highlights', 'Modern layout']
  },
  {
    id: 4,
    name: 'Florida Moving Pros',
    description: 'Bear mascot branding with family-friendly approach',
    frontImage: '/images/mailers/67e1c4950075aed581f09b8d_florida fornt.webp',
    backImage: '/images/mailers/67e1c4949fb11397fbdde822_florida back.webp',
    features: ['Mascot branding', 'Family friendly', 'Local expertise']
  },
  {
    id: 5,
    name: 'Dearman Moving & Storage',
    description: 'Emotional connection focused design emphasizing care',
    frontImage: '/images/mailers/67e1d953dceab167ce276e8f_dearman front.webp',
    backImage: '/images/mailers/67e1d95342e6ac8872f5608a_dearman back.webp',
    features: ['Emotional appeal', 'Family values', 'Service guarantees']
  },
  {
    id: 6,
    name: 'Move Indy Moving and Storage',
    description: 'Local family-owned business with community partnerships',
    frontImage: '/images/mailers/67e1d953045b5adf261680d1_move indy front.webp',
    backImage: '/images/mailers/67e1d953381b7dfd8804086f_move indi back.webp',
    features: ['Family owned', 'Community partnerships', 'Local focus']
  },
  {
    id: 7,
    name: 'Texas Best Moving & Storage',
    description: 'Texas pride with professional service offerings',
    frontImage: '/images/mailers/67e1d953b0e4bf1b7bd3cdf7_texas front.webp',
    backImage: '/images/mailers/67e1d95432cef390cfc0df38_texas back.webp',
    features: ['Texas branding', 'Professional services', 'Local expertise']
  },
  {
    id: 8,
    name: 'LaBarbera Movers',
    description: 'Professional team showcase with service variety',
    frontImage: '/images/mailers/67e1e1fc1b01a5f1de8aaf61_barbera front.webp',
    backImage: '/images/mailers/67e1e1fc65fa960788c38504_barbera back.webp',
    features: ['Team showcase', 'Service variety', 'Professional image']
  },
  {
    id: 9,
    name: 'Moving Team Six',
    description: 'Mission-focused branding with comprehensive services',
    frontImage: '/images/mailers/67e1b92a336ab16554a84832_six front.webp',
    backImage: '/images/mailers/67e1b92a4a02d97dac749444_six back.webp',
    features: ['Mission focused', 'Comprehensive services', 'Professional team']
  },
  {
    id: 10,
    name: 'Meridian Moving & Storage',
    description: 'Clean, modern design with compass branding',
    frontImage: '/images/mailers/67e1e1fcdbe0edb3e522534d_meridian front.webp',
    backImage: '/images/mailers/67e1e1fcdac6e5b417eb84d2_meridian back.webp',
    features: ['Modern design', 'Compass branding', 'Professional services']
  },
  {
    id: 11,
    name: '2 College Brothers',
    description: 'Purple and gold branding with comprehensive services',
    frontImage: '/images/mailers/67e1be79e67a530815608a8b_college front.webp',
    backImage: '/images/mailers/67e1be79e9bec973dadea21e_college back.webp',
    features: ['College theme', 'Comprehensive services', 'Professional branding']
  },
  {
    id: 12,
    name: 'Blue Men Moving LLC',
    description: 'Blue theme with professional team showcase',
    frontImage: '/images/mailers/67e1e1fceb351be4078a7f95_blue front.webp',
    backImage: '/images/mailers/67e1e1fc40ffa27f9604bddd_blue back.webp',
    features: ['Blue branding', 'Team showcase', 'Professional services']
  }
];

const SampleMailersPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-deep-navy"
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
            className="text-5xl font-bold text-lightest-slate mb-4 font-heading"
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
          <Card className="bg-light-navy border-teal/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-teal mb-2">12+</div>
              <div className="text-slate">Real Mailer Examples</div>
            </CardContent>
          </Card>
          <Card className="bg-light-navy border-teal/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-teal mb-2">100%</div>
              <div className="text-slate">Professional Designs</div>
            </CardContent>
          </Card>
          <Card className="bg-light-navy border-teal/20">
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
          <Card className="bg-light-navy border-teal/20">
            <CardHeader>
              <CardTitle className="text-3xl text-teal text-center font-heading">Professional Moving Company Mailers</CardTitle>
              <CardDescription className="text-center text-slate text-lg">
                Real examples from successful moving companies across North America.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {movingCompanyMailers.map((mailer) => (
                  <motion.div
                    key={mailer.id}
                    className="space-y-4"
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-lightest-slate mb-2 font-heading">{mailer.name}</h3>
                      <p className="text-slate text-sm">{mailer.description}</p>
                    </div>
                    
                {/* Front and Back Images */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="text-xs text-slate text-center">Front</div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div 
                          className="rounded-lg overflow-hidden border-2 border-teal/20 hover:border-teal transition-colors cursor-pointer"
                          onClick={() => setSelectedImage({ src: mailer.frontImage, alt: `${mailer.name} - Front`, name: mailer.name })}
                        >
                          <img 
                            src={mailer.frontImage}
                            alt={`${mailer.name} - Front`}
                            className="w-full h-auto object-cover hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate text-center">Back</div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div 
                          className="rounded-lg overflow-hidden border-2 border-teal/20 hover:border-teal transition-colors cursor-pointer"
                          onClick={() => setSelectedImage({ src: mailer.backImage, alt: `${mailer.name} - Back`, name: mailer.name })}
                        >
                          <img 
                            src={mailer.backImage}
                            alt={`${mailer.name} - Back`}
                            className="w-full h-auto object-cover hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
                    
                    {/* Features */}
                    <div className="mt-4">
                      <h4 className="font-semibold text-teal mb-2 text-sm">Key Features:</h4>
                      <ul className="space-y-1">
                        {mailer.features.map((feature, index) => (
                          <li key={index} className="text-slate text-xs flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-teal rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
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
          <Card className="bg-gradient-to-r from-teal/20 to-navy-accent/20 border-teal/30">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-lightest-slate mb-4 font-heading">Ready to Create Your Own Mailers?</h3>
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

      {/* Image Zoom Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-6xl bg-light-navy border-teal p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-teal mb-4 text-center font-heading">
                  {selectedImage.name}
                </h3>
                <div className="flex justify-center">
                  <img 
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
};

export default SampleMailersPage;
