# 🚀 Edge Function Setup Guide

## 📋 **Step-by-Step Instructions**

### **1. Go to Supabase Dashboard**
- Visit: https://supabase.com/dashboard
- Select your project: `idbyrtwdeeruiutoukct`
- Go to: **Edge Functions** (left sidebar)

### **2. Update Each Function**

For each of these functions, follow these steps:

#### **A. create-checkout-session**
1. **Click on** `create-checkout-session`
2. **Go to** "Code" tab
3. **Replace the entire code** with the content from `edge-functions/create-checkout-session.ts`
4. **Go to** "Settings" tab
5. **Update Environment Variables**:
   - **Variable**: `STRIPE_SECRET_KEY`
   - **Value**: `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`
6. **Save changes**
7. **Deploy** the function

#### **B. create-topup-session**
1. **Click on** `create-topup-session`
2. **Go to** "Code" tab
3. **Replace the entire code** with the content from `edge-functions/create-topup-session.ts`
4. **Go to** "Settings" tab
5. **Update Environment Variables**:
   - **Variable**: `STRIPE_SECRET_KEY`
   - **Value**: `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`
6. **Save changes**
7. **Deploy** the function

#### **C. stripe-checkout**
1. **Click on** `stripe-checkout`
2. **Go to** "Code" tab
3. **Replace the entire code** with the content from `edge-functions/stripe-checkout.ts`
4. **Go to** "Settings" tab
5. **Update Environment Variables**:
   - **Variable**: `STRIPE_SECRET_KEY`
   - **Value**: `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`
6. **Save changes**
7. **Deploy** the function

### **3. Environment Variables Summary**

**For ALL functions, set this environment variable:**
- **Variable Name**: `STRIPE_SECRET_KEY`
- **Value**: `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`

### **4. Test After Setup**

Once you've updated all functions:

1. **Go to** `/test-checkout`
2. **Click any** "Test Purchase" button
3. **Use test card**: `4242 4242 4242 4242`
4. **Complete checkout**
5. **Customer migration will happen automatically!** ✅

## 🎯 **What Will Happen**

**First Purchase:**
1. Edge function detects old customer ID doesn't exist in live mode
2. Automatically creates new customer in live mode
3. Updates database with new customer ID
4. Proceeds with checkout successfully

**Subsequent Purchases:**
1. Uses new live mode customer ID
2. Works perfectly! ✅

## 🆘 **If You Need Help**

- **Check function logs** in Supabase dashboard
- **Verify environment variables** are set correctly
- **Make sure functions are deployed** after code changes
- **Use test card numbers** for testing

## 🎉 **You're Ready!**

Once you update the edge functions with the live secret key, everything will work perfectly with your existing price IDs!

**The customer migration will happen automatically on the first purchase!** 🚀
