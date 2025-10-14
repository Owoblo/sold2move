import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster as ShadToaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import WelcomeMessage from '@/components/onboarding/WelcomeMessage';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { storeIntendedDestination } from '@/utils/authUtils';
import { testAuthFlow } from '@/utils/authDebugger';
import { supabase } from '@/lib/customSupabaseClient';

const HomePage = lazy(() => import('@/pages/HomePage'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));
const SignUpSuccessPage = lazy(() => import('@/pages/SignUpSuccessPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const WelcomePage = lazy(() => import('@/pages/WelcomePage'));
const ComponentTestPage = lazy(() => import('@/pages/ComponentTestPage'));
const BillingTestPage = lazy(() => import('@/pages/BillingTestPage'));
const ProtectedRoute = lazy(() => import('@/components/layout/ProtectedRoute'));
const PublicRoute = lazy(() => import('@/components/layout/PublicRoute'));
const DashboardLayout = lazy(() => import('@/components/dashboard/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AccountHub = lazy(() => import('@/components/dashboard/pages/AccountHub'));
const Orders = lazy(() => import('@/components/dashboard/pages/Orders'));
const SupportTicket = lazy(() => import('@/components/dashboard/pages/SupportTicket'));
const Billing = lazy(() => import('@/components/dashboard/pages/BillingLive'));
const MailingAssets = lazy(() => import('@/components/dashboard/pages/MailingAssets'));
const Products = lazy(() => import('@/components/dashboard/pages/Products'));
const Listings = lazy(() => import('@/components/dashboard/pages/Listings'));
const Mailing = lazy(() => import('@/components/dashboard/pages/Mailing'));
const DigitalMarketing = lazy(() => import('@/components/dashboard/pages/DigitalMarketing'));
const Resources = lazy(() => import('@/components/dashboard/pages/Resources'));
const SampleMailers = lazy(() => import('@/components/dashboard/pages/SampleMailers'));
const VideoTutorials = lazy(() => import('@/components/dashboard/pages/VideoTutorials'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const HealthCheck = lazy(() => import('@/pages/HealthCheck'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const SettingsPage = lazy(() => import('@/components/dashboard/pages/SettingsPage'));
const PostAuthPage = lazy(() => import('@/pages/PostAuthPage'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const Success = lazy(() => import('@/pages/Success'));
const RequestDemoPage = lazy(() => import('@/pages/RequestDemoPage'));
const HowMovingCompaniesCanUseSoldListings = lazy(() => import('@/pages/HowMovingCompaniesCanUseSoldListings'));
const SoldHouseListingsGuide = lazy(() => import('@/pages/SoldHouseListingsGuide'));
const OntarioSoldListings = lazy(() => import('@/pages/OntarioSoldListings'));
const CanadaSoldListings = lazy(() => import('@/pages/CanadaSoldListings'));
const USASoldListings = lazy(() => import('@/pages/USASoldListings'));
const TorontoSoldListings = lazy(() => import('@/pages/TorontoSoldListings'));
const VancouverSoldListings = lazy(() => import('@/pages/VancouverSoldListings'));
const RouteGuard = lazy(() => import('@/components/layout/RouteGuard'));

const SuspenseFallback = () => (
  <div className="flex justify-center items-center h-screen bg-deep-navy">
    <LoadingSpinner size="xl" />
  </div>
);

function App() {
  const location = useLocation();
  const { session, loading } = useAuth();
  const { 
    showTour, 
    showWelcomeMessage, 
    startTour, 
    completeTour, 
    skipTour 
  } = useOnboarding();

  // Store intended destination for deep links and protected routes
  useEffect(() => {
    if (location.pathname && 
        location.pathname !== '/login' && 
        location.pathname !== '/signup' && 
        location.pathname !== '/' &&
        location.pathname !== '/auth/callback') {
      storeIntendedDestination(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  // Debug session changes and run auth flow test
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 App: Session changed', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        currentPath: location.pathname,
        loading
      });
      
      // Run comprehensive auth flow test
      testAuthFlow(supabase);
    }
  }, [session, location.pathname, loading]);

  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname === '/onboarding';

  return (
    <div className="bg-deep-navy flex flex-col min-h-screen">
      {!isDashboardRoute && <Header />}
      <main className="flex-grow">
        <ErrorBoundary>
          <Suspense fallback={<SuspenseFallback />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<HomePage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/request-demo" element={<RequestDemoPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                
                {/* SEO Content Pages */}
                <Route path="/how-moving-companies-can-use-sold-listings-ontario" element={<HowMovingCompaniesCanUseSoldListings />} />
                <Route path="/sold-house-listings-canada-guide-movers" element={<SoldHouseListingsGuide />} />
                
                {/* Local SEO Landing Pages */}
                <Route path="/ontario-sold-listings" element={<OntarioSoldListings />} />
                <Route path="/canada-sold-listings" element={<CanadaSoldListings />} />
                <Route path="/usa-sold-listings" element={<USASoldListings />} />
                <Route path="/toronto-sold-listings" element={<TorontoSoldListings />} />
                <Route path="/vancouver-sold-listings" element={<VancouverSoldListings />} />
                
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
                <Route path="/signup-success" element={<PublicRoute><SignUpSuccessPage /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/post-auth" element={<PostAuthPage />} />
        <Route 
          path="/welcome"
          element={
            <ProtectedRoute>
              <WelcomePage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/test-components"
          element={
            <ProtectedRoute>
              <ComponentTestPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/test-billing"
          element={
            <ProtectedRoute>
              <BillingTestPage />
            </ProtectedRoute>
          }
        />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/success" element={<Success />} />
                <Route path="/health" element={<HealthCheck />} />
                
                <Route 
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />

                <Route 
                  path="/*"
                  element={
                    <RouteGuard>
                      <Routes>
                        <Route 
                          path="/dashboard/*" 
                          element={<DashboardLayout />} 
                        >
                          <Route index element={<DashboardPage />} />
                          <Route path="account" element={<AccountHub />} />
                          <Route path="settings" element={<SettingsPage />} />
                          <Route path="orders" element={<Orders />} />
                          <Route path="support" element={<SupportTicket />} />
                          <Route path="billing" element={<Billing />} />
                          <Route path="assets" element={<MailingAssets />} />
                          <Route path="products" element={<Products />} />
                          <Route path="listings/*" element={<Listings />} />
                          <Route path="mailing" element={<Mailing />} />
                          <Route path="digital-marketing" element={<DigitalMarketing />} />
                          <Route path="resources" element={<Resources />} />
                          <Route path="sample-mailers" element={<SampleMailers />} />
                          <Route path="tutorials" element={<VideoTutorials />} />
                        </Route>
                      </Routes>
                    </RouteGuard>
                  }
                />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isDashboardRoute && <Footer />}
      <ShadToaster />
      
      {/* Onboarding Components - Only show for authenticated users */}
      {session && (
        <>
          <WelcomeMessage 
            onStartTour={startTour}
            onDismiss={skipTour}
            showWelcomeMessage={showWelcomeMessage}
          />
          <OnboardingTour
            isOpen={showTour}
            onComplete={completeTour}
            onSkip={skipTour}
          />
        </>
      )}
    </div>
  );
}

export default App;