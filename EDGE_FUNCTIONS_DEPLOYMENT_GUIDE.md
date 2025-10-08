# Edge Functions Deployment Guide

## 🚀 Deploy Your Stripe Billing Edge Functions

Your billing system is ready! You just need to deploy the edge functions to enable payments.

## Option 1: CLI Deployment (Recommended)

### Step 1: Get Supabase Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Copy the token (starts with `sbp_`)
4. Set it in your terminal:
   ```bash
   export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
   ```

### Step 2: Deploy Functions
```bash
# Deploy checkout function
supabase functions deploy create-checkout-session-fixed --no-verify-jwt

# Deploy portal function
supabase functions deploy create-portal-session --no-verify-jwt

# Deploy webhook function
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Option 2: Manual Deployment via Dashboard

### Step 1: Access Functions Dashboard
1. Go to: https://supabase.com/dashboard/project/idbyrtwdeeruiutoukct/functions
2. Click "Create a new function"

### Step 2: Deploy create-checkout-session-fixed
1. **Function Name**: `create-checkout-session-fixed`
2. **Copy code from**: `edge-functions/create-checkout-session-fixed.ts`
3. **Environment Variables**:
   - `STRIPE_SECRET_KEY`: `[YOUR_STRIPE_SECRET_KEY]`
   - `SUPABASE_URL`: `https://idbyrtwdeeruiutoukct.supabase.co`
   - `SUPABASE_ANON_KEY`: `your_anon_key`
   - `SITE_URL`: `http://localhost:5173`

### Step 3: Deploy create-portal-session
1. **Function Name**: `create-portal-session`
2. **Copy code from**: `edge-functions/create-portal-session.ts`
3. **Same environment variables as above**

### Step 4: Deploy stripe-webhook
1. **Function Name**: `stripe-webhook`
2. **Copy code from**: `edge-functions/stripe-webhook.ts`
3. **Additional environment variable**:
   - `STRIPE_WEBHOOK_SECRET`: `wh_...` (get from Stripe Dashboard)

## Step 3: Set Up Stripe Webhooks

### 1. Go to Stripe Dashboard
- URL: https://dashboard.stripe.com/webhooks

### 2. Create Webhook Endpoint
- **Endpoint URL**: `https://idbyrtwdeeruiutoukct.supabase.co/functions/v1/stripe-webhook`
- **Events to send**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`

### 3. Copy Webhook Secret
- Copy the webhook secret (starts with `wh_`)
- Add it to your edge function environment variables

## Step 4: Test Your Billing System

### 1. Test Subscription
- Go to: http://localhost:5173/dashboard/billing
- Click "Upgrade to Starter" (or any plan)
- Complete the Stripe checkout flow

### 2. Test Credit Purchase
- Click "Buy Now" on any credit package
- Complete the payment

### 3. Test Customer Portal
- Click "Manage Subscription"
- Verify it opens Stripe Customer Portal

## 🎉 Your Billing System Will Be Live!

Once deployed, your billing system will:
- ✅ Process real payments via Stripe
- ✅ Manage subscriptions automatically
- ✅ Handle credit top-ups
- ✅ Sync data with your database
- ✅ Provide customer portal access

## Troubleshooting

### CORS Errors
- Make sure edge functions are deployed
- Check function URLs are correct

### Payment Failures
- Verify Stripe keys are correct
- Check webhook configuration
- Ensure environment variables are set

### Database Sync Issues
- Check webhook events in Stripe Dashboard
- Verify RLS policies allow updates
- Check edge function logs

## Support

If you encounter issues:
1. Check Supabase function logs
2. Check Stripe webhook logs
3. Verify all environment variables
4. Test with Stripe test mode first

Your billing system is ready to go live! 🚀💳
