import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Helmet } from 'react-helmet-async';

const mailerSamples = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1545591841-4a97f1da8d1f',
    alt: 'Just Listed postcard with a modern house photo',
    description: 'A "Just Listed" postcard featuring a modern home with large windows.',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1595872018818-97555653a011',
    alt: 'Just Sold postcard with a family home picture',
    description: 'A "Just Sold" postcard template showcasing a suburban family house.',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
    alt: 'Real estate postcard offering a free home evaluation',
    description: 'A direct mail postcard offering a free home evaluation to potential sellers.',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
    alt: 'We have buyers postcard for a specific neighborhood',
    description: 'A postcard indicating that there are interested buyers for homes in the area.',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    alt: 'Just Listed postcard with multiple property photos',
    description: 'A "Just Listed" mailer with space for multiple property images and details.',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
    alt: 'Thinking of selling postcard with a question mark design',
    description: 'A postcard designed to catch the eye of homeowners considering selling.',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00',
    alt: 'Just Sold postcard with a clear sold sign',
    description: 'A bold "Just Sold" postcard with a prominent sold sign graphic.',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1558005530-a79588965565',
    alt: 'Real estate marketing postcard with agent photo',
    description: 'A personal branding postcard for a real estate agent with their photo.',
  },
  {
    id: 9,
    src: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
    alt: 'Happy homeowners postcard design',
    description: 'A postcard design featuring happy new homeowners to create an emotional connection.',
  },
  {
    id: 10,
    src: 'https://horizons-cdn.hostinger.com/eb08a754-dbe8-4bc1-a626-f284484522e1/a59a858123360e764c0f2dcacf020012.webp',
    alt: 'Texas moving company postcard with special offers',
    description: 'A postcard for a Texas-based moving company with coupons for moving and packing services.',
  },
];

const SampleMailers = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Helmet>
        <title>Sample Mailers | Sold2Move</title>
        <meta name="description" content="Browse our gallery of professionally designed real estate postcards for inspiration for your next direct mail campaign." />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-lightest-slate font-heading">Sample Mailers Gallery</h1>
        <p className="mt-2 text-lg text-slate">
          Get inspired by our collection of professionally designed direct mail postcards. Click on any sample to see a larger view.
        </p>
      </div>

      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-2xl text-green">Postcard Designs</CardTitle>
          <CardDescription>
            These samples showcase effective designs for "Just Listed" and "Just Sold" announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mailerSamples.map((mailer) => (
                <DialogTrigger asChild key={mailer.id} onClick={() => setSelectedImage(mailer)}>
                  <motion.div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-green transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <img 
                      className="w-full h-auto object-cover aspect-video transition-transform duration-300 group-hover:scale-105"
                      alt={mailer.alt}
                      src={mailer.src} />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">View Sample</p>
                    </div>
                  </motion.div>
                </DialogTrigger>
              ))}
            </div>
            {selectedImage && (
              <DialogContent className="max-w-4xl bg-light-navy border-green">
                 <img 
                    className="w-full h-auto rounded-md"
                    alt={selectedImage.alt}
                    src={selectedImage.src} />
              </DialogContent>
            )}
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SampleMailers;