import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CreditConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  creditCost, 
  remainingCredits, 
  propertyType = 'property' 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-md bg-light-navy border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal/20 rounded-md">
                  <CreditCard className="h-5 w-5 text-teal" />
                </div>
                <CardTitle className="text-lightest-slate">Credit Required</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate hover:text-lightest-slate"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-yellow/10 border border-yellow/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow" />
                <span className="text-sm text-yellow">
                  Viewing this {propertyType} will cost credits
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate">Credit Cost:</span>
                  <Badge variant="outline" className="bg-teal/10 border-teal/20 text-teal">
                    {creditCost} credit{creditCost > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate">Your Credits:</span>
                  <span className="text-lightest-slate font-medium">
                    {remainingCredits} remaining
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate">After Purchase:</span>
                  <span className="text-lightest-slate font-medium">
                    {remainingCredits - creditCost} remaining
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-teal hover:bg-teal/90"
                >
                  View Property
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreditConfirmationDialog;
