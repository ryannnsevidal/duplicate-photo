# Production Setup Guide for Real Supabase Users

## 🚀 **Complete Setup for Production Deployment**

### **1. Supabase Database Setup**

**Run this SQL script in Supabase Dashboard → SQL Editor:**

```sql
-- Copy and paste the contents of scripts/fix-supabase-database.sql
```

This will:
- ✅ Create the `user_roles` table
- ✅ Set up proper RLS policies
- ✅ Create triggers for automatic user role assignment
- ✅ Add helper functions for admin checks
- ✅ Grant necessary permissions

### **2. Supabase Authentication Settings**

**Go to**: Supabase Dashboard → Authentication → Settings

#### **🔐 Email Auth Configuration**
```
✅ Enable Email Signup: ON
✅ Enable Email Confirmations: ON (for production security)
✅ Enable Secure Email Change: ON
✅ Enable Double Confirm Changes: ON
```

#### **🌐 Site URL Configuration**
```
Site URL: https://your-render-domain.onrender.com
Redirect URLs: 
  - http://localhost:5173 (local development)
  - https://your-render-domain.onrender.com (production)
  - https://your-render-domain.onrender.com/auth/callback
```

### **3. GitHub OAuth Configuration**

**Go to**: Supabase Dashboard → Authentication → Providers → GitHub

#### **🔑 GitHub App Setup**
1. **Create GitHub OAuth App** at https://github.com/settings/developers
   - Application name: `Your App Name`
   - Homepage URL: `https://your-render-domain.onrender.com`
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Copy GitHub Credentials**
   - Client ID: Copy from GitHub OAuth App
   - Client Secret: Copy from GitHub OAuth App

3. **Configure in Supabase**
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Save settings

### **4. Email Configuration**

**Go to**: Supabase Dashboard → Authentication → Email Templates

#### **📧 For Production**
```
✅ Use custom SMTP (recommended for production)
   - SMTP Host: your-email-provider.com
   - SMTP Port: 587 or 465
   - Username: your-email@domain.com
   - Password: your-app-password
```

#### **📧 For Testing**
```
✅ Use Supabase email service (default)
```

### **5. CORS Configuration**

**Go to**: Supabase Dashboard → Settings → API

**Add to CORS origins**:
```
http://localhost:5173
https://your-render-domain.onrender.com
```

### **6. Environment Variables for Render**

**In Render Dashboard → Environment Variables**:

```bash
# UI Environment Variables (Vite)
VITE_FEATURE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server Environment Variables (if you have API)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-database-url
```

### **7. Security Settings**

**Go to**: Supabase Dashboard → Authentication → Settings → Security

```
✅ JWT Expiry: 3600 (1 hour)
✅ Refresh Token Rotation: ON
✅ Refresh Token Reuse Interval: 10
✅ Secure Session Cookie: ON (for production)
```

## 🧪 **Testing the Setup**

### **1. Test Database Setup**
```bash
cd pix-dupe-detect-main
node scripts/test-github-auth.js
```

### **2. Test in Browser**
1. Go to your app URL
2. Click "Sign In"
3. Try both:
   - **GitHub OAuth**: Click "Continue with GitHub"
   - **Email Sign Up**: Create a new account
   - **Email Sign In**: Sign in with existing account

### **3. Test Admin Functionality**
1. Create an admin user in Supabase Dashboard
2. Sign in with admin account
3. Verify admin routes work

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **"Database error saving new user"**
- ✅ Run the SQL script in Supabase Dashboard
- ✅ Check RLS policies are correct
- ✅ Verify permissions are granted

#### **GitHub OAuth not working**
- ✅ Check GitHub OAuth App configuration
- ✅ Verify callback URLs match
- ✅ Ensure Client ID/Secret are correct

#### **Email confirmation not working**
- ✅ Check email provider settings
- ✅ Verify Site URL configuration
- ✅ Test email templates

#### **Admin routes not working**
- ✅ Check user_roles table exists
- ✅ Verify admin user is created
- ✅ Check RLS policies for admin access

## 📋 **Production Checklist**

- [ ] SQL script executed in Supabase
- [ ] GitHub OAuth configured
- [ ] Email settings configured
- [ ] CORS origins set
- [ ] Environment variables set in Render
- [ ] Security settings configured
- [ ] Test authentication flow
- [ ] Test admin functionality
- [ ] Test email confirmation
- [ ] Test GitHub OAuth

## 🎯 **Next Steps**

1. **Deploy to Render** with the configured environment variables
2. **Test the complete user flow**:
   - Sign up with email
   - Sign in with GitHub
   - Email confirmation
   - Admin access
3. **Monitor logs** for any issues
4. **Set up monitoring** for production

Your app is now ready for real Supabase users with GitHub OAuth! 🚀
