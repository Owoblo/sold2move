import React from 'react';
import { CheckCircle, Gift, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const CongratulationsDialog = ({ isOpen, onClose, credits = 100 }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-deep-navy border-lightest-navy/20">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="mx-auto mb-4"
          >
            <div className="w-20 h-20 bg-teal/20 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-teal" />
            </div>
          </motion.div>
          
          <DialogTitle className="text-2xl font-bold text-lightest-slate mb-2">
            🎉 Welcome to Sold2Move!
          </DialogTitle>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-teal/10 border border-teal/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-teal" />
                <span className="font-semibold text-teal">Signup Bonus!</span>
              </div>
              <p className="text-lightest-slate text-lg font-bold">
                You've received <span className="text-teal">{credits} free credits</span>
              </p>
              <p className="text-slate text-sm">
                Start exploring real-time moving leads in your area
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-slate">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal" />
                <span>Access to real-time moving leads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal" />
                <span>Advanced filtering options</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal" />
                <span>Export capabilities</span>
              </div>
            </div>
          </motion.div>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Button 
            onClick={onClose}
            className="w-full bg-teal text-deep-navy hover:bg-teal/90 font-semibold"
          >
            Start Exploring Leads
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CongratulationsDialog;
