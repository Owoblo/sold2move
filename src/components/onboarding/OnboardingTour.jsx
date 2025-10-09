import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CheckCircle, 
  Zap, 
  Search, 
  Download, 
  Settings,
  Home,
  Building,
  DollarSign,
  Target,
  Star,
  ArrowRight,
  Play
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile.jsx';
import { useToast } from '@/components/ui/use-toast';

const OnboardingTour = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const { profile } = useProfile();
  const { toast } = useToast();
  const tourRef = useRef(null);

  const tourSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Sold2Move!',
      description: 'Let\'s take a quick tour to show you how to find and convert moving leads.',
      icon: Home,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="h-8 w-8 text-teal" />
            </div>
            <h3 className="text-lg font-semibold text-lightest-slate mb-2">
              Your Lead Generation Dashboard
            </h3>
            <p className="text-slate text-sm">
              We'll show you how to find high-value moving leads from recent property sales and listings.
            </p>
          </div>
          <div className="bg-deep-navy/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-teal" />
              <span className="text-sm font-medium text-lightest-slate">You have 100 free credits to start!</span>
            </div>
            <p className="text-xs text-slate">
              Each property reveal costs 1-2 credits depending on the listing type.
            </p>
          </div>
        </div>
      ),
      action: 'Next',
      position: 'center'
    },
    {
      id: 'listings',
      title: 'Find Moving Leads',
      description: 'Discover recently sold properties and new listings in your service area.',
      icon: Building,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-deep-navy/30 rounded-lg">
              <Building className="h-6 w-6 text-teal mx-auto mb-2" />
              <h4 className="text-sm font-medium text-lightest-slate">Just Listed</h4>
              <p className="text-xs text-slate">New properties on the market</p>
              <Badge className="mt-1 text-xs">1 credit each</Badge>
            </div>
            <div className="text-center p-3 bg-deep-navy/30 rounded-lg">
              <Target className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-lightest-slate">Recently Sold</h4>
              <p className="text-xs text-slate">High-potential moving leads</p>
              <Badge className="mt-1 text-xs bg-amber-400/10 text-amber-400">2 credits each</Badge>
            </div>
          </div>
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-sm text-teal">
              <strong>Pro Tip:</strong> Focus on recently sold properties - these homeowners are most likely to move soon!
            </p>
          </div>
        </div>
      ),
      action: 'Got it!',
      position: 'center'
    },
    {
      id: 'reveal',
      title: 'Reveal Property Details',
      description: 'Use credits to reveal full property information and contact details.',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-deep-navy/30 rounded-lg">
              <div className="w-8 h-8 bg-slate/20 rounded flex items-center justify-center">
                <span className="text-sm">🏠</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate">Before reveal:</p>
                <p className="text-sm font-medium text-lightest-slate">***** ******* **</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate" />
              <div className="flex-1">
                <p className="text-sm text-slate">After reveal:</p>
                <p className="text-sm font-medium text-teal">123 Main Street</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
            <p className="text-sm text-amber-400">
              <strong>Remember:</strong> You can reveal multiple properties at once with bulk operations to save credits!
            </p>
          </div>
        </div>
      ),
      action: 'Show me!',
      position: 'center'
    },
    {
      id: 'filters',
      title: 'Use Smart Filters',
      description: 'Narrow down your search to find the most valuable leads.',
      icon: Search,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-deep-navy/30 rounded">
              <Search className="h-4 w-4 text-teal" />
              <span className="text-sm text-lightest-slate">Search by address or city</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-deep-navy/30 rounded">
              <DollarSign className="h-4 w-4 text-teal" />
              <span className="text-sm text-lightest-slate">Filter by price range</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-deep-navy/30 rounded">
              <Building className="h-4 w-4 text-teal" />
              <span className="text-sm text-lightest-slate">Property type and size</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-deep-navy/30 rounded">
              <Star className="h-4 w-4 text-teal" />
              <span className="text-sm text-lightest-slate">Save your favorite searches</span>
            </div>
          </div>
          <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              <strong>Advanced Tip:</strong> Save your most effective search combinations to quickly find similar leads in the future.
            </p>
          </div>
        </div>
      ),
      action: 'Perfect!',
      position: 'center'
    },
    {
      id: 'export',
      title: 'Export & Follow Up',
      description: 'Export your leads and start reaching out to potential customers.',
      icon: Download,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-deep-navy/30 rounded-lg">
              <Download className="h-5 w-5 text-teal" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">Export to CSV</p>
                <p className="text-xs text-slate">Include contact information</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-deep-navy/30 rounded-lg">
              <Settings className="h-5 w-5 text-teal" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">CRM Integration</p>
                <p className="text-xs text-slate">Connect to Salesforce, HubSpot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-deep-navy/30 rounded-lg">
              <Play className="h-5 w-5 text-teal" />
              <div>
                <p className="text-sm font-medium text-lightest-slate">Email Templates</p>
                <p className="text-xs text-slate">Pre-built outreach messages</p>
              </div>
            </div>
          </div>
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-sm text-teal">
              <strong>Success Tip:</strong> Follow up quickly! Most moving companies contact new leads within 24-48 hours of a sale.
            </p>
          </div>
        </div>
      ),
      action: 'Let\'s go!',
      position: 'center'
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start finding and converting moving leads right away.',
      icon: CheckCircle,
      content: (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-teal" />
          </div>
          <h3 className="text-lg font-semibold text-lightest-slate">
            Ready to Find Your First Leads?
          </h3>
          <p className="text-slate text-sm">
            You now know how to use Sold2Move to find and convert moving leads. 
            Let's start with your first search!
          </p>
          <div className="bg-deep-navy/30 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate">Your starting credits:</span>
              <span className="text-teal font-semibold">100 credits</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate">Estimated reveals:</span>
              <span className="text-lightest-slate font-semibold">50-100 properties</span>
            </div>
          </div>
        </div>
      ),
      action: 'Start Finding Leads',
      position: 'center'
    }
  ];

  const currentStepData = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    onComplete();
    toast({
      title: "Tour Complete!",
      description: "You're ready to start finding moving leads. Good luck!",
    });
  };

  const handleSkip = () => {
    onSkip();
    toast({
      title: "Tour Skipped",
      description: "You can always restart the tour from the help menu.",
    });
  };

  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      >
        <motion.div
          ref={tourRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-md"
        >
          <Card className="bg-light-navy border-lightest-navy/20">
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {React.createElement(currentStepData.icon, { 
                    className: "h-5 w-5 text-teal" 
                  })}
                  <span className="text-sm text-slate">
                    Step {currentStep + 1} of {tourSteps.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <CardTitle className="text-xl text-lightest-slate">
                {currentStepData.title}
              </CardTitle>
              <CardDescription className="text-slate">
                {currentStepData.description}
              </CardDescription>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-deep-navy/30 rounded-full h-2">
                  <motion.div
                    className="bg-teal h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {currentStepData.content}
            </CardContent>
            
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentStep 
                          ? 'bg-teal' 
                          : completedSteps.has(index)
                          ? 'bg-teal/50'
                          : 'bg-slate/30'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={handleNext}
                  className="bg-teal text-deep-navy hover:bg-teal/90 flex items-center gap-2"
                >
                  {currentStepData.action}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
