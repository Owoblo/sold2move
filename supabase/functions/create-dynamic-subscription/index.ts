import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

// Pricing constants
const PRICING_CONSTANTS = {
  POPULATION_MULTIPLIER: 0.00012,
  BASE_PRICE: 46,
  TIER_1_DIVISOR: 2,
  MINIMUM_PRICE: 25,
  CURRENCY: 'cad',
};

// Tier display names for Stripe product
const TIER_NAMES = {
  basic: 'Basic',
  moversSpecial: 'Movers Special',
};

// Calculate price based on population
function calculatePrice(totalPopulation: number, tier: 'basic' | 'moversSpecial' = 'basic'): number {
  if (!totalPopulation || totalPopulation <= 0) {
    return PRICING_CONSTANTS.MINIMUM_PRICE;
  }

  // Tier 2 formula: (0.00012 × population) + 46
  const tier2Price = (PRICING_CONSTANTS.POPULATION_MULTIPLIER * totalPopulation) + PRICING_CONSTANTS.BASE_PRICE;

  // Tier 1 is half of Tier 2
  const tier1Price = tier2Price / PRICING_CONSTANTS.TIER_1_DIVISOR;

  const price = tier === 'basic' ? tier1Price : tier2Price;

  // Apply minimum floor and round to 2 decimal places
  return Math.max(PRICING_CONSTANTS.MINIMUM_PRICE, Math.round(price * 100) / 100);
}

// Initialize Stripe
let stripe: Stripe;
try {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient()
  });
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { tier = 'basic' } = requestBody;

    if (!['basic', 'moversSpecial'].includes(tier)) {
      return new Response(JSON.stringify({
        error: 'Invalid tier. Must be "basic" or "moversSpecial"'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({
        error: 'Supabase configuration missing'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Client for user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || ''
        }
      }
    });

    // Service client for database queries
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'User not authenticated',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing dynamic subscription for user:', user.id);

    // Get user profile with service cities
    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('stripe_customer_id, business_email, service_cities, city_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch user profile',
        details: profileError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get city names from service_cities or fall back to city_name
    const cityNames: string[] = [];
    if (profile?.service_cities && profile.service_cities.length > 0) {
      for (const cityState of profile.service_cities) {
        cityNames.push(cityState.split(', ')[0]);
      }
    } else if (profile?.city_name) {
      cityNames.push(profile.city_name);
    }

    if (cityNames.length === 0) {
      return new Response(JSON.stringify({
        error: 'No service cities selected. Please select at least one city.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get population data for selected cities
    const { data: cityPopulations, error: citiesError } = await supabaseAdmin
      .from('city_populations')
      .select('city_name, population')
      .in('city_name', cityNames);

    if (citiesError) {
      console.error('Error fetching city populations:', citiesError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch city population data',
        details: citiesError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate total population
    const totalPopulation = cityPopulations?.reduce((sum, city) => sum + (city.population || 0), 0) || 0;

    console.log('Total population for selected cities:', totalPopulation);
    console.log('Cities:', cityNames);

    // Calculate price based on tier
    const calculatedPrice = calculatePrice(totalPopulation, tier);
    const priceInCents = Math.round(calculatedPrice * 100);

    console.log(`Calculated ${tier} price: $${calculatedPrice} (${priceInCents} cents)`);

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        console.log('Using existing customer:', customerId);
      } catch (error) {
        console.log('Customer not found in Stripe, creating new one');
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.business_email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
      console.log('Created new customer:', customerId);

      // Update profile with customer ID
      await supabaseAuth
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    const tierName = TIER_NAMES[tier as keyof typeof TIER_NAMES];

    // Create checkout session with inline price_data (no pre-created products needed)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: PRICING_CONSTANTS.CURRENCY,
            unit_amount: priceInCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `Sold2Move ${tierName} Plan`,
              description: `Service areas: ${cityNames.slice(0, 5).join(', ')}${cityNames.length > 5 ? ` +${cityNames.length - 5} more` : ''}`,
              metadata: {
                tier,
                totalPopulation: totalPopulation.toString(),
                supabase_user_id: user.id,
              }
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/billing?payment=cancelled`,
      subscription_data: {
        trial_period_days: 30, // 1 month free trial
        metadata: {
          supabase_user_id: user.id,
          tier,
          totalPopulation: totalPopulation.toString(),
          calculatedPrice: calculatedPrice.toString(),
          cityNames: cityNames.join(','),
        }
      },
      metadata: {
        supabase_user_id: user.id,
        tier,
      }
    });

    console.log('Checkout session created:', session.id);

    // Update profile with calculated price info
    await supabaseAuth
      .from('profiles')
      .update({
        calculated_monthly_price: calculatedPrice,
        selected_tier: tier,
        price_calculated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return new Response(JSON.stringify({
      success: true,
      sessionId: session.id,
      url: session.url,
      calculatedPrice,
      tier,
      totalPopulation,
      cities: cityNames,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in create-dynamic-subscription:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
