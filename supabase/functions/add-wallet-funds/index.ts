import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

/**
 * Add Wallet Funds Edge Function
 * Creates a Stripe checkout session for adding funds to user's wallet
 */

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
}) : null;

// Predefined funding amounts
const FUNDING_AMOUNTS = {
  small: { amount: 250, label: '$250' },
  medium: { amount: 500, label: '$500' },
  large: { amount: 1000, label: '$1,000' },
  xlarge: { amount: 2500, label: '$2,500' },
  custom: { min: 50, max: 10000 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, preset } = await req.json();

    // Validate amount
    let fundingAmount: number;

    if (preset && FUNDING_AMOUNTS[preset as keyof typeof FUNDING_AMOUNTS]) {
      const presetConfig = FUNDING_AMOUNTS[preset as keyof typeof FUNDING_AMOUNTS];
      if ('amount' in presetConfig) {
        fundingAmount = presetConfig.amount;
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid preset' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (amount && typeof amount === 'number') {
      if (amount < FUNDING_AMOUNTS.custom.min || amount > FUNDING_AMOUNTS.custom.max) {
        return new Response(
          JSON.stringify({
            error: `Amount must be between $${FUNDING_AMOUNTS.custom.min} and $${FUNDING_AMOUNTS.custom.max}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      fundingAmount = amount;
    } else {
      return new Response(
        JSON.stringify({ error: 'Please provide an amount or preset' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing wallet funding for user: ${user.id}, amount: $${fundingAmount}`);

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      // Create wallet if doesn't exist
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: user.id, balance: 0, currency: 'USD' })
        .select()
        .single();

      if (createError) {
        console.error('Error creating wallet:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create wallet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get or create Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, business_email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.business_email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

    // Create Stripe checkout session for wallet funding
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: fundingAmount * 100, // Convert to cents
            product_data: {
              name: 'Wallet Funds',
              description: `Add $${fundingAmount.toFixed(2)} to your Sold2Move wallet for direct mail campaigns`,
              metadata: {
                type: 'wallet_funding',
              },
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/dashboard/wallet?payment=success&amount=${fundingAmount}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/wallet?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        type: 'wallet_funding',
        amount: fundingAmount.toString(),
      },
    });

    console.log(`Wallet funding checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        amount: fundingAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in add-wallet-funds:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
