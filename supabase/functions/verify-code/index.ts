import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email-sender.ts';
import { buildWelcomeEmail } from '../_shared/email-templates.ts';

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
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and code are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid code format'
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

    console.log(`🔐 Verifying code for: ${email}`);

    // Verify the code using database function
    const { data: isValid, error: verifyError } = await supabase.rpc('verify_email_code', {
      p_email: email,
      p_code: code
    });

    if (verifyError) {
      console.error('❌ Error verifying code:', verifyError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to verify code'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!isValid) {
      console.log(`❌ Invalid or expired code for ${email}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired verification code'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Code verified for ${email}`);

    // Find the user by email and update email_confirmed_at
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to confirm email'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update user to confirm email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('❌ Error confirming email:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to confirm email'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Email confirmed for ${email}`);

    // Clean up used verification codes
    await supabase.rpc('cleanup_verification_codes');

    // Get user's name from profile for personalized welcome email
    let userName: string | undefined;
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user.id)
      .single();

    if (profile?.company_name) {
      userName = profile.company_name;
    }

    // Send welcome email
    const welcomeHtml = buildWelcomeEmail(userName);
    const emailResult = await sendEmail({
      to: email,
      subject: 'Welcome to Sold2Move!',
      html: welcomeHtml
    });

    if (emailResult.success) {
      console.log(`✅ Welcome email sent to ${email}`);
      // Log the email
      await supabase.from('email_logs').insert({
        user_id: user.id,
        email_type: 'welcome',
        recipient_email: email,
        subject: 'Welcome to Sold2Move!',
        status: 'sent',
        resend_message_id: emailResult.messageId
      });
    } else {
      console.error(`⚠️ Failed to send welcome email to ${email}: ${emailResult.error}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email verified successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Verify code error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
