/**
 * Outreach Unsubscribe Edge Function
 * Handles one-click unsubscribe for B2B outreach emails
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
    const contactId = url.searchParams.get('id');

    if (!contactId) {
      return new Response(buildUnsubscribePage(false, 'Missing contact ID'), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update contact status to unsubscribed
    const { data: contact, error } = await supabase
      .from('outreach_contacts')
      .update({ status: 'unsubscribed' })
      .eq('id', contactId)
      .select('company_name, email')
      .single();

    if (error) {
      console.error('Unsubscribe error:', error);
      return new Response(buildUnsubscribePage(false, 'Contact not found'), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Also stop any active sequences for this contact
    await supabase
      .from('outreach_sequences')
      .update({ status: 'stopped' })
      .eq('contact_id', contactId)
      .eq('status', 'active');

    console.log(`✅ Unsubscribed: ${contact.email}`);

    return new Response(buildUnsubscribePage(true, contact.company_name), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(buildUnsubscribePage(false, 'An error occurred'), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});

function buildUnsubscribePage(success: boolean, message: string): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Unsubscribed' : 'Error'} - Sold2Move</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a192f;
      color: #ccd6f6;
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
      padding: 48px;
      text-align: center;
      border: 1px solid #233554;
    }
    .logo {
      color: #64ffda;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 32px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #8892b0;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background-color: #64ffda;
      color: #0a192f;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Sold2Move</div>
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${success ? 'Unsubscribed Successfully' : 'Oops!'}</h1>
    <p>
      ${success
        ? `${message} has been unsubscribed from our outreach emails. You won't receive any more messages from us.`
        : message
      }
    </p>
    <a href="${siteUrl}" class="btn">Visit Sold2Move</a>
  </div>
</body>
</html>
  `.trim();
}
