# 🔧 Troubleshooting Guide - Sold2Move API Errors

## 🚨 **Current Issues & Solutions**

### **1. 406 Errors on `listing_reveals` table**

**Problem**: `406 Not Acceptable` errors when querying `listing_reveals`

**Root Cause**: 
- Data type mismatch (listing_id is TEXT but should be BIGINT)
- Missing or incorrect RLS policies
- Table permissions issues

**Solution**:
```sql
-- Run this SQL script in your Supabase SQL editor
-- File: fix-database-issues.sql
```

**Steps**:
1. Go to Supabase Dashboard → SQL Editor
2. Run the `fix-database-issues.sql` script
3. Verify the fixes with the test queries at the end

### **2. 500 Errors on `create-checkout-session` function**

**Problem**: `500 Internal Server Error` when creating checkout sessions

**Root Cause**:
- Missing environment variables
- Stripe configuration issues
- Function deployment problems

**Solution**:
1. **Check Environment Variables**:
   ```bash
   # In your Supabase project settings
   STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
   SITE_URL=https://yourdomain.com
   ```

2. **Redeploy the Edge Function**:
   ```bash
   # Replace the existing function with the fixed version
   supabase functions deploy create-checkout-session --file edge-functions/create-checkout-session-fixed.ts
   ```

3. **Test the Function**:
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/create-checkout-session' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"priceId": "price_1234567890"}'
   ```

## 🔍 **Diagnostic Steps**

### **Step 1: Check Database Schema**
```sql
-- Check listing_reveals table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'listing_reveals' 
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'listing_reveals';
```

### **Step 2: Test RLS Policies**
```sql
-- Test if you can query listing_reveals
SELECT COUNT(*) FROM listing_reveals WHERE user_id = 'your-user-id';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'listing_reveals';
```

### **Step 3: Check Edge Function Logs**
1. Go to Supabase Dashboard → Edge Functions
2. Click on `create-checkout-session`
3. Check the "Logs" tab for error details
4. Look for specific error messages

### **Step 4: Verify Environment Variables**
```bash
# Check if all required env vars are set
echo $STRIPE_SECRET_KEY
echo $SITE_URL
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

## 🛠 **Quick Fixes**

### **Fix 1: Database Issues**
```sql
-- Quick fix for listing_reveals
ALTER TABLE listing_reveals 
ALTER COLUMN listing_id TYPE BIGINT USING listing_id::BIGINT;

-- Fix RLS policies
DROP POLICY IF EXISTS "Users can view their own reveals" ON listing_reveals;
CREATE POLICY "Users can view their own reveals" ON listing_reveals
  FOR SELECT USING (auth.uid() = user_id);
```

### **Fix 2: Edge Function Issues**
```typescript
// Add error handling to your function
try {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not found');
  }
  // ... rest of your code
} catch (error) {
  console.error('Function error:', error);
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 📊 **Monitoring & Prevention**

### **1. Set up Monitoring**
- Enable Supabase logs
- Monitor Edge Function performance
- Set up alerts for 4xx/5xx errors

### **2. Regular Health Checks**
```sql
-- Daily health check query
SELECT 
  'listing_reveals' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM listing_reveals
UNION ALL
SELECT 
  'just_listed' as table_name,
  COUNT(*) as total_records,
  NULL as unique_users
FROM just_listed;
```

### **3. Test Scripts**
```javascript
// Test API endpoints
const testEndpoints = async () => {
  const baseUrl = 'https://your-project.supabase.co/rest/v1';
  const headers = {
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY
  };

  // Test listing_reveals
  try {
    const response = await fetch(`${baseUrl}/listing_reveals?select=id&limit=1`, { headers });
    console.log('listing_reveals status:', response.status);
  } catch (error) {
    console.error('listing_reveals error:', error);
  }

  // Test just_listed
  try {
    const response = await fetch(`${baseUrl}/just_listed?select=id&limit=1`, { headers });
    console.log('just_listed status:', response.status);
  } catch (error) {
    console.error('just_listed error:', error);
  }
};
```

## 🚀 **Deployment Checklist**

Before deploying fixes:

- [ ] Run database migration script
- [ ] Verify RLS policies are correct
- [ ] Test API endpoints manually
- [ ] Deploy updated Edge Functions
- [ ] Verify environment variables
- [ ] Test checkout flow end-to-end
- [ ] Monitor logs for errors

## 📞 **Getting Help**

If issues persist:

1. **Check Supabase Status**: https://status.supabase.com/
2. **Review Documentation**: https://supabase.com/docs
3. **Check Community**: https://github.com/supabase/supabase/discussions
4. **Contact Support**: Through Supabase Dashboard

## 🔄 **Rollback Plan**

If fixes cause issues:

```sql
-- Rollback listing_reveals changes
ALTER TABLE listing_reveals 
ALTER COLUMN listing_id TYPE TEXT;

-- Rollback RLS policies
DROP POLICY IF EXISTS "Users can view their own reveals" ON listing_reveals;
-- Restore original policies
```

---

**Last Updated**: $(date)
**Version**: 1.0
**Status**: Ready for deployment
