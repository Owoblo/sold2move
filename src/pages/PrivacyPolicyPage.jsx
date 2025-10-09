import React from 'react';
import PageWrapper from '@/components/layout/PageWrapper';

const PrivacyPolicyPage = () => {
  return (
    <PageWrapper
      title="Privacy Policy"
      description="Read the Sold2Move Privacy Policy to understand how we collect, use, and protect your personal and business information."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-lightest-slate mb-8 font-heading">Privacy Policy</h1>
          <div className="space-y-6 text-slate">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">1. Introduction</h2>
            <p>Welcome to Sold2Move. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">2. Information We Collect</h2>
            <p>We may collect personal information such as your name, company name, email address, phone number, and payment information when you register for our service. We also collect data related to your use of our platform, such as IP addresses, browser type, and pages visited.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">3. How We Use Your Information</h2>
            <p>We use the information we collect to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide, operate, and maintain our services.</li>
                <li>Process your transactions.</li>
                <li>Improve, personalize, and expand our services.</li>
                <li>Communicate with you, either directly or through one of our partners, for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes.</li>
                <li>Send you emails.</li>
                <li>Find and prevent fraud.</li>
              </ul>
            </p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">4. Sharing Your Information</h2>
            <p>We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information unless we provide users with advance notice. This does not include website hosting partners and other parties who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">5. Data Security</h2>
            <p>We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.</p>

            <h2 className="text-2xl font-semibold text-light-slate pt-4 font-heading">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@sold2move.com" className="text-teal hover:underline">privacy@sold2move.com</a>.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default PrivacyPolicyPage;