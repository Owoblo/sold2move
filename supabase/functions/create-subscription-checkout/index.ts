import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

/**
 * Fixed Tier Pricing
 * Solo: $99/mo - 1 city
 * Special: $249/mo - 2 cities
 * Premium: $999/mo - Unlimited cities
 */
const PRICING_TIERS = {
  solo: {
    id: 'solo',
    name: 'Solo',
    price: 99,
    priceInCents: 9900,
    cityLimit: 1,
    description: 'Access to listings in 1 city',
  },
  special: {
    id: 'special',
    name: 'Movers Special',
    price: 249,
    priceInCents: 24900,
    cityLimit: 2,
    description: 'Homeowner info + Furniture AI in 2 cities',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 999,
    priceInCents: 99900,
    cityLimit: null, // Unlimited
    description: 'Everything included, unlimited cities',
  },
};

// Initialize Stripe
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
}) : null;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe not initialized - missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { tierId, selectedCities = [] } = requestBody;

    // Validate tier
    if (!tierId || !PRICING_TIERS[tierId as keyof typeof PRICING_TIERS]) {
      return new Response(
        JSON.stringify({
          error: 'Invalid tier. Must be "solo", "special", or "premium"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tier = PRICING_TIERS[tierId as keyof typeof PRICING_TIERS];

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Auth client for user context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    });

    // Admin client for database operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'User not authenticated',
          details: authError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing subscription checkout for user:', user.id);
    console.log('Selected tier:', tierId);

    // Get user profile (use admin client to avoid RLS issues)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, business_email, full_name, service_cities')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user profile',
          details: profileError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        console.log('Using existing Stripe customer:', customerId);
      } catch (error) {
        console.log('Customer not found in Stripe, creating new one');
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.business_email,
        name: profile?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created new Stripe customer:', customerId);

      // Update profile with customer ID
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://sold2move.com';

    // Create checkout session with the fixed tier price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: tier.priceInCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `Sold2Move ${tier.name} Plan`,
              description: tier.description,
              metadata: {
                tier_id: tier.id,
                city_limit: tier.cityLimit?.toString() || 'unlimited',
              },
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/billing?payment=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          supabase_user_id: user.id,
          tier_id: tier.id,
          tier_name: tier.name,
          price: tier.price.toString(),
          city_limit: tier.cityLimit?.toString() || 'unlimited',
          selected_cities: JSON.stringify(selectedCities),
        },
      },
      metadata: {
        supabase_user_id: user.id,
        tier_id: tier.id,
      },
    });

    console.log('Checkout session created:', session.id);

    // Update profile with selected tier (pending until payment)
    await supabaseAdmin
      .from('profiles')
      .update({
        pending_subscription_tier: tier.id,
        pending_subscription_price: tier.price,
        subscription_checkout_created_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        tier: {
          id: tier.id,
          name: tier.name,
          price: tier.price,
          cityLimit: tier.cityLimit,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-subscription-checkout:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
