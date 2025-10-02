# OAuth Flow Debugging Guide

## 🔍 Console Logging Added

I've added comprehensive console logging throughout the OAuth flow to help identify issues. Here's what to look for:

### 1. **Google OAuth Initiation** (Login/Signup pages)
Look for these logs when clicking "Continue with Google":
```
🔄 Initiating Google OAuth sign-in
🔄 OAuth configuration: { siteUrl: "https://sold2move.com", redirectTo: "https://sold2move.com/auth/callback", provider: "google" }
✅ Google OAuth initiated successfully, redirecting to Google...
```

**If you see errors here:**
- Check Supabase configuration
- Verify Google OAuth setup
- Check environment variables

### 2. **Auth Callback Processing** (AuthCallbackPage)
Look for these logs when returning from Google:
```
🔍 AuthCallbackPage: Starting auth callback handling
🔍 Current URL: https://sold2move.com/auth/callback?code=...
🔍 Current session: none
🔍 URL Parameters: { code: "present", error: "none", errorDescription: "none" }
🔄 Exchanging OAuth code for session...
🔄 Code length: 123
✅ Code exchange successful: { hasSession: true, hasUser: true, userId: "..." }
🎉 Session created successfully, redirecting to post-auth
```

**If you see errors here:**
- Check if the code is present in URL
- Look for code exchange errors
- Verify Supabase auth configuration

### 3. **Profile Creation** (PostAuthPage)
Look for these logs when creating new user profiles:
```
🔍 PostAuthPage: Checking if profile creation is needed
🔍 Current state: { hasSession: true, hasUser: true, userId: "...", hasProfile: false, profileLoading: false, isCreatingProfile: false }
🔄 Creating profile for user: ...
🔄 User details: { id: "...", email: "...", created_at: "...", last_sign_in_at: "..." }
🔍 Checking if profile already exists...
🔍 Profile check result: { hasData: false, errorCode: "PGRST116", errorMessage: "..." }
🔄 Profile does not exist, creating new one...
🔄 Inserting profile data: { id: "...", business_email: "...", credits_remaining: 100, ... }
✅ Profile created successfully!
```

**If you see errors here:**
- Look for database permission errors
- Check for duplicate key errors
- Verify database schema and RLS policies

### 4. **Profile Fetching** (useProfile hook)
Look for these logs when loading user profiles:
```
🔍 useProfile: fetchProfile called
🔍 Session state: { hasSession: true, hasUser: true, userId: "..." }
🔄 Fetching profile for user: ...
🔍 Profile fetch result: { hasData: true, errorCode: null, profileData: { id: "...", credits_remaining: 100, ... } }
```

**If you see errors here:**
- Check database permissions
- Verify RLS policies
- Look for network issues

## 🐛 Common Issues and Solutions

### Issue: "No code or session found in callback"
**Possible causes:**
- Incorrect redirect URL in Google OAuth configuration
- Missing `vercel.json` file for SPA routing
- OAuth flow interrupted

**Solutions:**
1. Check Google Cloud Console redirect URIs
2. Verify `vercel.json` is deployed
3. Check Supabase URL configuration

### Issue: "Code exchange error"
**Possible causes:**
- Invalid OAuth code
- Supabase configuration issues
- Network problems

**Solutions:**
1. Check Supabase project settings
2. Verify environment variables
3. Check network connectivity

### Issue: "Database error saving new user"
**Possible causes:**
- Missing database permissions
- Incorrect RLS policies
- Database schema issues

**Solutions:**
1. Run the `fix-profile-creation.sql` script
2. Check database permissions
3. Verify RLS policies

### Issue: "Profile already exists" but user gets redirected to home
**Possible causes:**
- Profile exists but `onboarding_complete` is false
- Navigation logic issues
- Session state problems

**Solutions:**
1. Check profile data in database
2. Verify navigation logic
3. Check session state

## 📊 Debugging Steps

### Step 1: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try the OAuth flow
4. Look for the emoji-prefixed logs above

### Step 2: Check Network Tab
1. Go to Network tab in DevTools
2. Try the OAuth flow
3. Look for failed requests (red entries)
4. Check request/response details

### Step 3: Check Database
1. Go to Supabase Dashboard
2. Check the `profiles` table
3. Look for the user's record
4. Verify all required fields are present

### Step 4: Check Environment Variables
1. Verify `VITE_SUPABASE_URL` is correct
2. Verify `VITE_SUPABASE_ANON_KEY` is correct
3. Verify `VITE_SITE_URL` is set to `https://sold2move.com`

## 🚨 Error Codes Reference

- **PGRST116**: "Not found" - Expected for new users
- **23505**: Duplicate key - Profile already exists
- **42501**: Permission denied - RLS policy issue
- **23503**: Foreign key violation - User doesn't exist in auth.users

## 📝 What to Report

When reporting issues, include:
1. Console logs (copy/paste the emoji-prefixed logs)
2. Network errors (screenshot of failed requests)
3. User ID (from the logs)
4. Steps to reproduce
5. Browser and version

This logging system will help identify exactly where the OAuth flow is failing!
