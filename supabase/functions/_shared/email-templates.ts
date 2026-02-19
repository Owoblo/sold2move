/**
 * Shared email templates for Sold2Move
 * Brand colors:
 * - Background: #0a192f (deep navy)
 * - Card: #112240 (light navy)
 * - Accent: #64ffda (teal)
 * - Primary text: #ccd6f6 (light slate)
 * - Secondary text: #8892b0 (slate)
 * - Border: #233554 (navy border)
 */

// ============================================================================
// Types
// ============================================================================

export interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  content: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  footerText?: string;
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export interface PropertyListing {
  id: string;
  imgSrc?: string;
  address: string;
  price: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  detailUrl?: string;
}

export interface ReceiptData {
  amount: string;
  description: string;
  credits?: number;
  date: string;
  planName?: string;
}

// ============================================================================
// Base Template
// ============================================================================

/**
 * Build the base email template with Sold2Move branding
 */
export function buildEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    preheader = '',
    content,
    ctaButton,
    footerText,
    showUnsubscribe = false,
    unsubscribeUrl,
  } = options;

  const ctaHtml = ctaButton
    ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaButton.url}" style="display: inline-block; background-color: #64ffda; color: #0a192f; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${ctaButton.text}
        </a>
      </div>
    `
    : '';

  const footerHtml = footerText
    ? `<p style="color: #8892b0; font-size: 12px; text-align: center; margin: 0;">${footerText}</p>`
    : '';

  const unsubscribeHtml = showUnsubscribe && unsubscribeUrl
    ? `
      <p style="color: #8892b0; font-size: 11px; text-align: center; margin-top: 16px;">
        <a href="${unsubscribeUrl}" style="color: #8892b0; text-decoration: underline;">Unsubscribe</a> from these emails
      </p>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <!--[if !mso]><!-->
  <style>
    @media only screen and (max-width: 480px) {
      .container { padding: 24px 16px !important; }
      .property-card { width: 100% !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a192f; margin: 0; padding: 40px 20px;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}

  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #112240; border-radius: 12px; padding: 40px; border: 1px solid #233554;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #64ffda; font-size: 28px; margin: 0;">Sold2Move</h1>
    </div>

    <!-- Title -->
    <h2 style="color: #ccd6f6; font-size: 22px; margin-bottom: 24px; text-align: center;">
      ${title}
    </h2>

    <!-- Content -->
    <div style="color: #8892b0; font-size: 16px; line-height: 1.6;">
      ${content}
    </div>

    <!-- CTA Button -->
    ${ctaHtml}

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #233554; margin: 32px 0;">

    <!-- Footer -->
    ${footerHtml}
    ${unsubscribeHtml}

    <p style="color: #8892b0; font-size: 11px; text-align: center; margin-top: 16px;">
      &copy; ${new Date().getFullYear()} Sold2Move. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Property Alert Templates
// ============================================================================

/**
 * Build a single property card for email
 */
export function buildPropertyCard(listing: PropertyListing): string {
  const imageHtml = listing.imgSrc
    ? `<img src="${listing.imgSrc}" alt="Property" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px 8px 0 0;">`
    : `<div style="width: 100%; height: 160px; background-color: #233554; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: center; color: #8892b0;">No Image</div>`;

  const detailsHtml = [
    listing.beds !== undefined ? `${listing.beds} bed` : null,
    listing.baths !== undefined ? `${listing.baths} bath` : null,
    listing.sqft !== undefined ? `${listing.sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(' &bull; ');

  return `
    <div class="property-card" style="background-color: #0a192f; border-radius: 8px; overflow: hidden; margin-bottom: 16px; border: 1px solid #233554;">
      ${imageHtml}
      <div style="padding: 16px;">
        <p style="color: #64ffda; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">${listing.price}</p>
        <p style="color: #ccd6f6; font-size: 14px; margin: 0 0 8px 0;">${listing.address}</p>
        ${detailsHtml ? `<p style="color: #8892b0; font-size: 13px; margin: 0 0 12px 0;">${detailsHtml}</p>` : ''}
        ${listing.type ? `<span style="display: inline-block; background-color: #233554; color: #8892b0; padding: 4px 10px; border-radius: 4px; font-size: 12px;">${listing.type}</span>` : ''}
        ${listing.detailUrl ? `<a href="${listing.detailUrl}" style="display: block; color: #64ffda; font-size: 14px; margin-top: 12px; text-decoration: none;">View Details &rarr;</a>` : ''}
      </div>
    </div>
  `;
}

/**
 * Build property alert digest email
 */
export function buildPropertyAlertEmail(
  listings: PropertyListing[],
  userPrefs: { priceRange?: string; serviceAreas?: string[] },
  unsubscribeUrl?: string
): string {
  const listingCards = listings.map(buildPropertyCard).join('');

  const prefsText = [
    userPrefs.priceRange && userPrefs.priceRange !== 'all' ? `Price: ${userPrefs.priceRange}` : null,
    userPrefs.serviceAreas?.length ? `Areas: ${userPrefs.serviceAreas.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      We found <strong style="color: #64ffda;">${listings.length} new listing${listings.length !== 1 ? 's' : ''}</strong> matching your criteria.
    </p>
    ${prefsText ? `<p style="text-align: center; font-size: 13px; color: #8892b0; margin-bottom: 24px;">${prefsText}</p>` : ''}

    <div style="margin-top: 24px;">
      ${listingCards}
    </div>
  `;

  return buildEmailTemplate({
    title: 'New Properties in Your Area',
    preheader: `${listings.length} new listing${listings.length !== 1 ? 's' : ''} found matching your criteria`,
    content,
    ctaButton: {
      text: 'View All Listings',
      url: Deno.env.get('SITE_URL') || 'https://sold2move.com',
    },
    showUnsubscribe: true,
    unsubscribeUrl,
  });
}

// ============================================================================
// Transaction/Receipt Templates
// ============================================================================

/**
 * Build payment receipt email
 */
export function buildReceiptEmail(receipt: ReceiptData): string {
  const content = `
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Date</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${receipt.date}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Description</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${receipt.description}</td>
        </tr>
        ${receipt.planName ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${receipt.planName}</td>
        </tr>
        ` : ''}
        ${receipt.credits ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Credits Added</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0;">+${receipt.credits.toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid #233554;">
          <td style="color: #ccd6f6; padding: 16px 0 8px 0; font-weight: 600;">Total</td>
          <td style="color: #64ffda; text-align: right; padding: 16px 0 8px 0; font-size: 20px; font-weight: 600;">${receipt.amount}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">Thank you for your purchase!</p>
  `;

  return buildEmailTemplate({
    title: 'Payment Confirmed',
    preheader: `Your payment of ${receipt.amount} has been confirmed`,
    content,
    ctaButton: {
      text: 'Go to Dashboard',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
    footerText: 'If you have any questions about this transaction, please contact support.',
  });
}

// ============================================================================
// Subscription Templates
// ============================================================================

/**
 * Build subscription activated email
 */
export function buildSubscriptionActivatedEmail(planName: string, nextBillingDate: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your <strong style="color: #64ffda;">${planName}</strong> subscription is now active!
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Next Billing Date</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${nextBillingDate}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">You now have access to all ${planName} features. Start exploring sold listings in your area!</p>
  `;

  return buildEmailTemplate({
    title: 'Welcome to ' + planName + '!',
    preheader: `Your ${planName} subscription is now active`,
    content,
    ctaButton: {
      text: 'Start Exploring',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
  });
}

/**
 * Build subscription cancelled email
 */
export function buildSubscriptionCancelledEmail(planName: string, accessUntil: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your <strong style="color: #ccd6f6;">${planName}</strong> subscription has been cancelled.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <p style="color: #8892b0; margin: 0 0 8px 0;">You'll continue to have access until</p>
      <p style="color: #64ffda; font-size: 18px; font-weight: 600; margin: 0;">${accessUntil}</p>
    </div>
    <p style="text-align: center;">We're sorry to see you go. You can resubscribe anytime to regain access to all features.</p>
  `;

  return buildEmailTemplate({
    title: 'Subscription Cancelled',
    preheader: `Your ${planName} subscription has been cancelled`,
    content,
    ctaButton: {
      text: 'Resubscribe',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/pricing`,
    },
    footerText: 'If you cancelled by mistake or have questions, please contact support.',
  });
}

/**
 * Build renewal reminder email
 */
export function buildRenewalReminderEmail(planName: string, amount: string, renewalDate: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your <strong style="color: #64ffda;">${planName}</strong> subscription will renew soon.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Amount</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${amount}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Renewal Date</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0;">${renewalDate}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">No action needed. Your subscription will automatically renew.</p>
  `;

  return buildEmailTemplate({
    title: 'Subscription Renewal Reminder',
    preheader: `Your ${planName} subscription renews on ${renewalDate}`,
    content,
    ctaButton: {
      text: 'Manage Subscription',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/settings`,
    },
    footerText: 'To cancel or change your plan, visit your account settings.',
  });
}

// ============================================================================
// Account & Support Templates
// ============================================================================

/**
 * Build welcome email
 */
export function buildWelcomeEmail(userName?: string): string {
  const greeting = userName ? `Welcome, ${userName}!` : 'Welcome to Sold2Move!';

  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your account has been verified and you're ready to start finding leads.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #ccd6f6; font-size: 16px; margin: 0 0 16px 0;">Here's what you can do:</h3>
      <ul style="color: #8892b0; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 12px;">Browse recently sold properties in your service areas</li>
        <li style="margin-bottom: 12px;">Access homeowner contact information</li>
        <li style="margin-bottom: 12px;">Set up daily email alerts for new listings</li>
        <li style="margin-bottom: 12px;">Track your lead generation progress</li>
      </ul>
    </div>
    <p style="text-align: center;">You have a <strong style="color: #64ffda;">14-day free trial</strong> to explore all features!</p>
  `;

  return buildEmailTemplate({
    title: greeting,
    preheader: 'Your account is verified. Start your free trial today!',
    content,
    ctaButton: {
      text: 'Go to Dashboard',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
  });
}

/**
 * Build low credit warning email
 */
export function buildLowCreditEmail(creditsRemaining: number): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="background-color: #0a192f; border-radius: 8px; padding: 32px; display: inline-block;">
        <p style="color: #8892b0; margin: 0 0 8px 0;">Credits Remaining</p>
        <p style="color: #f59e0b; font-size: 48px; font-weight: bold; margin: 0;">${creditsRemaining}</p>
      </div>
    </div>
    <p style="text-align: center; margin-bottom: 24px;">
      You're running low on credits. Top up now to continue revealing homeowner information without interruption.
    </p>
  `;

  return buildEmailTemplate({
    title: 'Low Credit Alert',
    preheader: `You have ${creditsRemaining} credits remaining`,
    content,
    ctaButton: {
      text: 'Buy More Credits',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/pricing`,
    },
  });
}

/**
 * Build support ticket created email
 */
export function buildTicketCreatedEmail(ticketId: string | number, subject: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      We've received your support request and will get back to you shortly.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Ticket ID</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0;">#${ticketId}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Subject</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${subject}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">Our support team typically responds within 24 hours.</p>
  `;

  return buildEmailTemplate({
    title: 'Support Ticket Created',
    preheader: `Your support ticket #${ticketId} has been received`,
    content,
    ctaButton: {
      text: 'View Ticket',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/settings`,
    },
  });
}

/**
 * Build support ticket response email
 */
export function buildTicketResponseEmail(ticketId: string | number, subject: string, response: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      We've responded to your support ticket.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <p style="color: #8892b0; margin: 0 0 8px 0;">Ticket #${ticketId}: ${subject}</p>
      <hr style="border: none; border-top: 1px solid #233554; margin: 16px 0;">
      <p style="color: #ccd6f6; white-space: pre-wrap; margin: 0;">${response}</p>
    </div>
  `;

  return buildEmailTemplate({
    title: 'Support Ticket Update',
    preheader: `New response on ticket #${ticketId}`,
    content,
    ctaButton: {
      text: 'View Ticket',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/settings`,
    },
  });
}

// ============================================================================
// Contact Form Templates
// ============================================================================

/**
 * Build contact form confirmation email (to user)
 */
export function buildContactConfirmationEmail(name: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Hi ${name},
    </p>
    <p style="text-align: center; margin-bottom: 24px;">
      Thank you for reaching out! We've received your message and will get back to you within 1-2 business days.
    </p>
    <p style="text-align: center;">
      In the meantime, feel free to explore our platform or check out our FAQ.
    </p>
  `;

  return buildEmailTemplate({
    title: 'Thanks for Contacting Us',
    preheader: 'We received your message and will respond soon',
    content,
    ctaButton: {
      text: 'Visit Sold2Move',
      url: Deno.env.get('SITE_URL') || 'https://sold2move.com',
    },
  });
}

/**
 * Build contact form notification email (to admin)
 */
export function buildContactAdminEmail(formData: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  city?: string;
  state?: string;
  message: string;
}): string {
  const content = `
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0; vertical-align: top;">Name</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${formData.name}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0; vertical-align: top;">Email</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0;">
            <a href="mailto:${formData.email}" style="color: #64ffda; text-decoration: none;">${formData.email}</a>
          </td>
        </tr>
        ${formData.company ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0; vertical-align: top;">Company</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${formData.company}</td>
        </tr>
        ` : ''}
        ${formData.phone ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0; vertical-align: top;">Phone</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${formData.phone}</td>
        </tr>
        ` : ''}
        ${formData.city || formData.state ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0; vertical-align: top;">Location</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${[formData.city, formData.state].filter(Boolean).join(', ')}</td>
        </tr>
        ` : ''}
      </table>
      <hr style="border: none; border-top: 1px solid #233554; margin: 16px 0;">
      <p style="color: #8892b0; margin: 0 0 8px 0;">Message:</p>
      <p style="color: #ccd6f6; white-space: pre-wrap; margin: 0;">${formData.message}</p>
    </div>
  `;

  return buildEmailTemplate({
    title: 'New Contact Form Submission',
    preheader: `New message from ${formData.name}`,
    content,
    ctaButton: {
      text: 'Reply to ' + formData.name,
      url: `mailto:${formData.email}`,
    },
  });
}

// ============================================================================
// Password/Security Templates
// ============================================================================

/**
 * Build password changed email
 */
export function buildPasswordChangedEmail(): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your password has been successfully changed.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <p style="color: #8892b0; margin: 0;">
        If you didn't make this change, please contact support immediately or reset your password.
      </p>
    </div>
  `;

  return buildEmailTemplate({
    title: 'Password Changed',
    preheader: 'Your Sold2Move password has been changed',
    content,
    ctaButton: {
      text: 'Go to Dashboard',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
    footerText: 'If you did not request this change, please contact support@sold2move.com immediately.',
  });
}

// ============================================================================
// Trial & Payment Status Templates
// ============================================================================

/**
 * Build trial ending soon email
 */
export function buildTrialEndingEmail(planName: string, daysRemaining: number, trialEndDate: string): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your free trial for <strong style="color: #64ffda;">${planName}</strong> is ending soon.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 32px; margin-bottom: 24px; text-align: center;">
      <p style="color: #8892b0; margin: 0 0 8px 0;">Trial ends in</p>
      <p style="color: #f59e0b; font-size: 48px; font-weight: bold; margin: 0;">${daysRemaining}</p>
      <p style="color: #8892b0; margin: 8px 0 0 0;">${daysRemaining === 1 ? 'day' : 'days'}</p>
    </div>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Trial Ends</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${trialEndDate}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">
      To continue accessing all features without interruption, make sure your payment method is up to date.
    </p>
  `;

  return buildEmailTemplate({
    title: 'Your Trial is Ending Soon',
    preheader: `Your ${planName} trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
    content,
    ctaButton: {
      text: 'Manage Subscription',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/billing`,
    },
    footerText: 'Your card will be charged automatically when your trial ends unless you cancel.',
  });
}

/**
 * Build payment failed email
 */
export function buildPaymentFailedEmail(planName: string, amount: string, nextRetryDate?: string): string {
  const retryInfo = nextRetryDate
    ? `<p style="color: #8892b0; text-align: center; margin-top: 16px;">We'll automatically retry the payment on <strong style="color: #ccd6f6;">${nextRetryDate}</strong>.</p>`
    : '';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="background-color: #ef4444; border-radius: 50%; width: 64px; height: 64px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">!</span>
      </div>
      <p style="color: #ccd6f6; margin: 0;">
        We were unable to process your payment for <strong style="color: #64ffda;">${planName}</strong>.
      </p>
    </div>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Amount Due</td>
          <td style="color: #ef4444; text-align: right; padding: 8px 0;">${amount}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center; margin-bottom: 16px;">
      Please update your payment method to avoid service interruption.
    </p>
    ${retryInfo}
  `;

  return buildEmailTemplate({
    title: 'Payment Failed',
    preheader: `Action required: Your payment of ${amount} could not be processed`,
    content,
    ctaButton: {
      text: 'Update Payment Method',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/billing`,
    },
    footerText: 'If you need help, please contact support@sold2move.com.',
  });
}

/**
 * Build subscription receipt email (for renewals and successful payments)
 */
export function buildSubscriptionReceiptEmail(data: {
  planName: string;
  amount: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  invoiceNumber?: string;
}): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Thank you for your continued subscription to <strong style="color: #64ffda;">${data.planName}</strong>!
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.invoiceNumber ? `
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Invoice</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">#${data.invoiceNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Date</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.date}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Billing Period</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.periodStart} - ${data.periodEnd}</td>
        </tr>
        <tr style="border-top: 1px solid #233554;">
          <td style="color: #ccd6f6; padding: 16px 0 8px 0; font-weight: 600;">Total Paid</td>
          <td style="color: #64ffda; text-align: right; padding: 16px 0 8px 0; font-size: 20px; font-weight: 600;">${data.amount}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">Your subscription will automatically renew on ${data.periodEnd}.</p>
  `;

  return buildEmailTemplate({
    title: 'Payment Receipt',
    preheader: `Your payment of ${data.amount} for ${data.planName} was successful`,
    content,
    ctaButton: {
      text: 'View Billing History',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/billing`,
    },
    footerText: 'This receipt serves as confirmation of your payment. For invoice copies, visit your billing dashboard.',
  });
}

/**
 * Build plan changed email (upgrade/downgrade)
 */
export function buildPlanChangedEmail(data: {
  oldPlan: string;
  newPlan: string;
  newPrice: string;
  effectiveDate: string;
  isUpgrade: boolean;
}): string {
  const changeType = data.isUpgrade ? 'upgraded' : 'changed';
  const icon = data.isUpgrade ? '🚀' : '📋';

  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your subscription has been ${changeType} successfully!
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px;">
        <div style="text-align: center; flex: 1;">
          <p style="color: #8892b0; margin: 0 0 4px 0; font-size: 12px;">Previous Plan</p>
          <p style="color: #ccd6f6; margin: 0; font-size: 16px;">${data.oldPlan}</p>
        </div>
        <div style="color: #64ffda; font-size: 24px;">→</div>
        <div style="text-align: center; flex: 1;">
          <p style="color: #8892b0; margin: 0 0 4px 0; font-size: 12px;">New Plan</p>
          <p style="color: #64ffda; margin: 0; font-size: 16px; font-weight: 600;">${data.newPlan}</p>
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #233554; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">New Monthly Rate</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0; font-weight: 600;">${data.newPrice}/mo</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Effective</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.effectiveDate}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">
      ${data.isUpgrade
        ? 'You now have access to all your new plan features immediately.'
        : 'Your plan change will take effect at the start of your next billing cycle.'}
    </p>
  `;

  return buildEmailTemplate({
    title: `Plan ${data.isUpgrade ? 'Upgraded' : 'Changed'} Successfully`,
    preheader: `Your subscription has been ${changeType} to ${data.newPlan}`,
    content,
    ctaButton: {
      text: 'View Your Plan',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard/billing`,
    },
  });
}

/**
 * Build trial started email (for new trial subscriptions)
 */
export function buildTrialStartedEmail(planName: string, trialEndDate: string, trialDays: number): string {
  const content = `
    <p style="text-align: center; margin-bottom: 24px;">
      Your <strong style="color: #64ffda;">${trialDays}-day free trial</strong> has started!
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Plan</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0; font-weight: 600;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Trial Period</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${trialDays} days</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Trial Ends</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${trialEndDate}</td>
        </tr>
      </table>
    </div>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #ccd6f6; font-size: 16px; margin: 0 0 16px 0;">During your trial, you can:</h3>
      <ul style="color: #8892b0; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 12px;">Browse all recently sold properties in your selected cities</li>
        <li style="margin-bottom: 12px;">Access homeowner contact information</li>
        <li style="margin-bottom: 12px;">Set up personalized email alerts</li>
        <li style="margin-bottom: 12px;">Use our AI-powered furniture detection</li>
      </ul>
    </div>
    <p style="text-align: center;">
      We'll send you a reminder before your trial ends. You can cancel anytime.
    </p>
  `;

  return buildEmailTemplate({
    title: `Welcome to Your ${planName} Trial!`,
    preheader: `Your ${trialDays}-day free trial of ${planName} has started`,
    content,
    ctaButton: {
      text: 'Start Exploring',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
    footerText: 'No charges until your trial ends. Cancel anytime from your billing dashboard.',
  });
}

// ============================================================================
// Order/Product Templates
// ============================================================================

// ============================================================================
// B2B Outreach Templates (Lead Offer Emails)
// ============================================================================

export interface OutreachListing {
  address: string;
  city: string;
  state: string;
  price: string;
  beds?: number;
  baths?: number;
  imgSrc?: string;
}

// Outreach sender persona
const OUTREACH_SENDER = {
  name: 'Sarah Mitchell',
  title: 'Partner Success Manager',
  email: 'sarah@sold2move.com',
};

/**
 * Build Day 1 outreach email - First contact with a new lead offer
 * Plain text style - looks like a personal email, not a marketing blast
 */
export function buildOutreachDay1Email(
  listing: OutreachListing,
  companyName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(listing.city)}`;

  const propertyDetails = [
    listing.beds ? `${listing.beds} bed` : null,
    listing.baths ? `${listing.baths} bath` : null,
  ].filter(Boolean).join(' / ');

  // Plain text style email - looks personal, not like marketing
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px; color: #333333; font-size: 15px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto;">

    <p>Hello,</p>

    <p>I work for a company called Sold2Move, connecting moving companies with homeowners who need to relocate. A new client in <strong>${listing.city}, ${listing.state}</strong> came to Sold2Move to <strong>find a Moving Company</strong>.</p>

    <p style="margin: 24px 0;"><strong>${listing.address}, ${listing.city}, ${listing.state}</strong></p>

    <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; color: #555;">
      <li style="margin-bottom: 8px;">• Sale Price: <strong>${listing.price}</strong></li>
      ${propertyDetails ? `<li style="margin-bottom: 8px;">• Property: <strong>${propertyDetails}</strong></li>` : ''}
      <li style="margin-bottom: 8px;">• Move Timeline: <strong>Next 30-60 days</strong></li>
    </ul>

    <p>I found your business online, and think you'd be a good fit for what this homeowner needs – can you help? You can contact them <strong>for free</strong> if you're interested:</p>

    <div style="margin: 28px 0;">
      <a href="${signupUrl}" style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Contact This Homeowner →</a>
    </div>

    <p>If this isn't a good match or you have any questions, please let me know – my contact details are below.</p>

    <p style="margin-top: 32px;">Kind regards,</p>

    <p style="margin: 4px 0;"><strong>${OUTREACH_SENDER.name}</strong></p>
    <p style="margin: 4px 0; color: #666;">${OUTREACH_SENDER.title}</p>
    <p style="margin: 4px 0;"><a href="mailto:${OUTREACH_SENDER.email}" style="color: #0066FF; text-decoration: none;">${OUTREACH_SENDER.email}</a></p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

    <p style="font-size: 12px; color: #999;">
      You're receiving this because ${companyName} serves the ${listing.city} area.<br>
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </p>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Get the outreach sender info for use in email "from" field
 */
export function getOutreachSender() {
  return OUTREACH_SENDER;
}

/**
 * Build Day 1 outreach email - PLAIN TEXT version for A/B testing
 * This is actual plain text, not HTML - better deliverability
 */
export function buildOutreachDay1EmailPlaintext(
  listing: OutreachListing,
  companyName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(listing.city)}`;

  const propertyDetails = [
    listing.beds ? `${listing.beds} bed` : null,
    listing.baths ? `${listing.baths} bath` : null,
  ].filter(Boolean).join(' / ');

  return `Hello,

I work for a company called Sold2Move, connecting moving companies with homeowners who need to relocate. A new client in ${listing.city}, ${listing.state} came to Sold2Move to find a Moving Company.

${listing.address}, ${listing.city}, ${listing.state}

• Sale Price: ${listing.price}
${propertyDetails ? `• Property: ${propertyDetails}` : ''}
• Move Timeline: Next 30-60 days

I found your business online, and think you'd be a good fit for what this homeowner needs – can you help? You can contact them for free if you're interested:

${signupUrl}

If this isn't a good match or you have any questions, please let me know.

Kind regards,
${OUTREACH_SENDER.name}
${OUTREACH_SENDER.title}
${OUTREACH_SENDER.email}

---
You're receiving this because ${companyName} serves the ${listing.city} area.
Unsubscribe: ${unsubscribeUrl}`.trim();
}

/**
 * Build Day 3 outreach email - PLAIN TEXT version
 */
export function buildOutreachDay3EmailPlaintext(
  listings: OutreachListing[],
  companyName: string,
  cityName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(cityName)}`;

  const listingItems = listings.slice(0, 3).map(listing =>
    `• ${listing.address}, ${listing.city}, ${listing.state} - ${listing.price}`
  ).join('\n');

  return `Hi again,

Just following up – we've found ${listings.length} more homeowner${listings.length !== 1 ? 's' : ''} in ${cityName} who just sold and will need moving services:

${listingItems}

These homeowners need to move within the next 30-60 days. Want their contact info so you can reach out first?

${signupUrl}

Best,
${OUTREACH_SENDER.name}

---
You're receiving this because ${companyName} serves the ${cityName} area.
Unsubscribe: ${unsubscribeUrl}`.trim();
}

/**
 * Build Day 7 outreach email - PLAIN TEXT version
 */
export function buildOutreachDay7EmailPlaintext(
  totalLeadsInCity: number,
  cityName: string,
  companyName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(cityName)}`;

  return `Hi,

Quick follow up – we've now tracked ${totalLeadsInCity} homeowners who recently sold their homes in ${cityName} and will need moving services.

With Sold2Move, you get:
• Real-time alerts when homes sell in your service area
• Homeowner contact info (name, phone, email)
• Property details and estimated move timeline
• No long-term contracts – pay as you go

Ready to stop chasing leads and let them come to you?

${signupUrl}

Let me know if you have any questions – happy to help.

Best,
${OUTREACH_SENDER.name}
${OUTREACH_SENDER.title}
${OUTREACH_SENDER.email}

---
You're receiving this because ${companyName} serves the ${cityName} area. This is our final email.
Unsubscribe: ${unsubscribeUrl}`.trim();
}

/**
 * Build Day 3 outreach email - Follow up with new listings
 * Plain text style - personal follow-up
 */
export function buildOutreachDay3Email(
  listings: OutreachListing[],
  companyName: string,
  cityName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(cityName)}`;

  const listingItems = listings.slice(0, 3).map(listing => `
    <li style="margin-bottom: 12px;">
      <strong>${listing.address}</strong><br>
      <span style="color: #666;">${listing.city}, ${listing.state} • ${listing.price}</span>
    </li>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px; color: #333333; font-size: 15px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto;">

    <p>Hi again,</p>

    <p>Just following up – we've found <strong>${listings.length} more homeowner${listings.length !== 1 ? 's' : ''}</strong> in ${cityName} who just sold and will need moving services:</p>

    <ul style="padding-left: 20px; margin: 20px 0;">
      ${listingItems}
    </ul>

    <p>These homeowners need to move within the next 30-60 days. Want their contact info so you can reach out first?</p>

    <div style="margin: 28px 0;">
      <a href="${signupUrl}" style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Get These Leads Free →</a>
    </div>

    <p style="margin-top: 32px;">Best,</p>
    <p style="margin: 4px 0;"><strong>${OUTREACH_SENDER.name}</strong></p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

    <p style="font-size: 12px; color: #999;">
      You're receiving this because ${companyName} serves the ${cityName} area.<br>
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </p>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Build Day 7 outreach email - Final follow up with value prop
 * Plain text style - final personal email
 */
export function buildOutreachDay7Email(
  totalLeadsInCity: number,
  cityName: string,
  companyName: string,
  unsubscribeUrl: string
): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  const signupUrl = `${siteUrl}/signup?ref=outreach&city=${encodeURIComponent(cityName)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px; color: #333333; font-size: 15px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto;">

    <p>Hi,</p>

    <p>Quick follow up – we've now tracked <strong>${totalLeadsInCity} homeowners</strong> who recently sold their homes in ${cityName} and will need moving services.</p>

    <p>With Sold2Move, you get:</p>
    <ul style="padding-left: 20px; margin: 16px 0;">
      <li style="margin-bottom: 6px;">Real-time alerts when homes sell in your service area</li>
      <li style="margin-bottom: 6px;">Homeowner contact info (name, phone, email)</li>
      <li style="margin-bottom: 6px;">Property details and estimated move timeline</li>
      <li style="margin-bottom: 6px;">No long-term contracts – pay as you go</li>
    </ul>

    <p>Ready to stop chasing leads and let them come to you?</p>

    <div style="margin: 28px 0;">
      <a href="${signupUrl}" style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Start Free Trial →</a>
    </div>

    <p>Let me know if you have any questions – happy to help.</p>

    <p style="margin-top: 32px;">Best,</p>
    <p style="margin: 4px 0;"><strong>${OUTREACH_SENDER.name}</strong></p>
    <p style="margin: 4px 0; color: #666;">${OUTREACH_SENDER.title}</p>
    <p style="margin: 4px 0;"><a href="mailto:${OUTREACH_SENDER.email}" style="color: #0066FF; text-decoration: none;">${OUTREACH_SENDER.email}</a></p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

    <p style="font-size: 12px; color: #999;">
      You're receiving this because ${companyName} serves the ${cityName} area. This is our final email.<br>
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </p>

  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Order/Product Templates
// ============================================================================

/**
 * Build order confirmation email (for design services/products)
 */
export function buildOrderConfirmationEmail(data: {
  orderId: string;
  productName: string;
  amount: string;
  customerName?: string;
  date: string;
}): string {
  const greeting = data.customerName ? `Hi ${data.customerName},` : '';

  const content = `
    ${greeting ? `<p style="text-align: center; margin-bottom: 16px;">${greeting}</p>` : ''}
    <p style="text-align: center; margin-bottom: 24px;">
      Thank you for your order! We've received your payment and will begin processing your request.
    </p>
    <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Order ID</td>
          <td style="color: #64ffda; text-align: right; padding: 8px 0; font-family: monospace;">${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Product</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #8892b0; padding: 8px 0;">Date</td>
          <td style="color: #ccd6f6; text-align: right; padding: 8px 0;">${data.date}</td>
        </tr>
        <tr style="border-top: 1px solid #233554;">
          <td style="color: #ccd6f6; padding: 16px 0 8px 0; font-weight: 600;">Total</td>
          <td style="color: #64ffda; text-align: right; padding: 16px 0 8px 0; font-size: 20px; font-weight: 600;">${data.amount}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center;">
      We'll notify you when your order is ready. If you have any questions, please don't hesitate to contact support.
    </p>
  `;

  return buildEmailTemplate({
    title: 'Order Confirmed',
    preheader: `Your order for ${data.productName} has been confirmed`,
    content,
    ctaButton: {
      text: 'View Order Status',
      url: `${Deno.env.get('SITE_URL') || 'https://sold2move.com'}/dashboard`,
    },
    footerText: 'If you have questions about your order, please contact support@sold2move.com.',
  });
}
