import React from 'react';
import { Zap, Info } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile.jsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const LOW_CREDIT_THRESHOLD = 50;

const CreditMeter = () => {
  const { profile, loading } = useProfile();
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-lightest-slate bg-light-navy px-3 py-1.5 rounded-full">
        <SkeletonLoader className="h-4 w-16" />
      </div>
    );
  }

  const credits = profile?.credits_remaining ?? 0;
  const isUnlimited = profile?.unlimited ?? false;
  
  const displayCredits = isUnlimited ? 'Unlimited' : credits;
  const creditsColor = credits === 0 ? 'text-red-500' : credits <= LOW_CREDIT_THRESHOLD ? 'text-amber-400' : 'text-teal';

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-semibold text-lightest-slate bg-light-navy px-3 py-1.5 rounded-full hover:bg-lightest-navy/20 transition-colors">
            <Zap className={`h-4 w-4 ${isUnlimited ? 'text-teal' : creditsColor}`} />
            <span className={`${isUnlimited ? 'text-teal' : creditsColor}`}>{displayCredits}</span>
            {!isUnlimited && <span>Credits</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 mr-4 bg-light-navy border-lightest-navy/20 text-lightest-slate">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Your Credits</h4>
              <p className="text-sm text-slate">
                Credits are used to reveal property addresses.
              </p>
            </div>
            <div className="text-center">
              <p className={`text-4xl font-bold ${isUnlimited ? 'text-teal' : creditsColor}`}>
                {displayCredits}
              </p>
              <p className="text-sm text-slate">{isUnlimited ? 'Access' : 'Remaining'}</p>
            </div>
            {!isUnlimited && (
              <Button asChild size="sm" className="w-full bg-teal text-deep-navy hover:bg-teal/90">
                <Link to="/pricing#top-up">Buy More Credits</Link>
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
       <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-slate hover:text-teal cursor-pointer"/>
          </TooltipTrigger>
          <TooltipContent className="bg-light-navy border-lightest-navy/20 text-lightest-slate">
            <p>1 credit = 1 address reveal.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CreditMeter;