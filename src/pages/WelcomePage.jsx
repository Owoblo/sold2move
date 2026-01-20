import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@supabase/auth-helpers-react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Search,
  Target,
  ArrowRight,
  Sparkles,
  Users,
  MapPin,
  TrendingUp
} from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const session = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for profile to load
    if (!profileLoading && profile) {
      setIsLoading(false);
    }
  }, [profile, profileLoading]);

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  const handleSkipToDashboard = () => {
    navigate('/dashboard');
  };

  if (isLoading || profileLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-deep-navy text-lightest-slate">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal"></div>
        <p className="text-light-slate mt-4">Loading your account...</p>
      </div>
    );
  }

  return (
    <PageWrapper title="Welcome to Sold2Move!" description="Your account is ready - let's get you started finding moving leads.">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal/10 rounded-full mb-6">
            <Sparkles className="h-10 w-10 text-teal" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-lightest-slate mb-4">
            Welcome to Sold2Move!
          </h1>
          <p className="text-xl text-slate mb-8 max-w-2xl mx-auto">
            Your account is set up and ready to go. Let's take a quick tour to show you how to find and convert moving leads.
          </p>
          
          {/* Free Trial Badge */}
          <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 rounded-full px-6 py-3 mb-8">
            <Sparkles className="h-5 w-5 text-teal" />
            <span className="text-teal font-semibold">
              1 Month Free - Worth Over $500!
            </span>
          </div>

          <p className="text-slate text-lg max-w-xl mx-auto">
            Full access to all features during your free trial. No credit card required.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="bg-light-navy/50 border-lightest-navy/20">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-teal/10 rounded-full mb-4 mx-auto">
                <Search className="h-6 w-6 text-teal" />
              </div>
              <CardTitle className="text-lightest-slate">Find Moving Leads</CardTitle>
              <CardDescription className="text-slate">
                Discover properties that are likely to be moving soon using our advanced algorithms.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-light-navy/50 border-lightest-navy/20">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-teal/10 rounded-full mb-4 mx-auto">
                <Target className="h-6 w-6 text-teal" />
              </div>
              <CardTitle className="text-lightest-slate">Target Your Market</CardTitle>
              <CardDescription className="text-slate">
                Focus on specific cities, neighborhoods, or property types that match your business.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-light-navy/50 border-lightest-navy/20">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-teal/10 rounded-full mb-4 mx-auto">
                <TrendingUp className="h-6 w-6 text-teal" />
              </div>
              <CardTitle className="text-lightest-slate">Convert & Grow</CardTitle>
              <CardDescription className="text-slate">
                Turn leads into customers and grow your moving business with our proven system.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-light-navy/30 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-heading font-bold text-lightest-slate text-center mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/20 rounded-full mb-4">
                <span className="text-2xl font-bold text-teal">1</span>
              </div>
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">Set Your Preferences</h3>
              <p className="text-slate">
                Tell us which cities and property types you want to target for moving leads.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/20 rounded-full mb-4">
                <span className="text-2xl font-bold text-teal">2</span>
              </div>
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">Discover Properties</h3>
              <p className="text-slate">
                Our system finds properties that are likely to be moving soon in your target areas.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/20 rounded-full mb-4">
                <span className="text-2xl font-bold text-teal">3</span>
              </div>
              <h3 className="text-lg font-semibold text-lightest-slate mb-2">Reveal & Contact</h3>
              <p className="text-slate">
                Use your credits to reveal contact details and start reaching out to potential customers.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-teal mb-2">$500+</div>
            <div className="text-slate">Value of your free trial month</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-teal mb-2">Unlimited</div>
            <div className="text-slate">Access to all features</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-teal mb-2">24/7</div>
            <div className="text-slate">Lead discovery and updates</div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-teal/10 to-teal/5 border border-teal/20 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-heading font-bold text-lightest-slate mb-4">
              Ready to Start Finding Leads?
            </h2>
            <p className="text-slate mb-6 max-w-2xl mx-auto">
              Let's set up your preferences and show you how to find your first moving leads. 
              The whole process takes just a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                className="bg-teal text-deep-navy hover:bg-teal/90 px-8 py-3 text-lg"
                size="lg"
              >
                <Users className="mr-2 h-5 w-5" />
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                onClick={handleSkipToDashboard}
                variant="outline"
                className="border-lightest-navy/30 text-lightest-slate hover:bg-light-navy/50 px-8 py-3 text-lg"
                size="lg"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Skip to Dashboard
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-slate">
            You can always set up your preferences later from your dashboard.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
};

export default WelcomePage;
