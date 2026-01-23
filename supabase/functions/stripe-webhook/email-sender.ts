/**
 * Resend API wrapper for sending emails
 */

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  const { to, subject, html, replyTo, from = 'Sold2Move <noreply@sold2move.com>' } = params;
  const recipients = Array.isArray(to) ? to : [to];

  try {
    console.log(`📧 Sending email to: ${recipients.join(', ')} | Subject: ${subject}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        ...(replyTo && { reply_to: replyTo }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Resend API error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to send email',
      };
    }

    const data = await response.json();
    console.log(`✅ Email sent successfully. ID: ${data.id}`);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send multiple emails (batch)
 */
export async function sendEmails(emails: SendEmailParams[]): Promise<SendEmailResult[]> {
  const results = await Promise.all(emails.map(sendEmail));
  return results;
}
