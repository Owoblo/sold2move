# Google OAuth Setup for Sold2Move.com

## Overview
This guide will help you configure Google OAuth authentication for your Sold2Move application deployed on sold2move.com.

## 1. Supabase Dashboard Configuration

### Auth → URL Configuration
- **Site URL:** `https://sold2move.com`
- **Additional Redirect URLs:** Add these URLs:
  - `http://localhost:3000`
  - `https://*.vercel.app` (for Vercel preview deployments)
  - `https://www.sold2move.com`
  - `https://sold2move.com/auth/callback`
  - `https://sold2move.com/onboarding`

### Auth → Providers → Google
1. Enable Google provider
2. Add your Google OAuth credentials (see Google Cloud Console section below)

## 2. Google Cloud Console Configuration

### Create OAuth 2.0 Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**

### Configure OAuth Client
- **Name:** Sold2Move OAuth Client
- **Authorized JavaScript origins:**
  - `http://localhost:3000`
  - `https://sold2move.com`
  - `https://www.sold2move.com`
  - `https://*.vercel.app`

- **Authorized redirect URIs:**
  - `https://idbyrtwdeeruiutoukct.supabase.co/auth/v1/callback`
  - `https://sold2move.com/auth/callback`

### OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name:** Sold2Move
   - **User support email:** hello@sold2move.com
   - **Developer contact information:** hello@sold2move.com
4. Add **Authorized domains:**
   - `sold2move.com`
5. Add test users if in testing mode

## 3. Environment Variables

### Production Environment (.env.production)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko

# Site Configuration
VITE_SITE_URL=https://sold2move.com

# Stripe Configuration (Live Keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51O7k34CUfCzyitr0cflrMAJ67QrWnpRNt5oTXIMwmbJDcv5IpTNJrqZa25y6gkNBs6Rs8DEcLrFhbVut0QtHvvqb00l7V8iihl

# Environment
NODE_ENV=production
```

### Development Environment (.env.local)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko

# Site Configuration
VITE_SITE_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

## 4. Vercel Deployment Configuration

### Environment Variables in Vercel
Set these environment variables in your Vercel project settings:

**Production:**
- `VITE_SUPABASE_URL` = `https://idbyrtwdeeruiutoukct.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko`
- `VITE_SITE_URL` = `https://sold2move.com`

**Preview:**
- `VITE_SUPABASE_URL` = `https://idbyrtwdeeruiutoukct.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko`
- `VITE_SITE_URL` = `https://your-preview-url.vercel.app`

## 5. Testing the OAuth Flow

### Local Testing
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. Verify you're redirected to `/post-auth` and then to `/dashboard`

### Production Testing
1. Deploy to Vercel with the correct environment variables
2. Navigate to `https://sold2move.com/login`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. Verify you're redirected to `/post-auth` and then to `/dashboard`

## 6. Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the redirect URI in Google Cloud Console matches exactly
   - Check that the Supabase callback URL is correct

2. **User redirected back to home page**
   - Verify the `redirectTo` URL is in Supabase's Additional Redirect URLs
   - Check that the auth callback route is working properly

3. **"Invalid client" error**
   - Verify the Google OAuth client ID and secret are correct in Supabase
   - Ensure the OAuth consent screen is properly configured

4. **Session not persisting**
   - Check that cookies are being set for the correct domain
   - Verify the auth callback is properly exchanging the code for a session

### Debug Steps
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify environment variables are set correctly
4. Test with a clean private window
5. Check Supabase logs for authentication errors

## 7. Security Considerations

- Never expose your Supabase service role key in client-side code
- Use HTTPS in production
- Regularly rotate your OAuth credentials
- Monitor authentication logs for suspicious activity
- Implement rate limiting on authentication endpoints

## 8. Next Steps

After successful OAuth setup:
1. Test the complete user flow from signup to dashboard
2. Implement user profile creation on first login
3. Set up proper error handling and user feedback
4. Consider implementing additional OAuth providers if needed
5. Set up monitoring and analytics for authentication events
