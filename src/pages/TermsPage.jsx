import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';

const TermsPage = () => {
  return (
    <PageWrapper
      title="Terms of Service"
      description="Review the Terms of Service for using the Sold2Move platform. This agreement governs your use of our website and services."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-lightest-slate mb-8 font-heading">Terms of Service</h1>
          <div className="space-y-6 text-slate">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">1. Agreement to Terms</h2>
            <p>By using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the services.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">2. Use of Service</h2>
            <p>Sold2Move grants you a limited, non-exclusive, non-transferable, revocable license to use the service for your internal business purposes. You agree not to use the service for any purpose that is illegal or prohibited by these terms.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">3. Accounts and Registration</h2>
            <p>To access most features of the service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">4. Fees and Payment</h2>
            <p>You agree to pay all fees or charges to your account in accordance with the fees, charges, and billing terms in effect at the time a fee or charge is due and payable. All payment obligations are non-cancelable and all amounts paid are non-refundable.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">5. Termination</h2>
            <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">6. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:legal@sold2move.com" className="text-teal hover:underline">legal@sold2move.com</a>.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default TermsPage;