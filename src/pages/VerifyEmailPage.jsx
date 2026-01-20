import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import PageWrapper from '@/components/layout/PageWrapper';
import LoadingButton from '@/components/ui/LoadingButton';
import { supabase } from '@/lib/customSupabaseClient';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get email from navigation state
  const email = location.state?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setCode(newCode);
      // Focus last filled input or first empty
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email, code: fullCode },
      });

      if (error || !data?.success) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data?.error || "Invalid or expired code. Please try again.",
        });
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast({
        title: "Email Verified!",
        description: "Your email has been verified. You can now sign in.",
      });

      // Navigate to login
      navigate('/login', { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email },
      });

      if (error || !data?.success) {
        toast({
          variant: "destructive",
          title: "Failed to Resend",
          description: "Could not send verification code. Please try again.",
        });
        return;
      }

      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
      setResendCooldown(60); // 60 second cooldown
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <PageWrapper>
      <Helmet>
        <title>Verify Email - Sold2Move</title>
        <meta name="description" content="Enter your verification code to complete registration" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-deep-navy via-navy to-light-navy py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-teal rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-deep-navy" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-lightest-slate">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-slate">
                We sent a 6-digit code to<br />
                <span className="text-teal font-medium">{email}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Code Input */}
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/90 border-white/30 text-deep-navy focus:border-teal focus:ring-teal"
                    disabled={isVerifying}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <LoadingButton
                onClick={handleVerify}
                isLoading={isVerifying}
                disabled={code.some((d) => !d)}
                className="w-full bg-teal text-deep-navy hover:bg-teal/90"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Email
              </LoadingButton>

              {/* Resend Section */}
              <div className="text-center space-y-2">
                <p className="text-sm text-slate">
                  Didn't receive the code?
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="text-teal hover:text-teal/80 hover:bg-white/5"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : isResending
                    ? 'Sending...'
                    : 'Resend Code'}
                </Button>
              </div>

              {/* Back to Signup */}
              <div className="text-center pt-4 border-t border-white/10">
                <Button
                  variant="link"
                  onClick={() => navigate('/signup')}
                  className="text-slate hover:text-lightest-slate"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign Up
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-slate text-center">
                The code expires in 10 minutes. Check your spam folder if you don't see it.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default VerifyEmailPage;
