import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/hooks/useProfile';
import { useProducts, useCouponValidation } from '@/hooks/useProducts';
import { supabase } from '@/lib/customSupabaseClient';
import { getStripe } from '@/lib/stripe';
import LoadingButton from '@/components/ui/LoadingButton';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import {
  Palette,
  FileText,
  PenTool,
  Check,
  ChevronRight,
  ChevronLeft,
  Tag,
  Sparkles,
  X,
  ShoppingCart,
  CreditCard,
  User,
  ClipboardCheck
} from 'lucide-react';

// Order form schema
const orderSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(10, 'Phone number is required'),
  designNotes: z.string().optional(),
  couponCode: z.string().optional(),
  termsAgreed: z.boolean().refine(val => val === true, 'You must agree to the terms'),
  eSignature: z.string().min(2, 'Please sign your name to confirm'),
});

// Category icons mapping
const categoryIcons = {
  postcard_design: Palette,
  letter_design: FileText,
  handwritten_card: PenTool,
};

// Product card component
const ProductCard = ({ product, onSelect, isSelected }) => {
  const Icon = categoryIcons[product.category] || Palette;
  const price = (product.price_cents / 100).toFixed(2);
  const features = product.features || [];

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 h-full ${
          isSelected
            ? 'border-teal border-2 bg-teal/5'
            : 'border-lightest-navy/20 bg-light-navy hover:border-teal/50'
        }`}
        onClick={() => onSelect(product)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-teal/10">
              <Icon className="h-6 w-6 text-teal" />
            </div>
            {isSelected && (
              <Badge className="bg-teal text-deep-navy">
                <Check className="h-3 w-3 mr-1" />
                Selected
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl text-lightest-slate mt-3">{product.name}</CardTitle>
          <CardDescription className="text-slate">{product.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold text-teal">
            ${price}
            <span className="text-sm font-normal text-slate ml-1">one-time</span>
          </div>

          <div className="space-y-2">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate">
                <Check className="h-4 w-4 text-teal flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className={`w-full ${isSelected ? 'bg-teal text-deep-navy' : 'bg-light-navy border border-teal text-teal hover:bg-teal hover:text-deep-navy'}`}
          >
            {isSelected ? 'Selected' : 'Select This Design'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                index < currentStep
                  ? 'bg-teal text-deep-navy'
                  : index === currentStep
                    ? 'bg-teal/20 border-2 border-teal text-teal'
                    : 'bg-light-navy/50 text-slate'
              }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span className={`text-xs mt-2 ${index <= currentStep ? 'text-teal' : 'text-slate'}`}>
              {step.label}
            </span>
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`w-16 h-0.5 mx-2 ${
                index < currentStep ? 'bg-teal' : 'bg-light-navy/50'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Coupon input component
const CouponInput = ({ value, onChange, onValidate, validating, result, productPrice }) => {
  const [inputValue, setInputValue] = useState(value || '');

  const handleApply = () => {
    onValidate(inputValue, productPrice);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate" />
          <Input
            placeholder="Enter coupon code"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.toUpperCase());
              onChange(e.target.value.toUpperCase());
            }}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={validating || !inputValue}
          className="border-teal text-teal hover:bg-teal hover:text-deep-navy"
        >
          {validating ? 'Checking...' : 'Apply'}
        </Button>
      </div>
      {result && (
        <div className={`text-sm ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
          {result.valid ? (
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              {result.discountDisplay} applied!
            </span>
          ) : (
            result.error
          )}
        </div>
      )}
    </div>
  );
};

// Order wizard component
const OrderWizard = ({ product, onClose, profile }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { validateCoupon, clearCoupon, validating, couponResult } = useCouponValidation();

  const steps = [
    { label: 'Design', icon: Palette },
    { label: 'Details', icon: User },
    { label: 'Review', icon: ClipboardCheck },
    { label: 'Payment', icon: CreditCard },
  ];

  const form = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: profile?.full_name || profile?.company_name || '',
      customerEmail: profile?.business_email || '',
      customerPhone: profile?.phone || '',
      designNotes: '',
      couponCode: '',
      termsAgreed: false,
      eSignature: '',
    },
  });

  const calculateFinalPrice = () => {
    const basePrice = product.price_cents;
    const discount = couponResult?.valid ? couponResult.discountCents : 0;
    return Math.max(0, basePrice - discount);
  };

  const handleCheckout = async (values) => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-product-checkout', {
        body: JSON.stringify({
          productId: product.id,
          customerInfo: {
            name: values.customerName,
            email: values.customerEmail,
            phone: values.customerPhone,
          },
          designNotes: values.designNotes,
          couponCode: couponResult?.valid ? couponResult.code : null,
          eSignature: values.eSignature,
          termsAgreedAt: new Date().toISOString(),
        }),
      });

      if (error) {
        throw error;
      }

      if (!data?.sessionId) {
        throw new Error('No checkout session created');
      }

      // Redirect to Stripe checkout
      const stripe = await getStripe();
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const values = form.getValues();
    switch (currentStep) {
      case 0:
        return true; // Product already selected
      case 1:
        return values.customerName && values.customerEmail && values.customerPhone;
      case 2:
        return true; // Review step
      case 3:
        return values.termsAgreed && values.eSignature;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-lightest-slate mb-2">{product.name}</h3>
              <p className="text-slate">{product.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-deep-navy/50 rounded-lg">
              <div className="space-y-2">
                <h4 className="font-semibold text-teal">What's Included:</h4>
                {(product.features || []).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate">
                    <Check className="h-4 w-4 text-teal flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-light-navy rounded-lg">
                <span className="text-sm text-slate">Price</span>
                <span className="text-4xl font-bold text-teal">${(product.price_cents / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-teal/10 rounded-lg border border-teal/20">
              <div className="flex items-center gap-2 text-teal">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Sample designs available in our gallery</span>
              </div>
              <p className="text-sm text-slate mt-1">
                Check out our Sample Mailers page to see examples of professional designs.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-lightest-slate">Your Information</h3>
              <p className="text-slate text-sm">We'll use this to contact you about your design</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designNotes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Design Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your brand colors, style preferences, or any specific elements you'd like included..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        const finalPrice = calculateFinalPrice();
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-lightest-slate">Review Your Order</h3>
              <p className="text-slate text-sm">Make sure everything looks correct</p>
            </div>

            <div className="bg-deep-navy/50 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-lightest-navy/20">
                <div>
                  <h4 className="font-semibold text-lightest-slate">{product.name}</h4>
                  <p className="text-sm text-slate">Custom design service</p>
                </div>
                <span className="text-lg font-semibold text-lightest-slate">
                  ${(product.price_cents / 100).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Name:</span>
                  <span className="text-lightest-slate">{form.getValues('customerName')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Email:</span>
                  <span className="text-lightest-slate">{form.getValues('customerEmail')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Phone:</span>
                  <span className="text-lightest-slate">{form.getValues('customerPhone')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-lightest-navy/20">
                <FormField
                  control={form.control}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Have a coupon?</FormLabel>
                      <CouponInput
                        value={field.value}
                        onChange={field.onChange}
                        onValidate={validateCoupon}
                        validating={validating}
                        result={couponResult}
                        productPrice={product.price_cents}
                      />
                    </FormItem>
                  )}
                />
              </div>

              {couponResult?.valid && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({couponResult.discountDisplay})</span>
                  <span>-${(couponResult.discountCents / 100).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-lightest-navy/20">
                <span className="text-lg font-semibold text-lightest-slate">Total</span>
                <span className="text-2xl font-bold text-teal">
                  ${(finalPrice / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-lightest-slate">Complete Your Order</h3>
              <p className="text-slate text-sm">Review terms and confirm your order</p>
            </div>

            <div className="bg-deep-navy/50 rounded-lg p-4 space-y-4">
              <div className="prose prose-sm prose-invert max-h-40 overflow-y-auto">
                <h4 className="text-teal">Terms & Conditions</h4>
                <p className="text-slate text-sm">
                  By placing this order, you agree that our design team will create a custom design
                  specifically for your moving company. The design will include up to 2 revision rounds
                  and will be delivered within 3-5 business days. All designs are created specifically
                  for use in your direct mail campaigns.
                </p>
                <p className="text-slate text-sm">
                  You will receive print-ready files (PDF and PNG formats) that you can use with any
                  printing service. The design remains your property after purchase.
                </p>
              </div>

              <FormField
                control={form.control}
                name="termsAgreed"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 py-4 border-t border-lightest-navy/20">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms and conditions
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eSignature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-Signature (Type your full name)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Type your full name to sign"
                        className="font-serif italic text-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between items-center p-4 bg-teal/10 rounded-lg border border-teal/20">
              <div>
                <span className="text-sm text-slate">Total to pay</span>
                <div className="text-2xl font-bold text-teal">
                  ${(calculateFinalPrice() / 100).toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate text-sm">
                <CreditCard className="h-4 w-4" />
                Secure checkout via Stripe
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-light-navy border-lightest-navy/20 p-0 max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-slate hover:text-lightest-slate"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <StepIndicator
            currentStep={currentStep}
            totalSteps={steps.length}
            steps={steps}
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCheckout)}>
              <div className="min-h-[400px] overflow-y-auto pr-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-lightest-navy/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="border-slate text-slate hover:bg-slate/10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="bg-teal text-deep-navy hover:bg-teal/90"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    disabled={!canProceed()}
                    className="bg-teal text-deep-navy hover:bg-teal/90"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Complete Purchase
                  </LoadingButton>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Products page
const Products = () => {
  const { products, loading, error } = useProducts();
  const { profile } = useProfile();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleStartOrder = () => {
    if (selectedProduct) {
      setShowWizard(true);
    }
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-light-navy">
              <CardContent className="p-6 space-y-4">
                <SkeletonLoader className="h-12 w-12 rounded-lg" />
                <SkeletonLoader className="h-6 w-2/3" />
                <SkeletonLoader className="h-4 w-full" />
                <SkeletonLoader className="h-8 w-1/3" />
                <SkeletonLoader className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-light-navy border-red-500/20">
        <CardContent className="p-6 text-center">
          <p className="text-red-400">Failed to load products: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Helmet>
        <title>Design Services | Sold2Move Dashboard</title>
        <meta name="description" content="Order custom postcard, letter, and handwritten card designs for your moving company direct mail campaigns." />
      </Helmet>

      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-lightest-slate font-heading">Design Services</h1>
        <p className="mt-2 text-lg text-slate">
          Professional custom designs for your direct mail campaigns. Stand out with branded postcards,
          letters, and handwritten cards.
        </p>
      </div>

      {/* Value Proposition */}
      <Card className="bg-gradient-to-r from-teal/10 to-light-navy border-teal/20 mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 rounded-full bg-teal/20">
              <Sparkles className="h-8 w-8 text-teal" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-semibold text-lightest-slate mb-1">
                Professional Designs That Convert
              </h2>
              <p className="text-slate">
                Our design team creates custom mailers tailored to your brand.
                Get print-ready files delivered in 3-5 business days with 2 revision rounds included.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={handleSelectProduct}
            isSelected={selectedProduct?.id === product.id}
          />
        ))}
      </div>

      {/* Selected Product CTA */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="bg-deep-navy border-teal shadow-lg shadow-teal/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div>
                  <p className="text-sm text-slate">Selected:</p>
                  <p className="font-semibold text-lightest-slate">{selectedProduct.name}</p>
                </div>
                <div className="text-xl font-bold text-teal">
                  ${(selectedProduct.price_cents / 100).toFixed(2)}
                </div>
                <Button
                  onClick={handleStartOrder}
                  className="bg-teal text-deep-navy hover:bg-teal/90"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Start Order
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Wizard Modal */}
      {showWizard && selectedProduct && (
        <OrderWizard
          product={selectedProduct}
          onClose={handleCloseWizard}
          profile={profile}
        />
      )}
    </motion.div>
  );
};

export default Products;
