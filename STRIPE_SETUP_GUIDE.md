# Stripe Billing Setup Guide

This guide will help you set up a complete Stripe billing system for Sold2Move.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Supabase Configuration (already set)
SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Create Stripe Products and Pricing

```bash
# Install Stripe CLI (if not already installed)
npm install -g stripe

# Set up products and pricing
node scripts/setup-stripe-products.js create
```

### 3. Test the Billing System

```bash
# Create a test customer
node scripts/billing-manager.js test-customer

# Check billing stats
node scripts/billing-manager.js stats
```

## 📋 Detailed Setup

### Step 1: Stripe Account Setup

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Create an account or log in
   - Complete account verification

2. **Get API Keys**
   - Go to Developers > API Keys
   - Copy your Publishable key and Secret key
   - Add them to your environment variables

3. **Enable Webhooks** (Optional but recommended)
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe-webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Step 2: Database Setup

The following tables should already exist in your Supabase database:

```sql
-- Profiles table (already exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

-- Billing history table
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Step 3: Edge Functions Setup

Deploy the Stripe edge functions:

```bash
# Deploy checkout session function
supabase functions deploy create-checkout-session-fixed

# Deploy top-up session function  
supabase functions deploy create-topup-session

# Deploy customer portal function (create this)
supabase functions deploy create-portal-session
```

### Step 4: Create Customer Portal Function

Create `edge-functions/create-portal-session.ts`:

```typescript
import { corsHeaders } from './cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: req.headers.get('origin') + '/dashboard/billing',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

## 🛠️ Management Scripts

### Available Commands

```bash
# Product Management
node scripts/setup-stripe-products.js create    # Create all products
node scripts/setup-stripe-products.js list      # List existing products
node scripts/setup-stripe-products.js cleanup   # Delete all products (DANGER!)

# Billing Management
node scripts/billing-manager.js customers       # List customers
node scripts/billing-manager.js subscriptions   # List subscriptions
node scripts/billing-manager.js sync            # Sync customer data
node scripts/billing-manager.js update-status   # Update subscription status
node scripts/billing-manager.js stats           # Show billing statistics
node scripts/billing-manager.js all             # Run sync and update
```

### Product Structure

The system creates these products:

**Subscription Plans:**
- **Starter**: $29/month, 100 credits
- **Professional**: $79/month, 500 credits  
- **Enterprise**: $199/month, unlimited credits

**Credit Packages:**
- 50 credits: $15
- 100 credits: $25 (17% savings)
- 250 credits: $50 (33% savings)
- 500 credits: $90 (40% savings)

## 🔧 Integration Points

### Frontend Components

1. **BillingEnhanced.jsx** - Main billing page
2. **PricingPage.jsx** - Public pricing page
3. **CreditMeter.jsx** - Credit display component

### Backend Functions

1. **create-checkout-session-fixed.ts** - Handle subscription checkout
2. **create-topup-session.ts** - Handle credit purchases
3. **create-portal-session.ts** - Customer portal access

### Database Tables

1. **profiles** - User subscription status
2. **billing_history** - Payment history
3. **listing_reveals** - Credit usage tracking

## 🧪 Testing

### Test Customer Creation

```bash
node scripts/billing-manager.js test-customer
```

This creates:
- A test Stripe customer
- A test subscription
- Associated Supabase profile data

### Test Checkout Flow

1. Go to `/dashboard/billing`
2. Click "Start [Plan Name]"
3. Complete Stripe checkout
4. Verify subscription status updates

### Test Credit Purchase

1. Go to `/dashboard/billing`
2. Click "Buy Now" on a credit package
3. Complete Stripe checkout
4. Verify credits are added to account

## 📊 Monitoring

### Billing Statistics

```bash
node scripts/billing-manager.js stats
```

Shows:
- Total customers
- Active subscriptions
- Plan breakdown
- Revenue metrics

### Customer Sync

```bash
node scripts/billing-manager.js sync
```

Ensures:
- Stripe customers have Supabase profiles
- Supabase profiles have Stripe customer IDs
- Data consistency between systems

## 🚨 Troubleshooting

### Common Issues

1. **"Missing STRIPE_SECRET_KEY"**
   - Check environment variables
   - Ensure key is properly set

2. **"Customer not found"**
   - Run customer sync: `node scripts/billing-manager.js sync`
   - Check profile has `stripe_customer_id`

3. **"Subscription not updating"**
   - Run status update: `node scripts/billing-manager.js update-status`
   - Check webhook configuration

4. **"Checkout session failed"**
   - Verify Stripe keys are correct
   - Check edge function deployment
   - Review function logs

### Debug Commands

```bash
# Check Stripe connection
node scripts/billing-manager.js customers

# Verify product setup
node scripts/setup-stripe-products.js list

# Test customer creation
node scripts/billing-manager.js test-customer
```

## 🔒 Security Notes

1. **Never expose secret keys** in frontend code
2. **Use environment variables** for all sensitive data
3. **Validate webhook signatures** in production
4. **Implement rate limiting** on checkout endpoints
5. **Monitor for suspicious activity** in Stripe dashboard

## 📈 Production Checklist

- [ ] Stripe account verified
- [ ] Webhooks configured
- [ ] Environment variables set
- [ ] Products created
- [ ] Edge functions deployed
- [ ] Database tables created
- [ ] Test transactions completed
- [ ] Monitoring set up
- [ ] Error handling tested
- [ ] Security review completed

## 🆘 Support

For issues with:
- **Stripe**: Check [Stripe Documentation](https://stripe.com/docs)
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **This Implementation**: Review the scripts and components

---

**Ready to launch your billing system!** 🚀
