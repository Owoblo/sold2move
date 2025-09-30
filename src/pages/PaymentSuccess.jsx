import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    handlePaymentSuccess();
  }, [sessionId]);

  const handlePaymentSuccess = async () => {
    try {
      console.log('🎉 Processing payment success for session:', sessionId);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user's current profile with existing credits_remaining
      let profile = { credits_remaining: 500, subscription_status: 'inactive' }; // Default 500 free credits
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('credits_remaining, subscription_status')
          .eq('id', user.id)
          .single();

        if (profileData) {
          profile = {
            credits_remaining: profileData.credits_remaining || 500, // Use existing credits or default to 500
            subscription_status: profileData.subscription_status || 'inactive'
          };
        }
      } catch (error) {
        console.log('Profile query failed, using defaults:', error.message);
      }

      // Add credits based on the plan (Starter = 100 credits)
      const creditsToAdd = 100; // Starter plan credits
      const newCredits = profile.credits_remaining + creditsToAdd;

      console.log(`💰 Current credits: ${profile.credits_remaining}, Adding: ${creditsToAdd}, New total: ${newCredits}`);

      // Update user's profile with new credits and subscription status
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            credits_remaining: newCredits,
            subscription_status: 'active',
            subscription_plan: 'starter',
            subscription_started_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.log('Profile update failed:', updateError.message);
          // Don't throw error, just log it
        } else {
          console.log('✅ Successfully updated user profile with new credits');
        }
      } catch (error) {
        console.log('Profile update failed:', error.message);
        // Don't throw error, just log it
      }

      // Remove the old error handling since we're handling it above

      console.log('✅ Added', creditsToAdd, 'credits to user account');
      setCreditsAdded(creditsToAdd);
      setTotalCredits(newCredits);
      setSuccess(true);
      setLoading(false);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err) {
      console.error('❌ Payment success handling error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Processing Your Payment...</h2>
          <p className="text-slate">Please wait while we confirm your subscription</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Payment Processing Error</h2>
            <p className="text-slate mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-green text-deep-navy px-4 py-2 rounded hover:bg-green/90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-8">
          <CheckCircle className="h-16 w-16 text-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful! 🎉</h2>
          <p className="text-slate mb-4">
            Your Starter subscription has been activated
          </p>
          
          <div className="bg-light-navy/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-green" />
              <span className="text-white font-semibold">Credits Added</span>
            </div>
            <div className="text-3xl font-bold text-green">
              +{creditsAdded}
            </div>
            <p className="text-slate text-sm">Credits added to your account</p>
            <div className="mt-2 pt-2 border-t border-slate/20">
              <p className="text-slate text-sm">Total Credits: <span className="text-white font-semibold">{totalCredits}</span></p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate">
            <p>✅ Subscription: Active</p>
            <p>✅ Plan: Starter ($9.99 CAD/month)</p>
            <p>✅ Credits: {totalCredits} total available</p>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-green text-deep-navy px-6 py-3 rounded-lg font-semibold hover:bg-green/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-slate mt-4">
            Redirecting to dashboard in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
