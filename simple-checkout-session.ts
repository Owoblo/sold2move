const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

import { createClient } from 'npm:@supabase/supabase-js@2';
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
    const { priceId } = await req.json();
    
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Check if customer exists in live mode, if not create new one
    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        
        // Check if customer has existing subscriptions with different currency
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const existingCurrency = subscriptions.data[0].currency;
          const newCurrency = 'cad'; // Your new price is in CAD
          
          if (existingCurrency !== newCurrency) {
            console.log(`Currency mismatch: existing ${existingCurrency}, new ${newCurrency}. Creating new customer.`);
            customerId = null; // Force creation of new customer
          }
        }
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
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
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
      success_url: 'http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/pricing',
      metadata: {
        supabase_user_id: user.id
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id
        }
      },
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: false
      }
    });

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
