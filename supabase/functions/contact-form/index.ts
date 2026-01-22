/**
 * Contact Form Edge Function
 * Handles contact form submissions from the website
 *
 * Actions:
 * 1. Validates form data
 * 2. Saves submission to contact_submissions table
 * 3. Sends confirmation email to user
 * 4. Sends notification email to admin
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email-sender.ts';
import {
  buildContactConfirmationEmail,
  buildContactAdminEmail,
} from '../_shared/email-templates.ts';

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  city?: string;
  state?: string;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData: ContactFormData = await req.json();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Name, email, and message are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📧 Processing contact form submission from: ${formData.email}`);

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Save to contact_submissions table
    const { data: submission, error: insertError } = await supabase
      .from('contact_submissions')
      .insert({
        name: formData.name,
        email: formData.email,
        company: formData.company || null,
        phone: formData.phone || null,
        city: formData.city || null,
        state: formData.state || null,
        message: formData.message,
        status: 'new'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error saving contact submission:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to save your message. Please try again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Contact submission saved with ID: ${submission.id}`);

    // Send confirmation email to user
    const userConfirmationHtml = buildContactConfirmationEmail(formData.name);
    const userEmailResult = await sendEmail({
      to: formData.email,
      subject: 'Thanks for Contacting Sold2Move',
      html: userConfirmationHtml
    });

    if (userEmailResult.success) {
      console.log(`✅ Confirmation email sent to ${formData.email}`);
    } else {
      console.error(`⚠️ Failed to send confirmation to ${formData.email}: ${userEmailResult.error}`);
    }

    // Send notification email to admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'hello@sold2move.com';
    const adminNotificationHtml = buildContactAdminEmail(formData);
    const adminEmailResult = await sendEmail({
      to: adminEmail,
      subject: `New Contact Form: ${formData.name} from ${formData.company || 'Individual'}`,
      html: adminNotificationHtml,
      replyTo: formData.email
    });

    if (adminEmailResult.success) {
      console.log(`✅ Admin notification sent to ${adminEmail}`);
    } else {
      console.error(`⚠️ Failed to send admin notification: ${adminEmailResult.error}`);
    }

    // Log emails
    await supabase.from('email_logs').insert([
      {
        email_type: 'contact_confirmation',
        recipient_email: formData.email,
        subject: 'Thanks for Contacting Sold2Move',
        status: userEmailResult.success ? 'sent' : 'failed',
        resend_message_id: userEmailResult.messageId,
        error_message: userEmailResult.error,
        metadata: { submission_id: submission.id }
      },
      {
        email_type: 'contact_admin_notification',
        recipient_email: adminEmail,
        subject: `New Contact Form: ${formData.name}`,
        status: adminEmailResult.success ? 'sent' : 'failed',
        resend_message_id: adminEmailResult.messageId,
        error_message: adminEmailResult.error,
        metadata: { submission_id: submission.id, from_email: formData.email }
      }
    ]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Your message has been sent. We\'ll get back to you soon!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
