import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

const DataUseAgreementPage = () => {
  const lastUpdated = "January 22, 2026";
  const companyName = "Sold2Move";
  const companyEmail = "legal@sold2move.com";
  const companyAddress = "Toronto, Ontario, Canada";

  return (
    <PageWrapper
      title="Data Use Agreement"
      description="Review the Data Use Agreement governing your use of property data and leads from Sold2Move."
    >
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4 font-heading">Data Use Agreement</h1>
          <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

          <div className="space-y-8 text-muted-foreground">

            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">1. Introduction and Purpose</h2>
              <p className="mt-4">
                This Data Use Agreement ("Agreement") governs your access to and use of property data, homeowner information, leads, and related data (collectively, "Data") provided through the {companyName} platform. This Agreement is incorporated into and forms part of the {companyName} Terms of Service.
              </p>
              <p className="mt-4">
                By accessing or using any Data through our Services, you acknowledge that you have read, understood, and agree to be bound by this Agreement.
              </p>
            </section>

            {/* License Grant */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">2. License Grant</h2>
              <p className="mt-4">
                Subject to your compliance with this Agreement and the Terms of Service, {companyName} grants you a:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><strong>Worldwide</strong> (subject to geographic restrictions of your subscription)</li>
                <li><strong>Non-transferable</strong></li>
                <li><strong>Non-sublicensable</strong></li>
                <li><strong>Non-assignable</strong></li>
                <li><strong>Non-exclusive</strong></li>
                <li><strong>Revocable</strong></li>
              </ul>
              <p className="mt-4">
                license to access and use the Data solely for your internal business purposes as permitted under your subscription plan. This license is limited to the subscription term and may be terminated at any time by {companyName}.
              </p>
            </section>

            {/* Permitted Uses */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">3. Permitted Uses</h2>
              <p className="mt-4">You may use the Data for the following purposes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Direct mail marketing campaigns to property owners</li>
                <li>Internal business analysis and market research</li>
                <li>Lead qualification and customer prospecting</li>
                <li>Service area planning and optimization</li>
                <li>Customer relationship management</li>
              </ul>
              <p className="mt-4">
                All uses must comply with applicable laws, including but not limited to privacy laws, anti-spam legislation, telemarketing regulations, and fair housing requirements.
              </p>
            </section>

            {/* Usage Restrictions */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">4. Usage Restrictions</h2>
              <p className="mt-4">You expressly agree that you will NOT:</p>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.1 Data Distribution Restrictions</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Sell, rent, lease, license, or sublicense any Data to third parties</li>
                <li>Share, transfer, or distribute Data outside your organization</li>
                <li>Disclose Data to competitors of {companyName}</li>
                <li>Publish or make publicly available any Data</li>
                <li>Create derivative databases or data products for resale</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.2 Data Manipulation Restrictions</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Combine or merge Data with third-party data sources for redistribution</li>
                <li>Reverse engineer, decompile, or derive source algorithms from the Data</li>
                <li>Remove, alter, or obscure copyright notices or proprietary markings</li>
                <li>Modify Data in ways that misrepresent its source or accuracy</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.3 Account and Access Restrictions</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Share login credentials with unauthorized users</li>
                <li>Allow access to your account by third parties</li>
                <li>Use automated scripts, bots, or scrapers to bulk download Data</li>
                <li>Exceed rate limits or usage quotas of your subscription</li>
                <li>Access Data after subscription termination</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.4 Competitive Use Restrictions</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Use Data to build a competing product or service</li>
                <li>Resell or offer data services using {companyName} Data</li>
                <li>Use Data for benchmarking against {companyName}</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">4.5 Unlawful Use Restrictions</h3>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Use Data for any unlawful purpose</li>
                <li>Use Data to discriminate against individuals based on protected characteristics</li>
                <li>Use Data to harass, stalk, threaten, or defraud any person</li>
                <li>Use Data in violation of privacy laws or regulations</li>
              </ul>
            </section>

            {/* Marketing Compliance Requirements */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">5. Marketing Compliance Requirements</h2>
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="font-semibold text-foreground">YOUR LEGAL RESPONSIBILITIES:</p>
                <p className="mt-2">
                  You are solely responsible for ensuring that your use of the Data complies with all applicable marketing and communication laws. {companyName} does not control how you use the Data and cannot be held liable for your marketing activities.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-foreground mt-6">5.1 Telemarketing Compliance</h3>
              <p className="mt-2">Before making any telemarketing calls using Data, you must:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Scrub all phone numbers against the National Do-Not-Call Registry</li>
                <li>Scrub against applicable state and provincial do-not-call lists</li>
                <li>Maintain your own internal do-not-call list</li>
                <li>Comply with calling hour restrictions (typically 8am-9pm local time)</li>
                <li>Comply with TCPA requirements for auto-dialers and pre-recorded messages</li>
                <li>Comply with CRTC Telemarketing Rules for Canadian contacts</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">5.2 Email Compliance</h3>
              <p className="mt-2">When sending emails using Data, you must comply with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li><strong>CAN-SPAM Act (US):</strong> Include valid physical address, clear identification, and opt-out mechanism</li>
                <li><strong>CASL (Canada):</strong> Obtain express or implied consent before sending commercial electronic messages</li>
                <li>Honor opt-out requests within the required timeframe (10 business days for CAN-SPAM)</li>
                <li>Use accurate "From" information and subject lines</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">5.3 Direct Mail Compliance</h3>
              <p className="mt-2">When using Data for direct mail campaigns:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Do not use deceptive or misleading claims</li>
                <li>Comply with postal regulations</li>
                <li>Honor do-not-mail requests</li>
                <li>Comply with Fair Housing Act requirements (no discriminatory targeting)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mt-6">5.4 SMS/Text Message Compliance</h3>
              <p className="mt-2">If using Data for SMS marketing:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Obtain prior express written consent before sending marketing texts</li>
                <li>Provide clear opt-out instructions (STOP to unsubscribe)</li>
                <li>Honor opt-out requests immediately</li>
                <li>Comply with TCPA and CTIA guidelines</li>
              </ul>
            </section>

            {/* Data Accuracy and Disclaimers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">6. Data Accuracy and Disclaimers</h2>
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="font-semibold text-foreground">DATA PROVIDED "AS IS":</p>
                <p className="mt-2">
                  ALL DATA IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. {companyName.toUpperCase()} AND ITS DATA SUPPLIERS MAKE NO REPRESENTATIONS OR WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, TIMELINESS, OR RELIABILITY OF ANY DATA.
                </p>
                <p className="mt-4">
                  Data may contain errors, omissions, or outdated information. Property ownership may have changed. Contact information may be incorrect. Sale prices and property details may be inaccurate.
                </p>
                <p className="mt-4">
                  YOU ACKNOWLEDGE THAT YOU USE THE DATA AT YOUR OWN RISK AND SHOULD INDEPENDENTLY VERIFY ANY INFORMATION BEFORE RELYING ON IT.
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">7. Intellectual Property Rights</h2>
              <p className="mt-4">
                All Data, databases, compilations, and related intellectual property are and shall remain the exclusive property of {companyName} and its data suppliers. You acquire no ownership rights in the Data.
              </p>
              <p className="mt-4">
                You agree to include and maintain all copyright notices, trademark notices, and proprietary markings on any copies of Data as required by {companyName}.
              </p>
            </section>

            {/* Confidentiality */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">8. Confidentiality</h2>
              <p className="mt-4">
                You agree to treat all Data as confidential information. You shall:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Protect Data using at least the same degree of care you use to protect your own confidential information</li>
                <li>Limit access to Data to employees and contractors who need it for permitted purposes</li>
                <li>Ensure all persons with access to Data are bound by confidentiality obligations</li>
                <li>Not disclose Data to any third party without prior written consent</li>
                <li>Notify {companyName} immediately of any unauthorized disclosure or security breach</li>
              </ul>
            </section>

            {/* Monitoring and Enforcement */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">9. Monitoring and Enforcement</h2>
              <p className="mt-4">
                {companyName} reserves the right to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Monitor your access to and use of the Data</li>
                <li>Track usage patterns, access logs, and IP addresses</li>
                <li>Audit your compliance with this Agreement</li>
                <li>Investigate suspected violations</li>
                <li>Take enforcement action for any breach</li>
              </ul>
              <p className="mt-4">
                You agree to cooperate with any audit or investigation and provide reasonable access to your systems and records upon request.
              </p>
            </section>

            {/* Breach and Remedies */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">10. Breach and Remedies</h2>
              <p className="mt-4">
                In the event of a breach of this Agreement:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>{companyName} may immediately suspend or terminate your access to the Services</li>
                <li>You must immediately cease all use of the Data</li>
                <li>You must destroy all copies of Data in your possession</li>
                <li>You remain liable for any damages caused by the breach</li>
              </ul>
              <p className="mt-4">
                For non-material breaches, you may have thirty (30) days to cure the breach after receiving written notice. Material breaches (including unauthorized redistribution, competitive use, or illegal use) may result in immediate termination without cure period.
              </p>
              <p className="mt-4">
                {companyName} reserves the right to seek injunctive relief, specific performance, and monetary damages for any breach of this Agreement.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">11. Termination and Data Destruction</h2>
              <p className="mt-4">
                Upon termination or expiration of your subscription or this Agreement:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Your license to use the Data immediately terminates</li>
                <li>You must cease all use of the Data within 24 hours</li>
                <li>You must destroy all copies of Data, including backups, within 30 days</li>
                <li>Upon request, you must certify in writing that all Data has been destroyed</li>
                <li>You may not retain any Data for archival or historical purposes</li>
              </ul>
              <p className="mt-4">
                Provisions of this Agreement that by their nature should survive termination shall survive, including confidentiality, intellectual property, indemnification, and limitation of liability.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">12. Indemnification</h2>
              <p className="mt-4">
                You agree to indemnify, defend, and hold harmless {companyName}, its data suppliers, officers, directors, employees, and agents from any claims, damages, losses, or expenses (including attorneys' fees) arising from:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Your use of the Data</li>
                <li>Your marketing or outreach activities</li>
                <li>Your breach of this Agreement</li>
                <li>Your violation of any applicable law</li>
                <li>Claims by persons contacted using the Data</li>
                <li>Privacy, anti-spam, or telemarketing violations</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">13. Limitation of Liability</h2>
              <p className="mt-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {companyName.toUpperCase()} AND ITS DATA SUPPLIERS SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Lost profits, lost revenue, or lost business opportunities</li>
                <li>Damages arising from data inaccuracies or errors</li>
                <li>Claims resulting from your marketing activities</li>
                <li>Third-party claims against you</li>
              </ul>
              <p className="mt-4">
                Total liability shall not exceed the fees paid by you during the 12 months preceding the claim.
              </p>
            </section>

            {/* General Provisions */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">14. General Provisions</h2>

              <h3 className="text-xl font-semibold text-foreground mt-6">14.1 Governing Law</h3>
              <p className="mt-2">
                This Agreement shall be governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">14.2 Amendments</h3>
              <p className="mt-2">
                {companyName} may amend this Agreement at any time by posting the updated version on our website. Continued use of the Data after amendments constitutes acceptance of the changes.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">14.3 Severability</h3>
              <p className="mt-2">
                If any provision of this Agreement is found unenforceable, the remaining provisions shall continue in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6">14.4 Entire Agreement</h3>
              <p className="mt-2">
                This Agreement, together with the Terms of Service and Privacy Policy, constitutes the entire agreement between you and {companyName} regarding use of the Data.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground pt-4 font-heading">15. Contact Information</h2>
              <p className="mt-4">
                For questions about this Data Use Agreement, contact:
              </p>
              <div className="mt-4 p-4 bg-secondary/30 rounded-lg border border-border">
                <p><strong>{companyName}</strong></p>
                <p>Legal Department</p>
                <p>Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a></p>
                <p>Address: {companyAddress}</p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="mt-8">
              <div className="p-6 bg-secondary/30 border border-border rounded-lg">
                <h2 className="text-xl font-semibold text-foreground font-heading">Acknowledgment</h2>
                <p className="mt-4">
                  By using {companyName}'s Services and accessing any Data, you acknowledge that:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>You have read and understood this Data Use Agreement</li>
                  <li>You agree to be bound by all terms and conditions herein</li>
                  <li>You will comply with all applicable laws when using the Data</li>
                  <li>You accept full responsibility for your marketing activities</li>
                  <li>You understand that {companyName} is not liable for your use of the Data</li>
                </ul>
              </div>
            </section>

            {/* Related Policies */}
            <section className="pt-8 border-t border-border mt-8">
              <h2 className="text-xl font-semibold text-foreground font-heading">Related Policies</h2>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default DataUseAgreementPage;
