# 🚀 Quick Start Guide for New Developers

## 📋 What You're Getting

**PixDupe Pro** - A React-based duplicate photo detection application with:
- ✅ **Supabase Authentication** (Email + GitHub OAuth)
- ✅ **File Upload & Processing**
- ✅ **Duplicate Detection Algorithm**
- ✅ **User Dashboard & Admin Panel**
- ✅ **Production-Ready Deployment**

## ⚡ 5-Minute Setup

### **Step 1: Fork/Clone the Repository**
```bash
git clone <your-repo-url>
cd duplicate-photo
```

### **Step 2: Create Supabase Project**
1. **Go to**: [supabase.com](https://supabase.com) → New Project
2. **Choose organization** and **create project**
3. **Wait for setup** (2-3 minutes)
4. **Copy your credentials**:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **Step 3: Setup Database (One-Time)**
1. **Go to**: Supabase Dashboard → SQL Editor
2. **Copy and paste** the entire content from `scripts/fix-supabase-database-final.sql`
3. **Click "Run"** to execute the script
4. **Verify success** - you should see "Database setup complete!"

### **Step 4: Configure Authentication**
1. **Go to**: Supabase Dashboard → Authentication → Settings
2. **Configure these settings**:
   ```
   ✅ Enable Email Signup: ON
   ✅ Enable Email Confirmations: OFF (for testing)
   ✅ Site URL: http://localhost:5173
   ✅ Redirect URLs: 
      - http://localhost:5173
      - http://localhost:5173/auth/callback
   ```

### **Step 5: Set Environment Variables**
1. **Copy** `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. **Edit** `.env.local` with your Supabase credentials:
   ```env
   VITE_FEATURE_SUPABASE=true
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### **Step 6: Test Locally**
```bash
cd pix-dupe-detect-main
npm install
npm run dev
```
**Visit**: `http://localhost:5173`

## 🚀 Deploy to Production

### **Option A: Render (Recommended)**
1. **Go to**: [render.com](https://render.com) → Sign Up
2. **Connect your GitHub repository**
3. **Create New** → **Blueprint**
4. **Select your repository** and **branch**
5. **Render will automatically**:
   - Detect the `render.yaml` configuration
   - Create all necessary services
   - Set up environment variables

### **Option B: Manual Render Setup**
1. **Go to**: Render Dashboard → New → Static Site
2. **Connect your repository**
3. **Configure**:
   - **Name**: `pix-dupe-detect-ui`
   - **Root Directory**: `pix-dupe-detect-main`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
4. **Add Environment Variables**:
   ```
   NODE_VERSION=20
   VITE_FEATURE_SUPABASE=true
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### **Step 7: Update Supabase URLs**
**After deployment, update Supabase URLs**:
1. **Go to**: Supabase Dashboard → Authentication → Settings
2. **Update URLs**:
   ```
   Site URL: https://your-app-name.onrender.com
   Redirect URLs:
   - https://your-app-name.onrender.com
   - https://your-app-name.onrender.com/auth/callback
   - http://localhost:5173 (keep for development)
   ```

## 🧪 Testing Your Deployment

### **Test Authentication Flow**
1. **Visit your deployed app**
2. **Try signing up** with a new email
3. **Check your email** for confirmation (if enabled)
4. **Sign in** with your credentials
5. **Test sign out**

### **Test File Upload**
1. **Sign in to your account**
2. **Upload some test images**
3. **Verify duplicate detection works**

## 🔧 Troubleshooting

### **Common Issues & Solutions**

**❌ "Database error saving new user"**
- **Solution**: Run the SQL script again in Supabase SQL Editor
- **Check**: Supabase project is active and not paused

**❌ "Authentication not working"**
- **Solution**: Verify Supabase URLs are correct
- **Check**: Email confirmations are properly configured

**❌ "Build fails on Render"**
- **Solution**: Check if all dependencies are in `package.json`
- **Check**: Node.js version is 20.x

**❌ "404 on deep links"**
- **Solution**: Verify SPA rewrite rule: `/* → /index.html`
- **Check**: `render.yaml` has correct routes configuration

### **Debug Commands**
```bash
# Test local build
npm run build

# Test local preview
npm run preview

# Run tests
npm run test

# Check environment variables
echo $VITE_SUPABASE_URL
```

## 📚 What's Included

### **Frontend (React + TypeScript)**
- ✅ **Modern UI** with Tailwind CSS + shadcn/ui
- ✅ **Authentication** with Supabase
- ✅ **File upload** with drag & drop
- ✅ **Duplicate detection** algorithm
- ✅ **User dashboard** and admin panel
- ✅ **Responsive design** for all devices

### **Backend (Supabase)**
- ✅ **User authentication** (email + GitHub OAuth)
- ✅ **Database** with PostgreSQL
- ✅ **File storage** with Supabase Storage
- ✅ **Real-time subscriptions**
- ✅ **Row Level Security** (RLS)

### **Deployment**
- ✅ **Render blueprint** for automatic deployment
- ✅ **Static site** for fast loading
- ✅ **Environment variables** management
- ✅ **SSL certificates** included
- ✅ **CDN** for global performance

## 🎯 Next Steps

### **For Development**
1. **Customize the UI** - modify components in `src/components/`
2. **Add features** - extend functionality in `src/pages/`
3. **Improve algorithms** - enhance duplicate detection
4. **Add tests** - expand test coverage

### **For Production**
1. **Enable email confirmations** in Supabase
2. **Set up monitoring** and error tracking
3. **Configure backups** for your database
4. **Add custom domain** (optional)
5. **Set up CI/CD** for automatic deployments

## 🆘 Need Help?

### **Documentation**
- 📖 **Full Setup Guide**: `PRODUCTION_SETUP.md`
- 🔧 **API Documentation**: Check component files
- 🧪 **Testing Guide**: `tests/` directory

### **Support**
- **GitHub Issues**: Create an issue in the repository
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Render Docs**: [render.com/docs](https://render.com/docs)

## 🎉 Success!

**Your PixDupe Pro application is now live!**

**Production URL**: `https://your-app-name.onrender.com`

**Share with users** and start detecting duplicate photos! 🚀
