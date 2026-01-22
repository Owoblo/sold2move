import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

const PrivacyPolicyPage = () => {
  const lastUpdated = "January 22, 2026";
  const companyName = "Sold2Move";
  const companyEmail = "privacy@sold2move.com";
  const companyAddress = "Toronto, Ontario, Canada";

  return (
    <PageWrapper
      title="Privacy Policy"
      description="Read the Sold2Move Privacy Policy to understand how we collect, use, and protect your personal and business information."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4 font-heading">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

          <div className="space-y-8 text-muted-foreground">

            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">1. Introduction</h2>
              <p className="mt-4">
                Welcome to {companyName} ("Company," "we," "us," or "our"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or interact with our platform.
              </p>
              <p className="mt-4">
                By accessing or using our services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access or use our services.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-foreground mt-6">2.1 Personal Information</h3>
              <p className="mt-2">We may collect the following personal information when you register for an account or use our services:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Full name and business name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Billing address</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Business type and service areas</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">2.2 Automatically Collected Information</h3>
              <p className="mt-2">When you access our website, we automatically collect certain information, including:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Referring URLs and exit pages</li>
                <li>Pages visited and time spent on pages</li>
                <li>Click patterns and navigation paths</li>
                <li>Device identifiers</li>
                <li>Date and time stamps of access</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">2.3 Cookies and Tracking Technologies</h3>
              <p className="mt-2">
                We use cookies, web beacons, and similar tracking technologies to collect information about your browsing activities. These technologies help us analyze trends, administer the website, track user movements, and gather demographic information. You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features of our services.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">2.4 Third-Party Analytics</h3>
              <p className="mt-2">
                We use third-party analytics services (such as Google Analytics) to help us understand how users interact with our website. These services may collect information about your online activities over time and across different websites. You have no direct access to or control over cookies used by third-party advertisers or analytics providers.
              </p>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">3. How We Use Your Information</h2>
              <p className="mt-4">We use the information we collect for the following purposes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>To provide, operate, and maintain our services</li>
                <li>To process your transactions and manage your subscription</li>
                <li>To create and manage your account</li>
                <li>To communicate with you about your account, orders, and service updates</li>
                <li>To send you marketing communications (with your consent)</li>
                <li>To respond to your inquiries and provide customer support</li>
                <li>To improve, personalize, and expand our services</li>
                <li>To analyze usage patterns and trends</li>
                <li>To detect, prevent, and address fraud, security issues, and technical problems</li>
                <li>To enforce our Terms of Service and other agreements</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            {/* Sharing Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">4. Sharing Your Information</h2>
              <p className="mt-4">We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.1 Service Providers</h3>
              <p className="mt-2">
                We may share your information with third-party service providers who perform services on our behalf, including payment processing (Stripe), email delivery, hosting, analytics, and customer support. These providers are contractually obligated to use your information only for the purposes of providing services to us and to maintain appropriate security measures.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.2 Legal Requirements</h3>
              <p className="mt-2">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency), or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.3 Business Transfers</h3>
              <p className="mt-2">
                In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">5. Data Retention</h2>
              <p className="mt-4">
                We retain your personal information for as long as your account is active or as needed to provide you services. We may also retain and use your information as necessary to comply with our legal obligations, resolve disputes, enforce our agreements, and for operational, audit, and compliance purposes.
              </p>
              <p className="mt-4">
                Usage logs and analytics data may be retained for up to 24 months for operational and analytical purposes.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">6. Data Security</h2>
              <p className="mt-4">
                We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
              </p>
              <p className="mt-4">
                Your personal information is stored on secured networks and is only accessible by a limited number of authorized personnel who are required to keep the information confidential.
              </p>
            </section>

            {/* Your Rights and Choices */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">7. Your Rights and Choices</h2>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.1 Access and Correction</h3>
              <p className="mt-2">
                You have the right to access, correct, or update your personal information at any time through your account settings or by contacting us directly.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.2 Email Opt-Out</h3>
              <p className="mt-2">
                You may opt out of receiving promotional emails by clicking the "unsubscribe" link in any promotional email or by contacting us. Please note that you may still receive transactional emails related to your account and services.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.3 SMS Opt-Out</h3>
              <p className="mt-2">
                If you have opted in to receive SMS communications, you may opt out at any time by replying "STOP" to any message or by contacting us. Standard message and data rates may apply.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.4 Cookie Preferences</h3>
              <p className="mt-2">
                You can control cookies through your browser settings. Most browsers allow you to refuse cookies or alert you when cookies are being sent. However, disabling cookies may affect your ability to use certain features of our services.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.5 Account Deletion</h3>
              <p className="mt-2">
                You may request deletion of your account and personal information by contacting us at {companyEmail}. We will process your request in accordance with applicable law, though we may retain certain information as required for legal, audit, or operational purposes.
              </p>
            </section>

            {/* California Privacy Rights (CCPA) */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">8. California Privacy Rights (CCPA)</h2>
              <p className="mt-4">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><strong>Right to Know:</strong> You have the right to request information about the categories and specific pieces of personal information we have collected about you, the sources of that information, the business purpose for collecting it, and the categories of third parties with whom we share it.</li>
                <li><strong>Right to Delete:</strong> You have the right to request deletion of your personal information, subject to certain exceptions.</li>
                <li><strong>Right to Opt-Out:</strong> You have the right to opt out of the sale of your personal information. Note: We do not sell your personal information.</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights.</li>
              </ul>
              <p className="mt-4">
                To exercise your California privacy rights, please contact us at {companyEmail} or call us at (800) 555-0199. We will respond to verifiable consumer requests within 45 days.
              </p>
            </section>

            {/* Canadian Privacy Rights (PIPEDA) */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">9. Canadian Privacy Rights (PIPEDA)</h2>
              <p className="mt-4">
                If you are a Canadian resident, you have rights under the Personal Information Protection and Electronic Documents Act (PIPEDA):
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><strong>Right of Access:</strong> You may request access to your personal information held by us.</li>
                <li><strong>Right to Correction:</strong> You may request correction of inaccurate or incomplete personal information.</li>
                <li><strong>Right to Withdraw Consent:</strong> You may withdraw your consent to the collection, use, or disclosure of your personal information, subject to legal or contractual restrictions.</li>
                <li><strong>Right to Complain:</strong> You may file a complaint with the Office of the Privacy Commissioner of Canada if you believe we have violated your privacy rights.</li>
              </ul>
              <p className="mt-4">
                To exercise your Canadian privacy rights, please contact us at {companyEmail}.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">10. Children's Privacy</h2>
              <p className="mt-4">
                Our services are intended for business users and are not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 13 (or 16 in certain jurisdictions). If we learn that we have collected personal information from a child under the applicable age, we will take steps to delete such information promptly. If you believe we have collected information from a child, please contact us immediately at {companyEmail}.
              </p>
            </section>

            {/* Third-Party Links */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">11. Third-Party Links</h2>
              <p className="mt-4">
                Our website may contain links to third-party websites or services that are not operated by us. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. We encourage you to review the privacy policies of any third-party websites you visit.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">12. International Data Transfers</h2>
              <p className="mt-4">
                Your information may be transferred to and processed in countries other than your country of residence, including the United States and Canada. These countries may have data protection laws that are different from the laws of your country. By using our services, you consent to the transfer of your information to these countries. We take appropriate measures to ensure that your personal information remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Changes to This Privacy Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">13. Changes to This Privacy Policy</h2>
              <p className="mt-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically. Your continued use of our services after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">14. Contact Us</h2>
              <p className="mt-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-secondary/30 rounded-lg border border-border">
                <p><strong>{companyName}</strong></p>
                <p>Privacy Officer</p>
                <p>Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a></p>
                <p>Address: {companyAddress}</p>
              </div>
            </section>

            {/* Related Policies */}
            <section className="pt-8 border-t border-border mt-8">
              <h2 className="text-xl font-semibold text-foreground font-heading">Related Policies</h2>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                <Link to="/data-use-agreement" className="text-primary hover:underline">Data Use Agreement</Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default PrivacyPolicyPage;
