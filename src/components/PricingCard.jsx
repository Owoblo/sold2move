import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Loader2 } from 'lucide-react';

const PricingCard = ({ plan, isYearly, handleCheckout, loadingPriceId, isPaid, isCurrentPlan, navigate }) => {
  const isPopular = plan.popular;
  const price = isYearly ? plan.prices.yearly : plan.prices.monthly;

  const handleButtonClick = () => {
    if (isCurrentPlan) return;
    if (isPaid && plan.title !== 'Free Trial') {
      navigate('/dashboard/billing');
      return;
    }
    if (plan.title === 'Free Trial' && !isPaid) {
      handleCheckout(price);
    } else if (plan.title !== 'Free Trial') {
      // User request: "let the "choose plan" button lead to the test-checkout page.."
      if (plan.title === 'Starter' || plan.title === 'Growth' || plan.title === 'Enterprise') {
        navigate('/test-checkout');
      } else {
        handleCheckout(price);
      }
    } else if (plan.title === 'Free Trial' && isPaid) {
      navigate('/dashboard');
    }
  };

  const getButtonText = () => {
    if (loadingPriceId === (price.id || 'free_trial')) {
      return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    if (isCurrentPlan) {
      return 'Current Plan';
    }
    if (isPaid && plan.title !== 'Free Trial') {
      return 'Manage Plan';
    }
    return plan.cta;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: plan.delay * 0.1 }}
      className="h-full"
    >
      <Card className={`h-full flex flex-col bg-light-navy border ${isPopular ? 'border-green shadow-2xl shadow-green/10' : 'border-lightest-navy/20'} ${isCurrentPlan ? 'ring-2 ring-green' : ''}`}>
        {isPopular && (
          <div className="bg-green text-deep-navy text-sm font-bold text-center py-1.5 rounded-t-lg">MOST POPULAR</div>
        )}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green font-heading">{plan.title}</CardTitle>
          <CardDescription className="text-slate min-h-[40px]">{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center">
          <div className="text-center mb-6 h-20">
            <span className="text-5xl font-bold text-lightest-slate font-heading">${price.amount}</span>
            <span className="text-slate">{price.interval}</span>
            {isYearly && plan.prices.monthly.amount > 0 && (
                <p className="text-sm text-green h-4 mt-1">Save ${plan.prices.monthly.amount * 12 - price.amount}!</p>
            )}
            {(!isYearly || plan.prices.monthly.amount === 0) && <div className="h-4 mt-1"></div>}
          </div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-green/10 text-green font-bold py-2 px-4 rounded-full">
              <Zap className="w-5 h-5 mr-2" />
              <span>{plan.credits}</span>
            </div>
          </div>
          <ul className="space-y-3 text-left w-full">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleButtonClick}
            disabled={loadingPriceId === (price.id || 'free_trial') || isCurrentPlan}
            className={`w-full text-lg py-6 ${isPopular ? 'bg-green text-deep-navy hover:bg-green/90' : 'bg-lightest-navy text-lightest-slate hover:bg-lightest-navy/80'} disabled:opacity-50`}
          >
            {getButtonText()}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default PricingCard;