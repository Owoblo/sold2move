import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

const TermsPage = () => {
  const lastUpdated = "January 22, 2026";
  const companyName = "Sold2Move";
  const companyEmail = "legal@sold2move.com";
  const companyAddress = "Toronto, Ontario, Canada";

  return (
    <PageWrapper
      title="Terms of Service"
      description="Review the Terms of Service for using the Sold2Move platform. This agreement governs your use of our website and services."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4 font-heading">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

          <div className="space-y-8 text-muted-foreground">

            {/* Agreement to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">1. Agreement to Terms</h2>
              <p className="mt-4">
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and {companyName} ("Company," "we," "us," or "our") governing your access to and use of our website, platform, and services (collectively, the "Services").
              </p>
              <p className="mt-4">
                BY ACCESSING OR USING OUR SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE OUR SERVICES.
              </p>
              <p className="mt-4">
                You represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms.
              </p>
            </section>

            {/* Description of Services */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">2. Description of Services</h2>
              <p className="mt-4">
                {companyName} provides a platform that delivers property listing data, sold home information, and lead generation services to moving companies and related businesses in Canada and the United States. Our Services include access to property data, homeowner information, mailing services, and related tools.
              </p>
            </section>

            {/* License Grant */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">3. License Grant</h2>
              <p className="mt-4">
                Subject to your compliance with these Terms and payment of applicable fees, {companyName} grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Services solely for your internal business purposes during the subscription term.
              </p>
              <p className="mt-4">
                This license does not include the right to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Resell, redistribute, or sublicense any data or content obtained through the Services</li>
                <li>Share your account credentials or access with third parties</li>
                <li>Use automated systems, bots, or scrapers to access the Services beyond intended use</li>
                <li>Modify, adapt, translate, reverse engineer, decompile, or disassemble any portion of the Services</li>
                <li>Remove or alter any copyright, trademark, or proprietary notices</li>
                <li>Use the Services to compete directly with {companyName}</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">4. Account Registration</h2>
              <p className="mt-4">
                To access certain features of the Services, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your login credentials secure and confidential</li>
                <li>Notify us immediately of any unauthorized access or use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
              <p className="mt-4">
                We reserve the right to suspend or terminate your account if any information provided is inaccurate, misleading, or fraudulent.
              </p>
            </section>

            {/* Fees and Payment */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">5. Fees and Payment</h2>
              <p className="mt-4">
                You agree to pay all fees associated with your subscription plan in accordance with the pricing and billing terms in effect at the time of payment. All fees are quoted in the currency specified at checkout and are exclusive of applicable taxes.
              </p>
              <p className="mt-4">
                <strong>Payment Terms:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Subscription fees are billed in advance on a recurring basis (monthly or annually as selected)</li>
                <li>All payment obligations are non-cancelable</li>
                <li>All amounts paid are non-refundable except as expressly stated herein</li>
                <li>You authorize us to charge your payment method for all fees when due</li>
                <li>Failed payments may result in suspension or termination of your access</li>
              </ul>
              <p className="mt-4">
                We reserve the right to change our pricing at any time. Price changes will be communicated to you in advance and will apply to your next billing cycle.
              </p>
            </section>

            {/* Data Accuracy Disclaimer */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">6. Data Accuracy Disclaimer</h2>
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="font-semibold text-foreground">IMPORTANT DISCLAIMER:</p>
                <p className="mt-2">
                  THE DATA AND INFORMATION PROVIDED THROUGH OUR SERVICES, INCLUDING BUT NOT LIMITED TO PROPERTY LISTINGS, HOMEOWNER INFORMATION, CONTACT DETAILS, SALE PRICES, AND PROPERTY CHARACTERISTICS, IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND.
                </p>
                <p className="mt-4">
                  {companyName.toUpperCase()} AND ITS DATA SUPPLIERS DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, TIMELINESS, RELIABILITY, OR AVAILABILITY OF ANY DATA. WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>
                <p className="mt-4">
                  Data may contain errors, omissions, or inaccuracies. Property information may be outdated or incorrect. You acknowledge that you use any data obtained through our Services at your own risk and should independently verify any information before relying on it for business decisions.
                </p>
              </div>
            </section>

            {/* User Responsibilities and Compliance */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">7. User Responsibilities and Compliance</h2>
              <p className="mt-4">
                By using our Services, you acknowledge and agree that:
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.1 Marketing Compliance</h3>
              <p className="mt-2">
                <strong>YOU ARE SOLELY RESPONSIBLE</strong> for ensuring that your use of any data or leads obtained through our Services complies with all applicable federal, state, provincial, and local laws and regulations, including but not limited to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><strong>TCPA (Telephone Consumer Protection Act):</strong> Compliance with restrictions on telemarketing calls, auto-dialed calls, and text messages</li>
                <li><strong>CAN-SPAM Act:</strong> Compliance with requirements for commercial email messages</li>
                <li><strong>CASL (Canada's Anti-Spam Legislation):</strong> Compliance with Canadian electronic messaging laws</li>
                <li><strong>National Do-Not-Call Registry:</strong> Compliance with federal and state do-not-call requirements</li>
                <li><strong>State-specific telemarketing laws:</strong> Including but not limited to state do-not-call lists and calling hour restrictions</li>
                <li><strong>CRTC regulations:</strong> Compliance with Canadian Radio-television and Telecommunications Commission rules</li>
                <li><strong>Fair Housing Act:</strong> Compliance with non-discrimination requirements</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.2 Prohibited Uses</h3>
              <p className="mt-2">You agree NOT to use the Services or any data obtained therefrom to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Violate any applicable law, regulation, or third-party rights</li>
                <li>Send unsolicited communications in violation of anti-spam laws</li>
                <li>Harass, threaten, or defraud any person</li>
                <li>Discriminate against any person based on protected characteristics</li>
                <li>Engage in deceptive or misleading marketing practices</li>
                <li>Compile data for resale or redistribution to third parties</li>
                <li>Access or use the Services for illegal purposes</li>
                <li>Interfere with or disrupt the Services or servers</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">7.3 Your Acknowledgment</h3>
              <p className="mt-2">
                You acknowledge that {companyName} is a data provider and does not control how you use the information obtained through our Services. <strong>Compliance with applicable telemarketing, faxing, emailing, and direct mail laws is entirely your responsibility.</strong> You should consult with qualified legal counsel to ensure your marketing practices are compliant with all applicable laws.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">8. Intellectual Property</h2>
              <p className="mt-4">
                All rights, title, and interest in and to the Services, including but not limited to the platform, software, algorithms, databases, documentation, trademarks, logos, and all intellectual property therein, are and shall remain the exclusive property of {companyName} and its licensors.
              </p>
              <p className="mt-4">
                Nothing in these Terms grants you any right, title, or interest in the Services except for the limited license expressly granted herein. You may not use our trademarks, logos, or brand names without our prior written consent.
              </p>
            </section>

            {/* Confidentiality */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">9. Confidentiality</h2>
              <p className="mt-4">
                You agree to maintain the confidentiality of all data, information, and materials received through the Services. You shall not disclose, sell, lease, reproduce, or otherwise transfer such information to any third party without our prior written consent, except as necessary to use the Services for their intended purpose.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">10. Limitation of Liability</h2>
              <div className="mt-4 p-4 bg-secondary/30 border border-border rounded-lg">
                <p className="font-semibold text-foreground">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
                <ul className="list-disc list-inside mt-4 space-y-2 ml-4">
                  <li>
                    {companyName.toUpperCase()} AND ITS DATA SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES.
                  </li>
                  <li>
                    {companyName.toUpperCase()} AND ITS DATA SUPPLIERS SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM DATA UNAVAILABILITY, INACCURACIES, ERRORS, OR OMISSIONS IN THE DATA PROVIDED.
                  </li>
                  <li>
                    IN NO EVENT SHALL {companyName.toUpperCase()}'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES EXCEED THE AMOUNTS PAID BY YOU TO {companyName.toUpperCase()} DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
                  </li>
                  <li>
                    THESE LIMITATIONS APPLY REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF {companyName.toUpperCase()} HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </li>
                </ul>
              </div>
              <p className="mt-4">
                Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you. In such cases, our liability shall be limited to the maximum extent permitted by applicable law.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">11. Indemnification</h2>
              <p className="mt-4">
                You agree to indemnify, defend, and hold harmless {companyName}, its officers, directors, employees, agents, licensors, data suppliers, and representatives from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Your use of the Services or any data obtained therefrom</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any applicable law or regulation</li>
                <li>Your marketing activities, including telemarketing, email marketing, or direct mail campaigns</li>
                <li>Any claim that your use of the Services infringed or violated any third-party rights</li>
                <li>Your negligence or willful misconduct</li>
              </ul>
              <p className="mt-4">
                This indemnification obligation shall survive the termination of these Terms and your use of the Services.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">12. Disclaimer of Warranties</h2>
              <p className="mt-4">
                THE SERVICES AND ALL DATA, CONTENT, AND MATERIALS PROVIDED THROUGH THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="mt-4">
                {companyName.toUpperCase()} EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT</li>
                <li>WARRANTIES THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES</li>
                <li>WARRANTIES REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR TIMELINESS OF ANY DATA</li>
                <li>WARRANTIES THAT THE SERVICES WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS</li>
              </ul>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">13. Termination</h2>
              <p className="mt-4">
                We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason, including but not limited to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Breach of these Terms</li>
                <li>Non-payment of fees</li>
                <li>Fraudulent or illegal activity</li>
                <li>At our sole discretion for any reason</li>
              </ul>
              <p className="mt-4">
                Upon termination, your right to use the Services will immediately cease. You must destroy all copies of any data or materials obtained through the Services. Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership, warranty disclaimers, indemnification, and limitations of liability.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">14. Dispute Resolution</h2>
              <p className="mt-4">
                Any dispute, controversy, or claim arising out of or relating to these Terms or the Services shall first be resolved through good faith negotiations between the parties. If the dispute cannot be resolved through negotiation within thirty (30) days, either party may pursue resolution through binding arbitration or the courts, as applicable.
              </p>
              <p className="mt-4">
                These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario, Canada, without regard to its conflict of law provisions. You consent to the exclusive jurisdiction of the courts located in Toronto, Ontario, Canada for any legal proceedings arising out of these Terms.
              </p>
            </section>

            {/* Modifications to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">15. Modifications to Terms</h2>
              <p className="mt-4">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Services after any changes constitutes your acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Services.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">16. Severability</h2>
              <p className="mt-4">
                If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">17. Entire Agreement</h2>
              <p className="mt-4">
                These Terms, together with our Privacy Policy and Data Use Agreement, constitute the entire agreement between you and {companyName} regarding your use of the Services and supersede all prior or contemporaneous communications and proposals, whether oral or written.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">18. Contact Information</h2>
              <p className="mt-4">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-secondary/30 rounded-lg border border-border">
                <p><strong>{companyName}</strong></p>
                <p>Legal Department</p>
                <p>Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a></p>
                <p>Address: {companyAddress}</p>
              </div>
            </section>

            {/* Related Policies */}
            <section className="pt-8 border-t border-border mt-8">
              <h2 className="text-xl font-semibold text-foreground font-heading">Related Policies</h2>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
                <Link to="/data-use-agreement" className="text-primary hover:underline">Data Use Agreement</Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default TermsPage;
