# 🔄 Customer Migration Guide - Test to Live Mode

## 🎯 **Current Situation**

✅ **Good News**: Your live mode setup is working!  
⚠️ **Issue**: Your customer ID was created in test mode, but you're now using live mode.

**Error**: `"No such customer: 'cus_T5RE09DStXzAyB'; a similar object exists in test mode, but a live mode key was used to make this request."`

## 🔍 **What This Means**

1. **Your Supabase edge functions are now using live mode** ✅
2. **Your environment variables are correctly set** ✅  
3. **Your customer ID in the database is from test mode** ❌
4. **Stripe doesn't allow cross-mode access** ❌

## 🚀 **Solution: Automatic Customer Recreation**

**The good news**: Your edge functions will automatically handle this! When a user tries to make a purchase:

1. **Edge function detects** the customer ID doesn't exist in live mode
2. **Automatically creates** a new customer in live mode
3. **Updates the database** with the new live mode customer ID
4. **Proceeds with checkout** normally

## 🧪 **How to Test This**

### **Option 1: Test with Real Purchase (Recommended)**

1. **Go to `/test-checkout`**
2. **Click any "Test Purchase" button**
3. **Use a test card number**: `4242 4242 4242 4242`
4. **Complete the checkout**
5. **The system will automatically**:
   - Create a new live mode customer
   - Update your profile with the new customer ID
   - Process the payment

### **Option 2: Manual Database Update (Advanced)**

If you want to clear the old customer ID manually:

1. **Go to Supabase Dashboard**
2. **Go to Table Editor**
3. **Open the `profiles` table**
4. **Find your user record**
5. **Set `stripe_customer_id` to `NULL`**
6. **Save changes**

Then the next purchase will create a fresh customer ID.

## 🎯 **What Will Happen**

**First Purchase After Migration:**
1. User clicks "Test Purchase"
2. Edge function tries to use old customer ID
3. Stripe says "customer doesn't exist in live mode"
4. Edge function creates new customer in live mode
5. Updates database with new customer ID
6. Proceeds with checkout
7. **Success!** ✅

**Subsequent Purchases:**
1. User clicks "Test Purchase"
2. Edge function uses new live mode customer ID
3. **Works perfectly!** ✅

## 🔍 **Health Check Status**

The health check will now show:
- **Mode**: Live Mode ✅
- **Subscriptions**: Migration Needed ⚠️
- **Note**: "Customer ID needs to be recreated for current mode - will happen automatically on first purchase"

This is **normal and expected** during the migration process.

## ⚠️ **Important Notes**

1. **This is a one-time migration** - once the customer ID is recreated, everything works normally
2. **No data loss** - your user profile and other data remain intact
3. **Automatic process** - no manual intervention required
4. **Test cards work** - use `4242 4242 4242 4242` for testing

## 🎉 **You're Ready!**

**Next Steps:**
1. **Visit `/test-checkout`**
2. **Click any test purchase button**
3. **Use test card `4242 4242 4242 4242`**
4. **Complete the checkout**
5. **Customer migration will happen automatically**
6. **Future purchases will work perfectly**

## 🆘 **If You Need Help**

- **Check Supabase logs** for any edge function errors
- **Verify your live mode keys** are correctly set
- **Use test card numbers** for testing
- **Monitor your Stripe dashboard** for the new customer creation

**The migration will happen automatically on the first purchase - you're all set!** 🚀
