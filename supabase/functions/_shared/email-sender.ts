/**
 * Resend API wrapper for sending emails with tracking
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;  // Plain text alternative for A/B testing
  replyTo?: string;
  from?: string;
  tags?: { name: string; value: string }[];
  trackOpens?: boolean;
  trackClicks?: boolean;
  logToDatabase?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  entityRefId?: string;
  error?: string;
}

/**
 * Log email send to database for tracking
 */
async function logEmailSend(params: {
  emailId: string;
  entityRefId: string;
  recipient: string;
  subject: string;
  from: string;
  tags: { name: string; value: string }[];
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase not configured, skipping email logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('email_sends').insert({
      email_id: params.emailId,
      entity_ref_id: params.entityRefId,
      recipient: params.recipient,
      subject: params.subject,
      from_address: params.from,
      tags: params.tags,
      status: 'sent',
    });

    if (error) {
      console.error('⚠️ Failed to log email send:', error);
    } else {
      console.log(`📝 Email logged to database: ${params.emailId}`);
    }
  } catch (err) {
    console.error('⚠️ Email logging error:', err);
  }
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

  const {
    to,
    subject,
    html,
    text,
    replyTo,
    from = 'Sold2Move <noreply@sold2move.com>',
    tags = [],
    trackOpens = true,
    trackClicks = true,
    logToDatabase = true,
  } = params;
  const recipients = Array.isArray(to) ? to : [to];
  const entityRefId = crypto.randomUUID();

  try {
    console.log(`📧 Sending email to: ${recipients.join(', ')} | Subject: ${subject} | Ref: ${entityRefId}`);

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
        // Send either text or html (text for plain text A/B variant)
        ...(text ? { text } : { html }),
        ...(replyTo && { reply_to: replyTo }),
        headers: {
          'X-Entity-Ref-ID': entityRefId,
        },
        tags: [
          { name: 'app', value: 'sold2move' },
          ...tags,
        ],
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

    // Log to database for tracking
    const allTags = [{ name: 'app', value: 'sold2move' }, ...tags];
    if (logToDatabase) {
      await logEmailSend({
        emailId: data.id,
        entityRefId,
        recipient: recipients[0],
        subject,
        from,
        tags: allTags,
      });
    }

    return {
      success: true,
      messageId: data.id,
      entityRefId,
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
