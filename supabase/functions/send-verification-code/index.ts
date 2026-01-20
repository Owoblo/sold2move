import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`📧 Generating verification code for: ${email}`);

    // Generate verification code using database function
    const { data: code, error: codeError } = await supabase.rpc('create_verification_code', {
      p_email: email
    });

    if (codeError) {
      console.error('❌ Error generating code:', codeError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to generate verification code'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Verification code generated for ${email}`);

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Email service not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sold2Move <noreply@sold2move.com>',
        to: [email],
        subject: 'Your Sold2Move Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a192f; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #112240; border-radius: 12px; padding: 40px; border: 1px solid #233554;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #64ffda; font-size: 28px; margin: 0;">Sold2Move</h1>
              </div>

              <h2 style="color: #ccd6f6; font-size: 20px; margin-bottom: 16px; text-align: center;">
                Verify Your Email
              </h2>

              <p style="color: #8892b0; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
                Enter this code to complete your registration:
              </p>

              <div style="background-color: #0a192f; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', monospace; font-size: 36px; letter-spacing: 8px; color: #64ffda; font-weight: bold;">
                  ${code}
                </span>
              </div>

              <p style="color: #8892b0; font-size: 14px; text-align: center; margin-bottom: 24px;">
                This code expires in <strong style="color: #ccd6f6;">10 minutes</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #233554; margin: 24px 0;">

              <p style="color: #8892b0; font-size: 12px; text-align: center; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('❌ Resend error:', errorData);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send verification email'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Verification email sent to ${email}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Verification code sent'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Send verification code error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
