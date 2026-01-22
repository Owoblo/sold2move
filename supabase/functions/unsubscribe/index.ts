/**
 * Unsubscribe Edge Function
 * Handles email unsubscribe requests for CAN-SPAM compliance
 *
 * Supports:
 * - GET requests with token in query params (one-click unsubscribe)
 * - Returns an HTML confirmation page
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type') || 'all';

    if (!token) {
      return buildHtmlResponse(
        'Invalid Request',
        'Missing unsubscribe token. Please use the link from your email.',
        false
      );
    }

    console.log(`🔓 Processing unsubscribe request. Type: ${type}`);

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the email alert by unsubscribe token
    const { data: alert, error: fetchError } = await supabase
      .from('email_alerts')
      .select('id, user_id, email, enabled')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !alert) {
      console.error('❌ Invalid unsubscribe token:', token);
      return buildHtmlResponse(
        'Invalid Link',
        'This unsubscribe link is invalid or has expired. Please contact support if you need assistance.',
        false
      );
    }

    // Disable email alerts
    const { error: updateError } = await supabase
      .from('email_alerts')
      .update({ enabled: false })
      .eq('id', alert.id);

    if (updateError) {
      console.error('❌ Error updating email preferences:', updateError);
      return buildHtmlResponse(
        'Error',
        'Unable to process your request. Please try again later or contact support.',
        false
      );
    }

    console.log(`✅ Unsubscribed ${alert.email} from ${type} emails`);

    // Log the unsubscribe action
    await supabase.from('email_logs').insert({
      user_id: alert.user_id,
      email_type: 'unsubscribe',
      recipient_email: alert.email,
      subject: 'Unsubscribed',
      status: 'sent',
      metadata: {
        unsubscribe_type: type,
        alert_id: alert.id
      }
    });

    return buildHtmlResponse(
      'Unsubscribed Successfully',
      `You've been unsubscribed from ${type === 'all' ? 'all marketing' : type.replace('_', ' ')} emails. You can re-enable notifications anytime from your account settings.`,
      true
    );

  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    return buildHtmlResponse(
      'Error',
      'An unexpected error occurred. Please try again later or contact support.',
      false
    );
  }
});

/**
 * Build an HTML response page
 */
function buildHtmlResponse(title: string, message: string, success: boolean): Response {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Sold2Move</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a192f;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background-color: #112240;
      border-radius: 12px;
      padding: 40px;
      border: 1px solid #233554;
      text-align: center;
    }
    .logo {
      color: #64ffda;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 24px;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    .icon.success {
      background-color: rgba(100, 255, 218, 0.1);
    }
    .icon.error {
      background-color: rgba(255, 107, 107, 0.1);
    }
    h1 {
      color: #ccd6f6;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #8892b0;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #64ffda;
      color: #0a192f;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: opacity 0.2s;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #233554;
      color: #8892b0;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Sold2Move</div>

    <div class="icon ${success ? 'success' : 'error'}">
      ${success ? '✓' : '✕'}
    </div>

    <h1>${title}</h1>
    <p>${message}</p>

    <a href="${siteUrl}" class="button">Go to Sold2Move</a>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Sold2Move. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
