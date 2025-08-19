# 🚀 Render Deployment Guide

## 📋 Manual Deployment Steps

Since Render blueprints have limitations with static sites, we'll deploy manually.

### **Step 1: Create Static Site Service**

1. **Go to**: [render.com](https://render.com) → Dashboard
2. **Click**: "New" → "Static Site"
3. **Connect your repository**:
   - **Repository**: `ryannnsevidal/duplicate-photo`
   - **Branch**: `ci/cicd`
4. **Configure the service**:
   - **Name**: `pix-dupe-detect-ui`
   - **Root Directory**: `pix-dupe-detect-main`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

### **Step 2: Set Environment Variables**

**In Render Dashboard → Your Service → Environment:**

Add these environment variables:
```
NODE_VERSION=20
VITE_FEATURE_SUPABASE=true
VITE_SUPABASE_URL=https://udeausbrfvadriempqde.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWF1c2JyZnZhZHJpZW1wcWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MjcwNDUsImV4cCI6MjA3MTIwMzA0NX0.pXLSG0qHlN5vAtfKB_MeSVDX6PZHX9yd65O7LHoR7K0
VITE_APP_NAME=PixDupe Pro
VITE_APP_ENVIRONMENT=production
```

### **Step 3: Configure Redirects**

**In Render Dashboard → Your Service → Settings → Redirects/Rewrites:**

Add this rewrite rule:
```
Source: /*
Destination: /index.html
Type: Rewrite
```

### **Step 4: Update Supabase URLs**

**After deployment, update Supabase URLs:**

1. **Go to**: Supabase Dashboard → Authentication → Settings
2. **Update these URLs**:
   ```
   Site URL: https://your-app-name.onrender.com
   Redirect URLs:
   - https://your-app-name.onrender.com
   - https://your-app-name.onrender.com/auth/callback
   - http://localhost:5173 (keep for development)
   ```

## 🧪 Testing Your Deployment

### **Test 1: Basic Functionality**
1. **Visit your live URL**: `https://your-app-name.onrender.com`
2. **Verify the landing page loads**
3. **Click "Sign In"** to test navigation

### **Test 2: Authentication Flow**
1. **Click "Sign Up"** and create a new account
2. **Sign in** with your credentials
3. **Access the dashboard**
4. **Test sign out**

### **Test 3: File Upload (if implemented)**
1. **Sign in to your account**
2. **Upload a test image**
3. **Verify duplicate detection works**

## 🔧 Troubleshooting

### **Build Fails**
- Check if all dependencies are in `package.json`
- Verify Node.js version is 20.x
- Check build logs for specific errors

### **Authentication Not Working**
- Verify Supabase URLs are correct
- Check if environment variables are set
- Ensure Supabase project is active

### **404 on Deep Links**
- Verify the rewrite rule is set: `/* → /index.html`
- Check if the build created the `dist` folder correctly

## 📋 Next Steps After Deployment

1. **Test the live application** thoroughly
2. **Share the URL** with test users
3. **Monitor performance** and user feedback
4. **Implement next priority features**

## 🎯 Deployment Checklist

- [ ] **Static site service** created in Render
- [ ] **Environment variables** set correctly
- [ ] **Redirect rule** configured (`/* → /index.html`)
- [ ] **Supabase URLs** updated with production domain
- [ ] **Authentication flow** tested on live site
- [ ] **Error monitoring** set up

Your application will be live at: `https://your-app-name.onrender.com`
