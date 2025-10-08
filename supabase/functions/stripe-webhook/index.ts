import { corsHeaders } from './cors.ts';
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
              unlimited: planName === 'enterprise', // Set unlimited for enterprise plan
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

      // Handle other events as needed (e.g., invoice.payment_succeeded, invoice.payment_failed)
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling webhook event:', error.message);
    return new Response(`Webhook handler failed: ${error.message}`, { status: 500 });
  }
});
