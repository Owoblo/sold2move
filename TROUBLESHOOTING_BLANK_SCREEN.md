# Vercel Blank Screen Troubleshooting Guide

Use this checklist whenever your Vercel deployment shows a blank/white screen after a push.

---

## ⚡ Quick Fix Order (Try These First)

Priority order - fixes 95% of blank-screen issues:

1. 🟥 **Check console JS errors** - Open DevTools Console
2. 🟥 **Fix CSP violations** - Look for "Refused to load script"
3. 🟧 **Fix missing environment variables** - Check Vercel dashboard
4. 🟨 **Disable Vercel Live Feedback** - Set `VERCEL_LIVE_FEEDBACK_ENABLED=0`
5. 🟩 **Redeploy without cache** - Force fresh build
6. 🟦 **Check server logs** - Look for runtime errors
7. 🟪 **Check Sentry DSN** - Verify domain settings

---

## ✅ Complete Troubleshooting Checklist

### 1. Browser Console & Network

**Console Check:**
- [ ] Open DevTools → Console → Look for errors:
  - ❌ `createContext is undefined`
  - ❌ `Refused to load script...`
  - ❌ `Hydration failed...`
  - ❌ `Uncaught TypeError/ReferenceError`
  - ❌ Missing chunk/vendor bundle errors

**Network Check:**
- [ ] Open DevTools → Network → JS tab
  - [ ] Confirm vendor JS bundles load (status 200)
  - [ ] Check if any chunks fail to load (status 404/403)

---

### 2. Content Security Policy (CSP)

**CSP Violation Check:**
- [ ] Console shows CSP violations?
  - ❌ `Refused to load script...`
  - ❌ `Framing https://vercel.live violates frame-src...`
  - ❌ `Blocked by Content-Security-Policy`

**CSP Allowlist Check:**
- [ ] Verify `vercel.json` allows all required scripts:
  - [ ] Stripe: `https://js.stripe.com`, `https://checkout.stripe.com`
  - [ ] Supabase: `https://*.supabase.co`
  - [ ] Vercel: `https://vercel.live`, `https://*.vercel.live`, `https://va.vercel-scripts.com`
  - [ ] Sentry: `https://*.ingest.sentry.io`, `https://*.sentry.io`
  - [ ] Google: `https://maps.googleapis.com`, `https://fonts.googleapis.com`

**Vercel Preview Tools:**
- [ ] If using strict CSP, disable Vercel overlays:
  ```bash
  VERCEL_LIVE_FEEDBACK_ENABLED=0
  ```
  Set this in **Vercel → Settings → Environment Variables** for all environments

---

### 3. Environment Variables

**Vercel Dashboard Check:**
- [ ] Go to Vercel → Project → Settings → Environment Variables
- [ ] Ensure all required variables are set:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
  - [ ] `VERCEL_LIVE_FEEDBACK_ENABLED=0`
- [ ] Check for ❌ undefined or empty values
- [ ] Verify variables are set for correct environments (Production/Preview/Development)

**After Changing Variables:**
- [ ] Redeploy the project (changes don't apply to existing deployments)

---

### 4. Build Mismatch / Stale Cache

**Force Fresh Build:**
- [ ] In Vercel → Deployments → Click "..." → **Redeploy without cache**
- [ ] Locally: `rm -rf node_modules/.vite dist && npm install && npm run build`

**Bundle Verification:**
- [ ] Check if JS bundle names changed between deployments
- [ ] Verify dist/ folder is rebuilt before pushing

---

### 5. Sentry / Analytics / External Scripts

**Sentry Configuration:**
- [ ] Check DSN is correct in environment variables
- [ ] Go to Sentry.io → Settings → Client Keys → Allowed Domains
- [ ] Add: `https://*.vercel.app` and your custom domain
- [ ] Look for ❌ Sentry 403 errors in console

**Temporary Disable Test:**
- [ ] To isolate issue, temporarily disable Sentry:
  ```bash
  NEXT_PUBLIC_SENTRY_DSN=""
  ```

**Analytics Check:**
- [ ] Disable Speed Insights temporarily:
  ```bash
  VERCEL_SPEED_INSIGHTS_DEBUG=0
  ```

---

### 6. SSR / Server Component Errors

**Vercel Logs Check:**
- [ ] Go to Vercel → Deployments → [Latest] → Function Logs
- [ ] Look for:
  - ❌ `ReferenceError`
  - ❌ `TypeError`
  - ❌ `undefined` from env vars
  - ❌ Database connection errors
  - ❌ Fetch failures

**Local Production Test:**
```bash
npm run build
npm run preview
```
- [ ] Blank pages often reproduce locally with production build

---

### 7. Dependency Issues

**Version Conflicts:**
- [ ] Check for React version mismatch
- [ ] Verify no missing peer dependencies
- [ ] Check if multiple React instances exist

**Clean Install:**
```bash
rm -rf node_modules node_modules/.vite dist
npm install
npm run build
```

**React Deduplication (Vite):**
- [ ] Verify `vite.config.js` has React aliases:
  ```javascript
  resolve: {
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    }
  }
  ```

---

### 8. Suspense / Dynamic Imports

**Dynamic Import Check:**
- [ ] Look for ❌ dynamic imports failing to load
- [ ] Check if lazy-loaded components have proper fallbacks
- [ ] Verify Suspense boundaries aren't swallowing errors

**Debugging:**
```javascript
// Add error boundaries around Suspense
<ErrorBoundary fallback={<div>Error loading component</div>}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

---

### 9. Routing & Middleware

**Middleware Issues:**
- [ ] Check for redirect loops
- [ ] Verify URL rewriting is correct
- [ ] Look for cookie parsing errors
- [ ] Check auth guards aren't blocking render

**Temporary Disable:**
- [ ] Comment out middleware temporarily to isolate issue

---

### 10. Revalidate / Fetch Caching Issues

**Next.js Specific:**
- [ ] Ensure `export const revalidate` values are correct
- [ ] Check if fetch crashes on missing auth tokens
- [ ] Verify URLs work in production (not just dev)

---

### 11. Vercel Preview Tools / Injected Scripts

**Disable All Overlays:**
```bash
VERCEL_LIVE_FEEDBACK_ENABLED=0
VERCEL_SPEED_INSIGHTS_DEBUG=0
```

**Why This Helps:**
- Vercel injects scripts into preview/production deployments
- These scripts can conflict with strict CSP
- Disabling them isolates whether Vercel tools are causing the issue

---

## 🔧 Common Error Messages & Solutions

### Error: `createContext is undefined`
**Cause:** React failed to load
**Solutions:**
1. Check CSP is allowing React bundle
2. Verify no multiple React instances
3. Disable Vercel Live Feedback
4. Check network tab - ensure vendor-react bundle loads

### Error: `Refused to load script 'https://vercel.live/...'`
**Cause:** CSP blocking Vercel Live Feedback
**Solution:**
- Set `VERCEL_LIVE_FEEDBACK_ENABLED=0` in Vercel environment variables
- OR add `https://vercel.live` to CSP `script-src`

### Error: `Sentry 403 Forbidden`
**Cause:** Sentry rejecting requests
**Solutions:**
1. Check DSN is correct
2. Add `https://*.vercel.app` to Sentry Allowed Domains
3. Verify Sentry project is active

### Error: Blank screen, no console errors
**Cause:** Usually server-side error or missing environment variable
**Solutions:**
1. Check Vercel Function Logs
2. Verify all environment variables are set
3. Test with `npm run build && npm run preview` locally

---

## 📝 Prevention Checklist

Before pushing to production:

- [ ] Test production build locally: `npm run build && npm run preview`
- [ ] Verify all environment variables are documented
- [ ] Check CSP allows all required external scripts
- [ ] Ensure `VERCEL_LIVE_FEEDBACK_ENABLED=0` is set in Vercel
- [ ] Test in incognito mode (avoids cached CSP)
- [ ] Check Vercel deployment logs for warnings

---

## 🆘 Last Resort

If nothing works:

1. **Create new Vercel project**
   - Sometimes project settings get corrupted
   - Fresh project can reveal configuration issues

2. **Test minimal version**
   - Create branch with just homepage
   - Gradually add features back to find culprit

3. **Check Vercel Status**
   - Visit https://www.vercel-status.com
   - Platform outages can cause blank screens

4. **Ask for help**
   - Include: browser console errors, network tab, Vercel logs
   - Share: `vercel.json`, `vite.config.js`, environment variables (redacted)

---

## 📚 Related Documentation

- [VERCEL_ENVIRONMENT_SETUP.md](./VERCEL_ENVIRONMENT_SETUP.md) - Environment variables guide
- [LISTINGS_TABLE_FINAL_CONFIRMATION.md](./LISTINGS_TABLE_FINAL_CONFIRMATION.md) - Latest migration info
- [AUTH_WORKFLOW_FIXES.md](./AUTH_WORKFLOW_FIXES.md) - Auth troubleshooting

---

**Last Updated:** December 11, 2025
**Issue:** Blank homepage caused by CSP + Vercel Live Feedback + React deduplication
**Root Cause:** CSP blocked Vercel scripts → React failed to load → createContext undefined
**Solution:** Disable Vercel Live Feedback + Fix CSP + Dedupe React
