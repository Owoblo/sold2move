import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Helmet } from 'react-helmet-async';

const movingCompanyMailers = [
  {
    id: 1,
    name: 'Andrews Moving & Storage',
    description: 'Official Mover of The Guardians - Baseball themed moving services with special offers',
    src: '/api/placeholder/600/400',
    alt: 'Andrews Moving & Storage - Official Mover of The Guardians',
    features: ['Baseball partnership', 'Special offers', 'Professional branding', 'Customer testimonials']
  },
  {
    id: 2,
    name: 'Happy Helpers Moving Co.',
    description: 'Veteran owned business with patriotic theme and comprehensive moving services',
    src: '/api/placeholder/600/400',
    alt: 'Happy Helpers Moving Co. - Veteran owned patriotic design',
    features: ['Veteran owned', 'Patriotic design', 'Multiple service offerings', 'Community focused']
  },
  {
    id: 3,
    name: 'Varsity Movers',
    description: 'Clean, professional design emphasizing strength, agility, and precision in moving',
    src: '/api/placeholder/600/400',
    alt: 'Varsity Movers - Professional design with service highlights',
    features: ['Professional design', 'Service highlights', 'Discount offers', 'Modern layout']
  },
  {
    id: 4,
    name: 'Florida Moving Pros',
    description: 'Bear mascot branding with family-friendly approach and local expertise',
    src: '/api/placeholder/600/400',
    alt: 'Florida Moving Pros - Bear mascot family-friendly design',
    features: ['Mascot branding', 'Family friendly', 'Local expertise', 'Clear pricing']
  },
  {
    id: 5,
    name: 'Dearman Moving & Storage',
    description: 'Emotional connection focused design emphasizing care and family values',
    src: '/api/placeholder/600/400',
    alt: 'Dearman Moving & Storage - Family values emotional design',
    features: ['Emotional appeal', 'Family values', 'Customer testimonials', 'Service guarantees']
  },
  {
    id: 6,
    name: 'Move Indy Moving and Storage',
    description: 'Local family-owned business with community partnerships and personal touch',
    src: '/api/placeholder/600/400',
    alt: 'Move Indy - Family owned local business design',
    features: ['Family owned', 'Community partnerships', 'Personal testimonials', 'Local focus']
  },
  {
    id: 7,
    name: 'Texas Best Moving & Storage',
    description: 'Texas pride with professional service offerings and customer satisfaction focus',
    src: '/api/placeholder/600/400',
    alt: 'Texas Best Moving & Storage - Texas pride professional design',
    features: ['Texas branding', 'Professional services', 'Customer testimonials', 'Local expertise']
  },
  {
    id: 8,
    name: 'LaBarbera Movers',
    description: 'Professional team showcase with service variety and customer testimonials',
    src: '/api/placeholder/600/400',
    alt: 'LaBarbera Movers - Professional team showcase',
    features: ['Team showcase', 'Service variety', 'Professional image', 'Customer reviews']
  },
  {
    id: 9,
    name: 'Moving Team Six',
    description: 'Mission-focused branding with comprehensive services and veteran connections',
    src: '/api/placeholder/600/400',
    alt: 'Moving Team Six - Mission focused comprehensive services',
    features: ['Mission focused', 'Comprehensive services', 'Veteran connections', 'Professional team']
  },
  {
    id: 10,
    name: 'Meridian Moving & Storage',
    description: 'Clean, modern design with compass branding and customer satisfaction focus',
    src: '/api/placeholder/600/400',
    alt: 'Meridian Moving & Storage - Modern compass branding',
    features: ['Modern design', 'Compass branding', 'Customer satisfaction', 'Professional services']
  },
  {
    id: 11,
    name: 'College H.U.N.K.S. Hauling Junk & Moving',
    description: 'Personal letter format with owner introduction and service explanation',
    src: '/api/placeholder/600/400',
    alt: 'College H.U.N.K.S. - Personal letter owner introduction',
    features: ['Personal approach', 'Owner introduction', 'Service explanation', 'Veteran background']
  },
  {
    id: 12,
    name: '2 College Brothers',
    description: 'Purple and gold branding with comprehensive moving and storage services',
    src: '/api/placeholder/600/400',
    alt: '2 College Brothers - Purple gold comprehensive services',
    features: ['College theme', 'Comprehensive services', 'Discount offers', 'Professional branding']
  },
  {
    id: 13,
    name: 'Blue Men Moving LLC',
    description: 'Blue theme with professional team showcase and customer testimonials',
    src: '/api/placeholder/600/400',
    alt: 'Blue Men Moving LLC - Blue theme professional team',
    features: ['Blue branding', 'Team showcase', 'Customer testimonials', 'Professional services']
  },
  {
    id: 14,
    name: 'Slattery Moving & Storage',
    description: 'Personal letter format with family business values and service guarantees',
    src: '/api/placeholder/600/400',
    alt: 'Slattery Moving & Storage - Personal letter family values',
    features: ['Personal letter', 'Family values', 'Service guarantees', 'Professional approach']
  },
  {
    id: 15,
    name: 'Kinetic Movers LLC',
    description: 'Professional letter format with owner introduction and service principles',
    src: '/api/placeholder/600/400',
    alt: 'Kinetic Movers LLC - Professional letter service principles',
    features: ['Professional letter', 'Owner introduction', 'Service principles', 'Local expertise']
  },
  {
    id: 16,
    name: 'Palm Paradise Moving',
    description: 'Tropical theme with comprehensive moving services and local expertise',
    src: '/api/placeholder/600/400',
    alt: 'Palm Paradise Moving - Tropical theme comprehensive services',
    features: ['Tropical theme', 'Comprehensive services', 'Local expertise', 'Professional branding']
  },
  {
    id: 17,
    name: 'HaulMen Moving Company',
    description: 'Clean design with personal touch and service offerings',
    src: '/api/placeholder/600/400',
    alt: 'HaulMen Moving Company - Clean design personal touch',
    features: ['Clean design', 'Personal touch', 'Service offerings', 'Professional approach']
  },
  {
    id: 18,
    name: 'Haulin\' Assets Moving & Storage',
    description: 'Dynamic branding with comprehensive services and customer testimonials',
    src: '/api/placeholder/600/400',
    alt: 'Haulin Assets Moving & Storage - Dynamic branding comprehensive services',
    features: ['Dynamic branding', 'Comprehensive services', 'Customer testimonials', 'Professional team']
  },
  {
    id: 19,
    name: 'Moo Moo Moving',
    description: 'Unique cow mascot branding with friendly, approachable design',
    src: '/api/placeholder/600/400',
    alt: 'Moo Moo Moving - Unique cow mascot friendly design',
    features: ['Unique mascot', 'Friendly design', 'Approachable branding', 'Professional services']
  },
  {
    id: 20,
    name: 'Movegreen',
    description: 'Eco-friendly branding with sustainability focus and comprehensive services',
    src: '/api/placeholder/600/400',
    alt: 'Movegreen - Eco-friendly sustainability focus',
    features: ['Eco-friendly', 'Sustainability focus', 'Comprehensive services', 'Professional approach']
  }
];

const SampleMailers = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Helmet>
        <title>Moving Company Mailers Gallery | Sold2Move Dashboard</title>
        <meta name="description" content="Browse our gallery of professionally designed moving company mailers for inspiration for your next direct mail campaign." />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-lightest-slate font-heading">Moving Company Mailers Gallery</h1>
        <p className="mt-2 text-lg text-slate">
          Get inspired by real moving company mailers from successful businesses across North America. Click on any sample to see details and design strategies.
        </p>
      </div>

      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-2xl text-teal">Professional Moving Company Mailers</CardTitle>
          <CardDescription>
            These samples showcase effective design strategies, compelling offers, and professional branding from real moving companies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {movingCompanyMailers.map((mailer) => (
                <DialogTrigger asChild key={mailer.id} onClick={() => setSelectedImage(mailer)}>
                  <motion.div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-teal transition-all duration-300 bg-white/5 backdrop-blur-sm"
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-teal/20 to-navy-accent/20 flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📦</div>
                        <div className="text-white font-semibold text-sm mb-1">{mailer.name}</div>
                        <div className="text-slate text-xs">{mailer.description}</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white font-bold text-sm">View Sample</p>
                      </div>
                    </div>
                  </motion.div>
                </DialogTrigger>
              ))}
            </div>
            {selectedImage && (
              <DialogContent className="max-w-4xl bg-light-navy border-teal">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-teal mb-2">{selectedImage.name}</h3>
                    <p className="text-slate">{selectedImage.description}</p>
                  </div>
                  
                  <div className="aspect-[4/3] bg-gradient-to-br from-teal/20 to-navy-accent/20 rounded-lg flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">📦</div>
                      <div className="text-white font-semibold text-xl mb-2">{selectedImage.name}</div>
                      <div className="text-slate text-lg mb-4">{selectedImage.description}</div>
                      <div className="text-sm text-slate">
                        <em>Sample mailer image would be displayed here</em>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-teal mb-2">Key Features:</h4>
                      <ul className="space-y-1">
                        {selectedImage.features.map((feature, index) => (
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
  );
};

export default SampleMailers;