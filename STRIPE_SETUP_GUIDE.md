# 🔧 Stripe Setup Guide - Fix Mode Mismatch

## 🚨 **Current Issue**
You're using **test mode** Stripe keys (`pk_test_...`) but trying to access **live mode** price IDs (`price_1S4YXgCUfCzyitr0ECvYM6Lq`). This causes the error:

> "No such price: 'price_1S4YXgCUfCzyitr0ECvYM6Lq'; a similar object exists in live mode, but a test mode key was used to make this request."

## 🎯 **Solution Options**

### **Option 1: Create Test Price IDs (Recommended for Development)**

1. **Go to Stripe Dashboard (Test Mode)**
   - Visit: https://dashboard.stripe.com/test
   - Make sure you're in **Test Mode** (toggle in top-left)

2. **Create Test Products & Prices**
   
   **For Subscription Plans:**
   - Create product: "Starter Plan"
     - Price: $9.99/month recurring → Copy price ID
     - Price: $99.99/year recurring → Copy price ID
   - Create product: "Growth Plan" 
     - Price: $29.99/month recurring → Copy price ID
     - Price: $299.99/year recurring → Copy price ID
   - Create product: "Scale Plan"
     - Price: $99.99/month recurring → Copy price ID
     - Price: $999.99/year recurring → Copy price ID

   **For Credit Packs (One-time payments):**
   - Create product: "Small Credit Pack"
     - Price: $4.99 one-time → Copy price ID
   - Create product: "Medium Credit Pack"
     - Price: $9.99 one-time → Copy price ID
   - Create product: "Large Credit Pack"
     - Price: $19.99 one-time → Copy price ID

3. **Update Your Code**
   Replace the placeholder test price IDs in:
   - `src/utils/healthCheck.js`
   - `src/pages/TestCheckoutEnhanced.jsx`

### **Option 2: Switch to Live Mode (For Production)**

1. **Update Environment Variables**
   ```bash
   # In .env.local
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
   ```

2. **Update Supabase Edge Functions**
   - Go to Supabase Dashboard → Edge Functions
   - Update `STRIPE_SECRET_KEY` environment variable to your live secret key

3. **Your existing price IDs will work:**
   - `price_1S4YXgCUfCzyitr0ECvYM6Lq` (Starter)
   - `price_1S4YY0CUfCzyitr0xPamzt5d` (Growth)
   - `price_1S4YYKCUfCzyitr0eZwj02Is` (Scale)

## 🔍 **About Supabase Access**

**Can I access your Supabase directly?** 
- ❌ **No** - I cannot access your Supabase dashboard or make changes to your backend
- ✅ **What I can do:**
  - Help you write code that calls your Supabase functions
  - Debug issues with your edge functions
  - Help you understand what changes you need to make
  - Guide you through the setup process

**What you need to do:**
1. **Stripe Dashboard**: Create test price IDs or switch to live mode
2. **Supabase Dashboard**: Update environment variables if switching to live mode
3. **Code**: I can help you update the code once you have the right price IDs

## 🧪 **Testing Steps**

1. **Check Current Mode**
   - Visit `/test-checkout` 
   - Look at the "Stripe Configuration Status" notice
   - It will show if you're in Test Mode or Live Mode

2. **Test Health Check**
   - Visit `/health` while logged in
   - Should show proper status based on your configuration

3. **Test Checkout**
   - Try a test purchase
   - Should redirect to Stripe checkout

## 📋 **Quick Fix Checklist**

- [ ] Determine if you want to stay in test mode or switch to live mode
- [ ] If test mode: Create test price IDs in Stripe test dashboard
- [ ] If live mode: Update environment variables to live keys
- [ ] Update code with correct price IDs
- [ ] Test the health check
- [ ] Test the checkout flow

## 🆘 **Need Help?**

1. **Tell me which option you prefer** (test mode with new price IDs, or live mode)
2. **If test mode**: I'll help you update the code once you create the test price IDs
3. **If live mode**: I'll help you update the environment variables

The error will be fixed once the Stripe keys and price IDs match the same mode (both test or both live)!
