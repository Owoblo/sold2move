import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    headers?: { name: string; value: string }[];
    tags?: { name: string; value: string }[];
    click?: {
      link: string;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
    open?: {
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
    bounce?: {
      message: string;
    };
  };
}

/**
 * Update outreach sequence tracking when opens/clicks happen
 */
async function updateOutreachSequenceTracking(
  supabase: ReturnType<typeof createClient>,
  emailId: string,
  eventType: string
): Promise<void> {
  try {
    // Find the sequence by email ID (could be day_1, day_3, or day_7)
    const { data: sequences } = await supabase
      .from('outreach_sequences')
      .select('id, opened, clicked')
      .or(`day_1_email_id.eq.${emailId},day_3_email_id.eq.${emailId},day_7_email_id.eq.${emailId}`);

    if (!sequences?.length) return;

    for (const seq of sequences) {
      const updates: Record<string, boolean> = {};

      if (eventType === 'email.opened' && !seq.opened) {
        updates.opened = true;
        // Also increment daily stats
        await supabase.rpc('increment_outreach_daily_stat', {
          stat_name: 'emails_opened',
          increment_by: 1,
        });
      }

      if (eventType === 'email.clicked' && !seq.clicked) {
        updates.clicked = true;
        // Also increment daily stats
        await supabase.rpc('increment_outreach_daily_stat', {
          stat_name: 'emails_clicked',
          increment_by: 1,
        });
      }

      if (eventType === 'email.bounced') {
        // Mark sequence and contact as bounced
        await supabase
          .from('outreach_sequences')
          .update({ status: 'bounced' })
          .eq('id', seq.id);

        // Get contact_id and update contact status
        const { data: seqData } = await supabase
          .from('outreach_sequences')
          .select('contact_id')
          .eq('id', seq.id)
          .single();

        if (seqData) {
          await supabase
            .from('outreach_contacts')
            .update({ status: 'bounced' })
            .eq('id', seqData.contact_id);
        }

        await supabase.rpc('increment_outreach_daily_stat', {
          stat_name: 'emails_bounced',
          increment_by: 1,
        });
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('outreach_sequences')
          .update(updates)
          .eq('id', seq.id);
        console.log(`📊 Updated outreach sequence ${seq.id}: ${JSON.stringify(updates)}`);
      }
    }
  } catch (err) {
    console.error('Error updating outreach sequence tracking:', err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendWebhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

    // Optional: Verify webhook signature (recommended for production)
    // const svixId = req.headers.get('svix-id');
    // const svixTimestamp = req.headers.get('svix-timestamp');
    // const svixSignature = req.headers.get('svix-signature');
    // TODO: Implement signature verification if needed

    const payload: ResendWebhookPayload = await req.json();
    console.log(`📬 Resend webhook received: ${payload.type}`);
    console.log(`   Email ID: ${payload.data.email_id}`);
    console.log(`   To: ${payload.data.to?.join(', ')}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract common data
    const emailId = payload.data.email_id;
    const eventType = payload.type;
    const recipient = payload.data.to?.[0] || '';
    const subject = payload.data.subject || '';
    const tags = payload.data.tags || [];

    // Build metadata based on event type
    let metadata: Record<string, unknown> = {};
    let userAgent = '';
    let ipAddress = '';
    let linkUrl = '';

    if (payload.type === 'email.opened' && payload.data.open) {
      userAgent = payload.data.open.userAgent || '';
      ipAddress = payload.data.open.ipAddress || '';
      metadata = { timestamp: payload.data.open.timestamp };
    } else if (payload.type === 'email.clicked' && payload.data.click) {
      userAgent = payload.data.click.userAgent || '';
      ipAddress = payload.data.click.ipAddress || '';
      linkUrl = payload.data.click.link || '';
      metadata = { timestamp: payload.data.click.timestamp, link: linkUrl };
    } else if (payload.type === 'email.bounced' && payload.data.bounce) {
      metadata = { message: payload.data.bounce.message };
    }

    // Insert event into email_events table
    const { error: insertError } = await supabase.from('email_events').insert({
      email_id: emailId,
      event_type: eventType,
      recipient: recipient,
      subject: subject,
      tags: tags,
      metadata: metadata,
      user_agent: userAgent,
      ip_address: ipAddress,
      link_url: linkUrl,
    });

    if (insertError) {
      console.error('❌ Failed to insert email event:', insertError);
      // Don't throw - we still want to return 200 to Resend
    } else {
      console.log(`✅ Email event recorded: ${eventType} for ${emailId}`);
    }

    // Check if this is an outreach email and update sequence tracking
    const isOutreachEmail = tags.some(t => t.name === 'type' && t.value === 'outreach');
    if (isOutreachEmail) {
      await updateOutreachSequenceTracking(supabase, emailId, eventType);
    }

    // Return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true, type: eventType }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent Resend from retrying
    return new Response(
      JSON.stringify({ error: 'Internal error', received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
