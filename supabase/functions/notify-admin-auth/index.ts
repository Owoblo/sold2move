/**
 * Notify Admin on Auth Events
 * Sends email to admin when a user signs up or logs in
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_EMAIL = 'johnowolabi80@gmail.com';

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
    const { event, userId, email, name, provider } = await req.json();

    if (!event || !email) {
      return new Response(JSON.stringify({ error: 'event and email required' }), {
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

    // Get additional user info from Supabase if available
    let profileInfo = '';
    if (userId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company_name, city_name, phone, service_cities')
          .eq('id', userId)
          .single();

        if (profile) {
          profileInfo = `
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${profile.full_name || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Company:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${profile.company_name || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">City:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${profile.city_name || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${profile.phone || 'Not set'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Service Cities:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${profile.service_cities?.join(', ') || 'Not set'}</td></tr>
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

    const isSignUp = event === 'signup' || event === 'SIGNED_UP';
    const eventTitle = isSignUp ? '🎉 New User Sign Up!' : '👋 User Logged In';
    const eventColor = isSignUp ? '#64ffda' : '#ffd700';
    const subject = isSignUp
      ? `🎉 New Sign Up: ${email}`
      : `👋 User Login: ${email}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a192f;">
        <div style="background-color: #112240; border-radius: 12px; padding: 30px; border: 1px solid #233554;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #64ffda; font-size: 24px; margin: 0;">Sold2Move</h1>
            <p style="color: #8892b0; margin: 8px 0 0 0;">Admin Notification</p>
          </div>

          <div style="background-color: ${eventColor}20; border-left: 4px solid ${eventColor}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
            <h2 style="color: ${eventColor}; margin: 0; font-size: 20px;">${eventTitle}</h2>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6; font-weight: bold;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Event:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${isSignUp ? 'New Registration' : 'Login'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Provider:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${provider || 'Email/Password'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #233554; color: #8892b0;">Time:</td><td style="padding: 8px; border-bottom: 1px solid #233554; color: #ccd6f6;">${timestamp}</td></tr>
            ${profileInfo}
          </table>

          ${isSignUp ? `
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #64ffda; font-size: 14px; margin: 0;">💡 Consider reaching out to welcome them!</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 16px; color: #8892b0; font-size: 12px;">
          <p>Sold2Move Admin Notification System</p>
        </div>
      </div>
    `;

    console.log(`📧 Sending ${event} notification for ${email} to admin`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sold2Move <noreply@sold2move.com>',
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`✅ Admin notification sent for ${event}: ${email}`);

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notify admin error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
