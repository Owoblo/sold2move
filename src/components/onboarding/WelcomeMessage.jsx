import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile.jsx';

const WelcomeMessage = ({ onStartTour, onDismiss, showWelcomeMessage }) => {
  const { profile } = useProfile();

  if (!showWelcomeMessage) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="w-full max-w-md bg-light-navy border-lightest-navy/20">
          <CardContent className="p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
              className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="h-8 w-8 text-green" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-lightest-slate mb-2"
            >
              Welcome to Sold2Move!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate mb-6"
            >
              Your account is set up and ready to go. Let's take a quick tour to show you how to find and convert moving leads.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-deep-navy/30 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-green" />
                <span className="font-semibold text-lightest-slate">You have {profile?.credits_remaining || 100} free credits!</span>
              </div>
              <p className="text-sm text-slate">
                Each property reveal costs 1-2 credits. That's enough to reveal 50-100 properties to get you started.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-3"
            >
              <Button
                onClick={onDismiss}
                variant="outline"
                className="flex-1"
              >
                Skip Tour
              </Button>
              <Button
                onClick={onStartTour}
                className="flex-1 bg-green text-deep-navy hover:bg-green/90"
              >
                Start Tour
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeMessage;
