# Sold2Move Deployment Guide for Vercel

## 🚀 Quick Deployment Steps

### 1. Deploy to Vercel
```bash
# If using Vercel CLI
vercel --prod

# Or push to your connected Git repository
git add .
git commit -m "Fix SPA routing and OAuth"
git push origin main
```

### 2. Verify vercel.json is Present
Make sure the `vercel.json` file is in your project root. This file is crucial for:
- Proper SPA routing (fixes 404 errors on routes like `/onboarding`)
- Security headers
- Vercel-specific configuration

## 🔧 Configuration Files

### vercel.json
The `vercel.json` file handles:
- ✅ Client-side routing (fixes 404 errors)
- ✅ Security headers
- ✅ Vercel-specific rewrites
- ✅ Header configuration

### Environment Variables
Make sure your production environment has:
```bash
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko
VITE_SITE_URL=https://sold2move.com
```

## 🐛 Common Issues and Solutions

### Issue: 404 errors on routes like `/onboarding`
**Solution:** Ensure `vercel.json` file is in your project root and deployed.

### Issue: Console errors from Vercel feedback system
**Solution:** These are harmless and have been suppressed in the latest build.

### Issue: Favicon 404 error
**Solution:** The `favicon.ico` file is included in the build and should be uploaded.

### Issue: Google OAuth not working
**Solution:** 
1. Check Supabase URL configuration
2. Verify Google Cloud Console OAuth setup
3. Ensure environment variables are set correctly

## 📁 File Structure After Deployment
```
project-root/
├── vercel.json
├── package.json
├── src/
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── visual-editor-config.js
└── dist/ (after build)
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   ├── index-[hash].css
    │   └── ...
    └── ...
```

## 🧪 Testing Checklist

After deployment, test these routes:
- [ ] `/` - Home page loads
- [ ] `/login` - Login page loads
- [ ] `/signup` - Signup page loads
- [ ] `/onboarding` - Onboarding page loads (no 404)
- [ ] `/dashboard` - Dashboard loads (after login)
- [ ] Google OAuth flow works
- [ ] All internal navigation works

## 🔒 Security Considerations

The `.htaccess` file includes:
- XSS protection headers
- Clickjacking prevention
- MIME type sniffing prevention
- Content Security Policy
- Proper error page handling

## 📈 Performance Optimizations

The `.htaccess` file includes:
- Gzip compression for text files
- Browser caching for static assets
- Optimized cache headers

## 🆘 Troubleshooting

### If routes still return 404:
1. Verify `vercel.json` is in the project root
2. Check that the file is deployed to Vercel
3. Ensure the rewrites configuration is correct

### If Google OAuth fails:
1. Check browser console for specific errors
2. Verify Supabase configuration
3. Test with a clean private window

### If build fails:
1. Check Node.js version compatibility
2. Clear `node_modules` and reinstall
3. Check for TypeScript errors

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all files are uploaded correctly
3. Test with a clean private window
4. Check Hostinger error logs if available
