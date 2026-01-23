import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';
import { sendEmail } from '../_shared/email-sender.ts';
import {
  buildReceiptEmail,
  buildSubscriptionActivatedEmail,
  buildSubscriptionCancelledEmail,
} from '../_shared/email-templates.ts';

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
          // Get tier info from subscription metadata (new fixed-tier system)
          const tierId = subscription.metadata?.tier_id || null;
          const tierName = subscription.metadata?.tier_name || null;
          const cityLimit = subscription.metadata?.city_limit || null;

          // Fallback to lookup_key for backward compatibility
          const planName = tierId || subscription.items.data[0].price.lookup_key?.replace(/_monthly|_yearly/, '') || 'unknown';
          const status = subscription.status;
          const nextBillingDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
          const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null;

          // Determine if user should have unlimited cities (premium tier)
          const hasUnlimitedCities = tierId === 'premium' || cityLimit === 'unlimited' || planName === 'enterprise';

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              subscription_plan: planName,
              subscription_tier: tierId, // New field for fixed-tier system
              subscription_tier_name: tierName,
              city_limit: cityLimit === 'unlimited' ? null : (cityLimit ? parseInt(cityLimit) : null),
              next_billing_date: nextBillingDate,
              current_period_start: currentPeriodStart,
              unlimited: hasUnlimitedCities,
              // Clear pending fields on successful subscription
              pending_subscription_tier: null,
              pending_subscription_price: null,
            })
            .eq('id', supabaseUserId);

          if (updateError) throw updateError;
          console.log(`Subscription ${subscription.id} for user ${supabaseUserId} updated to ${status} (tier: ${tierId || planName}).`);

          // Get user email for notification
          const userEmail = (customerData as Stripe.Customer).email;

          // Send appropriate email based on event type
          if (userEmail) {
            const formattedPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);
            const formattedDate = nextBillingDate
              ? new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'N/A';

            if (event.type === 'customer.subscription.created') {
              // Send subscription activated email
              const html = buildSubscriptionActivatedEmail(formattedPlanName, formattedDate);
              const emailResult = await sendEmail({
                to: userEmail,
                subject: `Welcome to ${formattedPlanName}!`,
                html
              });

              if (emailResult.success) {
                console.log(`✅ Subscription activated email sent to ${userEmail}`);
                // Log the email
                await supabaseAdmin.from('email_logs').insert({
                  user_id: supabaseUserId,
                  email_type: 'subscription_activated',
                  recipient_email: userEmail,
                  subject: `Welcome to ${formattedPlanName}!`,
                  status: 'sent',
                  resend_message_id: emailResult.messageId,
                  metadata: { plan_name: planName, subscription_id: subscription.id }
                });
              }
            } else if (event.type === 'customer.subscription.deleted') {
              // Send subscription cancelled email
              const html = buildSubscriptionCancelledEmail(formattedPlanName, formattedDate);
              const emailResult = await sendEmail({
                to: userEmail,
                subject: 'Subscription Cancelled',
                html
              });

              if (emailResult.success) {
                console.log(`✅ Subscription cancelled email sent to ${userEmail}`);
                await supabaseAdmin.from('email_logs').insert({
                  user_id: supabaseUserId,
                  email_type: 'subscription_cancelled',
                  recipient_email: userEmail,
                  subject: 'Subscription Cancelled',
                  status: 'sent',
                  resend_message_id: emailResult.messageId,
                  metadata: { plan_name: planName, subscription_id: subscription.id }
                });
              }
            }
          }
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

              // Send payment confirmation email
              if (session.customer_email || session.customer_details?.email) {
                const userEmail = session.customer_email || session.customer_details?.email;
                const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : 'N/A';
                const purchaseDate = new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });

                const html = buildReceiptEmail({
                  amount: amountPaid,
                  description: `Credit Pack - ${creditsAmount} Credits`,
                  credits: creditsAmount,
                  date: purchaseDate
                });

                const emailResult = await sendEmail({
                  to: userEmail!,
                  subject: 'Payment Confirmed - Credits Added',
                  html
                });

                if (emailResult.success) {
                  console.log(`✅ Payment confirmation email sent to ${userEmail}`);
                  await supabaseAdmin.from('email_logs').insert({
                    user_id: userId,
                    email_type: 'payment_confirmation',
                    recipient_email: userEmail,
                    subject: 'Payment Confirmed - Credits Added',
                    status: 'sent',
                    resend_message_id: emailResult.messageId,
                    metadata: {
                      amount: amountPaid,
                      credits_purchased: creditsAmount,
                      new_total: newCredits,
                      session_id: session.id
                    }
                  });
                }
              }
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
