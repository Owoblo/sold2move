import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

const PageWrapper = ({ children, title, description }) => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
  };

  const fullTitle = title ? `${title} | Sold2Move` : 'Sold2Move';

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
      </Helmet>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen bg-deep-navy">
            <Loader2 className="h-8 w-8 animate-spin text-green" />
          </div>
        }
      >
        <motion.div
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
        >
          {children}
        </motion.div>
      </Suspense>
    </>
  );
};

export default PageWrapper;