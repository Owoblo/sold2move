# Vercel Environment Variables Setup

## Required Environment Variables

These environment variables **MUST** be set in your Vercel project dashboard to prevent errors.

### 1. Disable Vercel Live Feedback (CRITICAL)

**Variable:** `VERCEL_LIVE_FEEDBACK_ENABLED`
**Value:** `0`
**Scope:** Production, Preview, Development

**Why:** Vercel Live Feedback injects scripts that violate our Content Security Policy (CSP), causing React to fail to load and resulting in a blank homepage.

**How to Set:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `VERCEL_LIVE_FEEDBACK_ENABLED`
   - **Value:** `0`
   - **Environments:** Check all (Production, Preview, Development)
3. Click "Save"
4. Redeploy your project

---

### 2. Sentry Configuration (If Using Sentry)

**Variable:** `NEXT_PUBLIC_SENTRY_DSN`
**Value:** Your Sentry DSN from Sentry.io
**Scope:** Production, Preview (optional for Development)

**How to Get DSN:**
1. Go to Sentry.io → Settings → Projects → [Your Project]
2. Click "Client Keys (DSN)"
3. Copy the DSN value
4. Add to Vercel environment variables

**Additional Sentry Setup:**
- In Sentry.io → Settings → Projects → [Your Project] → Client Keys
- Under "Allowed Domains", add:
  - `https://*.vercel.app`
  - `https://yourdomain.com`

This prevents 403 Forbidden errors when sending Sentry events.

---

### 3. Existing Environment Variables

Make sure these are already set (from your `.env` file):

```bash
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
```

**Note:** In Vercel, you may need to prefix these with `VITE_` for Vite to pick them up.

---

## After Setting Environment Variables

1. **Trigger a new deployment** (or Vercel will auto-deploy on next push)
2. **Hard refresh your browser** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. **Check console for errors** - CSP violations should be gone

---

## Troubleshooting

### Still seeing "createContext is undefined"?
- Check that `VERCEL_LIVE_FEEDBACK_ENABLED=0` is set in **all environments**
- Make sure you've redeployed after setting the variable
- Clear browser cache completely

### Still seeing Sentry 403 errors?
- Verify `NEXT_PUBLIC_SENTRY_DSN` is correct
- Check Sentry "Allowed Domains" includes `*.vercel.app`
- Consider disabling Sentry in preview: set `NEXT_PUBLIC_SENTRY_DSN=` (empty) for Preview environment

### CSP errors still appearing?
- Check `vercel.json` has the correct CSP headers
- Make sure you're testing on the latest deployment
- Use incognito mode to avoid cached CSP policies

---

## Files Modified

- `.env.production` - Contains `VERCEL_LIVE_FEEDBACK_ENABLED=0` as fallback
- `vercel.json` - Updated CSP to allow necessary domains
- `vite.config.js` - Fixed React deduplication to prevent multiple instances

---

**Last Updated:** December 11, 2025
**Issue:** Blank homepage caused by CSP blocking Vercel scripts
**Solution:** Disable Vercel Live Feedback via environment variable
