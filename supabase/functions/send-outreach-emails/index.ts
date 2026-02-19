/**
 * Send Outreach Emails Edge Function
 * Automated B2B lead offer emails to moving companies
 *
 * Flow:
 * 1. Find new sold listings in the last 24-48 hours
 * 2. Match listings to moving company contacts by city
 * 3. Create new sequences and send Day 1 emails
 * 4. Check for Day 3 follow-ups (sent Day 1 >= 3 days ago)
 * 5. Check for Day 7 follow-ups (sent Day 3 >= 4 days ago)
 * 6. Respect daily rate limit (configurable, default 50/day)
 *
 * All emails include a magic link that auto-authenticates the contact
 * and shows them real leads in their city — no signup required.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email-sender.ts';
import {
  buildOutreachDay1Email,
  buildOutreachDay3Email,
  buildOutreachDay7Email,
  buildOutreachDay1EmailPlaintext,
  buildOutreachDay3EmailPlaintext,
  buildOutreachDay7EmailPlaintext,
  getOutreachSender,
  OutreachListing,
} from '../_shared/email-templates.ts';

// A/B test variants
type EmailVariant = 'html' | 'plaintext';

/**
 * Randomly select email variant for A/B testing (50/50 split)
 */
function selectEmailVariant(): EmailVariant {
  return Math.random() < 0.5 ? 'html' : 'plaintext';
}

// Get the personal sender for outreach emails
const OUTREACH_SENDER = getOutreachSender();
const OUTREACH_FROM = `${OUTREACH_SENDER.name} <${OUTREACH_SENDER.email}>`;

// Configuration
const DAILY_EMAIL_LIMIT = 50; // Max emails per day for deliverability
const DAY_3_DELAY_HOURS = 72; // 3 days
const DAY_7_DELAY_HOURS = 96; // 4 days after Day 3 (7 days total from Day 1)

interface OutreachContact {
  id: string;
  company_name: string;
  email: string;
  primary_city: string;
  primary_state: string | null;
  status: string;
  magic_token: string;
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
}

interface OutreachSequence {
  id: string;
  contact_id: string;
  listing_id: string;
  listing_city: string;
  day_1_sent_at: string | null;
  day_3_sent_at: string | null;
  day_7_sent_at: string | null;
  status: string;
  email_variant: EmailVariant;
  contact?: OutreachContact;
}

/**
 * Build the magic link URL for a contact (uses custom domain for clean emails)
 */
function buildMagicLinkUrl(magicToken: string): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  return `${siteUrl}/leads?token=${magicToken}`;
}

/**
 * Build the unsubscribe URL for a contact (uses custom domain for clean emails)
 */
function buildUnsubscribeUrl(contactId: string): string {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';
  return `${siteUrl}/unsubscribe?id=${contactId}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for test mode
    const body = await req.json().catch(() => ({}));
    const { testEmail, testCity, testState, testVariant } = body as {
      testEmail?: string;
      testCity?: string;
      testState?: string;
      testVariant?: EmailVariant;
    };

    if (testEmail) {
      const variant = testVariant || selectEmailVariant();
      console.log(`Test mode: sending [${variant}] to ${testEmail}`);
      return await sendTestEmail(testEmail, testCity || 'Toronto', testState || 'ON', variant);
    }

    console.log('Starting outreach emails job...');

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check today's email count for rate limiting
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
      .from('outreach_daily_stats')
      .select('emails_sent')
      .eq('date', today)
      .single();

    let emailsSentToday = todayStats?.emails_sent || 0;
    const remainingQuota = DAILY_EMAIL_LIMIT - emailsSentToday;

    if (remainingQuota <= 0) {
      console.log('Daily email limit reached, skipping');
      return new Response(JSON.stringify({
        success: true,
        message: 'Daily limit reached',
        emailsSentToday,
        limit: DAILY_EMAIL_LIMIT,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Emails sent today: ${emailsSentToday}/${DAILY_EMAIL_LIMIT}`);

    const results = {
      day1Sent: 0,
      day3Sent: 0,
      day7Sent: 0,
      errors: 0,
      skipped: 0,
    };

    // Track how many emails we can still send
    let emailBudget = remainingQuota;

    // =========================================================================
    // PHASE 1: Send Day 7 follow-ups (highest priority - final email)
    // =========================================================================
    if (emailBudget > 0) {
      const day7Results = await sendDay7Emails(supabase, emailBudget);
      results.day7Sent = day7Results.sent;
      results.errors += day7Results.errors;
      emailBudget -= day7Results.sent;
      console.log(`Day 7 emails sent: ${day7Results.sent}`);
    }

    // =========================================================================
    // PHASE 2: Send Day 3 follow-ups
    // =========================================================================
    if (emailBudget > 0) {
      const day3Results = await sendDay3Emails(supabase, emailBudget);
      results.day3Sent = day3Results.sent;
      results.errors += day3Results.errors;
      emailBudget -= day3Results.sent;
      console.log(`Day 3 emails sent: ${day3Results.sent}`);
    }

    // =========================================================================
    // PHASE 3: Create new sequences and send Day 1 emails
    // =========================================================================
    if (emailBudget > 0) {
      const day1Results = await createAndSendDay1Emails(supabase, emailBudget);
      results.day1Sent = day1Results.sent;
      results.errors += day1Results.errors;
      results.skipped = day1Results.skipped;
      console.log(`Day 1 emails sent: ${day1Results.sent}`);
    }

    // Update daily stats
    const totalSent = results.day1Sent + results.day3Sent + results.day7Sent;
    if (totalSent > 0) {
      await supabase.rpc('increment_outreach_daily_stat', {
        stat_name: 'emails_sent',
        increment_by: totalSent,
      });
    }

    console.log(`Outreach emails job completed:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Outreach emails processed',
      ...results,
      totalSent,
      emailsSentToday: emailsSentToday + totalSent,
      dailyLimit: DAILY_EMAIL_LIMIT,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Outreach emails job error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Send Day 7 emails - "Last note — is [Company] still looking for leads?"
 */
async function sendDay7Emails(
  supabase: ReturnType<typeof createClient>,
  budget: number
): Promise<{ sent: number; errors: number }> {
  const results = { sent: 0, errors: 0 };

  // Find sequences ready for Day 7:
  // Path A: Day 3 was sent >= 4 days ago (normal flow)
  // Path B: Day 1 was sent >= 7 days ago but Day 3 was skipped (fallback)
  const day3Cutoff = new Date();
  day3Cutoff.setHours(day3Cutoff.getHours() - DAY_7_DELAY_HOURS);
  const day1Cutoff = new Date();
  day1Cutoff.setHours(day1Cutoff.getHours() - 168); // 7 days from Day 1

  // Path A: Normal Day 3 → Day 7 flow
  const { data: seqPathA } = await supabase
    .from('outreach_sequences')
    .select(`*, contact:outreach_contacts(*)`)
    .eq('status', 'active')
    .not('day_3_sent_at', 'is', null)
    .is('day_7_sent_at', null)
    .lte('day_3_sent_at', day3Cutoff.toISOString())
    .limit(budget);

  // Path B: Day 3 was skipped, but 7+ days since Day 1
  const { data: seqPathB } = await supabase
    .from('outreach_sequences')
    .select(`*, contact:outreach_contacts(*)`)
    .eq('status', 'active')
    .is('day_3_sent_at', null)
    .is('day_7_sent_at', null)
    .not('day_1_sent_at', 'is', null)
    .lte('day_1_sent_at', day1Cutoff.toISOString())
    .limit(budget);

  // Combine and deduplicate
  const seenIds = new Set<string>();
  const sequences: typeof seqPathA = [];
  for (const seq of [...(seqPathA || []), ...(seqPathB || [])]) {
    if (!seenIds.has(seq.id)) {
      seenIds.add(seq.id);
      sequences.push(seq);
    }
  }

  const error = null;

  if (error || !sequences?.length) {
    return results;
  }

  for (const seq of sequences as (OutreachSequence & { contact: OutreachContact })[]) {
    if (!seq.contact || seq.contact.status !== 'active') continue;

    try {
      // Count total leads in this city
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('lastcity', seq.listing_city)
        .in('status', ['sold', 'just_listed']);

      const unsubscribeUrl = buildUnsubscribeUrl(seq.contact.id);
      const magicLinkUrl = buildMagicLinkUrl(seq.contact.magic_token);

      // Use same variant as Day 1 for consistency
      const variant = seq.email_variant || 'html';
      let emailContent: string;
      let isPlainText = false;

      if (variant === 'plaintext') {
        emailContent = buildOutreachDay7EmailPlaintext(
          count || 0, seq.listing_city, seq.contact.company_name,
          unsubscribeUrl, magicLinkUrl
        );
        isPlainText = true;
      } else {
        emailContent = buildOutreachDay7Email(
          count || 0, seq.listing_city, seq.contact.company_name,
          unsubscribeUrl, magicLinkUrl
        );
      }

      const emailResult = await sendEmail({
        to: seq.contact.email,
        subject: `Still looking for leads in ${seq.listing_city}?`,
        ...(isPlainText ? { text: emailContent } : { html: emailContent }),
        from: OUTREACH_FROM,
        tags: [
          { name: 'type', value: 'outreach' },
          { name: 'day', value: '7' },
          { name: 'city', value: seq.listing_city },
          { name: 'variant', value: variant },
        ],
      });

      if (emailResult.success) {
        await supabase
          .from('outreach_sequences')
          .update({
            day_7_sent_at: new Date().toISOString(),
            day_7_email_id: emailResult.messageId,
            status: 'completed',
          })
          .eq('id', seq.id);

        results.sent++;
        console.log(`  Day 7 [${variant}] sent to ${seq.contact.company_name}`);
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error(`Error sending Day 7 to ${seq.contact.email}:`, err);
      results.errors++;
    }
  }

  return results;
}

/**
 * Send Day 3 emails - "X new homes just sold in [City]"
 */
async function sendDay3Emails(
  supabase: ReturnType<typeof createClient>,
  budget: number
): Promise<{ sent: number; errors: number }> {
  const results = { sent: 0, errors: 0 };

  // Find sequences where Day 1 was sent >= 3 days ago and Day 3 not sent
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - DAY_3_DELAY_HOURS);

  const { data: sequences, error } = await supabase
    .from('outreach_sequences')
    .select(`
      *,
      contact:outreach_contacts(*)
    `)
    .eq('status', 'active')
    .not('day_1_sent_at', 'is', null)
    .is('day_3_sent_at', null)
    .lte('day_1_sent_at', cutoff.toISOString())
    .limit(budget);

  if (error || !sequences?.length) {
    return results;
  }

  for (const seq of sequences as (OutreachSequence & { contact: OutreachContact })[]) {
    if (!seq.contact || seq.contact.status !== 'active') continue;

    try {
      // Get recent listings in this city (sold + just_listed, excluding original)
      const { data: recentListings } = await supabase
        .from('listings')
        .select('zpid,addressstreet,lastcity,addressstate,price,beds,baths,imgsrc')
        .eq('lastcity', seq.listing_city)
        .in('status', ['sold', 'just_listed'])
        .neq('zpid', seq.listing_id)
        .order('lastseenat', { ascending: false })
        .limit(5);

      if (!recentListings?.length) {
        // No listings at all in this city — skip Day 3
        continue;
      }

      const listings: OutreachListing[] = recentListings.map(l => ({
        address: l.addressstreet,
        city: l.lastcity,
        state: l.addressstate,
        price: l.price,
        beds: l.beds,
        baths: l.baths,
        imgSrc: l.imgsrc,
      }));

      const unsubscribeUrl = buildUnsubscribeUrl(seq.contact.id);
      const magicLinkUrl = buildMagicLinkUrl(seq.contact.magic_token);

      // Use same variant as Day 1 for consistency
      const variant = seq.email_variant || 'html';
      let emailContent: string;
      let isPlainText = false;

      if (variant === 'plaintext') {
        emailContent = buildOutreachDay3EmailPlaintext(
          listings, seq.contact.company_name, seq.listing_city,
          unsubscribeUrl, magicLinkUrl
        );
        isPlainText = true;
      } else {
        emailContent = buildOutreachDay3Email(
          listings, seq.contact.company_name, seq.listing_city,
          unsubscribeUrl, magicLinkUrl
        );
      }

      const emailResult = await sendEmail({
        to: seq.contact.email,
        subject: `${listings.length} new homes just sold in ${seq.listing_city}`,
        ...(isPlainText ? { text: emailContent } : { html: emailContent }),
        from: OUTREACH_FROM,
        tags: [
          { name: 'type', value: 'outreach' },
          { name: 'day', value: '3' },
          { name: 'city', value: seq.listing_city },
          { name: 'variant', value: variant },
        ],
      });

      if (emailResult.success) {
        await supabase
          .from('outreach_sequences')
          .update({
            day_3_sent_at: new Date().toISOString(),
            day_3_email_id: emailResult.messageId,
          })
          .eq('id', seq.id);

        results.sent++;
      } else {
        results.errors++;
      }
    } catch (err) {
      console.error(`Error sending Day 3 to ${seq.contact.email}:`, err);
      results.errors++;
    }
  }

  return results;
}

/**
 * Create new sequences and send Day 1 emails
 * "Moving leads in [City] — free for your company"
 */
async function createAndSendDay1Emails(
  supabase: ReturnType<typeof createClient>,
  budget: number
): Promise<{ sent: number; errors: number; skipped: number }> {
  const results = { sent: 0, errors: 0, skipped: 0 };

  // Get active contacts (include magic_token)
  const { data: contacts, error: contactsError } = await supabase
    .from('outreach_contacts')
    .select('id, company_name, email, primary_city, primary_state, status, magic_token')
    .eq('status', 'active');

  if (contactsError) {
    console.error('Contacts query error:', contactsError);
    return results;
  }

  if (!contacts?.length) {
    console.log('No active outreach contacts found');
    return results;
  }

  // Build a map of city+state -> contacts for accurate matching
  const cityStateContactsMap = new Map<string, OutreachContact[]>();
  for (const contact of contacts as OutreachContact[]) {
    const city = contact.primary_city.toLowerCase().trim();
    const state = contact.primary_state?.toUpperCase().trim() || '';
    const key = `${city}|${state}`;
    if (!cityStateContactsMap.has(key)) {
      cityStateContactsMap.set(key, []);
    }
    cityStateContactsMap.get(key)!.push(contact);
  }

  // Get recent sold + just_listed in last 48 hours, filtered to contact cities
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 48);

  const contactCities = [...new Set((contacts as OutreachContact[]).map(c => c.primary_city))];
  const contactStates = [...new Set((contacts as OutreachContact[]).map(c => c.primary_state).filter(Boolean))];
  console.log(`Contact cities: ${contactCities.length}, Contact states: ${contactStates.length}`);

  const { data: recentListings, error: listingsError } = await supabase
    .from('listings')
    .select('zpid,addressstreet,lastcity,addressstate,addresszipcode,price,beds,baths,imgsrc,status')
    .in('status', ['sold', 'just_listed'])
    .gte('lastseenat', cutoffDate.toISOString())
    .neq('contenttype', 'LOT')
    .in('lastcity', contactCities)
    .in('addressstate', contactStates)
    .order('lastseenat', { ascending: false })
    .limit(500);

  if (listingsError) {
    console.error('Listings query error:', listingsError);
    return results;
  }

  if (!recentListings?.length) {
    console.log('No recent listings found. Cutoff:', cutoffDate.toISOString());
    return results;
  }

  console.log(`Found ${recentListings.length} listings in target cities`);

  // Pre-compute listing counts per city+state for the email template
  const cityListingCounts = new Map<string, number>();
  for (const listing of recentListings as Listing[]) {
    const key = `${listing.lastcity}|${listing.addressstate}`;
    cityListingCounts.set(key, (cityListingCounts.get(key) || 0) + 1);
  }

  // For each listing, find matching contacts and create sequences
  for (const listing of recentListings as Listing[]) {
    if (results.sent >= budget) break;

    const listingCity = listing.lastcity.toLowerCase().trim();
    const listingState = listing.addressstate?.toUpperCase().trim() || '';
    const key = `${listingCity}|${listingState}`;
    const matchingContacts = cityStateContactsMap.get(key) || [];

    // Get total listing count for this city (for the email)
    const totalInCity = cityListingCounts.get(`${listing.lastcity}|${listing.addressstate}`) || 1;

    for (const contact of matchingContacts) {
      if (results.sent >= budget) break;

      // Check if sequence already exists
      const { data: existingSeq } = await supabase
        .from('outreach_sequences')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('listing_id', listing.zpid)
        .single();

      if (existingSeq) {
        results.skipped++;
        continue;
      }

      try {
        const outreachListing: OutreachListing = {
          address: listing.addressstreet,
          city: listing.lastcity,
          state: listing.addressstate,
          price: listing.price,
          beds: listing.beds || undefined,
          baths: listing.baths || undefined,
          imgSrc: listing.imgsrc || undefined,
        };

        const unsubscribeUrl = buildUnsubscribeUrl(contact.id);
        const magicLinkUrl = buildMagicLinkUrl(contact.magic_token);

        // A/B test: 50% HTML, 50% plain text
        const variant = selectEmailVariant();

        let emailContent: string;
        let isPlainText = false;

        if (variant === 'plaintext') {
          emailContent = buildOutreachDay1EmailPlaintext(
            outreachListing, contact.company_name, unsubscribeUrl,
            magicLinkUrl, totalInCity
          );
          isPlainText = true;
        } else {
          emailContent = buildOutreachDay1Email(
            outreachListing, contact.company_name, unsubscribeUrl,
            magicLinkUrl, totalInCity
          );
        }

        const emailResult = await sendEmail({
          to: contact.email,
          subject: `Moving leads in ${listing.lastcity} — free for ${contact.company_name}`,
          ...(isPlainText ? { text: emailContent } : { html: emailContent }),
          from: OUTREACH_FROM,
          tags: [
            { name: 'type', value: 'outreach' },
            { name: 'day', value: '1' },
            { name: 'city', value: listing.lastcity },
            { name: 'variant', value: variant },
          ],
        });

        if (emailResult.success) {
          // Create the sequence record with A/B variant
          await supabase
            .from('outreach_sequences')
            .insert({
              contact_id: contact.id,
              listing_id: listing.zpid,
              listing_address: listing.addressstreet,
              listing_city: listing.lastcity,
              listing_state: listing.addressstate,
              listing_price: listing.price,
              listing_beds: listing.beds,
              listing_baths: listing.baths,
              day_1_sent_at: new Date().toISOString(),
              day_1_email_id: emailResult.messageId,
              email_variant: variant,
              status: 'active',
            });

          results.sent++;
          console.log(`  Day 1 [${variant}] sent to ${contact.company_name} for ${listing.addressstreet}`);
        } else {
          results.errors++;
          console.error(`  Failed to send to ${contact.email}: ${emailResult.error}`);
        }
      } catch (err) {
        console.error(`Error creating sequence for ${contact.email}:`, err);
        results.errors++;
      }
    }
  }

  return results;
}

/**
 * Send a test email to verify template styling
 */
async function sendTestEmail(
  toEmail: string,
  city: string,
  state: string,
  variant: EmailVariant
): Promise<Response> {
  const testListing: OutreachListing = {
    address: '123 Maple Drive',
    city: city,
    state: state,
    price: '$425,000',
    beds: 3,
    baths: 2,
  };

  const unsubscribeUrl = buildUnsubscribeUrl('test-id');
  // Use a real-looking magic link for testing
  const magicLinkUrl = buildMagicLinkUrl('00000000-0000-0000-0000-000000000000');

  let emailContent: string;
  let isPlainText = false;

  if (variant === 'plaintext') {
    emailContent = buildOutreachDay1EmailPlaintext(
      testListing, 'Test Moving Company', unsubscribeUrl, magicLinkUrl, 14
    );
    isPlainText = true;
  } else {
    emailContent = buildOutreachDay1Email(
      testListing, 'Test Moving Company', unsubscribeUrl, magicLinkUrl, 14
    );
  }

  const emailResult = await sendEmail({
    to: toEmail,
    subject: `Moving leads in ${city} — free for Test Moving Company`,
    ...(isPlainText ? { text: emailContent } : { html: emailContent }),
    from: OUTREACH_FROM,
    tags: [
      { name: 'type', value: 'outreach-test' },
      { name: 'day', value: '1' },
      { name: 'city', value: city },
      { name: 'variant', value: variant },
    ],
  });

  if (emailResult.success) {
    return new Response(JSON.stringify({
      success: true,
      message: `Test email [${variant}] sent to ${toEmail}`,
      messageId: emailResult.messageId,
      variant,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: emailResult.error,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
