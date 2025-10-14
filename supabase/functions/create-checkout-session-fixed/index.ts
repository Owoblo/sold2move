import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

// Initialize Stripe with proper error handling
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
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { priceId } = requestBody;
    
    if (!priceId) {
      return new Response(JSON.stringify({
        error: 'priceId is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({
        error: 'Supabase configuration missing'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || ''
        }
      }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({
        error: 'User not authenticated',
        details: authError?.message
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Processing checkout for user:', user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, business_email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch user profile',
        details: profileError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    let customerId = profile?.stripe_customer_id;

    // Check if customer exists in Stripe, if not create new one
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
      try {
        const customer = await stripe.customers.create({
          email: user.email || profile?.business_email,
          metadata: {
            supabase_user_id: user.id
          }
        });
        customerId = customer.id;
        console.log('Created new customer:', customerId);

        // Update profile with customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to update profile with customer ID:', updateError);
          // Don't fail the whole operation for this
        }
      } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        return new Response(JSON.stringify({
          error: 'Failed to create customer',
          details: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    console.log('Creating checkout session for customer:', customerId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/billing?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id
        }
      }
    });

    console.log('Checkout session created:', session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Unexpected error in create-checkout-session:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      stack: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
