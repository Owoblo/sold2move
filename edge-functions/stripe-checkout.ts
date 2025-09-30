import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import Stripe from 'npm:stripe@^14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { priceId, returnUrl } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')
          }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not authenticated'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Could not get user profile: ${profileError.message}`);
    }

    let customerId = profile.stripe_customer_id;

    // Check if customer exists in live mode, if not create new one
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (error) {
        // Customer doesn't exist in live mode, create new one
        console.log('Customer not found in live mode, creating new one');
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (updateError) {
        throw new Error(`Could not update profile with Stripe customer ID: ${updateError.message}`);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: returnUrl,
      cancel_url: `${new URL(req.url).origin}/pricing`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id
        }
      }
    });

    return new Response(JSON.stringify({
      sessionId: session.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
