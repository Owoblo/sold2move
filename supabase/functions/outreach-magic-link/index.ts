/**
 * Outreach Magic Link Edge Function
 *
 * When a moving company clicks their magic link from an outreach email,
 * this function validates their token, pulls real listings from their city,
 * and renders a leads page — no signup or login required.
 *
 * Tracks the click for analytics.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(buildErrorPage('Missing token', 'This link appears to be invalid.'), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Look up contact by magic token
    const { data: contact, error: contactError } = await supabase
      .from('outreach_contacts')
      .select('id, company_name, email, primary_city, primary_state, metadata, total_clicks')
      .eq('magic_token', token)
      .single();

    if (contactError || !contact) {
      return new Response(buildErrorPage('Invalid link', 'This link has expired or is invalid.'), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Track the click (non-blocking)
    supabase
      .from('outreach_contacts')
      .update({ total_clicks: (contact.total_clicks || 0) + 1 })
      .eq('id', contact.id)
      .then(() => {});

    // Also mark any active sequences as clicked
    supabase
      .from('outreach_sequences')
      .update({ clicked: true })
      .eq('contact_id', contact.id)
      .eq('status', 'active')
      .then(() => {});

    // Fetch recent listings in their city
    const query = supabase
      .from('listings')
      .select('zpid, addressstreet, lastcity, addressstate, addresszipcode, price, beds, baths, imgsrc, status, lastseenat')
      .eq('lastcity', contact.primary_city)
      .in('status', ['sold', 'just_listed'])
      .order('lastseenat', { ascending: false })
      .limit(20);

    if (contact.primary_state) {
      query.eq('addressstate', contact.primary_state);
    }

    const { data: listings } = await query;

    const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

    return new Response(
      buildLeadsPage(contact, listings || [], siteUrl, token),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      }
    );

  } catch (error) {
    console.error('Magic link error:', error);
    return new Response(buildErrorPage('Something went wrong', 'Please try clicking the link again.'), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});

interface Contact {
  id: string;
  company_name: string;
  email: string;
  primary_city: string;
  primary_state: string | null;
  metadata: Record<string, unknown> | null;
}

interface Listing {
  zpid: string;
  addressstreet: string;
  lastcity: string;
  addressstate: string;
  addresszipcode: string;
  price: string;
  beds: number | null;
  baths: number | null;
  imgsrc: string | null;
  status: string;
  lastseenat: string;
}

function buildLeadsPage(contact: Contact, listings: Listing[], siteUrl: string, token: string): string {
  const city = contact.primary_city;
  const state = contact.primary_state || '';
  const soldCount = listings.filter(l => l.status === 'sold').length;
  const listedCount = listings.filter(l => l.status === 'just_listed').length;

  const listingCards = listings.map(l => {
    const details = [
      l.beds ? `${l.beds} bed` : null,
      l.baths ? `${l.baths} bath` : null,
    ].filter(Boolean).join(' / ');

    const statusBadge = l.status === 'sold'
      ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">SOLD</span>'
      : '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">JUST LISTED</span>';

    const timeAgo = getTimeAgo(l.lastseenat);

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#111;">${l.addressstreet}</strong>
          ${statusBadge}
        </div>
        <div style="color:#6b7280;font-size:14px;margin-bottom:4px;">${l.lastcity}, ${l.addressstate} ${l.addresszipcode || ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span style="color:#0066FF;font-weight:600;font-size:18px;">${l.price}</span>
          <span style="color:#9ca3af;font-size:13px;">${details}${details && timeAgo ? ' &middot; ' : ''}${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');

  const signupUrl = `${siteUrl}/signup?ref=magic-link&city=${encodeURIComponent(city)}&email=${encodeURIComponent(contact.email)}&company=${encodeURIComponent(contact.company_name)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moving Leads in ${city} — Sold2Move</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
      color: #333;
    }
    .header {
      background: #0a192f;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { color: #64ffda; font-size: 22px; font-weight: bold; text-decoration: none; }
    .header-cta {
      background: #64ffda;
      color: #0a192f;
      padding: 8px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .hero {
      background: linear-gradient(135deg, #0a192f 0%, #112240 100%);
      padding: 40px 24px;
      text-align: center;
      color: #ccd6f6;
    }
    .hero h1 { font-size: 28px; margin-bottom: 12px; color: #fff; }
    .hero p { font-size: 16px; color: #8892b0; max-width: 500px; margin: 0 auto; }
    .stats {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-top: 24px;
    }
    .stat { text-align: center; }
    .stat-num { font-size: 32px; font-weight: 700; color: #64ffda; }
    .stat-label { font-size: 13px; color: #8892b0; margin-top: 4px; }
    .container { max-width: 680px; margin: 0 auto; padding: 24px 16px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111; }
    .cta-box {
      background: linear-gradient(135deg, #0a192f 0%, #112240 100%);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin-top: 32px;
    }
    .cta-box h2 { color: #fff; font-size: 22px; margin-bottom: 12px; }
    .cta-box p { color: #8892b0; margin-bottom: 20px; font-size: 15px; }
    .cta-btn {
      display: inline-block;
      background: #64ffda;
      color: #0a192f;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }
    .footer { text-align: center; padding: 32px; color: #9ca3af; font-size: 13px; }
    .blur-overlay {
      position: relative;
    }
    .blur-overlay::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(transparent, #f3f4f6);
      pointer-events: none;
    }
  </style>
</head>
<body>

  <div class="header">
    <a href="${siteUrl}" class="logo">Sold2Move</a>
    <a href="${signupUrl}" class="header-cta">Get Full Access — Free</a>
  </div>

  <div class="hero">
    <h1>Moving Leads in ${city}${state ? `, ${state}` : ''}</h1>
    <p>These homeowners recently sold or listed their home and will need a mover soon. Prepared for ${contact.company_name}.</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-num">${soldCount}</div>
        <div class="stat-label">Recently Sold</div>
      </div>
      <div class="stat">
        <div class="stat-num">${listedCount}</div>
        <div class="stat-label">Just Listed</div>
      </div>
      <div class="stat">
        <div class="stat-num">${listings.length}</div>
        <div class="stat-label">Total Leads</div>
      </div>
    </div>
  </div>

  <div class="container">
    <p class="section-title">Recent Listings in ${city}</p>

    <div class="blur-overlay">
      ${listingCards || '<p style="color:#6b7280;text-align:center;padding:32px;">No listings found in this area right now. Check back soon!</p>'}
    </div>

    <div class="cta-box">
      <h2>Want unlimited access to these leads?</h2>
      <p>Create a free account to see all listings, get daily alerts, and access homeowner details in ${city}.</p>
      <a href="${signupUrl}" class="cta-btn">Create Free Account</a>
    </div>
  </div>

  <div class="footer">
    &copy; ${new Date().getFullYear()} Sold2Move &middot; Moving leads delivered to your inbox
  </div>

</body>
</html>
  `.trim();
}

function buildErrorPage(title: string, message: string): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Sold2Move</title>
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
    .logo { color: #64ffda; font-size: 28px; font-weight: bold; margin-bottom: 32px; }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #8892b0; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background-color: #64ffda;
      color: #0a192f;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Sold2Move</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${siteUrl}" class="btn">Visit Sold2Move</a>
  </div>
</body>
</html>
  `.trim();
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
