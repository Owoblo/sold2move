# 🚀 Hostinger Deployment Guide - Sold2Move

## 📋 **Overview**

This guide will help you deploy your Sold2Move React application to Hostinger. Your app includes:
- ✅ React + Vite frontend
- ✅ Supabase backend (already live)
- ✅ Stripe payments (already configured)
- ✅ Edge functions (already deployed)

## 🎯 **Deployment Options**

### **Option 1: Static Hosting (Recommended)**
- **Best for**: React SPA applications
- **Cost**: Most affordable
- **Setup**: Upload built files to public_html

### **Option 2: VPS Hosting**
- **Best for**: Full control, custom server setup
- **Cost**: Higher but more flexible
- **Setup**: Node.js server with PM2

---

## 🚀 **Option 1: Static Hosting Deployment**

### **Step 1: Prepare Production Build**

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Create production build
npm run build

# 3. Verify build was created
ls -la dist/
```

### **Step 2: Configure Production Environment**

Create `.env.production` file:

```bash
# Production Environment Variables
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko
VITE_SITE_URL=https://yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51O7k34CUfCzyitr0cflrMAJ67QrWnpRNt5oTXIMwmbJDcv5IpTNJrqZa25y6gkNBs6Rs8DEcLrFhbVut0QtHvvqb00l7V8iihl
NODE_ENV=production
```

### **Step 3: Update Vite Config for Production**

Update `vite.config.js` to handle production builds:

```javascript
// Add this to your vite.config.js
export default defineConfig({
  // ... existing config
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      external: [
        '@babel/parser',
        '@babel/traverse', 
        '@babel/generator',
        '@babel/types'
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  },
  // ... rest of config
});
```

### **Step 4: Build for Production**

```bash
# Build with production environment
NODE_ENV=production npm run build

# Verify the build
ls -la dist/
# Should see: index.html, assets/, favicon.svg, etc.
```

### **Step 5: Upload to Hostinger**

#### **Via File Manager:**
1. **Login to Hostinger Control Panel**
2. **Go to File Manager**
3. **Navigate to `public_html`**
4. **Upload all contents of `dist/` folder**
5. **Set permissions** (755 for folders, 644 for files)

#### **Via FTP/SFTP:**
```bash
# Using FileZilla or similar FTP client
# Host: your-domain.com or IP address
# Username: your-username
# Password: your-password
# Port: 21 (FTP) or 22 (SFTP)

# Upload all files from dist/ to public_html/
```

#### **Via Git (if you have Git access):**
```bash
# If Hostinger supports Git deployment
git add .
git commit -m "Production build"
git push origin main
```

### **Step 6: Configure .htaccess for SPA Routing**

Create `.htaccess` file in `public_html`:

```apache
# .htaccess for React Router
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>
```

---

## 🖥️ **Option 2: VPS Hosting Deployment**

### **Step 1: Set Up VPS**

1. **Purchase VPS hosting** from Hostinger
2. **Access via SSH**:
   ```bash
   ssh root@your-server-ip
   ```

### **Step 2: Install Node.js**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **Step 3: Install PM2**

```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 startup script
pm2 startup
```

### **Step 4: Deploy Application**

```bash
# Clone your repository (or upload files)
git clone https://github.com/yourusername/sold2move.git
cd sold2move

# Install dependencies
npm install

# Create production build
npm run build

# Install serve for serving static files
npm install -g serve

# Start with PM2
pm2 start "serve -s dist -l 3000" --name "sold2move"
pm2 save
pm2 startup
```

### **Step 5: Configure Nginx (Optional)**

```nginx
# /etc/nginx/sites-available/sold2move
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 **Production Configuration**

### **Environment Variables**

Create these files for different environments:

#### **`.env.production`**
```bash
VITE_SUPABASE_URL=https://idbyrtwdeeruiutoukct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYnlydHdkZWVydWl1dG91a2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNTk0NjQsImV4cCI6MjA1MzgzNTQ2NH0.Hw0oJmIuDGdITM3TZkMWeXkHy53kO4i8TCJMxb6_hko
VITE_SITE_URL=https://yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51O7k34CUfCzyitr0cflrMAJ67QrWnpRNt5oTXIMwmbJDcv5IpTNJrqZa25y6gkNBs6Rs8DEcLrFhbVut0QtHvvqb00l7V8iihl
NODE_ENV=production
```

### **Update Package.json Scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:prod": "NODE_ENV=production vite build",
    "preview": "vite preview",
    "deploy": "npm run build:prod && echo 'Build complete! Upload dist/ folder to Hostinger'"
  }
}
```

---

## 🧪 **Testing Production Build**

### **Local Testing**

```bash
# Build for production
npm run build:prod

# Test locally
npm run preview

# Visit http://localhost:4173
```

### **Production Checklist**

- [ ] ✅ Build completes without errors
- [ ] ✅ All environment variables are set
- [ ] ✅ Supabase connection works
- [ ] ✅ Stripe payments work
- [ ] ✅ All routes work (including deep links)
- [ ] ✅ Images and assets load correctly
- [ ] ✅ Mobile responsiveness works
- [ ] ✅ Performance is acceptable

---

## 🚀 **Deployment Commands**

### **Quick Deploy Script**

Create `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment process..."

# Build for production
echo "📦 Building for production..."
npm run build:prod

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build files are in the 'dist' folder"
    echo "🌐 Upload the contents of 'dist' to your Hostinger public_html folder"
else
    echo "❌ Build failed!"
    exit 1
fi

echo "🎉 Deployment preparation complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

1. **404 on refresh**: Add `.htaccess` file (see Step 6 above)
2. **Environment variables not working**: Check `.env.production` file
3. **Assets not loading**: Check file permissions (755 for folders, 644 for files)
4. **CORS errors**: Verify Supabase URL and keys
5. **Stripe not working**: Check publishable key and webhook URLs

### **Debug Commands**

```bash
# Check build output
ls -la dist/

# Test local production build
npm run preview

# Check environment variables
echo $VITE_SUPABASE_URL

# Verify file permissions
ls -la public_html/
```

---

## 📞 **Support**

If you encounter issues:

1. **Check Hostinger documentation**: https://support.hostinger.com/
2. **Verify your domain DNS settings**
3. **Check file permissions**
4. **Review browser console for errors**
5. **Test with a simple HTML file first**

---

## 🎯 **Next Steps After Deployment**

1. **Set up SSL certificate** (Let's Encrypt via Hostinger)
2. **Configure domain DNS** to point to your hosting
3. **Set up monitoring** (optional)
4. **Configure backups** (optional)
5. **Test all functionality** thoroughly

---

**🎉 Congratulations! Your Sold2Move app should now be live on Hostinger!**
