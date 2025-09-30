# 🚀 Supabase Live Mode Setup Guide

## ✅ **Step 1: Environment Variables Updated**

Your local environment has been updated to use live Stripe keys:
- ✅ `.env.local` updated with live publishable key
- ✅ `.env` updated with live publishable key

## 🔧 **Step 2: Update Supabase Edge Functions**

You need to update your Supabase edge functions to use the live Stripe secret key.

### **Go to Supabase Dashboard:**

1. **Visit**: https://supabase.com/dashboard
2. **Select your project**: `idbyrtwdeeruiutoukct`
3. **Go to**: Edge Functions (left sidebar)
4. **Update Environment Variables** for these functions:
   - `create-checkout-session`
   - `create-topup-session`
   - `stripe-checkout`

### **Environment Variable to Update:**

**Variable Name**: `STRIPE_SECRET_KEY`
**New Value**: `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`

### **How to Update:**

1. **Click on each edge function**
2. **Go to "Settings" tab**
3. **Find "Environment Variables" section**
4. **Update `STRIPE_SECRET_KEY`** with the live secret key above
5. **Save changes**
6. **Redeploy the function** (if required)

## 🧪 **Step 3: Test the Setup**

Once you've updated the Supabase edge functions:

1. **Restart your dev server** (if it's running):
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Visit `/health`** while logged in
   - Should show "Live Mode" 
   - Should test your existing price IDs successfully

3. **Visit `/test-checkout`**
   - Should show "Live Mode" in the configuration notice
   - Should work with your existing price IDs

## 🎯 **Your Existing Price IDs Will Work**

Now that you're in live mode, these price IDs will work perfectly:
- ✅ `price_1S4YXgCUfCzyitr0ECvYM6Lq` (Starter)
- ✅ `price_1S4YY0CUfCzyitr0xPamzt5d` (Growth)
- ✅ `price_1S4YYKCUfCzyitr0eZwj02Is` (Scale)

## 🔍 **What to Expect**

**Health Check Results:**
- Mode: Live Mode
- Subscriptions: working
- One-time payments: working (if you have one-time price IDs)

**Test Checkout:**
- Configuration notice will show green "Live Mode"
- All buttons should work with real Stripe checkout
- Will redirect to live Stripe checkout (not test mode)

## ⚠️ **Important Notes**

1. **Live Mode = Real Money**: Test purchases will charge real credit cards
2. **Use Test Cards**: For testing, use Stripe's test card numbers
3. **Monitor Transactions**: Check your Stripe dashboard for real transactions

## 🆘 **If You Need Help**

1. **Edge Function Issues**: Check Supabase logs for any errors
2. **Environment Variables**: Make sure all functions have the live secret key
3. **Redeploy**: Some functions may need redeployment after env var changes

## 🎉 **You're All Set!**

Once you update the Supabase edge functions with the live secret key, everything should work perfectly with your existing price IDs!

**Next Steps:**
1. Update Supabase edge function environment variables
2. Test the health check
3. Test the checkout flow
4. Let me know if you need any help!
