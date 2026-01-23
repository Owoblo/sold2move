import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CampaignRecipient {
  listing_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface CreateCampaignRequest {
  name: string;
  template_id: string;
  mail_type: 'postcard' | 'letter' | 'handwritten';
  customizations: {
    headline?: string;
    body_text?: string;
    call_to_action?: string;
    sender_name: string;
    sender_company?: string;
    sender_phone?: string;
  };
  recipients: CampaignRecipient[];
}

const MAIL_PRICES: Record<string, number> = {
  postcard: 1.50,
  letter: 2.50,
  handwritten: 3.50,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateCampaignRequest = await req.json();
    const { name, template_id, mail_type, customizations, recipients } = body;

    // Validate request
    if (!name || !template_id || !mail_type || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customizations.sender_name) {
      return new Response(
        JSON.stringify({ error: 'Sender name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cost
    const pricePerPiece = MAIL_PRICES[mail_type] || 1.50;
    const totalCost = recipients.length * pricePerPiece;

    // Create admin client for wallet operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found. Please contact support.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check balance
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < totalCost) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient wallet balance',
          required: totalCost,
          available: currentBalance,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: user.id,
        name,
        template_id,
        template_type: mail_type,
        customizations,
        recipient_count: recipients.length,
        total_cost: totalCost,
        status: 'pending',
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert recipients
    const recipientRecords = recipients.map((r) => ({
      campaign_id: campaign.id,
      listing_id: r.listing_id,
      recipient_address: r.address,
      recipient_city: r.city,
      recipient_state: r.state,
      recipient_zip: r.zip_code,
      status: 'pending',
    }));

    const { error: recipientsError } = await supabaseAdmin
      .from('campaign_recipients')
      .insert(recipientRecords);

    if (recipientsError) {
      console.error('Recipients insertion error:', recipientsError);
      // Rollback campaign
      await supabaseAdmin.from('campaigns').delete().eq('id', campaign.id);
      return new Response(
        JSON.stringify({ error: 'Failed to add recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from wallet
    const newBalance = currentBalance - totalCost;
    const { error: walletUpdateError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError);
      // Rollback campaign and recipients
      await supabaseAdmin.from('campaign_recipients').delete().eq('campaign_id', campaign.id);
      await supabaseAdmin.from('campaigns').delete().eq('id', campaign.id);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        type: 'campaign_charge',
        amount: -totalCost,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Campaign: ${name}`,
        reference_type: 'campaign',
        reference_id: campaign.id,
      });

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
      // Non-critical, don't rollback
    }

    // Update campaign status to processing
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'processing' })
      .eq('id', campaign.id);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaign.id,
        total_cost: totalCost,
        recipient_count: recipients.length,
        new_balance: newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating campaign:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
