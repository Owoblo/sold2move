/**
 * Send Transactional Email Edge Function
 * Processes pending email notifications from the email_logs table
 *
 * Handles:
 * - Low credit warnings (triggered by database trigger)
 * - Support ticket responses (triggered by database trigger)
 * - Any other pending transactional emails
 *
 * Can be triggered by:
 * - Supabase pg_cron scheduled job
 * - Manual invocation
 * - Direct API call with specific email type
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email-sender.ts';
import {
  buildLowCreditEmail,
  buildTicketCreatedEmail,
  buildTicketResponseEmail,
} from '../_shared/email-templates.ts';

interface PendingEmail {
  id: string;
  user_id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  metadata: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting transactional email processor...');

    // Parse request body for optional filters
    let emailType: string | null = null;
    let specificUserId: string | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        emailType = body.email_type || null;
        specificUserId = body.user_id || null;
      } catch {
        // No body or invalid JSON, process all pending
      }
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query pending emails
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50); // Process up to 50 at a time

    if (emailType) {
      query = query.eq('email_type', emailType);
    }

    if (specificUserId) {
      query = query.eq('user_id', specificUserId);
    }

    const { data: pendingEmails, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching pending emails:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch pending emails'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('ℹ️ No pending emails to process');
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending emails',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${pendingEmails.length} pending emails to process`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0
    };

    // Process each pending email
    for (const pending of pendingEmails as PendingEmail[]) {
      try {
        console.log(`\n📧 Processing ${pending.email_type} for ${pending.recipient_email}`);

        let html: string;
        let subject = pending.subject;

        // Build appropriate email content based on type
        switch (pending.email_type) {
          case 'low_credit_warning_pending':
            const creditsRemaining = pending.metadata?.credits_remaining || 0;
            html = buildLowCreditEmail(creditsRemaining);
            subject = 'Low Credit Alert';
            break;

          case 'ticket_response_pending':
            const ticketId = pending.metadata?.ticket_id;
            const ticketSubject = pending.metadata?.ticket_subject || 'Support Request';
            const adminNotes = pending.metadata?.admin_notes || '';
            html = buildTicketResponseEmail(ticketId, ticketSubject, adminNotes);
            subject = `Support Ticket Update: ${ticketSubject}`;
            break;

          case 'ticket_created_pending':
            const newTicketId = pending.metadata?.ticket_id;
            const newTicketSubject = pending.metadata?.ticket_subject || 'Support Request';
            html = buildTicketCreatedEmail(newTicketId, newTicketSubject);
            subject = 'Support Ticket Created';
            break;

          default:
            console.log(`  ⚠️ Unknown email type: ${pending.email_type}, skipping`);
            // Mark as failed with reason
            await supabase
              .from('email_logs')
              .update({
                status: 'failed',
                error_message: `Unknown email type: ${pending.email_type}`
              })
              .eq('id', pending.id);
            results.failed++;
            results.processed++;
            continue;
        }

        // Send the email
        const emailResult = await sendEmail({
          to: pending.recipient_email,
          subject,
          html
        });

        if (emailResult.success) {
          // Update status to sent
          await supabase
            .from('email_logs')
            .update({
              status: 'sent',
              resend_message_id: emailResult.messageId,
              sent_at: new Date().toISOString(),
              // Update email_type to remove _pending suffix
              email_type: pending.email_type.replace('_pending', '')
            })
            .eq('id', pending.id);

          console.log(`  ✅ Email sent to ${pending.recipient_email}`);
          results.sent++;
        } else {
          // Update status to failed
          await supabase
            .from('email_logs')
            .update({
              status: 'failed',
              error_message: emailResult.error
            })
            .eq('id', pending.id);

          console.error(`  ❌ Failed to send to ${pending.recipient_email}: ${emailResult.error}`);
          results.failed++;
        }

        results.processed++;
      } catch (emailError) {
        console.error(`❌ Error processing email ${pending.id}:`, emailError);

        // Mark as failed
        await supabase
          .from('email_logs')
          .update({
            status: 'failed',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          .eq('id', pending.id);

        results.failed++;
        results.processed++;
      }
    }

    console.log(`\n✅ Transactional email processor completed:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Transactional emails processed',
      ...results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Transactional email processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
