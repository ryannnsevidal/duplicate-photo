# 🚀 Production Setup Guide for Render Deployment

## 📋 Prerequisites

- ✅ Supabase project created and configured
- ✅ GitHub repository with all code pushed
- ✅ Render account (free tier works)

## 🔧 Step 1: Supabase Configuration

### Authentication Settings
**Go to**: Supabase Dashboard → Authentication → Settings

**Configure these settings:**
```
✅ Enable Email Signup: ON
✅ Enable Email Confirmations: OFF (for testing, enable later)
✅ Site URL: https://your-app-name.onrender.com
✅ Redirect URLs: 
   - https://your-app-name.onrender.com
   - https://your-app-name.onrender.com/auth/callback
   - http://localhost:5173 (for local development)
```

### Database Setup
**Go to**: Supabase Dashboard → SQL Editor

**Run this SQL script:**
```sql
-- Simple Fix for Supabase Database Setup (No Triggers)
-- This script creates a minimal setup without triggers to avoid database errors

-- 1. Drop ALL existing policies and triggers
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user role creation" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all reads" ON public.user_roles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_roles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop the user_roles table completely and recreate it
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 3. Create user_roles table fresh (no triggers)
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create very simple policies (no recursion possible)
-- Allow all operations for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 8. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin();

-- 9. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
BEGIN RETURN ( SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1 ); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN RETURN ( SELECT EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin' ) ); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to create user role (called manually after signup)
CREATE OR REPLACE FUNCTION public.create_user_role(user_uuid UUID, user_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (user_uuid, user_role) ON CONFLICT (user_id) DO NOTHING;
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_role(UUID, TEXT) TO anon, authenticated;

-- 13. Verify the setup
SELECT 'Database setup complete!' as status, COUNT(*) as user_roles_count FROM public.user_roles;
```

### GitHub OAuth (Optional)
**Go to**: Supabase Dashboard → Authentication → Providers → GitHub

**Configure GitHub OAuth:**
1. Create a GitHub OAuth app at https://github.com/settings/developers
2. Set Authorization callback URL to: `https://your-project-ref.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret to Supabase

## 🔧 Step 2: Render Deployment

### Option A: Using Blueprint (Recommended)
1. **Go to**: Render Dashboard → Blueprints
2. **Connect your GitHub repository**
3. **Select the repository and branch**
4. **Render will automatically detect the `render.yaml` and create services**

### Option B: Manual Setup
1. **Go to**: Render Dashboard → New → Static Site
2. **Connect your GitHub repository**
3. **Configure:**
   - **Name**: `pix-dupe-detect-ui`
   - **Root Directory**: `pix-dupe-detect-main`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

### Environment Variables
**Set these in Render Dashboard → Environment Variables:**

**For UI Service:**
```
NODE_VERSION=20
VITE_FEATURE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=PixDupe Pro
VITE_APP_ENVIRONMENT=production
```

**For API Service (if needed):**
```
NODE_VERSION=20
API_TOKEN=your-api-token
DATABASE_URL=your-database-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔧 Step 3: Update Supabase URLs

**After deployment, update Supabase URLs:**

**Go to**: Supabase Dashboard → Authentication → Settings

**Update these URLs:**
```
Site URL: https://your-app-name.onrender.com
Redirect URLs:
- https://your-app-name.onrender.com
- https://your-app-name.onrender.com/auth/callback
- http://localhost:5173 (keep for local development)
```

## 🧪 Step 4: Testing

### Test Authentication Flow
1. **Visit your deployed app**: `https://your-app-name.onrender.com`
2. **Try signing up** with a new email
3. **Try signing in** with existing credentials
4. **Test GitHub OAuth** (if configured)

### Test API Endpoints (if applicable)
1. **Check if API is running**: `https://your-api-name.onrender.com/health`
2. **Test file upload functionality**

## 🔧 Step 5: Production Optimizations

### Enable Email Confirmations
**After testing, enable email confirmations:**
1. **Go to**: Supabase Dashboard → Authentication → Settings
2. **Turn ON** "Enable Email Confirmations"
3. **Configure email templates** if needed

### Set Up Custom Domain (Optional)
1. **Go to**: Render Dashboard → Your Service → Settings
2. **Add custom domain**
3. **Update Supabase URLs** with your custom domain

### Monitor and Logs
1. **Check Render logs** for any build or runtime errors
2. **Monitor Supabase usage** and performance
3. **Set up alerts** for any issues

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
- Check if all dependencies are in `package.json`
- Verify Node.js version is 20.x
- Check build logs for specific errors

**Authentication Not Working:**
- Verify Supabase URLs are correct
- Check if email confirmations are properly configured
- Ensure database setup script was run

**404 on Deep Links:**
- Verify SPA rewrite rule: `/* → /index.html`
- Check if `render.yaml` has correct routes configuration

**CORS Errors:**
- Add your Render domain to Supabase CORS settings
- Check if API endpoints are properly configured

### Debug Commands
```bash
# Test local build
cd pix-dupe-detect-main
npm run build

# Test local preview
npm run preview

# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

## ✅ Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database setup script executed successfully
- [ ] Authentication settings configured
- [ ] GitHub OAuth configured (optional)
- [ ] Render services deployed
- [ ] Environment variables set in Render
- [ ] Supabase URLs updated with production domain
- [ ] Authentication flow tested
- [ ] File upload functionality tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up

## 🎉 Success!

Your PixDupe Pro application is now deployed and ready for production use!

**Production URL**: `https://your-app-name.onrender.com`

**Next Steps:**
1. Share the production URL with users
2. Monitor usage and performance
3. Set up regular backups
4. Consider upgrading to paid plans as needed
