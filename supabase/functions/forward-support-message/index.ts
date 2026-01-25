/**
 * Forward Support Message to Admin
 * Sends email notification when a user sends a support chat message
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_EMAILS = ['johnowolabi80@gmail.com', 'jay@sold2move.com'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { userId, userEmail, userName, message, messageId } = await req.json();

    if (!message || !userEmail) {
      return new Response(JSON.stringify({ error: 'message and userEmail required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user profile info if available
    let profileInfo = '';
    if (userId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company_name, city_name, phone, subscription_tier')
          .eq('id', userId)
          .single();

        if (profile) {
          profileInfo = `
            <tr><td style="padding: 8px; color: #8892b0; width: 120px;">Company:</td><td style="padding: 8px; color: #ccd6f6;">${profile.company_name || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; color: #8892b0;">City:</td><td style="padding: 8px; color: #ccd6f6;">${profile.city_name || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; color: #8892b0;">Phone:</td><td style="padding: 8px; color: #ccd6f6;">${profile.phone || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; color: #8892b0;">Plan:</td><td style="padding: 8px; color: #ccd6f6;">${profile.subscription_tier || 'Free'}</td></tr>
          `;
        }
      } catch (e) {
        console.log('Could not fetch profile:', e);
      }
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const subject = `💬 Support Message from ${userName || userEmail}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a192f;">
        <div style="background-color: #112240; border-radius: 12px; padding: 30px; border: 1px solid #233554;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #64ffda; font-size: 24px; margin: 0;">Sold2Move Support</h1>
          </div>

          <div style="background-color: #ffd70020; border-left: 4px solid #ffd700; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
            <h2 style="color: #ffd700; margin: 0; font-size: 18px;">💬 New Support Message</h2>
          </div>

          <!-- User Info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #0a192f; border-radius: 8px;">
            <tr><td style="padding: 8px; color: #8892b0; width: 120px;">From:</td><td style="padding: 8px; color: #64ffda; font-weight: bold;">${userName || 'User'}</td></tr>
            <tr><td style="padding: 8px; color: #8892b0;">Email:</td><td style="padding: 8px; color: #ccd6f6;">${userEmail}</td></tr>
            ${profileInfo}
            <tr><td style="padding: 8px; color: #8892b0;">Time:</td><td style="padding: 8px; color: #ccd6f6;">${timestamp}</td></tr>
          </table>

          <!-- Message -->
          <div style="background-color: #0a192f; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #ccd6f6; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Message:</h3>
            <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap; background: #1d3a5c; padding: 16px; border-radius: 8px; border-left: 3px solid #64ffda;">${message}</p>
          </div>

          <!-- Reply Instructions -->
          <div style="text-align: center; padding: 16px; background: #64ffda15; border-radius: 8px;">
            <p style="color: #64ffda; margin: 0 0 12px 0; font-weight: bold;">Reply Options:</p>
            <p style="color: #8892b0; margin: 0; font-size: 14px;">
              1. Reply directly to this email (goes to ${userEmail})<br>
              2. Go to <a href="https://sold2move.com/dashboard/admin/support" style="color: #64ffda;">Admin Dashboard</a> to respond in-app
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 16px; color: #8892b0; font-size: 12px;">
          <p>Sold2Move Support Notification</p>
        </div>
      </div>
    `;

    console.log(`📧 Forwarding support message from ${userEmail} to admins`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sold2Move Support <noreply@sold2move.com>',
        to: ADMIN_EMAILS,
        reply_to: userEmail,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to forward message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`✅ Support message forwarded to admins`);

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Forward support message error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
