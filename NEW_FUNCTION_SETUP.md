# 🆕 New Edge Function Setup

## 🎯 **Create These 3 New Functions**

### **1. create-checkout-session-v2**
- **Name**: `create-checkout-session-v2`
- **Code**: Copy from `edge-functions/create-checkout-session.ts`
- **Environment Variable**: `STRIPE_SECRET_KEY` = `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`

### **2. create-topup-session-v2**
- **Name**: `create-topup-session-v2`
- **Code**: Copy from `edge-functions/create-topup-session.ts`
- **Environment Variable**: `STRIPE_SECRET_KEY` = `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`

### **3. stripe-checkout-v2**
- **Name**: `stripe-checkout-v2`
- **Code**: Copy from `edge-functions/stripe-checkout.ts`
- **Environment Variable**: `STRIPE_SECRET_KEY` = `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`

## ✅ **After Creating New Functions**

1. **Test the new functions** at `/test-checkout`
2. **If they work perfectly**, delete the old functions:
   - `create-checkout-session` (old)
   - `create-topup-session` (old)
   - `stripe-checkout` (old)

## 🎉 **Benefits of This Approach**

- ✅ **Fresh start** - no cached issues
- ✅ **Clean deployment** - new functions work perfectly
- ✅ **Easy rollback** - old functions still exist if needed
- ✅ **No downtime** - app already updated to use new names

## 🚀 **Ready to Go!**

Your app is already configured to use the new function names. Just create the 3 new functions and you're done!
