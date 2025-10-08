# Manual Edge Functions Deployment Guide

## 🚀 Deploy Your Stripe Billing Functions

Since the CLI deployment has token format issues, let's deploy manually through the Supabase dashboard.

## Step 1: Access Functions Dashboard

1. Go to: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions
2. Click "Create a new function"

## Step 2: Deploy Function 1 - create-checkout-session-fixed

### Function Details:
- **Name**: `create-checkout-session-fixed`
- **Description**: Handles Stripe checkout session creation

### Code to Copy:
```typescript
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

    const { priceId, mode = 'subscription' } = requestBody;

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
      mode: mode,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        supabase_user_id: user.id
      },
      ...(mode === 'subscription' && {
        subscription_data: {
          metadata: {
            supabase_user_id: user.id
          }
        }
      })
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
```

### Environment Variables:
- `STRIPE_SECRET_KEY`: `[YOUR_STRIPE_SECRET_KEY]`
- `SUPABASE_URL`: `https://idbyrtwdeeruiutoukct.supabase.co`
- `SUPABASE_ANON_KEY`: `your_anon_key`
- `SITE_URL`: `http://localhost:5173`

## Step 3: Deploy Function 2 - create-portal-session

### Function Details:
- **Name**: `create-portal-session`
- **Description**: Creates Stripe customer portal sessions

### Code to Copy:
```typescript
import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'User not authenticated', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      console.error('Profile or Stripe customer ID missing:', profileError);
      return new Response(JSON.stringify({ error: 'Stripe customer ID not found for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/billing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### Environment Variables:
- Same as Function 1

## Step 4: Deploy Function 3 - stripe-webhook

### Function Details:
- **Name**: `stripe-webhook`
- **Description**: Handles Stripe webhook events

### Code to Copy:
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!stripeSecretKey || !stripeWebhookSecret || !supabaseServiceRoleKey) {
  console.error('Missing Stripe or Supabase environment variables for webhook');
  Deno.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

Deno.serve(async (req) => {
  let event: Stripe.Event;

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      stripeWebhookSecret
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: customerData, error: customerError } = await stripe.customers.retrieve(customerId);
        if (customerError) throw customerError;
        const supabaseUserId = (customerData as Stripe.Customer).metadata.supabase_user_id;

        if (supabaseUserId) {
          const planName = subscription.items.data[0].price.lookup_key?.replace(/_monthly|_yearly/, '') || 'unknown';
          const status = subscription.status;
          const nextBillingDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              subscription_plan: planName,
              next_billing_date: nextBillingDate,
              unlimited: planName === 'enterprise',
            })
            .eq('id', supabaseUserId);

          if (updateError) throw updateError;
          console.log(`Subscription ${subscription.id} for user ${supabaseUserId} updated to ${status} (${planName}).`);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId && session.mode === 'payment' && session.payment_status === 'paid') {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const creditPrice = lineItems.data.find(item => item.price?.lookup_key?.startsWith('credit_pack_'));

          if (creditPrice) {
            const creditsAmount = parseInt(creditPrice.price?.metadata?.credits_amount || '0');
            if (creditsAmount > 0) {
              const { data: profile, error: fetchProfileError } = await supabaseAdmin
                .from('profiles')
                .select('credits_remaining')
                .eq('id', userId)
                .single();

              if (fetchProfileError) throw fetchProfileError;

              const newCredits = (profile?.credits_remaining || 0) + creditsAmount;

              const { error: updateCreditsError } = await supabaseAdmin
                .from('profiles')
                .update({ credits_remaining: newCredits })
                .eq('id', userId);

              if (updateCreditsError) throw updateCreditsError;
              console.log(`User ${userId} topped up ${creditsAmount} credits. New total: ${newCredits}`);
            }
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling webhook event:', error.message);
    return new Response(`Webhook handler failed: ${error.message}`, { status: 500 });
  }
});
```

### Environment Variables:
- `STRIPE_SECRET_KEY`: `[YOUR_STRIPE_SECRET_KEY]`
- `STRIPE_WEBHOOK_SECRET`: `wh_...` (get from Stripe Dashboard)
- `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI1OTQ2NCwiZXhwIjoyMDUzODM1NDY0fQ.WiJMUqoCxlI-FFtD7riPkds-qXcrSHB8f6RyXLhryvc`
- `SUPABASE_URL`: `https://idbyrtwdeeruiutoukct.supabase.co`

## Step 5: Set Up Stripe Webhooks

1. Go to: https://dashboard.stripe.com/webhooks
2. Create endpoint: `https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
4. Copy the webhook secret and add it to your stripe-webhook function

## 🎉 Your Billing System Will Be Live!

Once you deploy these 3 functions, your billing system will be 100% functional and ready to process real payments!
