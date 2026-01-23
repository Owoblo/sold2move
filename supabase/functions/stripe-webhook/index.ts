import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';
import { sendEmail } from './email-sender.ts';
import {
  buildReceiptEmail,
  buildSubscriptionActivatedEmail,
  buildSubscriptionCancelledEmail,
  buildOrderConfirmationEmail,
  buildTrialEndingEmail,
  buildPaymentFailedEmail,
  buildSubscriptionReceiptEmail,
  buildPlanChangedEmail,
  buildTrialStartedEmail,
} from './email-templates.ts';

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
              // Check if this is a trial subscription
              const isTrialing = subscription.status === 'trialing' && subscription.trial_end;

              if (isTrialing) {
                // Send trial started email
                const trialEndDate = new Date(subscription.trial_end! * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                });
                const trialDays = subscription.trial_end
                  ? Math.ceil((subscription.trial_end * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
                  : 14;

                const html = buildTrialStartedEmail(formattedPlanName, trialEndDate, trialDays);
                const emailResult = await sendEmail({
                  to: userEmail,
                  subject: `Your ${formattedPlanName} Trial Has Started!`,
                  html
                });

                if (emailResult.success) {
                  console.log(`✅ Trial started email sent to ${userEmail}`);
                  await supabaseAdmin.from('email_logs').insert({
                    user_id: supabaseUserId,
                    email_type: 'trial_started',
                    recipient_email: userEmail,
                    subject: `Your ${formattedPlanName} Trial Has Started!`,
                    status: 'sent',
                    resend_message_id: emailResult.messageId,
                    metadata: {
                      plan_name: planName,
                      subscription_id: subscription.id,
                      trial_end: trialEndDate,
                      trial_days: trialDays,
                    }
                  });
                }
              } else {
                // Send subscription activated email (for non-trial activations)
                const html = buildSubscriptionActivatedEmail(formattedPlanName, formattedDate);
                const emailResult = await sendEmail({
                  to: userEmail,
                  subject: `Welcome to ${formattedPlanName}!`,
                  html
                });

                if (emailResult.success) {
                  console.log(`✅ Subscription activated email sent to ${userEmail}`);
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
              }
            } else if (event.type === 'customer.subscription.updated') {
              // Check if plan changed by looking at previous_attributes
              const previousAttributes = (event.data as any).previous_attributes;
              const previousItems = previousAttributes?.items?.data;

              if (previousItems && previousItems.length > 0) {
                const previousPrice = previousItems[0]?.price;
                const currentPrice = subscription.items.data[0]?.price;

                // Check if the price/product changed (plan change)
                if (previousPrice && currentPrice && previousPrice.id !== currentPrice.id) {
                  const oldPlanName = previousPrice.metadata?.tier_name ||
                    previousPrice.lookup_key?.replace(/_monthly|_yearly/, '') ||
                    'Previous Plan';
                  const newPlanName = tierName || planName;
                  const newPrice = currentPrice.unit_amount
                    ? `$${(currentPrice.unit_amount / 100).toFixed(0)}`
                    : 'N/A';

                  // Determine if upgrade (higher price = upgrade)
                  const oldAmount = previousPrice.unit_amount || 0;
                  const newAmount = currentPrice.unit_amount || 0;
                  const isUpgrade = newAmount > oldAmount;

                  const effectiveDate = new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  const html = buildPlanChangedEmail({
                    oldPlan: oldPlanName.charAt(0).toUpperCase() + oldPlanName.slice(1),
                    newPlan: formattedPlanName,
                    newPrice,
                    effectiveDate,
                    isUpgrade,
                  });

                  const emailResult = await sendEmail({
                    to: userEmail,
                    subject: `Plan ${isUpgrade ? 'Upgraded' : 'Changed'} Successfully`,
                    html
                  });

                  if (emailResult.success) {
                    console.log(`✅ Plan changed email sent to ${userEmail}`);
                    await supabaseAdmin.from('email_logs').insert({
                      user_id: supabaseUserId,
                      email_type: 'plan_changed',
                      recipient_email: userEmail,
                      subject: `Plan ${isUpgrade ? 'Upgraded' : 'Changed'} Successfully`,
                      status: 'sent',
                      resend_message_id: emailResult.messageId,
                      metadata: {
                        old_plan: oldPlanName,
                        new_plan: planName,
                        is_upgrade: isUpgrade,
                        subscription_id: subscription.id
                      }
                    });
                  }
                }
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
          // Check payment type from metadata
          const paymentType = session.metadata?.type;
          const orderId = session.metadata?.order_id;

          // Handle wallet funding
          if (paymentType === 'wallet_funding') {
            const fundingAmount = parseFloat(session.metadata?.amount || '0');
            console.log(`Processing wallet funding: $${fundingAmount} for user ${userId}`);

            // Get user's wallet
            const { data: wallet, error: walletError } = await supabaseAdmin
              .from('wallets')
              .select('id, balance')
              .eq('user_id', userId)
              .single();

            if (walletError || !wallet) {
              console.error('Wallet not found for user:', userId);
              break;
            }

            const newBalance = parseFloat(wallet.balance) + fundingAmount;

            // Update wallet balance
            const { error: updateError } = await supabaseAdmin
              .from('wallets')
              .update({ balance: newBalance })
              .eq('id', wallet.id);

            if (updateError) {
              console.error('Error updating wallet balance:', updateError);
              break;
            }

            // Create transaction record
            await supabaseAdmin.from('wallet_transactions').insert({
              wallet_id: wallet.id,
              user_id: userId,
              type: 'deposit',
              amount: fundingAmount,
              balance_before: parseFloat(wallet.balance),
              balance_after: newBalance,
              description: `Added $${fundingAmount.toFixed(2)} to wallet`,
              reference_type: 'stripe_payment',
              stripe_payment_intent_id: session.payment_intent as string,
              metadata: { session_id: session.id }
            });

            console.log(`✅ Wallet funded: $${fundingAmount} for user ${userId}. New balance: $${newBalance}`);

            // Send confirmation email
            const userEmail = session.customer_email || session.customer_details?.email;
            if (userEmail) {
              const html = buildReceiptEmail({
                amount: `$${fundingAmount.toFixed(2)}`,
                description: 'Wallet Funds Added',
                date: new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              });

              const emailResult = await sendEmail({
                to: userEmail,
                subject: `Wallet Funded - $${fundingAmount.toFixed(2)} Added`,
                html
              });

              if (emailResult.success) {
                console.log(`✅ Wallet funding confirmation sent to ${userEmail}`);
                await supabaseAdmin.from('email_logs').insert({
                  user_id: userId,
                  email_type: 'wallet_funded',
                  recipient_email: userEmail,
                  subject: `Wallet Funded - $${fundingAmount.toFixed(2)} Added`,
                  status: 'sent',
                  resend_message_id: emailResult.messageId,
                  metadata: {
                    amount: fundingAmount,
                    new_balance: newBalance,
                    session_id: session.id
                  }
                });
              }
            }
            break;
          }

          // Check if this is a product order (design service)
          if (orderId) {
            // Handle product order payment
            console.log(`Processing product order payment: ${orderId}`);

            // Update order status to paid
            const { data: order, error: orderUpdateError } = await supabaseAdmin
              .from('design_orders')
              .update({
                status: 'paid',
                stripe_payment_intent_id: session.payment_intent as string,
                paid_at: new Date().toISOString(),
              })
              .eq('id', orderId)
              .select('*, design_products(*)')
              .single();

            if (orderUpdateError) {
              console.error('Error updating order:', orderUpdateError);
            } else {
              console.log(`Order ${orderId} marked as paid`);

              // Send order confirmation email
              const userEmail = session.customer_email || session.customer_details?.email || order.customer_email;
              if (userEmail) {
                const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : 'N/A';
                const purchaseDate = new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });

                const html = buildOrderConfirmationEmail({
                  orderId: orderId,
                  productName: order.design_products?.name || session.metadata?.product_name || 'Design Service',
                  amount: amountPaid,
                  customerName: order.customer_name,
                  date: purchaseDate,
                });

                const emailResult = await sendEmail({
                  to: userEmail,
                  subject: 'Order Confirmed - ' + (order.design_products?.name || 'Design Service'),
                  html
                });

                if (emailResult.success) {
                  console.log(`✅ Order confirmation email sent to ${userEmail}`);
                  await supabaseAdmin.from('email_logs').insert({
                    user_id: userId,
                    email_type: 'order_confirmation',
                    recipient_email: userEmail,
                    subject: 'Order Confirmed - ' + (order.design_products?.name || 'Design Service'),
                    status: 'sent',
                    resend_message_id: emailResult.messageId,
                    metadata: {
                      order_id: orderId,
                      product_id: order.product_id,
                      product_name: order.design_products?.name,
                      amount: amountPaid,
                      session_id: session.id
                    }
                  });
                }
              }
            }
          } else {
            // Handle credit pack purchase
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
        }
        break;

      case 'customer.subscription.trial_will_end':
        // Trial ending in 3 days - send reminder
        const trialSubscription = event.data.object as Stripe.Subscription;
        const trialCustomerId = trialSubscription.customer as string;

        try {
          const trialCustomer = await stripe.customers.retrieve(trialCustomerId);
          const trialUserId = (trialCustomer as Stripe.Customer).metadata?.supabase_user_id;
          const trialUserEmail = (trialCustomer as Stripe.Customer).email;

          if (trialUserEmail) {
            const tierName = trialSubscription.metadata?.tier_name || 'Your Plan';
            const trialEnd = trialSubscription.trial_end
              ? new Date(trialSubscription.trial_end * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'soon';

            // Calculate days remaining (usually 3 when this event fires)
            const daysRemaining = trialSubscription.trial_end
              ? Math.max(0, Math.ceil((trialSubscription.trial_end * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
              : 3;

            const html = buildTrialEndingEmail(tierName, daysRemaining, trialEnd);
            const emailResult = await sendEmail({
              to: trialUserEmail,
              subject: `Your trial ends in ${daysRemaining} days`,
              html,
            });

            if (emailResult.success) {
              console.log(`✅ Trial ending email sent to ${trialUserEmail}`);
              await supabaseAdmin.from('email_logs').insert({
                user_id: trialUserId,
                email_type: 'trial_ending',
                recipient_email: trialUserEmail,
                subject: `Your trial ends in ${daysRemaining} days`,
                status: 'sent',
                resend_message_id: emailResult.messageId,
                metadata: {
                  plan_name: tierName,
                  days_remaining: daysRemaining,
                  trial_end: trialEnd,
                  subscription_id: trialSubscription.id,
                },
              });
            }
          }
        } catch (err) {
          console.error('Error sending trial ending email:', err);
        }
        break;

      case 'invoice.payment_succeeded':
        // Subscription renewal payment succeeded - send receipt
        const paidInvoice = event.data.object as Stripe.Invoice;

        // Only send for subscription renewals (not first payment which is handled by subscription.created)
        if (paidInvoice.billing_reason === 'subscription_cycle' && paidInvoice.subscription) {
          const invoiceCustomerId = paidInvoice.customer as string;

          try {
            const invoiceCustomer = await stripe.customers.retrieve(invoiceCustomerId);
            const invoiceUserId = (invoiceCustomer as Stripe.Customer).metadata?.supabase_user_id;
            const invoiceUserEmail = paidInvoice.customer_email || (invoiceCustomer as Stripe.Customer).email;

            if (invoiceUserEmail) {
              const sub = await stripe.subscriptions.retrieve(paidInvoice.subscription as string);
              const planName = sub.metadata?.tier_name || 'Subscription';
              const amount = paidInvoice.amount_paid ? `$${(paidInvoice.amount_paid / 100).toFixed(2)}` : 'N/A';
              const date = new Date(paidInvoice.created * 1000).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              const periodStart = paidInvoice.period_start
                ? new Date(paidInvoice.period_start * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';
              const periodEnd = paidInvoice.period_end
                ? new Date(paidInvoice.period_end * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';

              const html = buildSubscriptionReceiptEmail({
                planName,
                amount,
                date,
                periodStart,
                periodEnd,
                invoiceNumber: paidInvoice.number || undefined,
              });

              const emailResult = await sendEmail({
                to: invoiceUserEmail,
                subject: `Payment Receipt - ${planName}`,
                html,
              });

              if (emailResult.success) {
                console.log(`✅ Subscription receipt email sent to ${invoiceUserEmail}`);
                await supabaseAdmin.from('email_logs').insert({
                  user_id: invoiceUserId,
                  email_type: 'subscription_receipt',
                  recipient_email: invoiceUserEmail,
                  subject: `Payment Receipt - ${planName}`,
                  status: 'sent',
                  resend_message_id: emailResult.messageId,
                  metadata: {
                    plan_name: planName,
                    amount,
                    invoice_id: paidInvoice.id,
                    invoice_number: paidInvoice.number,
                    period_start: periodStart,
                    period_end: periodEnd,
                  },
                });
              }
            }
          } catch (err) {
            console.error('Error sending subscription receipt email:', err);
          }
        }
        break;

      case 'invoice.payment_failed':
        // Payment failed - send notification
        const failedInvoice = event.data.object as Stripe.Invoice;
        const failedCustomerId = failedInvoice.customer as string;

        try {
          const failedCustomer = await stripe.customers.retrieve(failedCustomerId);
          const failedUserId = (failedCustomer as Stripe.Customer).metadata?.supabase_user_id;
          const failedUserEmail = failedInvoice.customer_email || (failedCustomer as Stripe.Customer).email;

          if (failedUserEmail && failedInvoice.subscription) {
            const failedSub = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
            const planName = failedSub.metadata?.tier_name || 'Subscription';
            const amount = failedInvoice.amount_due ? `$${(failedInvoice.amount_due / 100).toFixed(2)}` : 'N/A';

            // Check next payment attempt date
            const nextRetryDate = failedInvoice.next_payment_attempt
              ? new Date(failedInvoice.next_payment_attempt * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : undefined;

            const html = buildPaymentFailedEmail(planName, amount, nextRetryDate);
            const emailResult = await sendEmail({
              to: failedUserEmail,
              subject: 'Action Required: Payment Failed',
              html,
            });

            if (emailResult.success) {
              console.log(`✅ Payment failed email sent to ${failedUserEmail}`);
              await supabaseAdmin.from('email_logs').insert({
                user_id: failedUserId,
                email_type: 'payment_failed',
                recipient_email: failedUserEmail,
                subject: 'Action Required: Payment Failed',
                status: 'sent',
                resend_message_id: emailResult.messageId,
                metadata: {
                  plan_name: planName,
                  amount,
                  invoice_id: failedInvoice.id,
                  next_retry_date: nextRetryDate,
                  attempt_count: failedInvoice.attempt_count,
                },
              });
            }
          }
        } catch (err) {
          console.error('Error sending payment failed email:', err);
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
