# Sign Up Page Setup Guide

## Overview
This guide will help you set up a perfect sign up page that supports both email/password and Google OAuth authentication.

## Current Issues Identified

1. **Database Schema Inconsistencies**: Multiple SQL files with different profiles table schemas
2. **Missing Foreign Key Reference**: Profiles table doesn't properly reference auth.users
3. **RLS Policy Issues**: Row Level Security policies may be too restrictive
4. **Profile Creation Flow**: Manual profile creation instead of automatic triggers
5. **Edge Function Dependencies**: Signup bonus function may not be properly configured

## Step-by-Step Setup

### 1. Database Setup

Run the `OPTIMAL_AUTH_SETUP.sql` script in your Supabase SQL Editor:

```sql
-- This script will:
-- ✅ Clean up existing triggers and functions
-- ✅ Create optimal profiles table with proper foreign key
-- ✅ Set up correct RLS policies
-- ✅ Create automatic profile creation trigger
-- ✅ Set up signup bonus function
-- ✅ Create supporting tables
-- ✅ Test the setup
```

### 2. Edge Function Setup

Deploy the optimized Edge Function:

1. Copy `edge-functions/grant-signup-bonus-optimized.ts` to your Supabase Edge Functions
2. Rename it to `grant-signup-bonus` (replacing the existing one)
3. Deploy the function
4. Ensure the function has access to `SUPABASE_SERVICE_ROLE_KEY` environment variable

### 3. Update Your Sign Up Page

Replace your current `SignUpPage.jsx` with `SignUpPageOptimized.jsx`:

```bash
# Backup current file
mv src/pages/SignUpPage.jsx src/pages/SignUpPage.jsx.backup

# Use optimized version
mv src/pages/SignUpPageOptimized.jsx src/pages/SignUpPage.jsx
```

### 4. Update PostAuthPage (Optional)

Replace your current `PostAuthPage.jsx` with `PostAuthPageOptimized.jsx` for better error handling:

```bash
# Backup current file
mv src/pages/PostAuthPage.jsx src/pages/PostAuthPage.jsx.backup

# Use optimized version
mv src/pages/PostAuthPageOptimized.jsx src/pages/PostAuthPage.jsx
```

## Key Improvements

### Database Improvements
- **Proper Foreign Key**: `profiles.id` references `auth.users(id)`
- **Automatic Profile Creation**: Trigger creates profile when user signs up
- **Correct RLS Policies**: Users can only access their own profiles
- **Signup Bonus Function**: Properly configured bonus granting

### Code Improvements
- **Better Error Handling**: More descriptive error messages
- **Improved Logging**: Console logs for debugging
- **Email Confirmation Support**: Handles both confirmed and unconfirmed emails
- **Timeout Protection**: Prevents infinite loading states
- **Better UX**: Clearer status messages for users

## Testing the Setup

### 1. Test Email/Password Signup
1. Go to your sign up page
2. Enter a valid email and password (8+ characters)
3. Click "Sign Up"
4. Check if you're redirected to the success page or post-auth page
5. Verify profile was created in Supabase dashboard

### 2. Test Google OAuth Signup
1. Go to your sign up page
2. Click "Google" button
3. Complete Google OAuth flow
4. Check if you're redirected to post-auth page
5. Verify profile was created in Supabase dashboard

### 3. Verify Database
Check in Supabase SQL Editor:
```sql
-- Check if profiles are being created
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;

-- Check if triggers are working
SELECT * FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'grant_signup_bonus');
```

## Troubleshooting

### Common Issues

1. **Profile Not Created**
   - Check if the trigger is active
   - Verify RLS policies allow profile creation
   - Check Supabase logs for errors

2. **Google OAuth Not Working**
   - Verify Google OAuth is enabled in Supabase Auth settings
   - Check redirect URLs are correct
   - Ensure Google OAuth credentials are properly configured

3. **Edge Function Errors**
   - Check function logs in Supabase dashboard
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Test function manually with a valid user_id

4. **RLS Policy Issues**
   - Check if policies allow the operations you need
   - Verify user is authenticated when accessing profiles
   - Test with different user roles

### Debug Commands

Run these in your browser console to debug:

```javascript
// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Profile:', profile);

// Test signup bonus function
const { data, error } = await supabase.functions.invoke('grant-signup-bonus', {
  body: JSON.stringify({ user_id: user.id })
});
console.log('Bonus function result:', { data, error });
```

## Expected Flow

### Email/Password Signup
1. User enters email/password → `SignUpPage`
2. Supabase creates user in `auth.users`
3. Database trigger creates profile in `profiles`
4. Edge function grants signup bonus
5. User redirected to `PostAuthPage` or `SignUpSuccessPage`
6. `PostAuthPage` checks profile and redirects to dashboard/onboarding

### Google OAuth Signup
1. User clicks Google button → `SignUpPage`
2. Redirected to Google OAuth
3. Google redirects back to `/auth/callback`
4. `AuthCallbackPage` exchanges code for session
5. Database trigger creates profile in `profiles`
6. Edge function grants signup bonus
7. User redirected to `PostAuthPage`
8. `PostAuthPage` checks profile and redirects to dashboard/onboarding

## Success Criteria

✅ Users can sign up with email/password  
✅ Users can sign up with Google OAuth  
✅ Profiles are automatically created  
✅ Signup bonus is granted  
✅ Users are properly redirected after signup  
✅ Error handling works correctly  
✅ No infinite loading states  

## Next Steps

After implementing these changes:

1. Test thoroughly with both signup methods
2. Monitor Supabase logs for any errors
3. Check user profiles are being created correctly
4. Verify signup bonus is being granted
5. Test the complete user flow from signup to dashboard

Your sign up page should now work perfectly with both email/password and Google authentication!
