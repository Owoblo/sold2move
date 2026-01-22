/**
 * Send Property Alerts Edge Function
 * Sends daily email digests of new listings matching user criteria
 *
 * Triggered by: Supabase pg_cron scheduled job (daily)
 * Can also be triggered manually for testing
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email-sender.ts';
import { buildPropertyAlertEmail, PropertyListing } from '../_shared/email-templates.ts';

// Canadian provinces for country filtering
const CA_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'];

interface EmailAlert {
  id: string;
  user_id: string;
  email: string;
  enabled: boolean;
  frequency: string;
  price_range: string;
  min_price: number | null;
  max_price: number | null;
  service_areas: string[];
  unsubscribe_token: string;
  last_sent_at: string | null;
  last_listing_ids: string[];
}

interface UserProfile {
  id: string;
  country_code: string;
  ai_furniture_filter: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting property alerts job...');

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all enabled email alerts with daily frequency
    const { data: alerts, error: alertsError } = await supabase
      .from('email_alerts')
      .select('*')
      .eq('enabled', true)
      .eq('frequency', 'daily');

    if (alertsError) {
      console.error('❌ Error fetching email alerts:', alertsError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch email alerts'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!alerts || alerts.length === 0) {
      console.log('ℹ️ No enabled daily alerts found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No alerts to process',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Found ${alerts.length} enabled daily alerts to process`);

    // Get user profiles for country filtering
    const userIds = alerts.map(a => a.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, country_code, ai_furniture_filter')
      .in('id', userIds);

    const profileMap = new Map<string, UserProfile>(
      (profiles || []).map(p => [p.id, p])
    );

    // Process each alert
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0
    };

    for (const alert of alerts as EmailAlert[]) {
      try {
        console.log(`\n📧 Processing alert for: ${alert.email}`);

        const profile = profileMap.get(alert.user_id);

        // Build the listings query
        const listings = await fetchMatchingListings(supabase, alert, profile);

        // Filter out already-sent listings
        const newListings = listings.filter(
          l => !alert.last_listing_ids?.includes(l.id)
        );

        if (newListings.length === 0) {
          console.log(`  ⏭️ No new listings for ${alert.email}, skipping`);
          results.skipped++;
          results.processed++;
          continue;
        }

        console.log(`  📋 Found ${newListings.length} new listings`);

        // Build unsubscribe URL
        const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
        const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${alert.unsubscribe_token}&type=property_alerts`;

        // Build email content
        const propertyListings: PropertyListing[] = newListings.slice(0, 10).map(l => ({
          id: l.zpid,
          imgSrc: l.imgsrc,
          address: `${l.addressstreet}, ${l.lastcity}, ${l.addressstate} ${l.addresszipcode}`,
          price: l.price,
          beds: l.beds,
          baths: l.baths,
          sqft: l.area,
          type: l.statustext,
          detailUrl: l.detailurl
        }));

        const priceRangeDisplay = getPriceRangeDisplay(alert);
        const html = buildPropertyAlertEmail(
          propertyListings,
          {
            priceRange: priceRangeDisplay,
            serviceAreas: alert.service_areas?.slice(0, 3) // Show max 3 areas
          },
          unsubscribeUrl
        );

        // Send the email
        const emailResult = await sendEmail({
          to: alert.email,
          subject: `${newListings.length} New Listing${newListings.length > 1 ? 's' : ''} in Your Area`,
          html
        });

        if (emailResult.success) {
          // Update last_sent_at and last_listing_ids
          const newListingIds = newListings.map(l => l.zpid);
          const updatedListingIds = [...(alert.last_listing_ids || []), ...newListingIds].slice(-100); // Keep last 100

          await supabase
            .from('email_alerts')
            .update({
              last_sent_at: new Date().toISOString(),
              last_listing_ids: updatedListingIds
            })
            .eq('id', alert.id);

          // Log the email
          await supabase
            .from('email_logs')
            .insert({
              user_id: alert.user_id,
              email_type: 'property_alert',
              recipient_email: alert.email,
              subject: `${newListings.length} New Listings in Your Area`,
              status: 'sent',
              resend_message_id: emailResult.messageId,
              metadata: {
                listing_count: newListings.length,
                price_range: alert.price_range,
                service_areas: alert.service_areas
              }
            });

          console.log(`  ✅ Email sent to ${alert.email}`);
          results.sent++;
        } else {
          console.error(`  ❌ Failed to send to ${alert.email}: ${emailResult.error}`);

          // Log the failure
          await supabase
            .from('email_logs')
            .insert({
              user_id: alert.user_id,
              email_type: 'property_alert',
              recipient_email: alert.email,
              subject: `${newListings.length} New Listings in Your Area`,
              status: 'failed',
              error_message: emailResult.error
            });

          results.errors++;
        }

        results.processed++;
      } catch (alertError) {
        console.error(`❌ Error processing alert for ${alert.email}:`, alertError);
        results.errors++;
        results.processed++;
      }
    }

    console.log(`\n✅ Property alerts job completed:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Property alerts processed',
      ...results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Property alerts job error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Fetch listings matching the alert criteria
 */
async function fetchMatchingListings(
  supabase: ReturnType<typeof createClient>,
  alert: EmailAlert,
  profile?: UserProfile
): Promise<any[]> {
  // Query for recently updated listings (last 24 hours for daily alerts)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  let query = supabase
    .from('listings')
    .select('zpid,imgsrc,detailurl,addressstreet,lastcity,addresscity,addressstate,addresszipcode,price,unformattedprice,beds,baths,area,statustext,status,lastseenat,contenttype')
    .gte('lastseenat', cutoffDate.toISOString())
    .neq('contenttype', 'LOT') // Exclude empty land
    .order('lastseenat', { ascending: false })
    .limit(50);

  // Filter by service areas (cities)
  if (alert.service_areas && alert.service_areas.length > 0) {
    // Extract just the city names (format is "City, State")
    const cityNames = alert.service_areas.map(area => {
      const parts = area.split(',');
      return parts[0].trim();
    });
    query = query.in('lastcity', cityNames);
  }

  // Filter by price range
  const priceFilters = getPriceFilters(alert);
  if (priceFilters.minPrice) {
    query = query.gte('unformattedprice', priceFilters.minPrice);
  }
  if (priceFilters.maxPrice) {
    query = query.lte('unformattedprice', priceFilters.maxPrice);
  }

  // Filter by country if profile has country_code
  if (profile?.country_code) {
    if (profile.country_code === 'CA') {
      query = query.in('addressstate', CA_PROVINCES);
    } else if (profile.country_code === 'US') {
      // Exclude Canadian provinces
      for (const province of CA_PROVINCES) {
        query = query.neq('addressstate', province);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  return data || [];
}

/**
 * Get price filters based on alert settings
 */
function getPriceFilters(alert: EmailAlert): { minPrice: number | null; maxPrice: number | null } {
  if (alert.price_range === 'custom') {
    return {
      minPrice: alert.min_price,
      maxPrice: alert.max_price
    };
  }

  switch (alert.price_range) {
    case 'under-500k':
      return { minPrice: null, maxPrice: 500000 };
    case '500k-1m':
      return { minPrice: 500000, maxPrice: 1000000 };
    case 'over-1m':
      return { minPrice: 1000000, maxPrice: null };
    case 'all':
    default:
      return { minPrice: null, maxPrice: null };
  }
}

/**
 * Get human-readable price range for email display
 */
function getPriceRangeDisplay(alert: EmailAlert): string {
  if (alert.price_range === 'custom') {
    const min = alert.min_price ? `$${(alert.min_price / 1000).toFixed(0)}k` : 'Any';
    const max = alert.max_price ? `$${(alert.max_price / 1000).toFixed(0)}k` : 'Any';
    return `${min} - ${max}`;
  }

  switch (alert.price_range) {
    case 'under-500k':
      return 'Under $500k';
    case '500k-1m':
      return '$500k - $1M';
    case 'over-1m':
      return 'Over $1M';
    case 'all':
    default:
      return 'All prices';
  }
}
